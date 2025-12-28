import { writable } from 'svelte/store';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

export const user = writable<User | null>(null);

// Initialize session
supabase.auth.getSession().then(({ data: { session } }) => {
    if (session) {
        user.set(session.user);
    }
});

// Listen for changes
supabase.auth.onAuthStateChange((_event, session) => {
    user.set(session?.user ?? null);
});
