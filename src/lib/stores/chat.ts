import { writable, get } from 'svelte/store';
import { supabase } from '@/lib/supabase';
import { toasts } from '@/lib/stores/toasts';
import { user } from '@/lib/stores/auth';

export const chats = writable<any[]>([]);
export const messages = writable<any[]>([]);
export const activeChatId = writable<string | null>(null);

// Fetch all chats for the current user
export async function fetchChats() {
    try {
        const { data: myChats, error } = await supabase
            .from('chats')
            .select(`
                id, created_at, type, name,
                participants!inner(user_id)
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;

        const enhancedChats = await Promise.all(myChats.map(async (chat) => {
            let displayName = chat.name;
            let avatar = null;
            let lastMessage = 'Start a conversation';
            let time = '';

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

            if (chat.type === 'private') {
                const { data: { user } } = await supabase.auth.getUser();
                const { data: parts } = await supabase
                    .from('participants')
                    .select('user_id, profiles(full_name, avatar_url, status)')
                    .eq('chat_id', chat.id)
                    .neq('user_id', user?.id)
                    .single();

                if (parts && parts.profiles) {
                    // @ts-ignore
                    displayName = parts.profiles.full_name;
                    // @ts-ignore
                    avatar = parts.profiles.avatar_url;
                } else {
                    displayName = 'You';
                    avatar = user?.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email}`;
                    // @ts-ignore
                    chat.isSelf = true;
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
    }
}

// Fetch messages for a specific chat
export async function fetchMessages(chatId: string) {
    try {
        const { data, error } = await supabase
            .from('messages')
            .select(`
                id, content, created_at, sender_id, type,
                profiles:sender_id(full_name, avatar_url)
            `)
            .eq('chat_id', chatId)
            .order('created_at', { ascending: true });

        if (error) throw error;

        const { data: { user: currentUser } } = await supabase.auth.getUser();
        let otherUserReadAt = new Date(0);

        if (data && data.length > 0) {
            const { data: parts } = await supabase
                .from('participants')
                .select('user_id, last_read_at')
                .eq('chat_id', chatId)
                .neq('user_id', currentUser?.id);

            if (parts && parts.length > 0) {
                otherUserReadAt = new Date(parts[0].last_read_at || 0);
            }
        }

        console.log('Fetched messages for', chatId, 'Count:', data?.length);

        messages.set(data.map(m => {
            const msgTime = new Date(m.created_at);
            const isRead = m.sender_id === currentUser?.id ? msgTime <= otherUserReadAt : true;

            return {
                id: m.id,
                text: m.content,
                senderId: m.sender_id,
                timestamp: msgTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                status: isRead ? 'read' : 'sent',
                createdAt: m.created_at
            };
        }));

        activeChatId.set(chatId);
        await markChatAsRead(chatId);
        subscribeToMessages(chatId);

    } catch (err: any) {
        console.error('Fetch Messages Error:', err);
        toasts.error('Failed to load messages');
    }
}

export async function markChatAsRead(chatId: string) {
    try {
        await supabase.rpc('mark_chat_read', { _chat_id: chatId });
    } catch (err) {
        console.error('Failed to mark read', err);
    }
}

// Send a message
export async function sendMessage(chatId: string, content: string, senderId: string) {
    const tempId = `temp-${Date.now()}`;
    const timestamp = new Date();

    messages.update(current => [...current, {
        id: tempId,
        text: content,
        senderId,
        timestamp: timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'sending',
        createdAt: timestamp.toISOString()
    }]);

    try {
        const { data: newMsg, error } = await supabase
            .from('messages')
            .insert({
                chat_id: chatId,
                sender_id: senderId,
                content
            })
            .select()
            .single();

        if (error) throw error;

        messages.update(current => {
            return current.map(m => {
                if (m.id === tempId) {
                    return {
                        id: newMsg.id,
                        text: newMsg.content,
                        senderId: newMsg.sender_id,
                        timestamp: new Date(newMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        status: 'sent',
                        createdAt: newMsg.created_at
                    };
                }
                return m;
            });
        });

    } catch (err: any) {
        messages.update(current => current.filter(m => m.id !== tempId));
        toasts.error('Failed to send');
        console.error(err);
    }
}

// ============================================
// REALTIME + POLLING FOR BLUE TICKS
// ============================================
let activeChatSubscription: any = null;
let readStatusPollingInterval: any = null;

async function pollReadStatus(chatId: string) {
    const currentUser = get(user);
    if (!currentUser) return;

    const { data: parts } = await supabase
        .from('participants')
        .select('last_read_at')
        .eq('chat_id', chatId)
        .neq('user_id', currentUser.id)
        .limit(1)
        .single();

    if (parts && parts.last_read_at) {
        const otherReadAt = new Date(parts.last_read_at);
        messages.update(current => {
            return current.map(m => {
                if (m.senderId === currentUser.id && m.status !== 'read' && m.createdAt) {
                    if (new Date(m.createdAt) <= otherReadAt) {
                        return { ...m, status: 'read' };
                    }
                }
                return m;
            });
        });
    }
}

function subscribeToMessages(chatId: string) {
    // Cleanup previous
    if (activeChatSubscription) supabase.removeChannel(activeChatSubscription);
    if (readStatusPollingInterval) clearInterval(readStatusPollingInterval);

    // POLLING: Check read status every 2 seconds
    readStatusPollingInterval = setInterval(() => {
        if (get(activeChatId) === chatId) {
            pollReadStatus(chatId);
        }
    }, 2000);

    // Also poll immediately
    pollReadStatus(chatId);

    activeChatSubscription = supabase
        .channel(`chat:${chatId}`)
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `chat_id=eq.${chatId}`
        }, (payload) => {
            const newMsg = payload.new;

            // If I received a message and I'm viewing, mark as read
            const currentUser = get(user);
            if (currentUser && newMsg.sender_id !== currentUser.id && !document.hidden) {
                markChatAsRead(chatId);
            }

            messages.update(current => {
                if (current.find(m => m.id === newMsg.id)) return current;
                return [...current, {
                    id: newMsg.id,
                    text: newMsg.content,
                    senderId: newMsg.sender_id,
                    timestamp: new Date(newMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    status: 'sent',
                    createdAt: newMsg.created_at
                }];
            });
        })
        .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'participants',
            filter: `chat_id=eq.${chatId}`
        }, (payload) => {
            console.log('Read Receipt Update:', payload);
            const updatedParticipant = payload.new;
            const currentUser = get(user);

            if (updatedParticipant.last_read_at) {
                messages.update(current => {
                    return current.map(m => {
                        if (currentUser && m.senderId === currentUser.id && m.status !== 'read' && m.createdAt) {
                            if (new Date(m.createdAt) <= new Date(updatedParticipant.last_read_at)) {
                                return { ...m, status: 'read' };
                            }
                        }
                        return m;
                    });
                });
            }
        })
        .subscribe();
}

