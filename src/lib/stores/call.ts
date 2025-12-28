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
let pendingCandidates: RTCIceCandidateInit[] = [];

// Multiple ICE servers for better connectivity
const rtcConfig: RTCConfiguration = {
    iceServers: [
        // Google STUN
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        // Twilio STUN (free)
        { urls: 'stun:global.stun.twilio.com:3478' },
        // Metered TURN (free tier)
        {
            urls: 'turn:a.relay.metered.ca:80',
            username: 'e3e3e2e3e3e3e3e3e3e3e3e3',
            credential: 'e3e3e2e3e3e3e3e3e3e3e3e3'
        },
        {
            urls: 'turn:a.relay.metered.ca:443',
            username: 'e3e3e2e3e3e3e3e3e3e3e3e3',
            credential: 'e3e3e2e3e3e3e3e3e3e3e3e3'
        },
        {
            urls: 'turn:a.relay.metered.ca:443?transport=tcp',
            username: 'e3e3e2e3e3e3e3e3e3e3e3e3',
            credential: 'e3e3e2e3e3e3e3e3e3e3e3e3'
        }
    ],
    iceTransportPolicy: 'all',
    iceCandidatePoolSize: 10
};

// Process pending ICE candidates
async function processPendingCandidates() {
    if (!peerConnection?.remoteDescription) return;

    for (const candidate of pendingCandidates) {
        try {
            await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
            console.warn('Failed to add candidate:', e);
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
        .on('broadcast', { event: 'incoming-call' }, (payload) => {
            console.log('📞 Incoming call');
            callData.set(payload.payload);
            callStatus.set('incoming');
        })
        .on('broadcast', { event: 'call-answered' }, async (payload) => {
            console.log('✅ Call answered');
            if (peerConnection && payload.payload.answer) {
                try {
                    await peerConnection.setRemoteDescription(
                        new RTCSessionDescription(payload.payload.answer)
                    );
                    await processPendingCandidates();
                    callStatus.set('connected');
                } catch (e) {
                    console.error('Set answer error:', e);
                }
            }
        })
        .on('broadcast', { event: 'ice-candidate' }, async (payload) => {
            const candidate = payload.payload.candidate;
            if (!candidate) return;

            if (!peerConnection?.remoteDescription) {
                pendingCandidates.push(candidate);
                return;
            }

            try {
                await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (e) {
                console.warn('Add candidate error:', e);
            }
        })
        .on('broadcast', { event: 'call-ended' }, () => {
            endCall();
        })
        .subscribe();
}

// Start Call
export async function startCall(chatId: string, targetUserId: string, targetUserName: string) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        pendingCandidates = [];
        callStatus.set('calling');
        callData.set({
            chatId,
            callerId: user.id,
            callerName: user.user_metadata?.full_name || 'User',
            targetUserId
        });

        // Get microphone
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: false
        });
        localStream.set(stream);

        // Create connection
        peerConnection = new RTCPeerConnection(rtcConfig);

        // Add audio track
        stream.getAudioTracks().forEach(track => {
            peerConnection!.addTrack(track, stream);
        });

        // Remote audio
        peerConnection.ontrack = (e) => {
            console.log('🔊 Got remote audio');
            remoteStream.set(e.streams[0]);
        };

        // Subscribe to target channel first
        targetChannel = supabase.channel(`calls:${targetUserId}`);
        await targetChannel.subscribe();

        // ICE candidates
        peerConnection.onicecandidate = (e) => {
            if (e.candidate) {
                targetChannel.send({
                    type: 'broadcast',
                    event: 'ice-candidate',
                    payload: { candidate: e.candidate.toJSON() }
                });
            }
        };

        // Create offer
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);

        // Send call
        await targetChannel.send({
            type: 'broadcast',
            event: 'incoming-call',
            payload: {
                chatId,
                callerId: user.id,
                callerName: user.user_metadata?.full_name || 'User',
                offer: { type: offer.type, sdp: offer.sdp }
            }
        });

        toasts.success('Calling...');
    } catch (err: any) {
        console.error('Call error:', err);
        toasts.error(err.message || 'Call failed');
        endCall();
    }
}

// Answer Call
export async function answerCall() {
    try {
        const data = get(callData);
        if (!data?.offer) return;

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        pendingCandidates = [];

        // Get microphone
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: false
        });
        localStream.set(stream);

        // Create connection
        peerConnection = new RTCPeerConnection(rtcConfig);

        // Add audio track
        stream.getAudioTracks().forEach(track => {
            peerConnection!.addTrack(track, stream);
        });

        // Remote audio
        peerConnection.ontrack = (e) => {
            console.log('🔊 Got remote audio');
            remoteStream.set(e.streams[0]);
        };

        // Subscribe to caller channel
        targetChannel = supabase.channel(`calls:${data.callerId}`);
        await targetChannel.subscribe();

        // ICE candidates
        peerConnection.onicecandidate = (e) => {
            if (e.candidate) {
                targetChannel.send({
                    type: 'broadcast',
                    event: 'ice-candidate',
                    payload: { candidate: e.candidate.toJSON() }
                });
            }
        };

        // Set offer
        await peerConnection.setRemoteDescription(
            new RTCSessionDescription(data.offer)
        );
        await processPendingCandidates();

        // Create answer
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);

        // Send answer
        await targetChannel.send({
            type: 'broadcast',
            event: 'call-answered',
            payload: { answer: { type: answer.type, sdp: answer.sdp } }
        });

        callStatus.set('connected');
        toasts.success('Connected!');
    } catch (err: any) {
        console.error('Answer error:', err);
        toasts.error(err.message || 'Answer failed');
        endCall();
    }
}

// End Call
export function endCall() {
    const local = get(localStream);
    local?.getTracks().forEach(t => t.stop());

    peerConnection?.close();
    peerConnection = null;

    if (targetChannel) {
        targetChannel.send({ type: 'broadcast', event: 'call-ended', payload: {} });
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
