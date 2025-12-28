<script lang="ts">
  import { Search, Settings, Edit, LogOut, Users } from 'lucide-svelte';
  import { createEventDispatcher, onMount } from 'svelte';
  import ChatItem from './ChatItem.svelte';
  import { chats, fetchChats, initChatStore } from '@/lib/stores/chat';
  import { user } from '@/lib/stores/auth';
  import { supabase } from '@/lib/supabase';
  import { toasts } from '@/lib/stores/toasts';
  
  export let activeChatId: string | null = null;
  
  const dispatch = createEventDispatcher();
  
  let searchQuery = '';
  let showSettingsMenu = false;
  
  $: filteredChats = $chats.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  onMount(() => {
    initChatStore();
  });

  async function handleLogout() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toasts.success('Logged out successfully');
      // Auth store subscription in App.svelte will handle the redirect
    } catch (err) {
      console.error(err);
      toasts.error('Failed to log out');
    }
  }
</script>

<aside class="sidebar glass">
  <div class="header">
    <div class="profile-section">
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <div class="avatar-ring" on:click={() => dispatch('openProfile')} title="Edit Profile">
        <img 
          src={$user?.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${$user?.email}`} 
          alt="My Profile" 
        />
      </div>
      <div class="header-actions">
        <button 
          class="icon-btn" 
          title="New Group" 
          on:click={() => dispatch('newGroup')}
        >
          <Users size={20} />
        </button>
        <button 
          class="icon-btn" 
          title="New Chat" 
          on:click={() => dispatch('newChat')}
        >
          <Edit size={20} />
        </button>
        <div class="settings-wrapper">
          <button 
            class="icon-btn" 
            title="Settings"
            on:click={() => showSettingsMenu = !showSettingsMenu}
          >
            <Settings size={20} />
          </button>
          
          {#if showSettingsMenu}
            <div class="dropdown-menu glass" on:mouseleave={() => showSettingsMenu = false}>
              <button class="menu-item" on:click={handleLogout}>
                <LogOut size={16} />
                <span>Logout</span>
              </button>
            </div>
          {/if}
        </div>
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
</aside>

<style>
  .sidebar {
    width: 100%;
    max-width: 360px;
    height: 100vh;
    height: 100dvh;
    display: flex;
    flex-direction: column;
    border-right: 1px solid rgba(255, 255, 255, 0.05);
    background: linear-gradient(180deg, rgba(10, 10, 10, 0.95) 0%, rgba(5, 5, 5, 0.98) 100%);
    backdrop-filter: blur(20px);
  }

  @media (max-width: 768px) {
    .sidebar {
      max-width: 100%;
    }
  }

  .header {
    padding: 20px 16px 16px;
    background: transparent;
  }

  .profile-section {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding: 0 4px;
  }

  .avatar-ring {
    width: 42px;
    height: 42px;
    border-radius: 50%;
    border: 2px solid var(--primary);
    padding: 2px;
    transition: transform 0.2s ease;
    cursor: pointer;
  }
  
  .avatar-ring:hover {
    transform: scale(1.05);
  }

  .avatar-ring img {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background: #000;
  }

  .icon-btn {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.05);
    color: var(--text-muted);
    cursor: pointer;
    padding: 8px;
    border-radius: 50%;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-left: 8px;
  }

  .icon-btn:hover {
    background: var(--primary);
    color: black;
    border-color: var(--primary);
    transform: translateY(-2px);
  }

  .search-bar {
    position: relative;
    margin-top: 8px;
  }

  .search-icon {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--text-muted);
    pointer-events: none;
  }

  .search-bar input {
    width: 100%;
    padding: 10px 12px 10px 44px;
    border-radius: 20px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(0, 0, 0, 0.3);
    color: white;
    font-size: 0.9rem;
    outline: none;
    box-sizing: border-box;
    transition: all 0.2s ease;
  }

  .search-bar input:focus {
    border-color: var(--primary);
    background: rgba(0, 0, 0, 0.5);
    box-shadow: 0 0 0 3px rgba(0, 230, 118, 0.1);
  }

  .settings-wrapper {
    position: relative;
  }

  .dropdown-menu {
    position: absolute;
    top: 100%;
    right: 0;
    margin-top: 8px;
    background: #111;
    border: 1px solid var(--glass-border);
    border-radius: 12px;
    padding: 8px;
    min-width: 140px;
    z-index: 50;
    box-shadow: 0 4px 20px rgba(0,0,0,0.5);
  }

  .menu-item {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 10px;
    border: none;
    background: transparent;
    color: var(--error);
    cursor: pointer;
    border-radius: 8px;
    font-size: 0.9rem;
    font-weight: 500;
    transition: background 0.2s;
  }

  .menu-item:hover {
    background: rgba(239, 68, 68, 0.1);
  }

  .chat-list {
    flex: 1;
    overflow-y: auto;
    padding: 10px;
  }
</style>
