-- Ensure Users can update their own profile
drop policy if exists "Users can update own profile" on public.profiles;

create policy "Users can update own profile"
on public.profiles for update
using ( auth.uid() = id );
