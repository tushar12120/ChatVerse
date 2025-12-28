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
    if (!query.trim()) {
      users = [];
      return;
    }

    // Validate: Must be exactly 10 digits
    const cleanNumber = query.trim().replace(/\D/g, ''); // Remove non-digits
    if (cleanNumber.length !== 10) {
      toasts.error('Please enter a valid 10-digit mobile number');
      users = [];
      return;
    }

    loading = true;
    
    try {
      // EXACT MATCH - Full number required
      const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('mobile_number', cleanNumber)
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
      } catch (err: any) {
          console.error('Start Chat Error:', err);
          toasts.error(err.message || 'Could not start chat');
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
      <div class="search-icon-wrapper">
        <Search size={18} />
      </div>
      <input 
        type="text" 
        placeholder="Enter Full Mobile Number..." 
        bind:value={query}
        on:keydown={(e) => e.key === 'Enter' && searchUsers()}
      />
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
    width: 420px;
    background: linear-gradient(145deg, rgba(15, 15, 15, 0.95), rgba(5, 5, 5, 0.98));
    backdrop-filter: blur(20px);
    border-radius: 20px;
    padding: 24px;
    border: 1px solid var(--glass-border);
    box-shadow: 0 20px 60px rgba(0,0,0,0.6);
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
  }

  .header h3 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
  }
  
  .close-btn {
      background: rgba(255, 255, 255, 0.05); 
      border: 1px solid rgba(255, 255, 255, 0.05);
      color: var(--text-muted); 
      cursor: pointer;
      border-radius: 50%;
      padding: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
  }

  .close-btn:hover {
      background: rgba(255, 255, 255, 0.1);
      color: white;
  }

  .search-box {
      position: relative;
      margin-bottom: 20px;
  }
  
  .search-box input {
      width: 100%;
      padding: 14px 14px 14px 44px;
      border-radius: 14px;
      background: rgba(0, 0, 0, 0.4);
      border: 1px solid var(--glass-border);
      color: white;
      font-size: 0.95rem;
      outline: none;
      box-sizing: border-box;
      transition: all 0.2s ease;
  }

  .search-box input:focus {
      border-color: var(--primary);
      box-shadow: 0 0 0 2px rgba(0, 230, 118, 0.1);
  }
  
  .search-icon-wrapper {
      position: absolute;
      left: 14px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-muted);
      pointer-events: none;
      display: flex;
      align-items: center;
      z-index: 10;
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
