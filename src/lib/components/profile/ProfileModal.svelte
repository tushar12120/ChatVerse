<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { X, Save, RefreshCw } from 'lucide-svelte';
  import { user } from '@/lib/stores/auth';
  import { supabase } from '@/lib/supabase';
  import { toasts } from '@/lib/stores/toasts';

  const dispatch = createEventDispatcher();

  let fullName = '';
  let avatarUrl = '';
  let email = '';
  let mobile = '';
  let loading = false;

  onMount(() => {
    if ($user) {
      fullName = $user.user_metadata?.full_name || '';
      avatarUrl = $user.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${$user.email}`;
      email = $user.email || '';
      mobile = $user.user_metadata?.mobile_number || '';
    }
  });

  function generateRandomAvatar() {
    const seed = Math.random().toString(36).substring(7);
    avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;
  }

  async function saveProfile() {
    if (!fullName.trim()) {
      toasts.error('Name cannot be empty');
      return;
    }

    loading = true;
    try {
      // 1. Update Supabase Auth (Local Session)
      const { error: authError } = await supabase.auth.updateUser({
        data: { full_name: fullName, avatar_url: avatarUrl }
      });
      if (authError) throw authError;

      // 2. Update Public Profiles Table (For other users to see)
      const { error: dbError } = await supabase
        .from('profiles')
        .update({ 
          full_name: fullName, 
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', $user?.id);

      if (dbError) throw dbError;

      toasts.success('Profile updated successfully!');
      dispatch('close');
    } catch (err: any) {
      console.error(err);
      toasts.error(err.message || 'Failed to update profile');
    } finally {
      loading = false;
    }
  }
</script>

<div class="modal-backdrop" on:click={() => dispatch('close')}>
  <div class="modal glass" on:click|stopPropagation>
    <div class="header">
      <h2>Edit Profile</h2>
      <button class="icon-btn" on:click={() => dispatch('close')}>
        <X size={20} />
      </button>
    </div>

    <div class="content">
      <div class="avatar-section">
        <div class="avatar-preview">
          <img src={avatarUrl} alt="Avatar Preview" />
        </div>
        <button class="icon-btn refresh-btn" on:click={generateRandomAvatar} title="Generate Random Avatar">
            <RefreshCw size={18} />
        </button>
      </div>

      <div class="form-row">
          <div class="form-group half">
            <label for="email">Email</label>
            <input id="email" type="text" value={email} disabled class="readonly" />
          </div>
          <div class="form-group half">
            <label for="mobile">Mobile</label>
            <input id="mobile" type="text" value={mobile} disabled class="readonly" />
          </div>
      </div>

      <div class="form-group">
        <label for="name">Full Name</label>
        <input 
          id="name" 
          type="text" 
          bind:value={fullName} 
          placeholder="Enter your name" 
        />
      </div>

      <div class="form-group">
        <label for="avatar">Avatar URL</label>
        <input 
          id="avatar" 
          type="text" 
          bind:value={avatarUrl} 
          placeholder="https://..." 
        />
      </div>
    </div>

    <div class="footer">
      <button class="btn-cancel" on:click={() => dispatch('close')}>Cancel</button>
      <button class="btn-save" on:click={saveProfile} disabled={loading}>
        {#if loading}
          Saving...
        {:else}
          <Save size={18} /> Save Changes
        {/if}
      </button>
    </div>
  </div>
</div>

<style>
  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(4px);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
  }

  .modal {
    width: 90%;
    max-width: 400px;
    background: rgba(20, 20, 20, 0.9);
    border: 1px solid var(--glass-border);
    border-radius: 16px;
    padding: 24px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
  }

  .header h2 {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 600;
    background: var(--gradient-text);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .avatar-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 24px;
    position: relative;
  }

  .avatar-preview {
    width: 100px;
    height: 100px;
    border-radius: 50%;
    border: 3px solid var(--primary);
    padding: 3px;
    overflow: hidden;
    background: rgba(0,0,0,0.3);
  }

  .avatar-preview img {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    object-fit: cover;
  }

  .refresh-btn {
    position: absolute;
    bottom: 0;
    right: 35%;
    background: var(--primary) !important;
    color: black !important;
    border: none;
    box-shadow: 0 4px 10px rgba(0, 230, 118, 0.3);
  }

  .form-group {
    margin-bottom: 16px;
  }

  label {
    display: block;
    margin-bottom: 8px;
    font-size: 0.9rem;
    color: var(--text-muted);
  }

  input {
    width: 100%;
    padding: 12px;
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(0, 0, 0, 0.4);
    color: white;
    font-size: 1rem;
    outline: none;
    transition: var(--transition);
    box-sizing: border-box;
  }

  input:focus {
    border-color: var(--primary);
    box-shadow: 0 0 0 2px rgba(0, 230, 118, 0.1);
  }

  .footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    margin-top: 24px;
  }

  .btn-cancel {
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: var(--text-muted);
    padding: 10px 16px;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 500;
    transition: var(--transition);
  }

  .btn-cancel:hover {
    background: rgba(255, 255, 255, 0.05);
    color: white;
  }

  .btn-save {
    background: var(--primary);
    color: black;
    border: none;
    padding: 10px 20px;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: var(--transition);
  }

  .btn-save:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 230, 118, 0.2);
  }
  
  .btn-save:disabled {
    opacity: 0.7;
    cursor: not-allowed;
    transform: none;
  }

  .form-row {
    display: flex;
    gap: 12px;
    margin-bottom: 16px;
  }

  .form-group.half {
    flex: 1;
    margin-bottom: 0;
  }

  input.readonly {
    opacity: 0.6;
    cursor: default;
    border-style: dashed;
  }

  .icon-btn {
    background: rgba(255, 255, 255, 0.05);
    border: none;
    color: var(--text-muted);
    padding: 8px;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: var(--transition);
  }

  .icon-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    color: white;
  }
</style>
