-- DABO Finance V1 — paiement atomique d'une facture depuis l'interface Budget.
-- Migration ciblée, réexécutable, sans nouvelle table.

begin;

create or replace function public.pay_finance_bill(
  p_bill_id uuid,
  p_paid_by_member_id uuid,
  p_paid_on date default current_date
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_bill public.finance_bills%rowtype;
  v_actor_member_id uuid;
  v_transaction_id uuid;
begin
  select * into v_bill from public.finance_bills where id = p_bill_id for update;
  if not found then raise exception 'Finance bill not found'; end if;
  if v_bill.status <> 'pending' or v_bill.paid_transaction_id is not null then raise exception 'Finance bill is not pending'; end if;
  if v_bill.amount is null then raise exception 'Finance bill amount is required before payment'; end if;

  select m.id into v_actor_member_id
  from public.members m
  where m.household_id = v_bill.household_id and m.user_id = auth.uid() and m.left_at is null
  limit 1;
  if v_actor_member_id is null then raise exception 'Current user is not an active household member'; end if;
  if not exists (select 1 from public.members m where m.id=p_paid_by_member_id and m.household_id=v_bill.household_id and m.left_at is null) then
    raise exception 'Finance payer must be an active member of the household';
  end if;

  insert into public.finance_transactions(
    household_id, created_by_member_id, paid_by_member_id, amount, currency,
    category, label, occurred_on, source, status, visibility, private_owner_member_id
  ) values (
    v_bill.household_id, v_actor_member_id, p_paid_by_member_id, v_bill.amount, v_bill.currency,
    v_bill.category, v_bill.label, p_paid_on, 'bill_payment', 'posted', v_bill.visibility, v_bill.private_owner_member_id
  ) returning id into v_transaction_id;

  update public.finance_bills set status='paid', paid_transaction_id=v_transaction_id, updated_at=now() where id=v_bill.id;
  return v_transaction_id;
end;
$$;

grant execute on function public.pay_finance_bill(uuid, uuid, date) to authenticated;
commit;
