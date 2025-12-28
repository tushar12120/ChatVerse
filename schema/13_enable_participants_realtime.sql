-- Enable Realtime for Participants (for Read Receipts)
alter publication supabase_realtime add table participants;

-- Ensure replica identity is set so we get the updated data
alter table participants replica identity full;
