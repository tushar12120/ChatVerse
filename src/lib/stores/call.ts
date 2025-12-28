import { writable, get } from 'svelte/store';
import { supabase } from '@/lib/supabase';
import { toasts } from '@/lib/stores/toasts';

// Call States
export type CallStatus = 'idle' | 'calling' | 'incoming' | 'connected' | 'ended';

export const callStatus = writable<CallStatus>('idle');
export const remoteStream = writable<MediaStream | null>(null);
export const localStream = writable<MediaStream | null>(null);
export const callData = writable<{
    chatId: string;
    callerId: string;
    callerName: string;
    targetUserId?: string;
    offer?: RTCSessionDescriptionInit;
} | null>(null);

let peerConnection: RTCPeerConnection | null = null;
let callChannel: any = null;
let targetChannel: any = null;

// ICE Servers with TURN for better mobile connectivity
const rtcConfig: RTCConfiguration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' },
        // Free TURN servers (for testing - replace with your own in production)
        {
            urls: 'turn:openrelay.metered.ca:80',
            username: 'openrelayproject',
            credential: 'openrelayproject'
        },
        {
            urls: 'turn:openrelay.metered.ca:443',
            username: 'openrelayproject',
            credential: 'openrelayproject'
        }
    ],
    iceCandidatePoolSize: 10
};

// Audio constraints optimized for mobile
const audioConstraints: MediaTrackConstraints = {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true
};

// Initialize Call Listener
export async function initCallListener(userId: string) {
    if (callChannel) {
        supabase.removeChannel(callChannel);
    }

    callChannel = supabase
        .channel(`calls:${userId}`)
        .on('broadcast', { event: 'incoming-call' }, async (payload) => {
            console.log('📞 Incoming call:', payload);
            callData.set(payload.payload);
            callStatus.set('incoming');
        })
        .on('broadcast', { event: 'call-answered' }, async (payload) => {
            console.log('✅ Call answered');
            const answer = payload.payload.answer;
            if (peerConnection && answer) {
                try {
                    await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
                    callStatus.set('connected');
                } catch (err) {
                    console.error('Error setting remote description:', err);
                }
            }
        })
        .on('broadcast', { event: 'ice-candidate' }, async (payload) => {
            console.log('🧊 ICE candidate received');
            if (peerConnection && payload.payload.candidate) {
                try {
                    await peerConnection.addIceCandidate(new RTCIceCandidate(payload.payload.candidate));
                } catch (err) {
                    console.error('Error adding ICE candidate:', err);
                }
            }
        })
        .on('broadcast', { event: 'call-ended' }, () => {
            console.log('📵 Call ended by other party');
            endCall();
        })
        .subscribe((status) => {
            console.log('📡 Call channel status:', status);
        });
}

// Start Voice Call
export async function startCall(chatId: string, targetUserId: string, targetUserName: string) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        console.log('📞 Starting call to:', targetUserName);

        callStatus.set('calling');
        callData.set({
            chatId,
            callerId: user.id,
            callerName: user.user_metadata?.full_name || 'User',
            targetUserId
        });

        // Get audio with mobile-optimized constraints
        console.log('🎤 Requesting microphone...');
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: audioConstraints,
            video: false
        });
        console.log('🎤 Microphone access granted');
        localStream.set(stream);

        // Create peer connection
        peerConnection = new RTCPeerConnection(rtcConfig);
        console.log('🔌 Peer connection created');

        // Add tracks
        stream.getTracks().forEach(track => {
            console.log('➕ Adding track:', track.kind);
            peerConnection!.addTrack(track, stream);
        });

        // Handle remote stream
        peerConnection.ontrack = (event) => {
            console.log('🔊 Remote track received:', event.track.kind);
            remoteStream.set(event.streams[0]);
        };

        // Subscribe to target's channel FIRST
        targetChannel = supabase.channel(`calls:${targetUserId}`);

        // Handle ICE candidates
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                console.log('🧊 Sending ICE candidate');
                targetChannel.send({
                    type: 'broadcast',
                    event: 'ice-candidate',
                    payload: { candidate: event.candidate.toJSON() }
                });
            }
        };

        // Log connection states
        peerConnection.onconnectionstatechange = () => {
            console.log('🔌 Connection state:', peerConnection?.connectionState);
        };

        peerConnection.oniceconnectionstatechange = () => {
            console.log('🧊 ICE state:', peerConnection?.iceConnectionState);
        };

        peerConnection.onicegatheringstatechange = () => {
            console.log('📦 ICE gathering:', peerConnection?.iceGatheringState);
        };

        // Create offer
        const offer = await peerConnection.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: false
        });
        await peerConnection.setLocalDescription(offer);
        console.log('📤 Offer created');

        // Wait for subscription
        await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Channel subscription timeout'));
            }, 5000);

            targetChannel.subscribe((status: string) => {
                console.log('📡 Target channel:', status);
                if (status === 'SUBSCRIBED') {
                    clearTimeout(timeout);
                    resolve();
                }
            });
        });

        // Send call invitation
        await targetChannel.send({
            type: 'broadcast',
            event: 'incoming-call',
            payload: {
                chatId,
                callerId: user.id,
                callerName: user.user_metadata?.full_name || 'User',
                offer: offer
            }
        });

        console.log('📤 Call invitation sent');
        toasts.success('Calling...');

    } catch (err: any) {
        console.error('❌ Call error:', err);
        toasts.error(err.message || 'Could not start call');
        endCall();
    }
}

