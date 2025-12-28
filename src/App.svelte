<script lang="ts">
  import AuthLayout from '@/lib/components/auth/AuthLayout.svelte';
  import Login from '@/lib/components/auth/Login.svelte';
  import Register from '@/lib/components/auth/Register.svelte';
  import ToastContainer from '@/lib/components/ui/ToastContainer.svelte';
  import Sidebar from '@/lib/components/chat/Sidebar.svelte';
  import ChatWindow from '@/lib/components/chat/ChatWindow.svelte';
  import { user } from '@/lib/stores/auth';
  import { supabase } from '@/lib/supabase';
  import { chats } from '@/lib/stores/chat';
  import { fade, fly } from 'svelte/transition';
  
  let view: 'login' | 'register' = 'login';
  let activeChat: any = null;
  
  function switchView() {
    view = view === 'login' ? 'register' : 'login';
  }

  async function handleLogout() {
    await supabase.auth.signOut();
  }
</script>

<main>
  <ToastContainer />
  {#if !$user}
    <AuthLayout>
      {#key view}
        <div 
          in:fly={{ y: 20, duration: 400, delay: 200 }} 
          out:fade={{ duration: 200 }} 
          class="auth-wrapper"
        >
          {#if view === 'login'}
            <Login on:switch={switchView} on:success={() => {}} />
          {:else}
            <Register on:switch={switchView} on:success={() => {}} />
          {/if}
        </div>
      {/key}
    </AuthLayout>
  {:else}
    <div class="app-layout" in:fade>
      <Sidebar 
        activeChatId={activeChat?.id} 
        on:click={(e) => {
          // If e.detail is a chat object (existing flow) or just ID (new chat modal)
          const chatId = e.detail.id || e.detail; 
           // Wait for store to update or find it
           // A simple way is to find it in $chats, if not found (newly created), we might need to rely on store update
          activeChat = $chats.find(c => c.id === chatId) || { id: chatId, name: 'New Chat', avatar: '' };
        }} 
      />
      <ChatWindow {activeChat} />
    </div>
  {/if}
</main>

<style>
  main {
    width: 100%;
    min-height: 100vh;
  }
  
  .app-layout {
    display: flex;
    height: 100vh;
    width: 100%;
    overflow: hidden;
  }
  
  .auth-wrapper {
    width: 100%;
  }
</style>
