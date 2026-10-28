
-- Store enrollment inquiries submitted through the website.
create table if not exists public.enrollment_inquiries (
    id bigint generated always as identity primary key,
    full_name text not null,
    phone text not null,
    course text not null check (
        course in (
            'Theory Driving Lessons',
            'Practical Driving Lessons',
            'Driving Test Preparation'
        )
    ),
    message text not null default '',
    status text not null default 'pending' check (
        status in ('pending', 'contacted', 'enrolled', 'rejected')
    ),
    created_at timestamptz not null default now()
);

create index if not exists enrollment_inquiries_created_at_idx
    on public.enrollment_inquiries (created_at desc);
create index if not exists enrollment_inquiries_status_created_at_idx
    on public.enrollment_inquiries (status, created_at desc);

-- Enable Row Level Security.
alter table public.enrollment_inquiries
enable row level security;

-- Website visitors must not read or modify inquiries directly.
revoke all on table public.enrollment_inquiries
from anon, authenticated;

-- Permit the trusted backend service to manage the table.
grant all on table public.enrollment_inquiries to service_role;
