-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- Role type for catalogue sharing
create type public.catalogue_permission as enum ('owner', 'editor', 'viewer');

-- Profiles table mirrors auth.users metadata
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text,
  avatar_url text,
  role text not null default 'general' check (role in ('admin', 'general')),
  default_domain text,
  can_domain_woodslane boolean not null default false,
  can_domain_press boolean not null default false,
  can_domain_health boolean not null default false,
  can_domain_education boolean not null default false,
  allowed_vendors text[],
  discount_code_setting text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_role_idx on public.profiles (role);

-- Automatically keep updated_at in sync
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute procedure public.set_updated_at();

-- Auto-create profile for new auth user
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer
set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Helper to check if current user is admin
create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

-- Catalogue storage
create table if not exists public.catalogues (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users on delete cascade,
  name text not null,
  description text,
  layout jsonb,
  branding jsonb,
  items jsonb,
  settings jsonb,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.catalogues
  add column if not exists settings jsonb;

create index if not exists catalogues_owner_idx on public.catalogues (owner_id);
create index if not exists catalogues_is_archived_idx on public.catalogues (is_archived);

drop trigger if exists set_catalogues_updated_at on public.catalogues;
create trigger set_catalogues_updated_at
before update on public.catalogues
for each row execute procedure public.set_updated_at();

-- Shared catalogue permissions
create table if not exists public.catalogue_permissions (
  catalogue_id uuid not null references public.catalogues on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  permission public.catalogue_permission not null default 'viewer',
  created_at timestamptz not null default now(),
  primary key (catalogue_id, user_id)
);

create index if not exists catalogue_permissions_user_idx on public.catalogue_permissions (user_id);

drop table if exists public.discount_codes;
-- Deprecated helper tables (retired in favour of profile flags)
drop table if exists public.allowed_discount_codes;
drop table if exists public.allowed_vendors;
drop table if exists public.allowed_domains;

-- Enable Row Level Security
alter table public.profiles enable row level security;
alter table public.catalogues enable row level security;
alter table public.catalogue_permissions enable row level security;

drop policy if exists "profiles self access" on public.profiles;
create policy "profiles self access" on public.profiles
  for select using (id = auth.uid());

drop policy if exists "profiles admins manage" on public.profiles;
create policy "profiles admins manage" on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

-- Catalogues policies
drop policy if exists "catalogues owners and shared read" on public.catalogues;
create policy "catalogues owners and shared read" on public.catalogues
  for select using (
    public.is_admin()
    or owner_id = auth.uid()
  );

drop policy if exists "catalogues insert self" on public.catalogues;
create policy "catalogues insert self" on public.catalogues
  for insert with check (owner_id = auth.uid() or public.is_admin());

drop policy if exists "catalogues update" on public.catalogues;
create policy "catalogues update" on public.catalogues
  for update using (
    public.is_admin()
    or owner_id = auth.uid()
  );

drop policy if exists "catalogues delete" on public.catalogues;
create policy "catalogues delete" on public.catalogues
  for delete using (public.is_admin() or owner_id = auth.uid());

-- Catalogue permissions policies
drop policy if exists "catalogue_permissions visibility" on public.catalogue_permissions;
create policy "catalogue_permissions visibility" on public.catalogue_permissions
  for select using (
    public.is_admin()
    or user_id = auth.uid()
  );

drop policy if exists "catalogue_permissions insert admin or owner" on public.catalogue_permissions;
create policy "catalogue_permissions insert admin or owner" on public.catalogue_permissions
  for insert with check (public.is_admin());

drop policy if exists "catalogue_permissions manage admin or owner" on public.catalogue_permissions;
create policy "catalogue_permissions manage admin or owner" on public.catalogue_permissions
  for delete using (public.is_admin());

