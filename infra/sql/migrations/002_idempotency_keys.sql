create table if not exists idempotency_keys (
  scope text not null,
  idempotency_key text not null,
  status_code integer not null,
  response_json jsonb not null,
  created_at timestamptz not null default current_timestamp,
  primary key (scope, idempotency_key)
);

create index if not exists idempotency_keys_created_at_idx on idempotency_keys(created_at);
