-- Quem criou e quem alterou por último cada proposta

alter table proposals add column if not exists created_by jsonb;
alter table proposals add column if not exists updated_by jsonb;

create or replace function save_proposal(p jsonb)
returns void
language plpgsql
security invoker
as $$
declare
  pid uuid := (p->>'id')::uuid;
begin
  insert into proposals as t (
    id, status, template_id, client_name, company_name, cnpj, city, state, segment, stations, cnpjs,
    contact_role, contact_email, contact_phone, client_logo, title, product, proposal_date, valid_until,
    executive_id, executive, cover_title, cover_subtitle, cover_image, cases_title, cases_subtitle,
    roi, closing, sections, bureau, created_by, updated_by, created_at, updated_at
  ) values (
    pid, p->>'status', p->>'template_id', p->>'client_name', p->>'company_name', p->>'cnpj', p->>'city',
    p->>'state', p->>'segment', (p->>'stations')::int, (p->>'cnpjs')::int, p->>'contact_role',
    p->>'contact_email', p->>'contact_phone', p->>'client_logo', p->>'title', p->>'product',
    nullif(p->>'proposal_date','')::date, p->>'valid_until', nullif(p->>'executive_id',''), p->'executive',
    p->>'cover_title', p->>'cover_subtitle', p->>'cover_image', p->>'cases_title', p->>'cases_subtitle',
    p->'roi', p->'closing', p->'sections', coalesce(p->'bureau', '{}'::jsonb), p->'created_by', p->'updated_by', coalesce((p->>'created_at')::timestamptz, now()), now()
  )
  on conflict (id) do update set
    status = excluded.status, template_id = excluded.template_id, client_name = excluded.client_name,
    company_name = excluded.company_name, cnpj = excluded.cnpj, city = excluded.city, state = excluded.state,
    segment = excluded.segment, stations = excluded.stations, cnpjs = excluded.cnpjs,
    contact_role = excluded.contact_role, contact_email = excluded.contact_email,
    contact_phone = excluded.contact_phone, client_logo = excluded.client_logo, title = excluded.title,
    product = excluded.product, proposal_date = excluded.proposal_date, valid_until = excluded.valid_until,
    executive_id = excluded.executive_id, executive = excluded.executive, cover_title = excluded.cover_title,
    cover_subtitle = excluded.cover_subtitle, cover_image = excluded.cover_image,
    cases_title = excluded.cases_title, cases_subtitle = excluded.cases_subtitle, roi = excluded.roi,
    closing = excluded.closing, sections = excluded.sections, bureau = excluded.bureau,
    created_by = coalesce(t.created_by, excluded.created_by), updated_by = excluded.updated_by, updated_at = now();

  insert into proposal_scenarios (proposal_id, title, subtitle, current_operation, body, challenges, opportunities)
  select pid, s->>'title', s->>'subtitle', s->>'current_operation', s->>'body', s->'challenges', s->'opportunities'
  from (select p->'scenario' as s) x
  on conflict (proposal_id) do update set
    title = excluded.title, subtitle = excluded.subtitle, current_operation = excluded.current_operation,
    body = excluded.body, challenges = excluded.challenges, opportunities = excluded.opportunities;

  insert into proposal_projects (proposal_id, title, subtitle, objective, strategy, description, module_ids)
  select pid, s->>'title', s->>'subtitle', s->>'objective', s->>'strategy', s->>'description', s->'module_ids'
  from (select p->'project' as s) x
  on conflict (proposal_id) do update set
    title = excluded.title, subtitle = excluded.subtitle, objective = excluded.objective,
    strategy = excluded.strategy, description = excluded.description, module_ids = excluded.module_ids;

  insert into proposal_investments (
    proposal_id, stations, implementation_price, implementation_first, implementation_additional, implementation_discount_type, implementation_discount_value,
    implementation_discount, implementation_final, implementation_free, monthly_price, monthly_discount_type,
    monthly_discount_value, monthly_discount, monthly_final, custom_discounts, consumption, note
  )
  select pid, (s->>'stations')::int, (s->>'implementation_price')::numeric, (s->>'implementation_first')::numeric,
    (s->>'implementation_additional')::numeric, s->>'implementation_discount_type',
    (s->>'implementation_discount_value')::numeric, (s->>'implementation_discount')::numeric,
    (s->>'implementation_final')::numeric, (s->>'implementation_free')::boolean, (s->>'monthly_price')::numeric,
    s->>'monthly_discount_type', (s->>'monthly_discount_value')::numeric, (s->>'monthly_discount')::numeric,
    (s->>'monthly_final')::numeric, s->'custom_discounts', s->'consumption', s->>'note'
  from (select p->'investment' as s) x
  on conflict (proposal_id) do update set
    stations = excluded.stations, implementation_price = excluded.implementation_price,
    implementation_first = excluded.implementation_first, implementation_additional = excluded.implementation_additional,
    implementation_discount_type = excluded.implementation_discount_type,
    implementation_discount_value = excluded.implementation_discount_value,
    implementation_discount = excluded.implementation_discount, implementation_final = excluded.implementation_final,
    implementation_free = excluded.implementation_free, monthly_price = excluded.monthly_price,
    monthly_discount_type = excluded.monthly_discount_type, monthly_discount_value = excluded.monthly_discount_value,
    monthly_discount = excluded.monthly_discount, monthly_final = excluded.monthly_final,
    custom_discounts = excluded.custom_discounts, consumption = excluded.consumption, note = excluded.note;

  delete from proposal_modules where proposal_id = pid;
  insert into proposal_modules (id, proposal_id, module_id, name, description, table_price, discount, final_price, included, sort_order)
  select (m->>'id')::uuid, pid, nullif(m->>'module_id',''), m->>'name', m->>'description',
    (m->>'table_price')::numeric, (m->>'discount')::numeric, (m->>'final_price')::numeric,
    (m->>'included')::boolean, (ord - 1)::int
  from jsonb_array_elements(p->'modules') with ordinality as t(m, ord);

  delete from proposal_cases where proposal_id = pid;
  insert into proposal_cases (proposal_id, case_id, "order")
  select pid, c #>> '{}', (ord - 1)::int
  from jsonb_array_elements(p->'case_ids') with ordinality as t(c, ord);
end;
$$;

