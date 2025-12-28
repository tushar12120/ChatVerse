<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import Input from '@/lib/components/ui/Input.svelte';
  import { supabase } from '@/lib/supabase';
  import { toasts } from '@/lib/stores/toasts';
  
  const dispatch = createEventDispatcher();
  
  let email = '';
  let password = '';
  let isLoading = false;
  let errors: Record<string, string> = {};
  
  function validate() {
    errors = {};
    if (!email) errors.email = 'Email is required';
    if (!password) errors.password = 'Password is required';
    return Object.keys(errors).length === 0;
  }
  
  async function handleSubmit() {
    if (validate()) {
      isLoading = true;
      try {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        
        if (error) throw error;
        
        toasts.success('Welcome back!');
        dispatch('success');
      } catch (err: any) {
        toasts.error(err.message || 'Login failed');
      } finally {
        isLoading = false;
      }
    }
  }
</script>

<div class="card glass">
  <h2 class="title">Welcome Back</h2>
  <p class="subtitle">Enter your details to continue</p>
  
  <form on:submit|preventDefault={handleSubmit}>
    <Input id="email" label="Email Address" type="email" bind:value={email} error={errors.email} />
    <Input id="password" label="Password" type="password" bind:value={password} error={errors.password} />
    
    <button type="submit" class="btn-primary" disabled={isLoading}>
      {#if isLoading}Logging in...{:else}Log In{/if}
    </button>
    
    <div class="footer">
      <span>Don't have an account?</span>
      <button type="button" class="text-link" on:click={() => dispatch('switch')}>Sign Up</button>
    </div>
  </form>
</div>

<style>
  .card {
    padding: 2.5rem;
    border-radius: var(--radius);
    width: 100%;
    box-sizing: border-box;
  }
  
  .title {
    margin: 0 0 0.5rem;
    font-size: 1.75rem;
    font-weight: 700;
  }
  
  .subtitle {
    margin: 0 0 2rem;
    color: var(--text-muted);
  }

  .error-banner {
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid var(--error);
    color: var(--error);
    padding: 0.75rem;
    border-radius: 8px;
    margin-bottom: 1.5rem;
    font-size: 0.9rem;
    text-align: center;
  }
  
  .footer {
    margin-top: 1.5rem;
    text-align: center;
    font-size: 0.9rem;
    color: var(--text-muted);
  }
  
  .footer button {
    background: none;
    border: none;
    padding: 0;
    margin-left: 0.5rem;
    font-size: 0.9rem;
  }

  button:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
</style>
