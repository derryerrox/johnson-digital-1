create table if not exists public.jd_site_images (
  image_key text primary key check (image_key ~ '^[a-z0-9][a-z0-9-]{1,79}$'),
  category text not null check (category in ('Homepage', 'Portfolio', 'Industries', 'Services', 'Team', 'Gallery', 'Promotional')),
  title text not null check (char_length(title) between 1 and 120),
  alt_text text not null check (char_length(alt_text) between 1 and 240),
  section_name text not null check (char_length(section_name) between 1 and 120),
  storage_path text unique,
  fallback_url text,
  is_published boolean not null default true,
  updated_at timestamptz not null default now(),
  check (storage_path is not null or fallback_url is not null)
);

alter table public.jd_site_images enable row level security;
revoke all on public.jd_site_images from public, anon, authenticated;
grant all on public.jd_site_images to service_role;

insert into public.jd_site_images (image_key, category, title, alt_text, section_name, fallback_url) values
  ('homepage-hero', 'Homepage', 'Agency hero image', 'Contemporary creative workspace', 'Homepage hero', 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=2200&q=90'),
  ('about-studio', 'Homepage', 'Creative studio', 'Warm, modern creative studio with a thoughtfully arranged workspace', 'About section', 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1200&q=85'),
  ('team-founder', 'Team', 'Johnson Maroko', 'Johnson Maroko, founder and managing director of JOHNSON DIGITAL', 'Founder profile', '/assets/founder-johnson-maroko.png'),
  ('portfolio-hospitality', 'Portfolio', 'Atelier House concept', 'Demonstration concept: contemporary resort hotel', 'Selected work — hospitality', 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1500&q=85'),
  ('portfolio-fashion', 'Portfolio', 'Maison Edit concept', 'Demonstration concept: editorial fashion campaign', 'Selected work — fashion', 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=1000&q=85'),
  ('portfolio-beauty', 'Portfolio', 'Common Ritual concept', 'Demonstration concept: beauty and skincare campaign', 'Selected work — beauty', 'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=1000&q=85'),
  ('industry-real-estate', 'Industries', 'Real estate & property', 'Contemporary luxury home with warm neutral interiors and natural light', 'Industries — Real Estate & Property', 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1500&q=85'),
  ('industry-hospitality', 'Industries', 'Hospitality & tourism', 'Refined resort with a pool and lush tropical landscape', 'Industries — Hospitality & Tourism', 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1100&q=85'),
  ('industry-beauty', 'Industries', 'Beauty, wellness & lifestyle', 'Minimal skincare products styled in a soft, warm studio setting', 'Industries — Beauty, Wellness & Lifestyle', 'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=1100&q=85'),
  ('industry-food', 'Industries', 'Food & beverage', 'Carefully plated restaurant meal in warm natural light', 'Industries — Food & Beverage', 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1500&q=85'),
  ('industry-fashion', 'Industries', 'Fashion & retail', 'Fashion campaign portrait with understated editorial styling', 'Industries — Fashion & Retail', 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=1500&q=85'),
  ('industry-corporate', 'Industries', 'Corporate & professional services', 'Contemporary professional studio with natural light and a warm neutral palette', 'Industries — Corporate & Professional Services', 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1100&q=85'),
  ('industry-education', 'Industries', 'Education & institutions', 'Students learning together in a bright, collaborative classroom', 'Industries — Education & Institutions', 'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?auto=format&fit=crop&w=1100&q=85'),
  ('industry-healthcare', 'Industries', 'Healthcare & medical services', 'Healthcare professional in a bright, modern clinical environment', 'Industries — Healthcare & Medical Services', 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1500&q=85'),
  ('industry-automotive', 'Industries', 'Luxury automotive', 'Premium sports car photographed in a cinematic setting', 'Industries — Luxury Automotive & Private Aviation', 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1100&q=85'),
  ('industry-aviation', 'Industries', 'Private aviation', 'Private aircraft in flight above the clouds', 'Industries — Luxury Automotive & Private Aviation', 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=850&q=85')
on conflict (image_key) do nothing;

create table if not exists public.jd_contact_rate_limits (
  bucket_key text primary key check (char_length(bucket_key) = 64),
  window_started_at timestamptz not null,
  hits integer not null check (hits > 0)
);

alter table public.jd_contact_rate_limits enable row level security;
revoke all on public.jd_contact_rate_limits from public, anon, authenticated;
grant all on public.jd_contact_rate_limits to service_role;

create or replace function public.jd_consume_contact_limit(
  p_bucket_key text,
  p_limit integer default 3,
  p_window_seconds integer default 600
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_hits integer;
begin
  if p_limit < 1 or p_window_seconds < 1 then
    raise exception 'Invalid rate limit parameters';
  end if;

  insert into public.jd_contact_rate_limits (bucket_key, window_started_at, hits)
  values (p_bucket_key, v_now, 1)
  on conflict (bucket_key) do update
  set
    hits = case
      when public.jd_contact_rate_limits.window_started_at <= v_now - make_interval(secs => p_window_seconds) then 1
      else public.jd_contact_rate_limits.hits + 1
    end,
    window_started_at = case
      when public.jd_contact_rate_limits.window_started_at <= v_now - make_interval(secs => p_window_seconds) then v_now
      else public.jd_contact_rate_limits.window_started_at
    end
  returning public.jd_contact_rate_limits.hits into v_hits;

  return v_hits <= p_limit;
end;
$$;

revoke all on function public.jd_consume_contact_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.jd_consume_contact_limit(text, integer, integer) to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'jd-site-images',
  'jd-site-images',
  true,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
