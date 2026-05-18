-- =====================================================
-- SPACE COAST EVENTS — Supabase Schema
-- Run this in your Supabase SQL editor
-- =====================================================

-- EVENTS table
create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  start_date timestamptz not null,
  end_date timestamptz,
  location_name text,
  address text,
  city text default 'Melbourne',
  state text default 'FL',
  category text check (category in (
    'Networking', 'Community', 'Health & Wellness',
    'Arts & Culture', 'Business', 'Music & Entertainment',
    'Food & Drink', 'Outdoors', 'Education', 'Other'
  )),
  tags text[],
  image_url text,
  event_url text,
  source_id uuid references sources(id) on delete set null,
  source_name text,
  is_free boolean default false,
  cost_info text,
  status text default 'published' check (status in ('published', 'pending', 'rejected')),
  submitted_by text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- SOURCES table (sites to scrape)
create table if not exists sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  url text not null unique,
  scraper_type text default 'generic' check (scraper_type in (
    'generic', 'ical', 'rss', 'facebook_page', 'manual'
  )),
  -- JSON selectors for custom scraping: { "title": ".event-title", "date": ".event-date", ... }
  css_selectors jsonb,
  is_active boolean default true,
  last_scraped_at timestamptz,
  last_scrape_status text,
  created_at timestamptz default now()
);

-- SUBMISSIONS table (community-submitted events, go through approval)
create table if not exists submissions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  start_date timestamptz not null,
  end_date timestamptz,
  location_name text,
  address text,
  city text,
  category text,
  event_url text,
  is_free boolean default false,
  cost_info text,
  submitter_name text,
  submitter_email text,
  status text default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_at timestamptz,
  created_at timestamptz default now()
);

-- INDEXES for performance
create index if not exists events_start_date_idx on events(start_date);
create index if not exists events_category_idx on events(category);
create index if not exists events_status_idx on events(status);
create index if not exists events_city_idx on events(city);

-- Enable Row Level Security
alter table events enable row level security;
alter table sources enable row level security;
alter table submissions enable row level security;

-- Public can read published events
create policy "Public events are viewable" on events
  for select using (status = 'published');

-- Public can insert submissions
create policy "Anyone can submit events" on submissions
  for insert with check (true);

-- Public can read sources (for transparency)
create policy "Sources are viewable" on sources
  for select using (true);

-- =====================================================
-- SEED DATA — Sample sources to get you started
-- =====================================================
insert into sources (name, url, scraper_type, is_active) values
  ('Brevard Chamber of Commerce', 'https://www.brevardbusiness.org/events', 'generic', true),
  ('Melbourne Regional Chamber', 'https://www.melbourneregionalchamber.com/events', 'generic', true),
  ('Cocoa Beach Chamber', 'https://www.cocoabeachchamber.com/events', 'generic', true),
  ('Groundswell', 'https://www.groundswellcowork.com/events', 'generic', true),
  ('Eastern Florida State College', 'https://www.easternflorida.edu/community-resources/events', 'generic', true),
  ('City of Melbourne Events', 'https://www.melbourneflorida.org/events', 'generic', true)
on conflict (url) do nothing;
