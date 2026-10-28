-- Learning videos use the existing stable course IDs returned by the API.
create table if not exists public.course_videos (
    id bigint generated always as identity primary key,
    course_id bigint not null check (course_id in (1, 2, 3)),
    title text not null check (char_length(title) between 1 and 200),
    description text not null default '',
    source_type text not null check (source_type in ('youtube', 'direct')),
    video_url text not null,
    thumbnail_url text,
    is_published boolean not null default false,
    display_order integer not null default 0 check (display_order >= 0),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists course_videos_course_order_idx
    on public.course_videos (course_id, display_order, created_at);
create index if not exists course_videos_published_idx
    on public.course_videos (is_published, course_id, display_order);

alter table public.course_videos enable row level security;
revoke all on table public.course_videos from anon, authenticated;
grant all on table public.course_videos to service_role;

create or replace function public.set_course_videos_updated_at()
returns trigger language plpgsql as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists course_videos_updated_at on public.course_videos;
create trigger course_videos_updated_at
before update on public.course_videos
for each row execute function public.set_course_videos_updated_at();
