<script lang="ts">
  import { Check, CheckCheck } from 'lucide-svelte';
  
  export let message: any;
  export let isMe: boolean;

  // Detect message type
  function isImageUrl(text: string): boolean {
    return /\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i.test(text) || 
           text.includes('storage/v1/object/public/chat-media');
  }

  function extractUrl(text: string): string | null {
    const urlMatch = text.match(/https?:\/\/[^\s]+/);
    return urlMatch ? urlMatch[0] : null;
  }

  $: url = extractUrl(message.text);
  $: isImage = url && isImageUrl(url);
  $: displayText = message.text.replace(/📎\s*[\w.-]+:\s*/, '').replace(url || '', '').trim();
</script>

<div class="message-wrapper" class:me={isMe}>
  <div class="bubble glass">
    {#if isImage}
      <a href={url} target="_blank" rel="noopener">
        <img src={url} alt="Shared image" class="media-preview" />
      </a>
      {#if displayText}
        <p class="caption">{displayText}</p>
      {/if}
    {:else if url}
      <p>
        {displayText || '📎 File:'}
        <a href={url} target="_blank" rel="noopener" class="file-link">{url.split('/').pop()}</a>
      </p>
    {:else}
      <p>{message.text}</p>
    {/if}
    <div class="meta">
      <span class="time">{message.timestamp}</span>
      {#if isMe}
        <span class="status">
          {#if message.status === 'read'}
            <div class="read-icon">
               <CheckCheck size={16} color="#40C4FF" strokeWidth={2.5} />
            </div>
          {:else if message.status === 'received'}
            <CheckCheck size={16} color="#aaa" />
          {:else}
            <Check size={16} color="#aaa" />
          {/if}
        </span>
      {/if}
    </div>
  </div>
</div>

<style>
  .message-wrapper {
    display: flex;
    justify-content: flex-start;
    margin-bottom: 12px;
  }

  .message-wrapper.me {
    justify-content: flex-end;
  }

  .bubble {
    max-width: 65%;
    padding: 10px 14px;
    border-radius: 12px;
    position: relative;
    font-size: 0.95rem;
    line-height: 1.4;
    border-top-left-radius: 2px;
  }

  .me .bubble {
    background: linear-gradient(135deg, rgba(0, 168, 84, 0.2), rgba(0, 230, 118, 0.1));
    border: 1px solid rgba(0, 230, 118, 0.2);
    border-top-left-radius: 12px;
    border-top-right-radius: 2px;
  }
  
  .bubble:not(.me .bubble) {
    background: rgba(255, 255, 255, 0.08);
  }

  .meta {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 4px;
    margin-top: 4px;
    opacity: 0.7;
  }

  .time {
    font-size: 0.7rem;
  }
  
  .status {
    display: flex;
    align-items: center;
  }

  .read-icon {
    display: flex;
    filter: drop-shadow(0 0 4px rgba(64, 196, 255, 0.5)); /* The 'Blur' Glow Effect */
    animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  }

  @keyframes popIn {
    from { transform: scale(0); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
  }

  .media-preview {
    max-width: 100%;
    max-height: 300px;
    border-radius: 8px;
    margin-bottom: 8px;
    cursor: pointer;
    transition: transform 0.2s;
  }

  .media-preview:hover {
    transform: scale(1.02);
  }

  .caption {
    margin: 4px 0 0;
    font-size: 0.9rem;
    opacity: 0.9;
  }

  .file-link {
    color: #40C4FF;
    text-decoration: none;
    word-break: break-all;
  }

  .file-link:hover {
    text-decoration: underline;
  }

  p {
    margin: 0;
    word-wrap: break-word;
  }
</style>
