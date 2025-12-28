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
  let isMobile = false;

  // Check if mobile
  onMount(() => {
    const checkMobile = () => {
      isMobile = window.innerWidth < 768;
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  });

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

  function handleChatSelect(e: CustomEvent) {
    const chatId = e.detail.id || e.detail;
    activeChat = $chats.find(c => c.id === chatId) || { id: chatId, name: 'Loading...', avatar: '' };
  }

  function handleBack() {
    activeChat = null;
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
    <div class="app-layout" class:mobile={isMobile} in:fade>
      <!-- Sidebar: Hidden on mobile when chat is open -->
      <div class="sidebar-container" class:hidden={isMobile && activeChat}>
        <Sidebar 
          activeChatId={activeChat?.id} 
          on:newChat={() => showNewChatModal = true}
          on:openProfile={() => showProfileModal = true}
          on:click={handleChatSelect}
        />
      </div>
      
      <!-- ChatWindow: Full screen on mobile -->
      <div class="chat-container" class:hidden={isMobile && !activeChat}>
        <ChatWindow {activeChat} {isMobile} on:back={handleBack} />
      </div>
    </div>

    {#if showNewChatModal}
      <SearchUserModal 
        on:close={() => showNewChatModal = false} 
        on:select={(e) => {
          const chatId = e.detail;
          activeChat = { id: chatId, name: 'Loading...', avatar: '' };
        }}
      />
    {/if}

    {#if showProfileModal}
      <ProfileModal on:close={() => showProfileModal = false} />
    {/if}
    
    <CallModal />
  {/if}
</main>



<style>
  main {
    width: 100%;
    min-height: 100vh;
    min-height: 100dvh; /* Dynamic viewport height for mobile */
  }
  
  .app-layout {
    display: flex;
    height: 100vh;
    height: 100dvh;
    width: 100%;
    overflow: hidden;
  }

  .sidebar-container {
    width: 360px;
    flex-shrink: 0;
    transition: transform 0.3s ease;
  }

  .chat-container {
    flex: 1;
    min-width: 0;
  }

  /* Mobile Styles */
  .app-layout.mobile .sidebar-container {
    width: 100%;
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 10;
  }

  .app-layout.mobile .chat-container {
    width: 100%;
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 20;
  }

  .app-layout.mobile .hidden {
    display: none;
  }
  
  .auth-wrapper {
    width: 100%;
  }

  /* Global mobile optimizations */
  @media (max-width: 768px) {
    :global(body) {
      -webkit-tap-highlight-color: transparent;
      -webkit-touch-callout: none;
    }
  }
</style>
