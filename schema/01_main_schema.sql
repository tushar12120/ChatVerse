-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. PROFILES (Extends auth.users)
create table public.profiles (
  id uuid references auth.users(id) on delete cascade not null primary key,
  email text,
  full_name text,
  mobile_number text,
  avatar_url text,
  status text default 'Hey there! I am using ChatVerse.',
  last_seen timestamptz default now(),
  updated_at timestamptz default now()
);

-- Turn on RLS
alter table public.profiles enable row level security;

-- Policies for Profiles
create policy "Public profiles are viewable by everyone" 
on public.profiles for select using (true);

create policy "Users can update own profile" 
on public.profiles for update using (auth.uid() = id);

-- 2. CHATS (Conversations)
create table public.chats (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamptz default now(),
  type text default 'private', -- 'private' or 'group'
  name text, -- NULL for private chats
  image_url text
);

alter table public.chats enable row level security;

-- 3. PARTICIPANTS (Link Users to Chats)
create table public.participants (
  chat_id uuid references public.chats(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  role text default 'member', -- 'admin', 'member'
  joined_at timestamptz default now(),
  primary key (chat_id, user_id)
);

alter table public.participants enable row level security;

-- Policies for Participants
create policy "Users can see chats they are a participant in"
on public.participants for select
using (auth.uid() = user_id);

create policy "Users can see chat details if they are a participant"
on public.chats for select
using (exists (
  select 1 from public.participants p 
  where p.chat_id = id and p.user_id = auth.uid()
));

-- 4. MESSAGES
create table public.messages (
  id uuid default uuid_generate_v4() primary key,
  chat_id uuid references public.chats(id) on delete cascade not null,
  sender_id uuid references public.profiles(id) on delete cascade not null,
  content text,
  type text default 'text', -- 'text', 'image', 'video', 'file'
  created_at timestamptz default now(),
  read_by jsonb default '[]'::jsonb -- Array of user_ids who read the message
);

alter table public.messages enable row level security;

-- Policies for Messages
create policy "Users can view messages in chats they belong to"
on public.messages for select
using (exists (
  select 1 from public.participants p
  where p.chat_id = chat_id and p.user_id = auth.uid()
));

create policy "Users can insert messages in chats they belong to"
on public.messages for insert
with check (exists (
  select 1 from public.participants p
  where p.chat_id = chat_id and p.user_id = auth.uid()
));

-- 5. AUTOMATIC PROFILE CREATION TRIGGER
-- This triggers when a new user signs up via Supabase Auth
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, mobile_number)
  values (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'mobile_number'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 6. STORAGE BUCKETS (Optional setup via SQL, usually done in dashboard)
-- insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true);
-- insert into storage.buckets (id, name, public) values ('chat-media', 'chat-media', true);
