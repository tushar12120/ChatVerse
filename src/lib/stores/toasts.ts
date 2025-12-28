import { writable } from 'svelte/store';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
    id: number;
    message: string;
    type: ToastType;
}

const { subscribe, update } = writable<Toast[]>([]);

export const toasts = {
    subscribe,
    add: (message: string, type: ToastType = 'info', duration = 3000) => {
        const id = Date.now();
        update((all) => [...all, { id, message, type }]);

        setTimeout(() => {
            update((all) => all.filter((t) => t.id !== id));
        }, duration);
    },
    success: (message: string, duration = 3000) => toasts.add(message, 'success', duration),
    error: (message: string, duration = 4000) => toasts.add(message, 'error', duration),
    info: (message: string, duration = 3000) => toasts.add(message, 'info', duration),
};
