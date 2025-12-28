<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { X, Search, Check, Users } from 'lucide-svelte';
  import { supabase } from '@/lib/supabase';
  import { user } from '@/lib/stores/auth';
  import { toasts } from '@/lib/stores/toasts';
  import { fetchChats } from '@/lib/stores/chat';

  const dispatch = createEventDispatcher();

  let groupName = '';
  let searchQuery = '';
  let searchResults: any[] = [];
  let selectedMembers: any[] = [];
  let isSearching = false;
  let isCreating = false;

  async function searchUsers() {
    if (!searchQuery.trim() || searchQuery.length < 3) {
      searchResults = [];
      return;
    }

    isSearching = true;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, mobile_number')
        .neq('id', $user?.id)
        .or(`full_name.ilike.%${searchQuery}%,mobile_number.ilike.%${searchQuery}%`)
        .limit(10);

      if (error) throw error;
      
      // Filter out already selected members
      searchResults = (data || []).filter(
        u => !selectedMembers.find(m => m.id === u.id)
      );
    } catch (err) {
      console.error(err);
      toasts.error('Search failed');
    }
    isSearching = false;
  }

  function addMember(profile: any) {
    if (!selectedMembers.find(m => m.id === profile.id)) {
      selectedMembers = [...selectedMembers, profile];
    }
    searchResults = searchResults.filter(u => u.id !== profile.id);
    searchQuery = '';
  }

  function removeMember(id: string) {
    selectedMembers = selectedMembers.filter(m => m.id !== id);
  }

  async function createGroup() {
    if (!groupName.trim()) {
      toasts.error('Group name is required');
      return;
    }

    if (selectedMembers.length < 1) {
      toasts.error('Add at least 1 member to create a group');
      return;
    }

    isCreating = true;
    try {
      // Create group chat
      const { data: chat, error: chatError } = await supabase
        .from('chats')
        .insert({ 
          type: 'group',
          name: groupName.trim()
        })
        .select()
        .single();

      if (chatError) throw chatError;

      // Add all participants (including current user as admin)
      const participants = [
        { chat_id: chat.id, user_id: $user?.id, role: 'admin' },
        ...selectedMembers.map(m => ({
          chat_id: chat.id,
          user_id: m.id,
          role: 'member'
        }))
      ];

      const { error: partError } = await supabase
        .from('participants')
        .insert(participants);

      if (partError) throw partError;

      toasts.success(`Group "${groupName}" created!`);
      await fetchChats();
      dispatch('created', chat.id);
      dispatch('close');

    } catch (err: any) {
      console.error(err);
      toasts.error(err.message || 'Failed to create group');
    }
    isCreating = false;
  }
</script>

