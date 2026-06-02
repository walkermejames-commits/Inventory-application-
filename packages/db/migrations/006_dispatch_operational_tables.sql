create table if not exists dispatch_timers (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  driver_id uuid references driver_profiles(id),
  timer_type text not null,
  status text not null default 'active',
  due_at timestamptz not null,
  fired_at timestamptz,
  escalation_level int not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists operational_events (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references bookings(id) on delete cascade,
  driver_id uuid references driver_profiles(id),
  event_type text not null,
  severity text not null default 'info',
  actor_role text not null,
  title text not null,
  detail text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists intervention_tasks (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references bookings(id) on delete cascade,
  driver_id uuid references driver_profiles(id),
  task_type text not null,
  status text not null default 'open',
  priority text not null default 'normal',
  title text not null,
  detail text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists dispatch_timers_active_due_idx on dispatch_timers(status, due_at);
create index if not exists dispatch_timers_booking_type_status_idx on dispatch_timers(booking_id, timer_type, status);
create index if not exists operational_events_booking_created_idx on operational_events(booking_id, created_at desc);
create index if not exists intervention_tasks_status_priority_idx on intervention_tasks(status, priority, created_at desc);

alter table dispatch_timers enable row level security;
alter table operational_events enable row level security;
alter table intervention_tasks enable row level security;
