<script lang="ts">
  import { onMount } from 'svelte';
  import AuthLayout from '@/lib/components/auth/AuthLayout.svelte';
  import Login from '@/lib/components/auth/Login.svelte';
  import Register from '@/lib/components/auth/Register.svelte';
  import ToastContainer from '@/lib/components/ui/ToastContainer.svelte';
  import Sidebar from '@/lib/components/chat/Sidebar.svelte';
  import ChatWindow from '@/lib/components/chat/ChatWindow.svelte';
  import SearchUserModal from '@/lib/components/chat/SearchUserModal.svelte';
  import ProfileModal from '@/lib/components/profile/ProfileModal.svelte';
  import CallModal from '@/lib/components/call/CallModal.svelte';
  import { user } from '@/lib/stores/auth';
  import { supabase } from '@/lib/supabase';
  import { chats } from '@/lib/stores/chat';
  import { initCallListener, cleanupCallListener } from '@/lib/stores/call';
  import { fade, fly } from 'svelte/transition';
  
  let view: 'login' | 'register' = 'login';
  let activeChat: any = null;
  let showNewChatModal = false;
  let showProfileModal = false;

  // Initialize call listener when user changes
  $: if ($user) {
    initCallListener($user.id);
  } else {
    cleanupCallListener();
  }

  // Reactive: Update activeChat details when chats store updates
  $: if (activeChat?.id && $chats.length > 0) {
      const updatedChat = $chats.find(c => c.id === activeChat.id);
      if (updatedChat) {
          if (activeChat.name === 'Loading...' || activeChat.name === 'New Chat') {
             activeChat = updatedChat;
          }
      }
  }
  
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
        on:newChat={() => showNewChatModal = true}
        on:openProfile={() => showProfileModal = true}
        on:click={(e) => {
          const chatId = e.detail.id || e.detail; 
          // Optimistically set active chat or find it
          activeChat = $chats.find(c => c.id === chatId) || { id: chatId, name: 'Loading...', avatar: '' };
        }} 
      />
      <ChatWindow {activeChat} />
    </div>

    {#if showNewChatModal}
      <SearchUserModal 
        on:close={() => showNewChatModal = false} 
        on:select={(e) => {
          const chatId = e.detail;
          activeChat = { id: chatId, name: 'Loading...', avatar: '' };
          // Store will auto-update activeChat via reactive statement below
        }}
      />
    {/if}

    {#if showProfileModal}
      <ProfileModal on:close={() => showProfileModal = false} />
    {/if}
    
    <!-- Call Modal (Incoming/Outgoing Calls) -->
    <CallModal />
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
