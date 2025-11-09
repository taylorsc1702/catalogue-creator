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
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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

-- Approved discount codes (managed by admins)
create table if not exists public.discount_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  label text,
  is_active boolean not null default true,
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_discount_codes_updated_at on public.discount_codes;
create trigger set_discount_codes_updated_at
before update on public.discount_codes
for each row execute procedure public.set_updated_at();

-- Per-user restrictions
create table if not exists public.allowed_domains (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  domain text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists allowed_domains_user_domain_idx
  on public.allowed_domains (user_id, domain);

create table if not exists public.allowed_vendors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  vendor text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists allowed_vendors_user_vendor_idx
  on public.allowed_vendors (user_id, vendor);

create table if not exists public.allowed_discount_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  discount_code_id uuid not null references public.discount_codes on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, discount_code_id)
);

-- Enable Row Level Security
alter table public.profiles enable row level security;
alter table public.catalogues enable row level security;
alter table public.catalogue_permissions enable row level security;
alter table public.discount_codes enable row level security;
alter table public.allowed_domains enable row level security;
alter table public.allowed_vendors enable row level security;
alter table public.allowed_discount_codes enable row level security;

-- Profiles policies
create policy if not exists "profiles self access" on public.profiles
  for select using (id = auth.uid());

create policy if not exists "profiles admins manage" on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

-- Catalogues policies
create policy if not exists "catalogues owners and shared read" on public.catalogues
  for select using (
    public.is_admin()
    or owner_id = auth.uid()
    or exists (
      select 1 from public.catalogue_permissions cp
      where cp.catalogue_id = catalogues.id
        and cp.user_id = auth.uid()
    )
  );

create policy if not exists "catalogues insert self" on public.catalogues
  for insert with check (owner_id = auth.uid() or public.is_admin());

create policy if not exists "catalogues update" on public.catalogues
  for update using (
    public.is_admin()
    or owner_id = auth.uid()
    or exists (
      select 1 from public.catalogue_permissions cp
      where cp.catalogue_id = catalogues.id
        and cp.user_id = auth.uid()
        and cp.permission in ('owner', 'editor')
    )
  );

create policy if not exists "catalogues delete" on public.catalogues
  for delete using (public.is_admin() or owner_id = auth.uid());

-- Catalogue permissions policies
create policy if not exists "catalogue_permissions visibility" on public.catalogue_permissions
  for select using (
    public.is_admin()
    or user_id = auth.uid()
    or exists (
      select 1 from public.catalogues c
      where c.id = catalogue_permissions.catalogue_id
        and c.owner_id = auth.uid()
    )
  );

create policy if not exists "catalogue_permissions insert admin or owner" on public.catalogue_permissions
  for insert with check (
    public.is_admin()
    or exists (
      select 1
      from public.catalogues c
      where c.id = catalogue_permissions.catalogue_id
        and c.owner_id = auth.uid()
    )
  );

create policy if not exists "catalogue_permissions manage admin or owner" on public.catalogue_permissions
  for delete using (
    public.is_admin()
    or exists (
      select 1
      from public.catalogues c
      where c.id = catalogue_permissions.catalogue_id
        and c.owner_id = auth.uid()
    )
  );

-- Discount codes policies
create policy if not exists "discount_codes read" on public.discount_codes
  for select using (is_active);

create policy if not exists "discount_codes manage admins" on public.discount_codes
  for all using (public.is_admin()) with check (public.is_admin());

-- Allowed domains policies
create policy if not exists "allowed_domains self" on public.allowed_domains
  for all using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

-- Allowed vendors policies
create policy if not exists "allowed_vendors self" on public.allowed_vendors
  for all using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

-- Allowed discount codes policies
create policy if not exists "allowed_discount_codes self" on public.allowed_discount_codes
  for all using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

