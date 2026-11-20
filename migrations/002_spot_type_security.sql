alter table spots add column if not exists spot_type text not null default '';
alter table spots add column if not exists security text not null default '';
