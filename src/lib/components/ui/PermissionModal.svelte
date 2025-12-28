<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { Bell, Mic, Shield, X } from 'lucide-svelte';
  import { requestNotificationPermission, requestMicrophonePermission } from '@/lib/stores/permissions';
  import { toasts } from '@/lib/stores/toasts';

  const dispatch = createEventDispatcher();

  let isRequesting = false;
  let notificationGranted = false;
  let microphoneGranted = false;

  async function requestNotification() {
    isRequesting = true;
    notificationGranted = await requestNotificationPermission();
    isRequesting = false;
  }

  async function requestMicrophone() {
    isRequesting = true;
    microphoneGranted = await requestMicrophonePermission();
    isRequesting = false;
  }

  async function requestAll() {
    isRequesting = true;
    notificationGranted = await requestNotificationPermission();
    microphoneGranted = await requestMicrophonePermission();
    isRequesting = false;
    
    // Mark as done
    localStorage.setItem('permissions_requested', 'true');
    toasts.success('Setup complete!');
    dispatch('close');
  }

  function skip() {
    localStorage.setItem('permissions_requested', 'true');
    dispatch('close');
  }
</script>

<div class="modal-overlay">
  <div class="modal glass">
    <header>
      <div class="icon-circle">
        <Shield size={28} />
      </div>
      <h2>Enable Features</h2>
      <p>Grant permissions for the best experience</p>
    </header>

    <div class="permission-list">
      <!-- Notifications -->
      <div class="permission-item" class:granted={notificationGranted}>
        <div class="perm-icon">
          <Bell size={22} />
        </div>
        <div class="perm-info">
          <span class="perm-title">Notifications</span>
          <span class="perm-desc">Get notified for new messages</span>
        </div>
        {#if notificationGranted}
          <span class="status granted">✓</span>
        {:else}
          <button class="enable-btn" on:click={requestNotification} disabled={isRequesting}>
            Enable
          </button>
        {/if}
      </div>

      <!-- Microphone -->
      <div class="permission-item" class:granted={microphoneGranted}>
        <div class="perm-icon">
          <Mic size={22} />
        </div>
        <div class="perm-info">
          <span class="perm-title">Microphone</span>
          <span class="perm-desc">Required for voice calls</span>
        </div>
        {#if microphoneGranted}
          <span class="status granted">✓</span>
        {:else}
          <button class="enable-btn" on:click={requestMicrophone} disabled={isRequesting}>
            Enable
          </button>
        {/if}
      </div>
    </div>

    <div class="actions">
      <button class="allow-all-btn" on:click={requestAll} disabled={isRequesting}>
        {#if isRequesting}
          Please wait...
        {:else}
          Allow All & Continue
        {/if}
      </button>
      <button class="skip-btn" on:click={skip}>
        Skip for now
      </button>
    </div>
  </div>
</div>

<style>
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.85);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    padding: 20px;
  }

  .modal {
    width: 100%;
    max-width: 380px;
    background: linear-gradient(145deg, rgba(25, 25, 25, 0.98), rgba(10, 10, 10, 0.99));
    border-radius: 20px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    padding: 32px 24px;
    text-align: center;
  }

  header {
    margin-bottom: 28px;
  }

  .icon-circle {
    width: 64px;
    height: 64px;
    background: linear-gradient(135deg, var(--primary), #00c853);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 16px;
    color: black;
  }

  h2 {
    margin: 0 0 6px;
    font-size: 1.4rem;
  }

  header p {
    margin: 0;
    color: var(--text-muted);
    font-size: 0.9rem;
  }

  .permission-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 28px;
  }

  .permission-item {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 14px 16px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    transition: all 0.2s;
  }

  .permission-item.granted {
    border-color: rgba(0, 230, 118, 0.3);
    background: rgba(0, 230, 118, 0.05);
  }

  .perm-icon {
    width: 44px;
    height: 44px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--primary);
  }

  .perm-info {
    flex: 1;
    text-align: left;
  }

  .perm-title {
    display: block;
    font-weight: 500;
    margin-bottom: 2px;
  }

  .perm-desc {
    font-size: 0.8rem;
    color: var(--text-muted);
  }

  .enable-btn {
    padding: 8px 16px;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 8px;
    color: white;
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .enable-btn:hover:not(:disabled) {
    background: var(--primary);
    border-color: var(--primary);
    color: black;
  }

  .enable-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .status.granted {
    color: var(--primary);
    font-weight: bold;
    font-size: 1.2rem;
  }

  .actions {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .allow-all-btn {
    padding: 14px;
    background: var(--primary);
    border: none;
    border-radius: 10px;
    color: black;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .allow-all-btn:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 16px rgba(0, 230, 118, 0.3);
  }

  .allow-all-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .skip-btn {
    padding: 12px;
    background: transparent;
    border: none;
    color: var(--text-muted);
    font-size: 0.9rem;
    cursor: pointer;
  }

  .skip-btn:hover {
    color: white;
  }
</style>
