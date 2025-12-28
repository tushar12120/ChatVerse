-- FIX 500 ERROR (Infinite Recursion)
-- The previous policy caused an infinite loop because checking 'participants' required reading 'participants'.
-- We break this by using a SECURITY DEFINER function that bypasses RLS to check membership.

-- 1. Create a secure function to check if user is in a chat
create or replace function is_chat_member(_chat_id uuid)
returns boolean as $$
begin
  return exists (
    select 1 from public.participants 
    where chat_id = _chat_id 
    and user_id = auth.uid()
  );
end;
$$ language plpgsql security definer; 
-- 'security definer' means this function runs with admin privileges, bypassing RLS to avoid the loop.

-- 2. Update Chats Policy to use this function
drop policy if exists "Users can see chats they are a participant in or created" on public.chats;
create policy "Users can see chats they are a participant in or created"
on public.chats for select
using (
  created_by = auth.uid() or
  is_chat_member(id)
);

-- 3. Update Participants Policy to use this function
drop policy if exists "Users can view all participants in their chats" on public.participants;
create policy "Users can view all participants in their chats"
on public.participants for select
using (
  is_chat_member(chat_id)
);
