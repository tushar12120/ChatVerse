-- ========================================
-- MASTER DATABASE FIX (Run This Completely)
-- ========================================

-- 1. Create Helper Function (Bypasses RLS Recursion)
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

-- 2. Add created_by to chats (if missing)
do $$ 
begin
    if not exists (select 1 from information_schema.columns where table_name = 'chats' and column_name = 'created_by') then
        alter table public.chats add column created_by uuid default auth.uid();
    end if;
end $$;

-- 3. Add last_read_at to participants (if missing)
do $$ 
begin
    if not exists (select 1 from information_schema.columns where table_name = 'participants' and column_name = 'last_read_at') then
        alter table public.participants add column last_read_at timestamptz default now();
    end if;
end $$;

-- 4. CHATS Policies
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
  is_chat_member(id)
);

-- 5. PARTICIPANTS Policies
drop policy if exists "Users can insert participants" on public.participants;
drop policy if exists "Users can see chats they are a participant in" on public.participants;
drop policy if exists "Users can view all participants in their chats" on public.participants;

create policy "Users can insert participants" 
on public.participants for insert 
with check (auth.role() = 'authenticated');

create policy "Users can view all participants in their chats"
on public.participants for select
using (
  is_chat_member(chat_id)
);

-- Allow updating last_read_at
drop policy if exists "Users can update their own participant row" on public.participants;
create policy "Users can update their own participant row"
on public.participants for update
using (user_id = auth.uid());

-- 6. Mark Chat Read Function
create or replace function mark_chat_read(_chat_id uuid)
returns void as $$
begin
  update public.participants
  set last_read_at = now()
  where chat_id = _chat_id
  and user_id = auth.uid();
end;
$$ language plpgsql security definer;

-- 7. Get Existing Chat Function
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
      count(*) = (case when auth.uid() = other_user_id then 1 else 2 end)
      and bool_or(p.user_id = auth.uid())
      and bool_or(p.user_id = other_user_id)
  limit 1;
  
  return _chat_id;
end;
$$ language plpgsql security definer;

-- 8. Messages Policies (Ensure users can see/insert messages in their chats)
drop policy if exists "Users can view messages in chats they belong to" on public.messages;
drop policy if exists "Users can insert messages in chats they belong to" on public.messages;

create policy "Users can view messages in chats they belong to"
on public.messages for select
using (is_chat_member(chat_id));

create policy "Users can insert messages in chats they belong to"
on public.messages for insert
with check (is_chat_member(chat_id) and sender_id = auth.uid());

-- Done!
