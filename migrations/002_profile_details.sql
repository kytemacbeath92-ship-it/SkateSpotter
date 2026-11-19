alter table profiles add column if not exists full_name text not null default '';
alter table profiles add column if not exists age integer;
alter table profiles add column if not exists city text not null default '';
alter table profiles add column if not exists country text not null default '';
alter table profiles add column if not exists contact text not null default '';
alter table profiles add column if not exists ride text not null default '';
alter table profiles add column if not exists complete boolean not null default false;
