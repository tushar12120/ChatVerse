<script lang="ts">
  import { fade } from 'svelte/transition';
</script>

<div class="auth-container">
  <div class="background-anim"></div>
  <div class="content" in:fade={{ duration: 400 }}>
    <h1 class="logo">ChatVerse</h1>
    <slot />
  </div>
</div>

<style>
  .auth-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 1rem;
    position: relative;
    overflow: hidden;
  }

  .background-anim {
    position: absolute;
    top: -50%;
    left: -50%;
    right: -50%;
    bottom: -50%;
    background: radial-gradient(circle at center, rgba(0, 230, 118, 0.1), transparent 60%);
    animation: pulse 10s infinite alternate;
    z-index: -1;
  }

  @keyframes pulse {
    0% { transform: scale(1); opacity: 0.5; }
    100% { transform: scale(1.2); opacity: 0.8; }
  }

  .logo {
    font-size: 2.5rem;
    font-weight: 800;
    margin-bottom: 2rem;
    background: linear-gradient(135deg, #fff 0%, var(--primary) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    letter-spacing: -1px;
    text-align: center;
  }

  .content {
    width: 100%;
    max-width: 420px;
    z-index: 1;
  }
</style>
