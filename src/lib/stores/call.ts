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

// STUN Server (Free, no API needed)
const rtcConfig: RTCConfiguration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
    ],
    iceCandidatePoolSize: 10
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
            console.log('Call channel status:', status);
        });
}

// Start Voice Call (Audio Only)
export async function startCall(chatId: string, targetUserId: string, targetUserName: string) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        callStatus.set('calling');
        callData.set({
            chatId,
            callerId: user.id,
            callerName: user.user_metadata?.full_name || 'User',
            targetUserId
        });

        // Get audio only
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: false
        });
        localStream.set(stream);

        peerConnection = new RTCPeerConnection(rtcConfig);

        stream.getTracks().forEach(track => {
            peerConnection!.addTrack(track, stream);
        });

        peerConnection.ontrack = (event) => {
            console.log('🔊 Remote track received');
            remoteStream.set(event.streams[0]);
        };

        // Subscribe to target's channel first, then send
        targetChannel = supabase.channel(`calls:${targetUserId}`);

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

        peerConnection.onconnectionstatechange = () => {
            console.log('Connection state:', peerConnection?.connectionState);
        };

        peerConnection.oniceconnectionstatechange = () => {
            console.log('ICE connection state:', peerConnection?.iceConnectionState);
        };

        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);

        // Subscribe and wait, then send
        await new Promise<void>((resolve) => {
            targetChannel.subscribe((status: string) => {
                console.log('Target channel status:', status);
                if (status === 'SUBSCRIBED') {
                    resolve();
                }
            });
        });

        // Send the call invitation
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
        console.error('Call error:', err);
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

        const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: false
        });
        localStream.set(stream);

        peerConnection = new RTCPeerConnection(rtcConfig);

        stream.getTracks().forEach(track => {
            peerConnection!.addTrack(track, stream);
        });

        peerConnection.ontrack = (event) => {
            console.log('🔊 Remote track received (answerer)');
            remoteStream.set(event.streams[0]);
        };

        // Subscribe to caller's channel
        targetChannel = supabase.channel(`calls:${data.callerId}`);

        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                console.log('🧊 Sending ICE candidate (answerer)');
                targetChannel.send({
                    type: 'broadcast',
                    event: 'ice-candidate',
                    payload: { candidate: event.candidate.toJSON() }
                });
            }
        };

        peerConnection.onconnectionstatechange = () => {
            console.log('Connection state (answerer):', peerConnection?.connectionState);
        };

        // Set remote description (the offer)
        if (data.offer) {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
        }

        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);

        // Subscribe and send answer
        await new Promise<void>((resolve) => {
            targetChannel.subscribe((status: string) => {
                console.log('Caller channel status:', status);
                if (status === 'SUBSCRIBED') {
                    resolve();
                }
            });
        });

        await targetChannel.send({
            type: 'broadcast',
            event: 'call-answered',
            payload: { answer: answer }
        });

        console.log('📤 Answer sent');
        callStatus.set('connected');
        toasts.success('Connected!');

    } catch (err: any) {
        console.error('Answer error:', err);
        toasts.error(err.message || 'Could not answer call');
        endCall();
    }
}

// End Call
export function endCall() {
    const local = get(localStream);
    if (local) {
        local.getTracks().forEach(track => track.stop());
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
