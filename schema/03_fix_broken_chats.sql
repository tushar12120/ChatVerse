-- Identify chats where the creator is not a participant (Zombie chats from previous RLS failure)
-- And insert them into participants table

insert into public.participants (chat_id, user_id)
select id, created_by 
from public.chats 
where created_by is not null
and id not in (
  select chat_id from public.participants
);

-- Note: The above assumes 'created_by' is populated. 
-- For older chats before the column was added, it might be null.
-- In that case, we might need to purge them or ignore them.

-- Optional: Delete completely empty chats if created_by is null
delete from public.chats 
where created_by is null 
and id not in (select chat_id from public.participants);
