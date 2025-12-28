-- Add last_read_at to participants to track when they last opened a chat
alter table public.participants 
add column if not exists last_read_at timestamptz default now();

-- Helper function to Mark Chat as Read
create or replace function mark_chat_read(_chat_id uuid)
returns void as $$
begin
  update public.participants
  set last_read_at = now()
  where chat_id = _chat_id
  and user_id = auth.uid();
end;
$$ language plpgsql security definer;
