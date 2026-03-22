-- Crezo Phase 1 MVP — PostgreSQL Schema
-- Run against your PostgreSQL instance (e.g. on Raspberry Pi)

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Creators
CREATE TABLE creators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(20),
  gst_number VARCHAR(20),
  upi_id VARCHAR(50),
  bank_details TEXT,
  media_kit_url VARCHAR(500),
  bio TEXT,
  niche VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Brands
CREATE TABLE brands (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  contact_person VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(20),
  whatsapp VARCHAR(20),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_brands_creator ON brands(creator_id);

-- Deals
CREATE TYPE deal_status AS ENUM (
  'pitched', 'negotiating', 'confirmed', 'in_progress', 'delivered', 'paid'
);

CREATE TABLE deals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  value_inr INTEGER NOT NULL,
  status deal_status NOT NULL DEFAULT 'pitched',
  start_date DATE,
  end_date DATE,
  usage_rights TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_deals_creator ON deals(creator_id);
CREATE INDEX idx_deals_status ON deals(status);

-- Content slots
CREATE TYPE content_platform AS ENUM (
  'ig_reel', 'yt_video', 'yt_short', 'story', 'post', 'other'
);

CREATE TYPE content_status AS ENUM (
  'idea', 'scripted', 'shot', 'edited', 'posted'
);

CREATE TABLE content_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  platform content_platform NOT NULL,
  type VARCHAR(50) NOT NULL,
  status content_status NOT NULL DEFAULT 'idea',
  scheduled_date DATE NOT NULL,
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_content_slots_creator ON content_slots(creator_id);
CREATE INDEX idx_content_slots_scheduled ON content_slots(scheduled_date);
CREATE INDEX idx_content_slots_deal ON content_slots(deal_id);

-- Deliverables
CREATE TABLE deliverables (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  platform content_platform NOT NULL,
  due_date DATE,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  content_slot_id UUID REFERENCES content_slots(id) ON DELETE SET NULL,
  title VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_deliverables_deal ON deliverables(deal_id);

-- Invoices
CREATE TYPE invoice_status AS ENUM (
  'draft', 'sent', 'acknowledged', 'paid'
);

CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  gst_amount INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL,
  status invoice_status NOT NULL DEFAULT 'draft',
  sent_date DATE,
  paid_date DATE,
  pdf_url VARCHAR(500),
  gstin VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_invoices_creator ON invoices(creator_id);
CREATE INDEX idx_invoices_deal ON invoices(deal_id);

-- Assets metadata (device-only, no cloud storage)
CREATE TYPE deliverable_status AS ENUM (
  'raw', 'edited', 'final', 'submitted', 'approved'
);

CREATE TABLE assets_metadata (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  device_asset_id VARCHAR(255) NOT NULL,
  device_album_name VARCHAR(255),
  platform content_platform NOT NULL,
  deliverable_status deliverable_status NOT NULL DEFAULT 'raw',
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_assets_creator ON assets_metadata(creator_id);
CREATE INDEX idx_assets_deal ON assets_metadata(deal_id);
CREATE UNIQUE INDEX idx_assets_device_creator ON assets_metadata(creator_id, device_asset_id);

-- Contracts (PDFs in S3)
CREATE TABLE contracts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  file_url VARCHAR(500) NOT NULL,
  signed_date DATE,
  expiry_date DATE,
  usage_platforms TEXT[],
  whitelisting_allowed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_contracts_deal ON contracts(deal_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER creators_updated_at BEFORE UPDATE ON creators
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER brands_updated_at BEFORE UPDATE ON brands
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER deals_updated_at BEFORE UPDATE ON deals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER content_slots_updated_at BEFORE UPDATE ON content_slots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER deliverables_updated_at BEFORE UPDATE ON deliverables
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER invoices_updated_at BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER assets_metadata_updated_at BEFORE UPDATE ON assets_metadata
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER contracts_updated_at BEFORE UPDATE ON contracts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
