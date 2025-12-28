<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import Input from '@/lib/components/ui/Input.svelte';
  import { supabase } from '@/lib/supabase';
  import { toasts } from '@/lib/stores/toasts';
  
  const dispatch = createEventDispatcher();
  
  let name = '';
  let mobile = '';
  let email = '';
  let password = '';
  let confirmPassword = '';
  
  let isLoading = false;
  let errors: Record<string, string> = {};
  
  function validate() {
    errors = {};
    if (!name) errors.name = 'Full Name is required';
    if (!mobile) errors.mobile = 'Mobile Number is required';
    else if (!/^\d{10}$/.test(mobile)) errors.mobile = 'Enter a valid 10-digit mobile number';
    if (!email) errors.email = 'Email is required';
    else if (!/^\S+@\S+\.\S+$/.test(email)) errors.email = 'Enter a valid email';
    if (!password) errors.password = 'Password is required';
    else if (password.length < 6) errors.password = 'Password must be at least 6 characters';
    if (password !== confirmPassword) errors.confirmPassword = 'Passwords do not match';
    
    return Object.keys(errors).length === 0;
  }
  
  async function handleSubmit() {
    if (validate()) {
      isLoading = true;
      try {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: name,
              mobile_number: mobile,
            }
          }
        });

        if (error) throw error;

        toasts.success('Registration successful! Check your email.');
        dispatch('switch'); // Switch to login for now
        
      } catch (err: any) {
        toasts.error(err.message || 'Registration failed');
      } finally {
        isLoading = false;
      }
    } else {
      toasts.error('Please fix the errors in the form.');
    }
  }
</script>

<div class="card glass">
  <h2 class="title">Create Account</h2>
  <p class="subtitle">Join ChatVerse today</p>
  
  <form on:submit|preventDefault={handleSubmit}>
    <Input id="name" label="Full Name" bind:value={name} error={errors.name} />
    <Input id="mobile" label="Mobile Number" type="tel" bind:value={mobile} error={errors.mobile} />
    <Input id="email" label="Email Address" type="email" bind:value={email} error={errors.email} />
    <Input id="password" label="Password" type="password" bind:value={password} error={errors.password} />
    <Input id="confirmPassword" label="Confirm Password" type="password" bind:value={confirmPassword} error={errors.confirmPassword} />
    
    <button type="submit" class="btn-primary" disabled={isLoading}>
      {#if isLoading}Creating...{:else}Sign Up{/if}
    </button>
    
    <div class="footer">
      <span>Already have an account?</span>
      <button type="button" class="text-link" on:click={() => dispatch('switch')}>Log in</button>
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
