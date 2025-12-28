<script lang="ts">
  import { MoreVertical, Send, Paperclip, Smile, X, ArrowLeft, Phone } from 'lucide-svelte';
  import { afterUpdate, createEventDispatcher } from 'svelte';
  import MessageBubble from './MessageBubble.svelte';
  import { messages, fetchMessages, sendMessage } from '@/lib/stores/chat';
  import { user } from '@/lib/stores/auth';
  import { toasts } from '@/lib/stores/toasts';
  import { supabase } from '@/lib/supabase';
  import { startCall } from '@/lib/stores/call';
  
  export let activeChat: any;
  export let isMobile: boolean = false;
  
  const dispatch = createEventDispatcher();

  // Get the other user's ID for calling
  async function getOtherUserId(): Promise<string | null> {
    if (!activeChat?.id || activeChat.isSelf) return null;
    
    const { data } = await supabase
      .from('participants')
      .select('user_id')
      .eq('chat_id', activeChat.id)
      .neq('user_id', $user?.id)
      .single();
    
    return data?.user_id || null;
  }

  async function handleCall() {
    const targetUserId = await getOtherUserId();
    if (!targetUserId) {
      toasts.error('Cannot call this user');
      return;
    }
    startCall(activeChat.id, targetUserId, activeChat.name);
  }

  function handleBack() {
    dispatch('back');
  }
  
  let newMessage = '';
  let chatContainer: HTMLElement;
  let showEmojiPicker = false;
  let fileInput: HTMLInputElement;
  
  const commonEmojis = ['😀', '😂', '😍', '🥰', '😎', '🤔', '😢', '😡', '👍', '❤️', '🔥', '🎉', '💯', '🙏', '👋', '😊'];
  
  // Reload messages when chat changes
  $: if (activeChat?.id) {
    fetchMessages(activeChat.id);
    showEmojiPicker = false;
  }
  
  async function handleSend() {
    if (!newMessage.trim() || !activeChat) return;
    
    await sendMessage(activeChat.id, newMessage, $user!.id);
    newMessage = '';
  }
  
  function scrollToBottom() {
    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  }

  function addEmoji(emoji: string) {
    newMessage += emoji;
    showEmojiPicker = false;
  }

  async function handleAttachment() {
    fileInput.click();
  }

  async function uploadFile(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toasts.error('File too large. Max 5MB allowed.');
      return;
    }

    try {
      toasts.success('Uploading...');

      const fileName = `${Date.now()}_${file.name}`;
      const { data, error } = await supabase.storage
        .from('chat-media')
        .upload(`${activeChat.id}/${fileName}`, file);

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('chat-media')
        .getPublicUrl(`${activeChat.id}/${fileName}`);

      // Send as message
      await sendMessage(activeChat.id, `📎 ${file.name}: ${publicUrl}`, $user!.id);
      toasts.success('File sent!');

    } catch (err: any) {
      console.error(err);
      toasts.error(err.message || 'Failed to upload file');
    }

    // Reset input
    target.value = '';
  }

  afterUpdate(scrollToBottom);
</script>

