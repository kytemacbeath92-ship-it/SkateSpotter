create table if not exists spots (
  id text primary key,
  lat double precision not null,
  lng double precision not null,
  street_address text not null default '',
  building_name text,
  common_name text,
  common_name_logged_by text,
  description text not null default '',
  created_by text not null,
  created_by_name text not null default '',
  created_at timestamptz not null default now(),
  cover_photo_id text,
  pending_cover_photo_id text
);

create table if not exists photos (
  id text primary key,
  spot_id text not null references spots(id) on delete cascade,
  kind text not null check (kind in ('spot', 'trick')),
  mime_type text not null,
  bytes bytea not null,
  caption text not null default '',
  created_by text not null,
  created_by_name text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists likes (
  photo_id text not null references photos(id) on delete cascade,
  user_id text not null,
  created_at timestamptz not null default now(),
  primary key (photo_id, user_id)
);

create table if not exists comments (
  id text primary key,
  photo_id text not null references photos(id) on delete cascade,
  user_id text not null,
  user_name text not null default '',
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists common_name_logs (
  id text primary key,
  spot_id text not null references spots(id) on delete cascade,
  name text not null,
  user_id text not null,
  user_name text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists profiles (
  user_id text primary key,
  display_name text not null,
  updated_at timestamptz not null default now()
);

create index if not exists photos_spot_kind_idx on photos (spot_id, kind, created_at desc);
create index if not exists comments_photo_idx on comments (photo_id, created_at);
create index if not exists spots_created_idx on spots (created_at desc);
create index if not exists likes_photo_idx on likes (photo_id);
