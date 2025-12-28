<script lang="ts">
  import { Phone, PhoneOff, Video } from 'lucide-svelte';
  import { callStatus, callData, answerCall, endCall, localStream, remoteStream } from '@/lib/stores/call';

  $: isIncoming = $callStatus === 'incoming';
  $: isCalling = $callStatus === 'calling';
  $: isConnected = $callStatus === 'connected';
  $: showModal = isIncoming || isCalling || isConnected;

  // Svelte action to set srcObject on video elements
  function srcObject(node: HTMLVideoElement, stream: MediaStream | null) {
    node.srcObject = stream;
    return {
      update(newStream: MediaStream | null) {
        node.srcObject = newStream;
      }
    };
  }
</script>

{#if showModal}
  <div class="call-overlay">
    <div class="call-modal glass">
      
      {#if isConnected}
        <!-- Connected Call View -->
        <div class="video-container">
          {#if $remoteStream}
            <video 
              class="remote-video" 
              autoplay 
              playsinline
              use:srcObject={$remoteStream}
            />
          {:else}
            <div class="audio-call-bg">
              <div class="pulse-ring"></div>
              <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${$callData?.callerName}`} alt="" class="caller-avatar" />
            </div>
          {/if}
          
          {#if $localStream && $callData?.isVideo}
            <video 
              class="local-video" 
              autoplay 
              muted 
              playsinline
              use:srcObject={$localStream}
            />
          {/if}
        </div>
        
        <div class="call-info">
          <h3>{$callData?.callerName}</h3>
          <span class="status">Connected</span>
        </div>
        
        <div class="call-actions">
          <button class="end-btn" on:click={endCall}>
            <PhoneOff size={24} />
          </button>
        </div>

      {:else if isIncoming}
        <!-- Incoming Call View -->
        <div class="incoming-view">
          <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${$callData?.callerName}`} alt="" class="caller-avatar large" />
          <h2>{$callData?.callerName}</h2>
          <p>{$callData?.isVideo ? 'Video Call' : 'Voice Call'}</p>
        </div>
        
        <div class="call-actions incoming">
          <button class="reject-btn" on:click={endCall}>
            <PhoneOff size={28} />
          </button>
          <button class="accept-btn" on:click={answerCall}>
            {#if $callData?.isVideo}
              <Video size={28} />
            {:else}
              <Phone size={28} />
            {/if}
          </button>
        </div>

      {:else if isCalling}
        <!-- Calling View -->
        <div class="calling-view">
          <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${$callData?.callerName}`} alt="" class="caller-avatar large" />
          <h2>Calling...</h2>
          <p>{$callData?.callerName}</p>
        </div>
        
        <div class="call-actions">
          <button class="end-btn" on:click={endCall}>
            <PhoneOff size={24} />
          </button>
        </div>
      {/if}
      
    </div>
  </div>
{/if}

<style>
  .call-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.9);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
  }

  .call-modal {
    width: 400px;
    max-width: 95vw;
    background: linear-gradient(145deg, rgba(20, 20, 20, 0.98), rgba(5, 5, 5, 0.99));
    border-radius: 24px;
    padding: 32px;
    text-align: center;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .video-container {
    position: relative;
    width: 100%;
    aspect-ratio: 4/3;
    background: #111;
    border-radius: 16px;
    overflow: hidden;
    margin-bottom: 20px;
  }

  .remote-video {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .local-video {
    position: absolute;
    bottom: 12px;
    right: 12px;
    width: 100px;
    height: 75px;
    border-radius: 8px;
    object-fit: cover;
    border: 2px solid rgba(255, 255, 255, 0.2);
  }

  .audio-call-bg {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    position: relative;
  }

  .pulse-ring {
    position: absolute;
    width: 120px;
    height: 120px;
    border-radius: 50%;
    border: 3px solid var(--primary);
    animation: pulse 2s ease-out infinite;
  }

  @keyframes pulse {
    0% { transform: scale(0.8); opacity: 1; }
    100% { transform: scale(1.5); opacity: 0; }
  }

  .caller-avatar {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    z-index: 1;
  }

  .caller-avatar.large {
    width: 120px;
    height: 120px;
    margin-bottom: 20px;
  }

  .incoming-view, .calling-view {
    padding: 20px 0 30px;
  }

  .incoming-view h2, .calling-view h2 {
    margin: 0 0 8px;
    font-size: 1.5rem;
  }

  .incoming-view p, .calling-view p {
    margin: 0;
    color: var(--text-muted);
  }

  .call-info h3 {
    margin: 0 0 4px;
  }

  .call-info .status {
    color: var(--primary);
    font-size: 0.9rem;
  }

  .call-actions {
    display: flex;
    justify-content: center;
    gap: 24px;
    margin-top: 24px;
  }

  .call-actions.incoming {
    gap: 60px;
  }

  .end-btn, .reject-btn {
    background: #e53935;
    border: none;
    width: 60px;
    height: 60px;
    border-radius: 50%;
    color: white;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.2s;
  }

  .accept-btn {
    background: var(--primary);
    border: none;
    width: 60px;
    height: 60px;
    border-radius: 50%;
    color: black;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.2s;
  }

  .end-btn:hover, .reject-btn:hover, .accept-btn:hover {
    transform: scale(1.1);
  }
</style>