<div class="chat-window">
  {#if activeChat}
    <!-- Header -->
    <header class="chat-header glass">
      {#if isMobile}
        <button class="back-btn" on:click={handleBack}>
          <ArrowLeft size={24} />
        </button>
      {/if}
      <div class="user-info">
        <img src={activeChat.avatar} alt={activeChat.name} class="avatar" />
        <div class="details">
          <h3>{activeChat.name}</h3>
          <span class="status">
            {#if activeChat.isSelf}
              Message yourself
            {:else}
              {activeChat.type === 'group' ? 'Group Chat' : 'Online'}
            {/if}
          </span>
        </div>
      </div>
      
      <div class="actions">
        {#if !activeChat.isSelf}
          <button class="icon-btn" on:click={handleCall} title="Voice Call"><Phone size={20} /></button>
        {/if}
        <button class="icon-btn"><MoreVertical size={20} /></button>
      </div>
    </header>

    <!-- Messages -->
    <div class="messages-area custom-scroll" bind:this={chatContainer}>
      <div class="date-divider">
        <span>Today</span>
      </div>
      {#each $messages as msg (msg.id)}
        <MessageBubble message={msg} isMe={msg.senderId === $user?.id} />
      {/each}
    </div>

    <!-- Input -->
    <div class="input-area glass">
      <div class="emoji-container">
        <button class="icon-btn" on:click={() => showEmojiPicker = !showEmojiPicker}>
          {#if showEmojiPicker}
            <X size={24} />
          {:else}
            <Smile size={24} />
          {/if}
        </button>
        
        {#if showEmojiPicker}
          <div class="emoji-picker">
            {#each commonEmojis as emoji}
              <button class="emoji-btn" on:click={() => addEmoji(emoji)}>{emoji}</button>
            {/each}
          </div>
        {/if}
      </div>
      
      <button class="icon-btn" on:click={handleAttachment}><Paperclip size={24} /></button>
      <input type="file" bind:this={fileInput} on:change={uploadFile} hidden accept="image/*,video/*,.pdf,.doc,.docx" />
      
      <input 
        type="text" 
        placeholder="Type a message..." 
        bind:value={newMessage}
        on:keydown={(e) => e.key === 'Enter' && handleSend()}
      />
      
      <button 
        class="send-btn" 
        on:click={handleSend}
        disabled={!newMessage.trim()}
      >
        <Send size={20} />
      </button>
    </div>

  {:else}
    <div class="empty-state">
      <div class="empty-content">
        <h1>ChatVerse</h1>
        <p>Select a chat to start messaging</p>
      </div>
    </div>
  {/if}
</div>

<style>
  .chat-window {
    flex: 1;
    display: flex;
    flex-direction: column;
    height: 100vh;
    height: 100dvh;
    background: url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png');
    background-blend-mode: overlay;
    background-color: rgba(0,0,0,0.5);
  }

  .chat-header {
    padding: 0 16px;
    height: 64px;
    min-height: 64px;
    display: flex;
    align-items: center;
    gap: 12px;
    background: rgba(10, 10, 10, 0.9);
    border-bottom: 1px solid var(--glass-border);
  }

  .back-btn {
    background: transparent;
    border: none;
    color: var(--text-muted);
    padding: 8px;
    margin-left: -8px;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  }

  .back-btn:hover {
    color: white;
    background: rgba(255, 255, 255, 0.1);
  }

  .user-info {
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 1;
    min-width: 0;
  }

  .avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
  }

  .details h3 {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
  }

  .details .status {
    font-size: 0.8rem;
    color: var(--primary);
  }

  .actions {
    display: flex;
    gap: 8px;
  }

  .icon-btn {
    background: transparent;
    border: none;
    color: var(--text-muted);
    padding: 10px;
    border-radius: 50%;
    cursor: pointer;
    transition: all 0.2s;
  }

  .icon-btn:hover {
    color: white;
    background: rgba(255, 255, 255, 0.1);
  }

  .messages-area {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
    display: flex;
    flex-direction: column;
  }

  .date-divider {
    text-align: center;
    margin: 20px 0;
    position: relative;
  }

  .date-divider span {
    background: rgba(20, 20, 20, 0.6);
    padding: 4px 12px;
    border-radius: 12px;
    font-size: 0.8rem;
    color: var(--text-muted);
  }

  .input-area {
    padding: 12px 24px;
    display: flex;
    align-items: center;
    gap: 12px;
    background: rgba(10, 10, 10, 0.9);
    border-top: 1px solid var(--glass-border);
  }

  input {
    flex: 1;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    padding: 12px 16px;
    border-radius: 24px;
    color: white;
    outline: none;
    font-size: 1rem;
  }

  input:focus {
    border-color: var(--primary);
  }

  .send-btn {
    background: var(--primary);
    color: black;
    border: none;
    width: 48px;
    height: 48px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: transform 0.2s;
  }

  .send-btn:hover:not(:disabled) {
    transform: scale(1.1);
  }
  
  .send-btn:disabled {
    opacity: 0.5;
    cursor: default;
  }

  .empty-state {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-muted);
    background: rgba(5, 5, 5, 0.7);
    backdrop-filter: blur(5px);
  }

  .empty-content {
    text-align: center;
    background: rgba(255, 255, 255, 0.03);
    padding: 40px;
    border-radius: 24px;
    border: 1px solid rgba(255, 255, 255, 0.05);
    box-shadow: 0 8px 32px rgba(0,0,0,0.3);
  }

  .empty-content h1 {
    font-size: 2.5rem;
    margin: 0 0 16px;
    background: linear-gradient(135deg, #fff 0%, var(--primary) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .empty-content p {
    font-size: 1.1rem;
    margin: 0;
    opacity: 0.8;
  }

  .emoji-container {
    position: relative;
  }

  .emoji-picker {
    position: absolute;
    bottom: 60px;
    left: 0;
    background: rgba(20, 20, 20, 0.98);
    border: 1px solid var(--glass-border);
    border-radius: 16px;
    padding: 16px;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 6px;
    width: 200px;
    max-height: 200px;
    overflow: hidden;
    box-shadow: 0 8px 32px rgba(0,0,0,0.6);
    z-index: 100;
  }

  .emoji-btn {
    background: transparent;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    padding: 8px;
    border-radius: 8px;
    transition: all 0.2s;
  }

  .emoji-btn:hover {
    background: rgba(255,255,255,0.1);
    transform: scale(1.2);
  }
</style>
