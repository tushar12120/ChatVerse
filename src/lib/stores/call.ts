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
let pendingCandidates: RTCIceCandidateInit[] = []; // Buffer for ICE candidates

// ICE Servers
const rtcConfig: RTCConfiguration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
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

// Add pending ICE candidates
async function addPendingCandidates() {
    if (!peerConnection || !peerConnection.remoteDescription) return;

    console.log(`📦 Adding ${pendingCandidates.length} buffered ICE candidates`);
    for (const candidate of pendingCandidates) {
        try {
            await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
            console.error('Error adding buffered candidate:', err);
        }
    }
    pendingCandidates = [];
}

// Initialize Call Listener
export async function initCallListener(userId: string) {
    if (callChannel) {
        supabase.removeChannel(callChannel);
    }

    pendingCandidates = [];

    callChannel = supabase
        .channel(`calls:${userId}`)
        .on('broadcast', { event: 'incoming-call' }, async (payload) => {
            console.log('📞 Incoming call:', payload.payload.callerName);
            callData.set(payload.payload);
            callStatus.set('incoming');
        })
        .on('broadcast', { event: 'call-answered' }, async (payload) => {
            console.log('✅ Call answered');
            const answer = payload.payload.answer;
            if (peerConnection && answer) {
                try {
                    await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
                    await addPendingCandidates();
                    callStatus.set('connected');
                } catch (err) {
                    console.error('Error setting remote description:', err);
                }
            }
        })
        .on('broadcast', { event: 'ice-candidate' }, async (payload) => {
            const candidate = payload.payload.candidate;
            if (!candidate) return;

            // Buffer if remote description not set yet
            if (!peerConnection || !peerConnection.remoteDescription) {
                console.log('🧊 Buffering ICE candidate');
                pendingCandidates.push(candidate);
                return;
            }

            try {
                await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
                console.log('🧊 ICE candidate added');
            } catch (err) {
                console.error('Error adding ICE candidate:', err);
            }
        })
        .on('broadcast', { event: 'call-ended' }, () => {
            console.log('📵 Call ended by other party');
            endCall();
        })
        .subscribe((status) => {
            console.log('📡 Call channel:', status);
        });
}

// Start Voice Call
export async function startCall(chatId: string, targetUserId: string, targetUserName: string) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        console.log('📞 Starting call to:', targetUserName);
        pendingCandidates = [];

        callStatus.set('calling');
        callData.set({
            chatId,
            callerId: user.id,
            callerName: user.user_metadata?.full_name || 'User',
            targetUserId
        });

        // Get audio
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true },
            video: false
        });
        console.log('🎤 Microphone granted');
        localStream.set(stream);

        // Create peer connection
        peerConnection = new RTCPeerConnection(rtcConfig);

        // Add tracks
        stream.getTracks().forEach(track => {
            peerConnection!.addTrack(track, stream);
        });

        // Handle remote stream
        peerConnection.ontrack = (event) => {
            console.log('🔊 Remote audio received');
            remoteStream.set(event.streams[0]);
        };

        // Subscribe to target's channel FIRST
        targetChannel = supabase.channel(`calls:${targetUserId}`);

        await new Promise<void>((resolve) => {
            targetChannel.subscribe((status: string) => {
                if (status === 'SUBSCRIBED') resolve();
            });
        });

        // Handle ICE candidates AFTER channel is subscribed
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                targetChannel.send({
                    type: 'broadcast',
                    event: 'ice-candidate',
                    payload: { candidate: event.candidate.toJSON() }
                });
            }
        };

        peerConnection.oniceconnectionstatechange = () => {
            console.log('🧊 ICE:', peerConnection?.iceConnectionState);
        };

        peerConnection.onconnectionstatechange = () => {
            console.log('🔌 Connection:', peerConnection?.connectionState);
        };

        // Create and set offer
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);

        // Send call invitation
        await targetChannel.send({
            type: 'broadcast',
            event: 'incoming-call',
            payload: {
                chatId,
                callerId: user.id,
                callerName: user.user_metadata?.full_name || 'User',
                offer: peerConnection.localDescription
            }
        });

        console.log('📤 Call sent');
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

        console.log('📞 Answering:', data.callerName);
        pendingCandidates = [];

        // Get audio
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true },
            video: false
        });
        console.log('🎤 Microphone granted');
        localStream.set(stream);

        // Create peer connection
        peerConnection = new RTCPeerConnection(rtcConfig);

        // Add tracks
        stream.getTracks().forEach(track => {
            peerConnection!.addTrack(track, stream);
        });

        // Handle remote stream
        peerConnection.ontrack = (event) => {
            console.log('🔊 Remote audio received');
            remoteStream.set(event.streams[0]);
        };

        // Subscribe to caller's channel
        targetChannel = supabase.channel(`calls:${data.callerId}`);

        await new Promise<void>((resolve) => {
            targetChannel.subscribe((status: string) => {
                if (status === 'SUBSCRIBED') resolve();
            });
        });

        // Handle ICE candidates
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                targetChannel.send({
                    type: 'broadcast',
                    event: 'ice-candidate',
                    payload: { candidate: event.candidate.toJSON() }
                });
            }
        };

        peerConnection.oniceconnectionstatechange = () => {
            console.log('🧊 ICE:', peerConnection?.iceConnectionState);
        };

        // Set remote description (offer)
        if (data.offer) {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
            console.log('📥 Remote offer set');
            await addPendingCandidates();
        }

        // Create answer
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);

        // Send answer
        await targetChannel.send({
            type: 'broadcast',
            event: 'call-answered',
            payload: { answer: peerConnection.localDescription }
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
        local.getTracks().forEach(track => track.stop());
    }

    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }

    if (targetChannel) {
        targetChannel.send({
            type: 'broadcast',
            event: 'call-ended',
            payload: {}
        });
        supabase.removeChannel(targetChannel);
        targetChannel = null;
    }

    pendingCandidates = [];
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
