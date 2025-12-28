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
    offer?: RTCSessionDescriptionInit;
} | null>(null);

let peerConnection: RTCPeerConnection | null = null;
let callChannel: any = null;

// STUN Server (Free, no API needed)
const rtcConfig: RTCConfiguration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ]
};

// Initialize Call Listener
export async function initCallListener(userId: string) {
    callChannel = supabase
        .channel(`calls:${userId}`)
        .on('broadcast', { event: 'incoming-call' }, async (payload) => {
            console.log('Incoming call:', payload);
            callData.set(payload.payload);
            callStatus.set('incoming');
        })
        .on('broadcast', { event: 'call-answered' }, async (payload) => {
            console.log('Call answered');
            const answer = payload.payload.answer;
            if (peerConnection && answer) {
                await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
                callStatus.set('connected');
            }
        })
        .on('broadcast', { event: 'ice-candidate' }, async (payload) => {
            if (peerConnection && payload.payload.candidate) {
                await peerConnection.addIceCandidate(new RTCIceCandidate(payload.payload.candidate));
            }
        })
        .on('broadcast', { event: 'call-ended' }, () => {
            endCall();
        })
        .subscribe();
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
            callerName: user.user_metadata?.full_name || 'User'
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
            remoteStream.set(event.streams[0]);
        };

        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                supabase.channel(`calls:${targetUserId}`).send({
                    type: 'broadcast',
                    event: 'ice-candidate',
                    payload: { candidate: event.candidate }
                });
            }
        };

        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);

        await supabase.channel(`calls:${targetUserId}`).send({
            type: 'broadcast',
            event: 'incoming-call',
            payload: {
                chatId,
                callerId: user.id,
                callerName: user.user_metadata?.full_name || 'User',
                offer
            }
        });

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
            remoteStream.set(event.streams[0]);
        };

        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                supabase.channel(`calls:${data.callerId}`).send({
                    type: 'broadcast',
                    event: 'ice-candidate',
                    payload: { candidate: event.candidate }
                });
            }
        };

        if (data.offer) {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
        }

        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);

        await supabase.channel(`calls:${data.callerId}`).send({
            type: 'broadcast',
            event: 'call-answered',
            payload: { answer }
        });

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
    if (data) {
        supabase.channel(`calls:${data.callerId}`).send({
            type: 'broadcast',
            event: 'call-ended',
            payload: {}
        });
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
