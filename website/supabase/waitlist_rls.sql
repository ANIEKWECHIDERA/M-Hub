-- Secure the public waitlist table.
--
-- The website writes waitlist rows through server actions using the Supabase
-- service-role key. Visitors should not be able to query or mutate this table
-- directly with the public anon key.

alter table public.waitlist enable row level security;

revoke all on table public.waitlist from anon;
revoke all on table public.waitlist from authenticated;
grant all on table public.waitlist to service_role;
