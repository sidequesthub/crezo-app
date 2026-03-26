-- Domain: Invoices (Invoicing & Payments)

create table if not exists invoices (
  id uuid primary key default uuid_generate_v4(),
  creator_id uuid references creators(id) on delete cascade not null,
  deal_id uuid references deals(id) on delete set null,
  brand_id uuid references brands(id) on delete set null,
  amount numeric not null default 0,
  gst_amount numeric not null default 0,
  total numeric not null default 0,
  status text not null default 'draft'
    check (status in ('draft','sent','acknowledged','paid')),
  gstin text,
  sent_date date,
  paid_date date,
  pdf_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table invoices enable row level security;

create policy "invoices_all" on invoices for all
  using (creator_id in (select id from creators where user_id = auth.uid()))
  with check (creator_id in (select id from creators where user_id = auth.uid()));

create trigger set_updated_at before update on invoices
  for each row execute function public.set_updated_at();