<div class="modal-overlay" on:click={() => dispatch('close')}>
  <div class="modal glass" on:click|stopPropagation>
    <header>
      <div class="header-icon">
        <Users size={24} />
      </div>
      <div>
        <h2>New Group</h2>
        <p>Add members to create a group</p>
      </div>
      <button class="close-btn" on:click={() => dispatch('close')}>
        <X size={20} />
      </button>
    </header>

    <!-- Group Name -->
    <div class="group-name-section">
      <input 
        type="text" 
        placeholder="Group name" 
        bind:value={groupName}
        maxlength="50"
      />
    </div>

    <!-- Selected Members -->
    {#if selectedMembers.length > 0}
      <div class="selected-members">
        <span class="label">Members ({selectedMembers.length})</span>
        <div class="member-chips">
          {#each selectedMembers as member}
            <div class="member-chip">
              <img src={member.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${member.full_name}`} alt="" />
              <span>{member.full_name?.split(' ')[0]}</span>
              <button class="remove-btn" on:click={() => removeMember(member.id)}>
                <X size={14} />
              </button>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Search Users -->
    <div class="search-section">
      <div class="search-bar">
        <Search size={18} />
        <input 
          type="text" 
          placeholder="Search by name or number..." 
          bind:value={searchQuery}
          on:input={searchUsers}
        />
      </div>

      <!-- Search Results -->
      <div class="search-results custom-scroll">
        {#if isSearching}
          <div class="loading">Searching...</div>
        {:else if searchResults.length > 0}
          {#each searchResults as profile}
            <button class="user-item" on:click={() => addMember(profile)}>
              <img 
                src={profile.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${profile.full_name}`} 
                alt="" 
                class="avatar"
              />
              <div class="info">
                <span class="name">{profile.full_name || 'Unknown'}</span>
                <span class="number">{profile.mobile_number || ''}</span>
              </div>
              <div class="add-icon">
                <Check size={18} />
              </div>
            </button>
          {/each}
        {:else if searchQuery.length >= 3}
          <div class="no-results">No users found</div>
        {:else}
          <div class="hint">Type at least 3 characters to search</div>
        {/if}
      </div>
    </div>

    <!-- Create Button -->
    <button 
      class="create-btn" 
      on:click={createGroup}
      disabled={isCreating || !groupName.trim() || selectedMembers.length < 1}
    >
      {#if isCreating}
        Creating...
      {:else}
        Create Group ({selectedMembers.length + 1} members)
      {/if}
    </button>
  </div>
</div>

<style>
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 20px;
  }

  .modal {
    width: 100%;
    max-width: 420px;
    max-height: 90vh;
    background: linear-gradient(145deg, rgba(20, 20, 20, 0.98), rgba(5, 5, 5, 0.99));
    border-radius: 16px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 20px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .header-icon {
    width: 48px;
    height: 48px;
    background: var(--primary);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: black;
  }

  header h2 {
    margin: 0;
    font-size: 1.1rem;
  }

  header p {
    margin: 2px 0 0;
    font-size: 0.8rem;
    color: var(--text-muted);
  }

  .close-btn {
    margin-left: auto;
    background: transparent;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    padding: 8px;
    border-radius: 50%;
    transition: all 0.2s;
  }

  .close-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    color: white;
  }

  .group-name-section {
    padding: 16px 20px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }

  .group-name-section input {
    width: 100%;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    padding: 12px 16px;
    font-size: 1rem;
    color: white;
  }

  .group-name-section input:focus {
    outline: none;
    border-color: var(--primary);
  }

  .selected-members {
    padding: 12px 20px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }

  .label {
    font-size: 0.75rem;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .member-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 10px;
  }

  .member-chip {
    display: flex;
    align-items: center;
    gap: 6px;
    background: rgba(0, 230, 118, 0.15);
    border: 1px solid rgba(0, 230, 118, 0.3);
    border-radius: 20px;
    padding: 4px 8px 4px 4px;
  }

  .member-chip img {
    width: 24px;
    height: 24px;
    border-radius: 50%;
  }

  .member-chip span {
    font-size: 0.85rem;
  }

  .member-chip .remove-btn {
    background: transparent;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    padding: 2px;
    display: flex;
  }

  .search-section {
    padding: 16px 20px;
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }

  .search-bar {
    display: flex;
    align-items: center;
    gap: 10px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    padding: 10px 14px;
  }

  .search-bar input {
    flex: 1;
    background: transparent;
    border: none;
    color: white;
    font-size: 0.95rem;
  }

  .search-bar input:focus {
    outline: none;
  }

  .search-results {
    flex: 1;
    margin-top: 12px;
    overflow-y: auto;
    max-height: 200px;
  }

  .user-item {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 10px;
    background: transparent;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    transition: background 0.2s;
    text-align: left;
  }

  .user-item:hover {
    background: rgba(255, 255, 255, 0.05);
  }

  .avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
  }

  .info {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .name {
    color: white;
    font-weight: 500;
  }

  .number {
    font-size: 0.8rem;
    color: var(--text-muted);
  }

  .add-icon {
    color: var(--primary);
  }

  .loading, .no-results, .hint {
    text-align: center;
    padding: 20px;
    color: var(--text-muted);
    font-size: 0.9rem;
  }

  .create-btn {
    margin: 16px 20px 20px;
    padding: 14px;
    background: var(--primary);
    color: black;
    border: none;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .create-btn:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 230, 118, 0.3);
  }

  .create-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
