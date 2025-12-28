<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  export let chat: any;
  export let active = false;

  const dispatch = createEventDispatcher();
</script>

<button 
  class="chat-item" 
  class:active 
  on:click={() => dispatch('click', chat)}
>
  <div class="avatar-container">
    <img src={chat.avatar} alt={chat.name} class="avatar" />
    {#if chat.online}
      <span class="online-dot"></span>
    {/if}
  </div>
  
  <div class="info">
    <div class="top-row">
      <span class="name">{chat.name}</span>
      <span class="time">{chat.time}</span>
    </div>
    <div class="bottom-row">
      <p class="message">{chat.lastMessage}</p>
      {#if chat.unread > 0}
        <span class="badge">{chat.unread}</span>
      {/if}
    </div>
  </div>
</button>

<style>
  .chat-item {
    width: 100%;
    padding: 12px 16px;
    display: flex;
    align-items: center;
    background: transparent;
    border: none;
    cursor: pointer;
    transition: all 0.2s ease;
    border-radius: 12px;
    color: var(--text-main);
    text-align: left;
    margin-bottom: 2px;
  }

  .chat-item:hover {
    background: rgba(255, 255, 255, 0.05);
  }

  .chat-item.active {
    background: rgba(0, 230, 118, 0.08); /* Transparent Primary */
    border-left: 3px solid var(--primary);
  }

  .avatar-container {
    position: relative;
    margin-right: 16px;
  }

  .avatar {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    object-fit: cover;
    background: #111;
  }

  .online-dot {
    position: absolute;
    bottom: 2px;
    right: 2px;
    width: 12px;
    height: 12px;
    background: var(--primary);
    border: 2px solid var(--bg-color);
    border-radius: 50%;
  }

  .info {
    flex: 1;
    min-width: 0; /* For truncation text */
  }

  .top-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 4px;
    align-items: center;
  }

  .name {
    font-weight: 600;
    font-size: 1rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .time {
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .bottom-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .message {
    margin: 0;
    font-size: 0.9rem;
    color: var(--text-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    /* max-width: 180px; */
  }

  .badge {
    background: var(--primary);
    color: #000;
    font-size: 0.7rem;
    font-weight: 700;
    min-width: 20px;
    height: 20px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 5px;
  }
</style>
