-- Split bank_details into separate fields on creators
ALTER TABLE creators ADD COLUMN IF NOT EXISTS pan_number text;
ALTER TABLE creators ADD COLUMN IF NOT EXISTS bank_account_number text;
ALTER TABLE creators ADD COLUMN IF NOT EXISTS bank_ifsc text;
ALTER TABLE creators ADD COLUMN IF NOT EXISTS bank_name text;
-- Auto-incrementing invoice number per creator
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq;

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS invoice_number integer;

-- Function to auto-assign invoice number on insert
CREATE OR REPLACE FUNCTION set_invoice_number()
RETURNS trigger AS $$
DECLARE
  next_num integer;
BEGIN
  SELECT COALESCE(MAX(invoice_number), 0) + 1
    INTO next_num
    FROM invoices
    WHERE creator_id = NEW.creator_id;
  NEW.invoice_number := next_num;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_invoice_number_trigger ON invoices;
CREATE TRIGGER set_invoice_number_trigger
  BEFORE INSERT ON invoices
  FOR EACH ROW
  WHEN (NEW.invoice_number IS NULL)
  EXECUTE FUNCTION set_invoice_number();

-- Backfill existing invoices
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY creator_id ORDER BY created_at) AS rn
  FROM invoices
  WHERE invoice_number IS NULL
)
UPDATE invoices SET invoice_number = numbered.rn
FROM numbered WHERE invoices.id = numbered.id;
