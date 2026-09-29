-- 019: Free plan — 3 active deals and 3 invoices a month (were 5 and 5).
-- Vault folders stay at 3; the media kit page stays free.
-- Nobody is affected today: everyone holds an early-access Pro grant (018).
update features set default_value = '3'::jsonb where key = 'deals.active_max';
update features set default_value = '3'::jsonb where key = 'invoices.issued_per_month';