// Answer Call
export async function answerCall() {
    try {
        const data = get(callData);
        if (!data) return;

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        console.log('📞 Answering call from:', data.callerName);

        // Get audio
        console.log('🎤 Requesting microphone...');
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: audioConstraints,
            video: false
        });
        console.log('🎤 Microphone access granted');
        localStream.set(stream);

        // Create peer connection
        peerConnection = new RTCPeerConnection(rtcConfig);
        console.log('🔌 Peer connection created');

        // Add tracks
        stream.getTracks().forEach(track => {
            console.log('➕ Adding track:', track.kind);
            peerConnection!.addTrack(track, stream);
        });

        // Handle remote stream
        peerConnection.ontrack = (event) => {
            console.log('🔊 Remote track received:', event.track.kind);
            remoteStream.set(event.streams[0]);
        };

        // Subscribe to caller's channel
        targetChannel = supabase.channel(`calls:${data.callerId}`);

        // Handle ICE candidates
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                console.log('🧊 Sending ICE candidate');
                targetChannel.send({
                    type: 'broadcast',
                    event: 'ice-candidate',
                    payload: { candidate: event.candidate.toJSON() }
                });
            }
        };

        // Log states
        peerConnection.onconnectionstatechange = () => {
            console.log('🔌 Connection state:', peerConnection?.connectionState);
        };

        peerConnection.oniceconnectionstatechange = () => {
            console.log('🧊 ICE state:', peerConnection?.iceConnectionState);
        };

        // Set remote description
        if (data.offer) {
            console.log('📥 Setting remote offer');
            await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
        }

        // Create answer
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        console.log('📤 Answer created');

        // Wait for subscription
        await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Channel subscription timeout'));
            }, 5000);

            targetChannel.subscribe((status: string) => {
                console.log('📡 Caller channel:', status);
                if (status === 'SUBSCRIBED') {
                    clearTimeout(timeout);
                    resolve();
                }
            });
        });

        // Send answer
        await targetChannel.send({
            type: 'broadcast',
            event: 'call-answered',
            payload: { answer: answer }
        });

        console.log('📤 Answer sent');
        callStatus.set('connected');
        toasts.success('Connected!');

    } catch (err: any) {
        console.error('❌ Answer error:', err);
        toasts.error(err.message || 'Could not answer call');
        endCall();
    }
}

// End Call
export function endCall() {
    console.log('📵 Ending call');

    const local = get(localStream);
    if (local) {
        local.getTracks().forEach(track => {
            track.stop();
            console.log('⏹️ Stopped track:', track.kind);
        });
    }

    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }

    const data = get(callData);
    if (data && targetChannel) {
        targetChannel.send({
            type: 'broadcast',
            event: 'call-ended',
            payload: {}
        });
    }

    if (targetChannel) {
        supabase.removeChannel(targetChannel);
        targetChannel = null;
    }

    callStatus.set('idle');
    callData.set(null);
    remoteStream.set(null);
    localStream.set(null);
}

export function cleanupCallListener() {
    if (callChannel) {
        supabase.removeChannel(callChannel);
        callChannel = null;
    }
    endCall();
}
