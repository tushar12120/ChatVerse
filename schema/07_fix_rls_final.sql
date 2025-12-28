-- FINAL FIX FOR RLS POLICIES
-- This script only fixes the permissions (Policies).
-- It skips Realtime setup since that is already enabled.

-- 1. Ensure created_by column exists in chats
do $$ 
begin
    if not exists (select 1 from information_schema.columns where table_name = 'chats' and column_name = 'created_by') then
        alter table public.chats add column created_by uuid default auth.uid();
    end if;
end $$;

-- 2. Reset CHATS Policies
drop policy if exists "Users can create chats" on public.chats;
drop policy if exists "Users can see chat details if they are a participant" on public.chats;
drop policy if exists "Users can see chats they are a participant in or created" on public.chats;

create policy "Users can create chats" 
on public.chats for insert 
with check (auth.role() = 'authenticated');

create policy "Users can see chats they are a participant in or created"
on public.chats for select
using (
  created_by = auth.uid() or
  exists (
    select 1 from public.participants p 
    where p.chat_id = id and p.user_id = auth.uid()
  )
);

-- 3. Reset PARTICIPANTS Policies
drop policy if exists "Users can insert participants" on public.participants;
drop policy if exists "Users can see chats they are a participant in" on public.participants;
drop policy if exists "Users can view all participants in their chats" on public.participants;

create policy "Users can insert participants" 
on public.participants for insert 
with check (auth.role() = 'authenticated');

create policy "Users can view all participants in their chats"
on public.participants for select
using (
  exists (
    select 1 from public.participants p
    where p.chat_id = chat_id 
    and p.user_id = auth.uid()
  )
);
