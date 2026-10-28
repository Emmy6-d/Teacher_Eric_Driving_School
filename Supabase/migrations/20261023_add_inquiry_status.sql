-- Safe, repeatable migration for existing inquiry installations.
-- Existing rows receive `pending`; the default and constraint apply to future writes.
alter table public.enrollment_inquiries
    add column if not exists status text not null default 'pending';

do $$
begin
    if not exists (
        select 1 from pg_constraint
        where conrelid = 'public.enrollment_inquiries'::regclass
          and conname = 'enrollment_inquiries_status_allowed'
    ) then
        alter table public.enrollment_inquiries
            add constraint enrollment_inquiries_status_allowed
            check (status in ('pending', 'contacted', 'enrolled', 'rejected')) not valid;
    end if;
end $$;

create index if not exists enrollment_inquiries_created_at_idx
    on public.enrollment_inquiries (created_at desc);
create index if not exists enrollment_inquiries_status_created_at_idx
    on public.enrollment_inquiries (status, created_at desc);

alter table public.enrollment_inquiries enable row level security;
revoke all on table public.enrollment_inquiries from anon, authenticated;
grant all on table public.enrollment_inquiries to service_role;

-- Once any legacy status values have been reviewed and corrected, validate with:
-- alter table public.enrollment_inquiries
--   validate constraint enrollment_inquiries_status_allowed;
