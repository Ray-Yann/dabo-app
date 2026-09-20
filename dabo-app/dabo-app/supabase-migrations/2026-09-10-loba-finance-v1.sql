-- DABO — LOBA ↔ Finance V1
-- Migration ciblée. Ne jamais exécuter supabase-schema.sql en production.
-- Le paiement est atomique, verrouille la facture et refuse une proposition devenue obsolète.

begin;

create or replace function public.loba_pay_finance_bill(
  p_bill_id uuid,
  p_actor_member_id uuid,
  p_actor_user_id uuid,
  p_paid_by_member_id uuid,
  p_paid_on date,
  p_expected_updated_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bill public.finance_bills%rowtype;
  v_transaction_id uuid;
begin
  if p_paid_on is null then raise exception 'Payment date is required'; end if;

  select * into v_bill
  from public.finance_bills
  where id = p_bill_id
  for update;

  if not found then raise exception 'Finance bill not found'; end if;
  if v_bill.status <> 'pending' or v_bill.paid_transaction_id is not null then
    raise exception 'Finance bill is not pending';
  end if;
  if v_bill.amount is null then raise exception 'Finance bill amount is required before payment'; end if;
  if v_bill.updated_at is distinct from p_expected_updated_at then
    raise exception 'Finance bill changed since LOBA proposal';
  end if;

  if not exists (
    select 1 from public.members m
    where m.id = p_actor_member_id
      and m.household_id = v_bill.household_id
      and m.user_id = p_actor_user_id
      and m.left_at is null
  ) then raise exception 'LOBA actor must be an active household member'; end if;

  if not exists (
    select 1 from public.members m
    where m.id = p_paid_by_member_id
      and m.household_id = v_bill.household_id
      and m.left_at is null
  ) then raise exception 'Finance payer must be an active household member'; end if;

  if v_bill.visibility = 'private' and v_bill.private_owner_member_id is distinct from p_actor_member_id then
    raise exception 'Private finance bill does not belong to LOBA actor';
  end if;

  insert into public.finance_transactions(
    household_id, created_by_member_id, paid_by_member_id, amount, currency,
    category, label, occurred_on, source, status, visibility, private_owner_member_id
  ) values (
    v_bill.household_id, p_actor_member_id, p_paid_by_member_id, v_bill.amount, v_bill.currency,
    v_bill.category, v_bill.label, p_paid_on, 'bill_payment', 'posted', v_bill.visibility, v_bill.private_owner_member_id
  ) returning id into v_transaction_id;

  update public.finance_bills
  set status = 'paid', paid_transaction_id = v_transaction_id, updated_at = now()
  where id = v_bill.id;

  return v_transaction_id;
end;
$$;

revoke all on function public.loba_pay_finance_bill(uuid,uuid,uuid,uuid,date,timestamptz) from public;
revoke all on function public.loba_pay_finance_bill(uuid,uuid,uuid,uuid,date,timestamptz) from anon;
revoke all on function public.loba_pay_finance_bill(uuid,uuid,uuid,uuid,date,timestamptz) from authenticated;
grant execute on function public.loba_pay_finance_bill(uuid,uuid,uuid,uuid,date,timestamptz) to service_role;

commit;
