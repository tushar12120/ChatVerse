import { writable } from 'svelte/store';
import { toasts } from './toasts';

export const permissionsGranted = writable({
    notification: false,
    microphone: false
});

// Request Notification Permission
export async function requestNotificationPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
        console.log('Notifications not supported');
        return false;
    }

    if (Notification.permission === 'granted') {
        permissionsGranted.update(p => ({ ...p, notification: true }));
        return true;
    }

    if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            permissionsGranted.update(p => ({ ...p, notification: true }));
            toasts.success('Notifications enabled');
            return true;
        }
    }

    return false;
}

// Request Microphone Permission
export async function requestMicrophonePermission(): Promise<boolean> {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Stop the stream immediately, we just needed permission
        stream.getTracks().forEach(track => track.stop());
        permissionsGranted.update(p => ({ ...p, microphone: true }));
        toasts.success('Microphone access granted');
        return true;
    } catch (err) {
        console.error('Microphone permission denied:', err);
        toasts.error('Microphone access denied. Voice calls need microphone.');
        return false;
    }
}

// Request All Permissions at once
export async function requestAllPermissions(): Promise<void> {
    await requestNotificationPermission();
    await requestMicrophonePermission();
}

// Check current permission states
export function checkPermissions(): void {
    // Check notification status
    if ('Notification' in window && Notification.permission === 'granted') {
        permissionsGranted.update(p => ({ ...p, notification: true }));
    }

    // Check microphone - we can't check without requesting, 
    // so we'll rely on the stored state
}

// Show a test notification
export function showTestNotification(title: string, body: string): void {
    if (Notification.permission === 'granted') {
        new Notification(title, {
            body,
            icon: '/logo-512.png',
            badge: '/logo-192.png'
        });
    }
}
