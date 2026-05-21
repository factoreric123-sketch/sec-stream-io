-- Fix D: Compound indexes for sec_filings cursor pagination.
-- The public /v1/filings handler filters by ticker (+ optional form_type)
-- and orders by (filing_date desc, accession_number desc) with keyset
-- pagination. Without these compound indexes, every page is a sort.

-- Primary index: ticker + (filing_date, accession_number) descending.
-- Covers ?ticker=AAPL queries with cursor pagination.
CREATE INDEX IF NOT EXISTS idx_sec_filings_ticker_date_acc
  ON public.sec_filings (ticker, filing_date DESC, accession_number DESC);

-- Secondary index: ticker + form_type + (filing_date, accession_number).
-- Covers ?ticker=AAPL&type=10-K queries. Index-only friendly for typical
-- API payload columns.
CREATE INDEX IF NOT EXISTS idx_sec_filings_ticker_form_date_acc
  ON public.sec_filings (ticker, form_type, filing_date DESC, accession_number DESC);

-- Lookup index for usage_logs rate-limit window scans.
-- The current rate limiter does:
--   SELECT count(*) FROM usage_logs WHERE user_id = $1 AND created_at >= $2
-- A composite (user_id, created_at desc) is ideal.
CREATE INDEX IF NOT EXISTS idx_usage_logs_user_created_desc
  ON public.usage_logs (user_id, created_at DESC);

-- API key lookup is by sha256 hash on every authenticated request.
-- key_hash is already UNIQUE per migration m6, which creates an implicit
-- btree index. Adding a comment for clarity; no new index needed.
COMMENT ON COLUMN public.api_keys.key_hash IS
  'sha256 hex of cleartext key. UNIQUE -> already indexed for O(log n) auth lookup.';
