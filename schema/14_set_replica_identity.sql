-- The table is already in Realtime (Good!)
-- We just need to ensure we receive the Full Update Data
alter table participants replica identity full;
