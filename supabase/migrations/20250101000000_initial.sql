-- Crezo MVP — Supabase (PostgreSQL + Auth)
-- Run via Supabase Dashboard → SQL Editor, or: supabase db push

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enums
CREATE TYPE deal_status AS ENUM (
  'pitched', 'negotiating', 'confirmed', 'in_progress', 'delivered', 'paid'
);

CREATE TYPE content_platform AS ENUM (
  'ig_reel', 'yt_video', 'yt_short', 'story', 'post', 'other'
);

CREATE TYPE content_status AS ENUM (
  'idea', 'scripted', 'shot', 'edited', 'posted'
);

CREATE TYPE invoice_status AS ENUM (
  'draft', 'sent', 'acknowledged', 'paid'
);

CREATE TYPE deliverable_status AS ENUM (
  'raw', 'edited', 'final', 'submitted', 'approved'
);

-- Creators (1:1 with auth.users)
CREATE TABLE public.creators (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL DEFAULT 'Creator',
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  gst_number VARCHAR(20),
  upi_id VARCHAR(50),
  bank_details TEXT,
  media_kit_url VARCHAR(500),
  bio TEXT,
  niche VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE public.brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  contact_person VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(20),
  whatsapp VARCHAR(20),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_brands_creator ON public.brands(creator_id);

CREATE TABLE public.deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  value_inr INTEGER NOT NULL,
  status deal_status NOT NULL DEFAULT 'pitched',
  start_date DATE,
  end_date DATE,
  usage_rights TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_deals_creator ON public.deals(creator_id);
CREATE INDEX idx_deals_status ON public.deals(status);

CREATE TABLE public.content_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  platform content_platform NOT NULL,
  type VARCHAR(50) NOT NULL,
  status content_status NOT NULL DEFAULT 'idea',
  scheduled_date DATE NOT NULL,
  deal_id UUID REFERENCES public.deals(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_content_slots_creator ON public.content_slots(creator_id);
CREATE INDEX idx_content_slots_scheduled ON public.content_slots(scheduled_date);

CREATE TABLE public.deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  platform content_platform NOT NULL,
  due_date DATE,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  content_slot_id UUID REFERENCES public.content_slots(id) ON DELETE SET NULL,
  title VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_deliverables_deal ON public.deliverables(deal_id);

CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  gst_amount INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL,
  status invoice_status NOT NULL DEFAULT 'draft',
  sent_date DATE,
  paid_date DATE,
  pdf_url VARCHAR(500),
  gstin VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_invoices_creator ON public.invoices(creator_id);

CREATE TABLE public.assets_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES public.deals(id) ON DELETE SET NULL,
  device_asset_id VARCHAR(255) NOT NULL,
  device_album_name VARCHAR(255),
  platform content_platform NOT NULL,
  deliverable_status deliverable_status NOT NULL DEFAULT 'raw',
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX idx_assets_device_creator ON public.assets_metadata(creator_id, device_asset_id);

CREATE TABLE public.contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  file_url VARCHAR(500) NOT NULL,
  signed_date DATE,
  expiry_date DATE,
  usage_platforms TEXT[],
  whitelisting_allowed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Auto-create creator row on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.creators (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(COALESCE(NEW.email, 'user'), '@', 1)),
    COALESCE(NEW.email, '')
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- updated_at helper
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER creators_updated_at BEFORE UPDATE ON public.creators
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER brands_updated_at BEFORE UPDATE ON public.brands
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER deals_updated_at BEFORE UPDATE ON public.deals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER content_slots_updated_at BEFORE UPDATE ON public.content_slots
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER deliverables_updated_at BEFORE UPDATE ON public.deliverables
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER invoices_updated_at BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER assets_metadata_updated_at BEFORE UPDATE ON public.assets_metadata
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE public.creators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "creators_select_own" ON public.creators FOR SELECT USING (auth.uid() = id);
CREATE POLICY "creators_update_own" ON public.creators FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "brands_all_own" ON public.brands FOR ALL USING (auth.uid() = creator_id);

CREATE POLICY "deals_all_own" ON public.deals FOR ALL USING (auth.uid() = creator_id);

CREATE POLICY "content_slots_all_own" ON public.content_slots FOR ALL USING (auth.uid() = creator_id);

CREATE POLICY "deliverables_all_own" ON public.deliverables FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.deals d WHERE d.id = deliverables.deal_id AND d.creator_id = auth.uid())
  );

CREATE POLICY "invoices_all_own" ON public.invoices FOR ALL USING (auth.uid() = creator_id);

CREATE POLICY "assets_all_own" ON public.assets_metadata FOR ALL USING (auth.uid() = creator_id);

CREATE POLICY "contracts_all_own" ON public.contracts FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.deals d WHERE d.id = contracts.deal_id AND d.creator_id = auth.uid())
  );
