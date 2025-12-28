-- IMPROVED DUPLICATE CHECK
-- The previous version incorrectly matched ANY private chat as a "Self Chat" 
-- because checking if "I am in the chat" twice (p1 and p2) is always true.
-- This version checks the EXACT participant count.

create or replace function get_private_chat_id(other_user_id uuid)
returns uuid as $$
declare
  _chat_id uuid;
begin
  select c.id into _chat_id
  from chats c
  join participants p on c.id = p.chat_id
  where c.type = 'private'
  group by c.id
  having 
      -- If finding self-chat (me + me), count must be 1.
      -- If finding pair-chat (me + other), count must be 2.
      count(*) = (case when auth.uid() = other_user_id then 1 else 2 end)
      
      -- Must contain Me
      and bool_or(p.user_id = auth.uid())
      
      -- Must contain Other (which is same as Me for self key)
      and bool_or(p.user_id = other_user_id)
  limit 1;
  
  return _chat_id;
end;
$$ language plpgsql security definer;
