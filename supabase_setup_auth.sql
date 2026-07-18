-- Upewnijmy się, że tabela 'profiles' istnieje, lub dodajmy do niej brakujące kolumny
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Dodanie brakujących kolumn (nie wyrzucą błędu, jeśli już istnieją, ale trzeba uważać w standardowym PostgreSQL, użyjemy add column if not exists w oddzielnych poleceniach)
alter table public.profiles add column if not exists username text unique;
alter table public.profiles add column if not exists country text;
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists avatar_url text;

-- Włączenie Row Level Security (RLS) dla bezpieczeństwa
alter table public.profiles enable row level security;

-- Poniższe polisy mogły już istnieć, dlatego najlepiej je zignorować jeśli wyskoczy błąd,
-- albo upuścić stare przed ich dodaniem. (Supabase zignoruje lub rzuci mały błąd).
do $$
begin
    drop policy if exists "Public profiles are viewable by everyone." on public.profiles;
    drop policy if exists "Users can insert their own profile." on public.profiles;
    drop policy if exists "Users can update own profile." on public.profiles;
end $$;

create policy "Public profiles are viewable by everyone."
  on public.profiles for select
  using ( true );

create policy "Users can insert their own profile."
  on public.profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile."
  on public.profiles for update
  using ( auth.uid() = id );

-- Funkcja i trigger do automatycznego tworzenia profilu przy rejestracji
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, username, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'user_name', new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Dodanie kolumny 'submitted_by' do tabeli figures (jeśli nie istnieje) i powiązanie z profiles
alter table public.figures add column if not exists submitted_by uuid references public.profiles(id);
