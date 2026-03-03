create table if not exists users (
  id uuid primary key,
  email text not null unique,
  password_hash text not null,
  display_name text not null,
  created_at timestamptz not null default current_timestamp,
  updated_at timestamptz not null default current_timestamp
);

create table if not exists games (
  id text primary key,
  title text not null,
  status text not null,
  created_at timestamptz not null default current_timestamp
);

create table if not exists decks (
  id uuid primary key,
  game_id text not null references games(id) on delete cascade,
  language_code text not null,
  title text not null,
  description text,
  version text not null,
  created_at timestamptz not null default current_timestamp
);

create index if not exists decks_game_id_idx on decks(game_id);
create index if not exists decks_language_code_idx on decks(language_code);

create table if not exists cards (
  id uuid primary key,
  deck_id uuid not null references decks(id) on delete cascade,
  term text not null,
  image_path text,
  audio_path text,
  tags text[] not null default '{}',
  created_at timestamptz not null default current_timestamp
);

create index if not exists cards_deck_id_idx on cards(deck_id);

create table if not exists user_deck_progress (
  user_id uuid not null references users(id) on delete cascade,
  deck_id uuid not null references decks(id) on delete cascade,
  last_index integer not null default 0,
  known_count integer not null default 0,
  updated_at timestamptz not null default current_timestamp,
  primary key (user_id, deck_id)
);

create table if not exists user_known_cards (
  user_id uuid not null references users(id) on delete cascade,
  deck_id uuid not null references decks(id) on delete cascade,
  card_id uuid not null references cards(id) on delete cascade,
  known_at timestamptz not null default current_timestamp,
  primary key (user_id, card_id)
);

create index if not exists user_known_cards_deck_idx on user_known_cards(user_id, deck_id);

create table if not exists user_points (
  user_id uuid primary key references users(id) on delete cascade,
  total_points integer not null default 0,
  updated_at timestamptz not null default current_timestamp
);

create table if not exists user_game_points (
  user_id uuid not null references users(id) on delete cascade,
  game_id text not null references games(id) on delete cascade,
  points integer not null default 0,
  updated_at timestamptz not null default current_timestamp,
  primary key (user_id, game_id)
);

create table if not exists sessions (
  id uuid primary key,
  game_id text not null references games(id) on delete cascade,
  mode text not null,
  state_json jsonb not null,
  version integer not null default 1,
  updated_at timestamptz not null default current_timestamp
);

create table if not exists auth_refresh_sessions (
  token_hash text primary key,
  user_id uuid not null references users(id) on delete cascade,
  expires_at timestamptz not null,
  revoked_at timestamptz
);

create index if not exists auth_refresh_sessions_user_id_idx on auth_refresh_sessions(user_id);

