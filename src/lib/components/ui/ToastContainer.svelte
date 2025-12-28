<script lang="ts">
  import { toasts } from '@/lib/stores/toasts';
  import { fly } from 'svelte/transition';
  import { CheckCircle, XCircle, Info } from 'lucide-svelte';
  import { flip } from 'svelte/animate';

  function getIcon(type: 'success' | 'error' | 'info') {
    switch (type) {
      case 'success': return CheckCircle;
      case 'error': return XCircle;
      default: return Info;
    }
  }
</script>

<div class="toast-container">
  {#each $toasts as toast (toast.id)}
    <div 
      class="toast {toast.type}" 
      in:fly={{ y: 20, duration: 300 }} 
      out:fly={{ y: -20, duration: 300 }} 
      animate:flip
    >
      <svelte:component this={getIcon(toast.type)} size={20} />
      <span>{toast.message}</span>
    </div>
  {/each}
</div>

<style>
  .toast-container {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 9999;
    display: flex;
    flex-direction: column;
    gap: 10px;
    pointer-events: none; /* Allow clicking through container */
  }

  .toast {
    background: rgba(20, 20, 20, 0.9);
    backdrop-filter: blur(10px);
    color: white;
    padding: 12px 20px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    gap: 10px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
    border: 1px solid rgba(255, 255, 255, 0.1);
    min-width: 250px;
    pointer-events: auto; /* Enable clicks on toasts */
    font-size: 0.95rem;
  }

  .toast.success {
    border-left: 4px solid var(--primary);
  }
  
  .toast.success :global(svg) {
    color: var(--primary);
  }

  .toast.error {
    border-left: 4px solid var(--error);
  }

  .toast.error :global(svg) {
    color: var(--error);
  }

  .toast.info {
    border-left: 4px solid #3b82f6;
  }

  .toast.info :global(svg) {
    color: #3b82f6;
  }
</style>
