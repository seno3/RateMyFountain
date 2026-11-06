-- A fountain becomes verified once it has >= 2 confirmations, or >= 2 ratings,
-- from users other than its creator. See SPEC.md §4.
--
-- security definer: the trigger has to count other users' rows and update fountains,
-- which normal clients can't do under RLS.

create function public.refresh_fountain_verified() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  creator uuid;
begin
  select created_by into creator from public.fountains where id = new.fountain_id;

  if (
    select count(*) from public.fountain_confirmations c
    where c.fountain_id = new.fountain_id and c.user_id is distinct from creator
  ) >= 2
  or (
    select count(*) from public.ratings r
    where r.fountain_id = new.fountain_id and r.user_id is distinct from creator
  ) >= 2
  then
    update public.fountains set verified = true
    where id = new.fountain_id and not verified;
  end if;

  return null;
end;
$$;

create trigger confirmations_refresh_verified
  after insert on public.fountain_confirmations
  for each row execute function public.refresh_fountain_verified();

create trigger ratings_refresh_verified
  after insert on public.ratings
  for each row execute function public.refresh_fountain_verified();
