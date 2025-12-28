-- Function to get existing private chat ID between two users
-- Usage: supabase.rpc('get_private_chat_id', { other_user_id: '...' })

create or replace function get_private_chat_id(other_user_id uuid)
returns uuid as $$
declare
  _chat_id uuid;
begin
  -- Logic: Find a private chat where both users are participants
  select p1.chat_id into _chat_id
  from participants p1
  join participants p2 on p1.chat_id = p2.chat_id
  join chats c on c.id = p1.chat_id
  where c.type = 'private'
  and p1.user_id = auth.uid()
  and p2.user_id = other_user_id
  limit 1;
  
  return _chat_id;
end;
$$ language plpgsql security definer;
