-- DABO Finance V1 — factures récurrentes mensuelles / annuelles
-- Migration ciblée. Ne supprime aucune donnée existante.
begin;

create or replace function public.finance_clamped_date(p_year int, p_month int, p_day int)
returns date
language sql
immutable
as $$
  select make_date(p_year, p_month, least(p_day, extract(day from (make_date(p_year,p_month,1) + interval '1 month - 1 day'))::int));
$$;

create or replace function public.create_recurring_finance_bill(
  p_household_id uuid,
  p_created_by_member_id uuid,
  p_label text,
  p_category text,
  p_amount numeric,
  p_first_due_on date,
  p_frequency text
) returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_series_id uuid;
  v_due date := p_first_due_on;
  v_until date := p_first_due_on + case when p_frequency='monthly' then interval '18 months' else interval '5 years' end;
  v_anchor_day int := extract(day from p_first_due_on)::int;
  v_anchor_month int := extract(month from p_first_due_on)::int;
begin
  if p_frequency not in ('monthly','yearly') then raise exception 'Unsupported finance recurrence'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Amount must be positive'; end if;

  insert into public.finance_bill_series(
    household_id, created_by_member_id, label, category, expected_amount, currency,
    frequency, day_of_month, month_of_year, active, visibility
  ) values (
    p_household_id, p_created_by_member_id, trim(p_label), p_category, p_amount, 'EUR',
    p_frequency, v_anchor_day, case when p_frequency='yearly' then v_anchor_month else null end, true, 'household'
  ) returning id into v_series_id;

  while v_due <= v_until loop
    insert into public.finance_bills(
      household_id, created_by_member_id, series_id, label, category, amount, currency, due_on, status, visibility
    ) values (
      p_household_id, p_created_by_member_id, v_series_id, trim(p_label), p_category, p_amount, 'EUR', v_due, 'pending', 'household'
    ) on conflict (series_id, due_on) where series_id is not null do nothing;

    if p_frequency='monthly' then
      if extract(month from v_due)::int = 12 then
        v_due := public.finance_clamped_date(extract(year from v_due)::int + 1, 1, v_anchor_day);
      else
        v_due := public.finance_clamped_date(extract(year from v_due)::int, extract(month from v_due)::int + 1, v_anchor_day);
      end if;
    else
      v_due := public.finance_clamped_date(extract(year from v_due)::int + 1, v_anchor_month, v_anchor_day);
    end if;
  end loop;
  return v_series_id;
end;
$$;

grant execute on function public.create_recurring_finance_bill(uuid,uuid,text,text,numeric,date,text) to authenticated;

commit;
