-- The problem: Users can only see THEIR OWN participant row.
-- We need them to see ALL participants for any chat they belong to.

-- 1. Drop the restrictive policy
drop policy if exists "Users can see chats they are a participant in" on public.participants;

-- 2. Create the correct policy
-- "I can see a participant row IF that row belongs to a chat that I am also a participant of"
create policy "Users can view all participants in their chats"
on public.participants for select
using (
  exists (
    select 1 from public.participants p
    where p.chat_id = chat_id 
    and p.user_id = auth.uid()
  )
);
