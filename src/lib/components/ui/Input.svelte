<script lang="ts">
  import { Eye, EyeOff } from 'lucide-svelte';
  
  export let label: string;
  export let value: string;
  export let type: 'text' | 'email' | 'password' | 'tel' = 'text';
  export let placeholder = '';
  export let id: string;
  export let error: string = '';

  let showPassword = false;
  
  $: inputType = type === 'password' ? (showPassword ? 'text' : 'password') : type;

  function togglePassword() {
    showPassword = !showPassword;
  }
</script>

<div class="input-group">
  <div class="relative">
    <input
      {id}
      type={inputType}
      bind:value
      placeholder=" "
      class:has-error={!!error}
    />
    <label for={id}>{label}</label>

    {#if type === 'password'}
      <button 
        type="button" 
        class="toggle-visibility" 
        on:click={togglePassword}
        tabindex="-1"
      >
        <svelte:component this={showPassword ? EyeOff : Eye} size={18} />
      </button>
    {/if}
  </div>
  {#if error}
    <span class="error-msg">{error}</span>
  {/if}
</div>

<style>
  .input-group {
    margin-bottom: 1.5rem;
    position: relative;
    width: 100%;
  }

  .relative {
    position: relative;
  }

  input {
    width: 100%;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 1rem 1rem 0.5rem;
    font-size: 1rem;
    color: white;
    outline: none;
    transition: all 0.2s ease;
    height: 56px;
    box-sizing: border-box; /* Important fix */
  }

  input:focus {
    border-color: var(--primary);
    background: rgba(255, 255, 255, 0.05);
  }

  input.has-error {
    border-color: var(--error);
  }

  /* Floating Label */
  label {
    position: absolute;
    left: 1rem;
    top: 1rem;
    color: var(--text-muted);
    font-size: 1rem;
    pointer-events: none;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }

  /* Float label when focused or has value (or placeholder shown which is hacky, using :not(:placeholder-shown)) */
  input:focus ~ label,
  input:not(:placeholder-shown) ~ label {
    top: 5px;
    left: 1rem;
    font-size: 0.75rem;
    color: var(--primary);
  }

  input.has-error:focus ~ label,
  input.has-error:not(:placeholder-shown) ~ label {
    color: var(--error);
  }

  .toggle-visibility {
    position: absolute;
    right: 1rem;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    padding: 0;
    display: flex;
    align-items: center;
  }

  .toggle-visibility:hover {
    color: white;
  }

  .error-msg {
    color: var(--error);
    font-size: 0.75rem;
    margin-top: 0.25rem;
    display: block;
    margin-left: 0.5rem;
  }
</style>
