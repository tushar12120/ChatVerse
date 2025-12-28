<script lang="ts">
  import { Search, Settings, Edit } from 'lucide-svelte';
  import { createEventDispatcher, onMount } from 'svelte';
  import ChatItem from './ChatItem.svelte';
  import SearchUserModal from './SearchUserModal.svelte';
  import { chats, fetchChats } from '@/lib/stores/chat';
  import { user } from '@/lib/stores/auth';
  
  export let activeChatId: string | null = null;
  
  const dispatch = createEventDispatcher();
  
  let searchQuery = '';
  let showNewChatModal = false;
  
  $: filteredChats = $chats.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  onMount(() => {
    fetchChats();
  });
</script>

<aside class="sidebar glass">
  <div class="header">
    <div class="profile-section">
      <div class="avatar-ring">
        <img 
          src={$user?.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${$user?.email}`} 
          alt="My Profile" 
        />
      </div>
      <div class="header-actions">
        <button 
          class="icon-btn" 
          title="New Chat" 
          on:click={() => showNewChatModal = true}
        >
          <Edit size={20} />
        </button>
        <button class="icon-btn" title="Settings"><Settings size={20} /></button>
      </div>
    </div>
    
    <div class="search-bar">
      <Search class="search-icon" size={18} />
      <input 
        type="text" 
        placeholder="Search conversation..." 
        bind:value={searchQuery}
      />
    </div>
  </div>

  <div class="chat-list custom-scroll">
    {#each filteredChats as chat (chat.id)}
      <ChatItem 
        {chat} 
        active={activeChatId === chat.id}
        on:click
      />
    {/each}
  </div>

  {#if showNewChatModal}
    <SearchUserModal 
      on:close={() => showNewChatModal = false} 
      on:select={(e) => {
        dispatch('click', { id: e.detail }); // Just pass ID, App will handle fetch
      }}
    />
  {/if}
</aside>

<style>
  .sidebar {
    width: 380px;
    height: 100vh;
    display: flex;
    flex-direction: column;
    border-right: 1px solid var(--glass-border);
    background: rgba(10, 10, 10, 0.6);
  }

  .header {
    padding: 24px;
    background: rgba(0, 0, 0, 0.2);
  }

  .profile-section {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
  }

  .avatar-ring {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    border: 2px solid var(--primary);
    padding: 2px;
  }

  .avatar-ring img {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background: #000;
  }

  .icon-btn {
    background: transparent;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    padding: 8px;
    border-radius: 50%;
    transition: all 0.2s ease;
  }

  .icon-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    color: white;
  }

  .search-bar {
    position: relative;
  }

  .search-icon {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--text-muted);
  }

  .search-bar input {
    width: 100%;
    padding: 12px 12px 12px 42px;
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(255, 255, 255, 0.05);
    color: white;
    font-size: 0.95rem;
    outline: none;
    box-sizing: border-box;
    transition: border-color 0.2s ease;
  }

  .search-bar input:focus {
    border-color: var(--primary);
  }

  .chat-list {
    flex: 1;
    overflow-y: auto;
    padding: 12px;
  }
</style>
