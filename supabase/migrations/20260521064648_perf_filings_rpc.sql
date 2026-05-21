-- Fix E: get_filings_paginated RPC using tuple comparison.
-- The current handler builds a PostgREST .or() filter:
--   filing_date.lt.X OR (filing_date.eq.X AND accession_number.lt.Y)
-- which is correct but not always pushed through the compound index well.
-- A raw SQL tuple comparison (filing_date, accession_number) < (X, Y)
-- is index-friendly and substantially faster on deep pagination.
--
-- Returns one extra row (limit + 1) so the caller can detect has_more,
-- matching the existing handler's contract.

CREATE OR REPLACE FUNCTION public.get_filings_paginated(
  p_ticker          TEXT,
  p_form_type       TEXT DEFAULT NULL,
  p_cursor_date     DATE DEFAULT NULL,
  p_cursor_acc      TEXT DEFAULT NULL,
  p_limit           INT  DEFAULT 25
)
RETURNS TABLE (
  accession_number TEXT,
  form_type        TEXT,
  filing_date      DATE,
  report_date      DATE,
  ticker           TEXT,
  company_name     TEXT,
  cik              TEXT,
  filing_url       TEXT,
  description      TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    f.accession_number,
    f.form_type,
    f.filing_date,
    f.report_date,
    f.ticker,
    f.company_name,
    f.cik,
    f.filing_url,
    f.description
  FROM public.sec_filings f
  WHERE f.ticker = upper(p_ticker)
    AND (p_form_type IS NULL OR f.form_type = p_form_type)
    AND (
      p_cursor_date IS NULL
      OR (f.filing_date, f.accession_number) < (p_cursor_date, p_cursor_acc)
    )
  ORDER BY f.filing_date DESC, f.accession_number DESC
  LIMIT LEAST(GREATEST(p_limit, 1), 100) + 1;
$$;

-- Lock down: only service-role / authenticated callers via PostgREST RPC.
REVOKE ALL ON FUNCTION public.get_filings_paginated(TEXT, TEXT, DATE, TEXT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_filings_paginated(TEXT, TEXT, DATE, TEXT, INT)
  TO service_role;
