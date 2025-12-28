<script lang="ts">
  import { Phone, Video, MoreVertical, Send, Paperclip, Smile } from 'lucide-svelte';
  import { afterUpdate } from 'svelte';
  import MessageBubble from './MessageBubble.svelte';
  import { messages, fetchMessages, sendMessage } from '@/lib/stores/chat';
  import { user } from '@/lib/stores/auth';
  
  export let activeChat: any;
  
  let newMessage = '';
  let chatContainer: HTMLElement;
  
  // Reload messages when chat changes
  $: if (activeChat?.id) {
    fetchMessages(activeChat.id);
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

  afterUpdate(scrollToBottom);
</script>

<div class="chat-window">
  {#if activeChat}
    <!-- Header -->
    <header class="chat-header glass">
      <div class="user-info">
        <img src={activeChat.avatar} alt={activeChat.name} class="avatar" />
        <div class="details">
          <h3>{activeChat.name}</h3>
          <span class="status">{activeChat.type === 'private' ? 'Available' : 'Group Chat'}</span>
        </div>
      </div>
      
      <div class="actions">
        <button class="icon-btn"><Video size={20} /></button>
        <button class="icon-btn"><Phone size={20} /></button>
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
      <button class="icon-btn"><Smile size={24} /></button>
      <button class="icon-btn"><Paperclip size={24} /></button>
      
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
    background: url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png'); /* Subtle pattern */
    background-blend-mode: overlay;
    background-color: rgba(0,0,0,0.5);
  }

  .chat-header {
    padding: 0 24px;
    height: 72px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: rgba(10, 10, 10, 0.8);
    border-bottom: 1px solid var(--glass-border);
  }

  .user-info {
    display: flex;
    align-items: center;
    gap: 16px;
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
  }
</style>
