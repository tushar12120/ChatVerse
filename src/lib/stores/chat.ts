import { writable, get } from 'svelte/store';
import { supabase } from '@/lib/supabase';
import { toasts } from '@/lib/stores/toasts';

export const chats = writable<any[]>([]);
export const messages = writable<any[]>([]);
export const activeChatId = writable<string | null>(null);

// Fetch all chats for the current user
export async function fetchChats() {
    try {
        // 1. Get all chats user is part of
        const { data: myChats, error } = await supabase
            .from('chats')
            .select(`
        id, created_at, type, name,
        participants!inner(user_id)
      `)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // 2. Enhance chat data (Get other participant details for private chats)
        const enhancedChats = await Promise.all(myChats.map(async (chat) => {
            let displayName = chat.name;
            let avatar = null;
            let lastMessage = 'Start a conversation';
            let time = '';

            // Get last message
            const { data: lastMsg } = await supabase
                .from('messages')
                .select('content, created_at')
                .eq('chat_id', chat.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (lastMsg) {
                lastMessage = lastMsg.content;
                time = new Date(lastMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            }

            // If private, fetch the other user's profile
            if (chat.type === 'private') {
                const { data: { user } } = await supabase.auth.getUser();
                // Since we don't have easy access to 'other' participant ID here from the simple query above without mapping
                // We need to fetch participants for this chat
                const { data: parts } = await supabase
                    .from('participants')
                    .select('user_id, profiles(full_name, avatar_url, status)')
                    .eq('chat_id', chat.id)
                    .neq('user_id', user?.id) // Get the OTHER guy
                    .single();

                if (parts && parts.profiles) {
                    // @ts-ignore
                    displayName = parts.profiles.full_name;
                    // @ts-ignore
                    avatar = parts.profiles.avatar_url;
                }
            }

            return {
                ...chat,
                name: displayName || 'Unknown',
                avatar: avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${displayName}`,
                lastMessage,
                time
            };
        }));

        chats.set(enhancedChats);
    } catch (err: any) {
        console.error('Error fetching chats:', err);
        // Silent fail or toast?
    }
}

// Fetch messages for a specific chat
export async function fetchMessages(chatId: string) {
    try {
        const { data, error } = await supabase
            .from('messages')
            .select(`
        id, content, created_at, sender_id, type, status,
        profiles:sender_id(full_name, avatar_url)
      `)
            .eq('chat_id', chatId)
            .order('created_at', { ascending: true });

        if (error) throw error;

        messages.set(data.map(m => ({
            id: m.id,
            text: m.content,
            senderId: m.sender_id,
            timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            status: 'read' // TODO: Implement read receipts
        })));

        activeChatId.set(chatId);
        subscribeToMessages(chatId);

    } catch (err: any) {
        toasts.error('Failed to load messages');
        console.error(err);
    }
}

// Send a message
export async function sendMessage(chatId: string, content: string, senderId: string) {
    try {
        const { error } = await supabase
            .from('messages')
            .insert({
                chat_id: chatId,
                sender_id: senderId,
                content
            });

        if (error) throw error;
        // Optimistic update isn't strictly needed if Realtime is fast, 
        // but for now relying on Realtime subscription to append message

    } catch (err: any) {
        toasts.error('Failed to send');
        console.error(err);
    }
}

// Realtime Subscription
let subscription: any = null;

function subscribeToMessages(chatId: string) {
    if (subscription) supabase.removeChannel(subscription);

    subscription = supabase
        .channel(`chat:${chatId}`)
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `chat_id=eq.${chatId}`
        }, (payload) => {
            const newMsg = payload.new;
            messages.update(current => [...current, {
                id: newMsg.id,
                text: newMsg.content,
                senderId: newMsg.sender_id,
                timestamp: new Date(newMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                status: 'sent'
            }]);
        })
        .subscribe();
}

// Create new chat (Helper)
export async function createPrivateChat(otherUserId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // TODO: optimization - check if chat already exists

    // 1. Create Chat
    const { data: chat, error: chatError } = await supabase
        .from('chats')
        .insert({ type: 'private' })
        .select()
        .single();

    if (chatError) throw chatError;

    // 2. Add Participants
    await supabase.from('participants').insert([
        { chat_id: chat.id, user_id: user.id },
        { chat_id: chat.id, user_id: otherUserId }
    ]);

    return chat.id;
}