// Global Subscription (Sidebar Updates & New Chats)
let globalSubscription: any = null;

export async function initChatStore() {
    await fetchChats();

    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) return;

    if (globalSubscription) return;

    globalSubscription = supabase
        .channel('global-user-changes')
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'messages'
        }, (payload) => {
            const newMsg = payload.new;
            chats.update(currentChats => {
                return currentChats.map(c => {
                    if (c.id === newMsg.chat_id) {
                        return {
                            ...c,
                            lastMessage: newMsg.content,
                            time: new Date(newMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        };
                    }
                    return c;
                });
            });
        })
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'participants',
            filter: `user_id=eq.${currentUser.id}`
        }, () => {
            console.log('New chat detected, refetching...');
            fetchChats();
        })
        .subscribe();
}

// Create new chat (Helper)
export async function createPrivateChat(otherUserId: string) {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) return;

    const { data: existingChatId } = await supabase
        .rpc('get_private_chat_id', { other_user_id: otherUserId });

    if (existingChatId) {
        console.log('Found existing chat:', existingChatId);
        return existingChatId;
    }

    const { data: chat, error: chatError } = await supabase
        .from('chats')
        .insert({ type: 'private' })
        .select()
        .single();

    if (chatError) throw chatError;

    const participants = [{ chat_id: chat.id, user_id: currentUser.id }];

    if (otherUserId !== currentUser.id) {
        participants.push({ chat_id: chat.id, user_id: otherUserId });
    }

    await supabase.from('participants').insert(participants);

    return chat.id;
}
