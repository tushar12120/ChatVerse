-- 1. update chats table to track creator (needed for RLS check during creation)
alter table public.chats add column if not exists created_by uuid default auth.uid();

-- 2. Allow authenticated users to insert new chats
create policy "Users can create chats" 
on public.chats for insert 
with check (auth.role() = 'authenticated');

-- 3. Update Chats SELECT policy to allow creator to see the chat (even if not in participants yet)
drop policy if exists "Users can see chat details if they are a participant" on public.chats;
drop policy if exists "Users can see chats they are a participant in or created" on public.chats;

create policy "Users can see chats they are a participant in or created"
on public.chats for select
using (
  created_by = auth.uid() or
  exists (
    select 1 from public.participants p 
    where p.chat_id = id and p.user_id = auth.uid()
  )
);

-- 4. Allow authenticated users to insert participants (needed to add themselves and others)
create policy "Users can insert participants" 
on public.participants for insert 
with check (auth.role() = 'authenticated');
