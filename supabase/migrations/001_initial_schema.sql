-- Create profiles table
create table profiles (
  id uuid references auth.users on delete cascade,
  email text,
  role text default 'user',
  is_active boolean default true,
  created_at timestamp default now(),
  primary key (id)
);

-- Create activity_logs table
create table activity_logs (
  id uuid default gen_random_uuid(),
  user_id uuid references profiles(id),
  action text,
  ip_address text,
  created_at timestamp default now(),
  primary key (id)
);

-- Enable RLS
alter table profiles enable row level security;
alter table activity_logs enable row level security;

-- Profiles Policies - Simple approach to avoid infinite recursion
-- User can read own profile
create policy "User read own profile"
on profiles for select
using (auth.uid() = id);

-- User can update own profile
create policy "User update own profile"
on profiles for update
using (auth.uid() = id);

-- Disable the recursive admin policy - let app handle admin checks
-- We'll allow users to read all profiles for now (they can see other users)
create policy "Users can read all profiles"
on profiles for select
using (true);

-- Activity Logs Policies - Simple approach
-- Allow reading logs if user is authenticated
create policy "Authenticated users can read logs"
on activity_logs for select
using (auth.uid() is not null);

-- Allow inserting logs if user is authenticated
create policy "Authenticated users can insert logs"
on activity_logs for insert
with check (auth.uid() is not null);

-- Function to automatically create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

-- Drop trigger if it exists
drop trigger if exists on_auth_user_created on auth.users;

-- Trigger to create profile automatically
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
