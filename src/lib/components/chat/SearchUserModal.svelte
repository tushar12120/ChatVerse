<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { supabase } from '@/lib/supabase';
  import { X, Search } from 'lucide-svelte';
  import { createPrivateChat, fetchChats } from '@/lib/stores/chat';
  import { toasts } from '@/lib/stores/toasts';
  
  const dispatch = createEventDispatcher();
  
  let query = '';
  let users: any[] = [];
  let loading = false;
  
  async function searchUsers() {
    if (!query.trim()) return;
    loading = true;
    
    try {
      const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .ilike('full_name', `%${query}%`)
      .limit(5);

      if (error) throw error;
      users = data || [];
    } catch (err) {
      console.error(err);
    } finally {
      loading = false;
    }
  }

  async function startChat(userId: string) {
      try {
          const chatId = await createPrivateChat(userId);
          await fetchChats(); // Refresh list
          dispatch('select', chatId);
          dispatch('close');
          toasts.success('Chat started!');
      } catch (err) {
          toasts.error('Could not start chat');
      }
  }
</script>

<div class="modal-backdrop" on:click={() => dispatch('close')}>
  <div class="modal glass" on:click|stopPropagation>
    <div class="header">
      <h3>New Chat</h3>
      <button class="close-btn" on:click={() => dispatch('close')}><X size={20} /></button>
    </div>
    
    <div class="search-box">
      <input 
        type="text" 
        placeholder="Search users by name..." 
        bind:value={query}
        on:input={searchUsers}
      />
      <Search size={18} class="search-icon" />
    </div>

    <div class="user-list custom-scroll">
      {#if loading}
        <div class="loading">Searching...</div>
      {:else if users.length === 0 && query}
        <div class="loading">No users found</div>
      {:else}
        {#each users as user}
          <button class="user-item" on:click={() => startChat(user.id)}>
             <img src={user.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${user.full_name}`} alt={user.full_name} />
             <div class="info">
                 <span class="name">{user.full_name}</span>
                 <span class="status">{user.mobile_number || 'Available'}</span>
             </div>
          </button>
        {/each}
      {/if}
    </div>
  </div>
</div>

<style>
  .modal-backdrop {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }
  
  .modal {
    width: 400px;
    background: #111;
    border-radius: 16px;
    padding: 24px;
    border: 1px solid var(--glass-border);
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
  }
  
  .close-btn {
      background: none; border: none; color: white; cursor: pointer;
  }

  .search-box {
      position: relative;
      margin-bottom: 16px;
  }
  
  .search-box input {
      width: 100%;
      padding: 12px 12px 12px 40px;
      border-radius: 8px;
      background: rgba(255,255,255,0.1);
      border: none;
      color: white;
  }
  
  .search-icon {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      color: #aaa;
  }

  .user-list {
      max-height: 300px;
      overflow-y: auto;
  }

  .user-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px;
      width: 100%;
      background: none;
      border: none;
      cursor: pointer;
      text-align: left;
      border-radius: 8px;
  }
  
  .user-item:hover {
      background: rgba(255,255,255,0.05);
  }

  .user-item img {
      width: 40px; height: 40px; border-radius: 50%;
  }

  .info {
      display: flex; flex-direction: column;
  }
  
  .name { color: white; font-weight: 500; }
  .status { color: #888; font-size: 0.8rem; }
  
  .loading {
      text-align: center; color: #888; padding: 20px;
  }
</style>
