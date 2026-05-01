-- Webhooks table
CREATE TABLE public.webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  url text NOT NULL,
  secret text NOT NULL,
  events text[] NOT NULL DEFAULT ARRAY['filing.created']::text[],
  active boolean NOT NULL DEFAULT true,
  label text NOT NULL DEFAULT 'Default',
  created_at timestamptz NOT NULL DEFAULT now(),
  last_delivery_at timestamptz
);

ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own webhooks" ON public.webhooks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own webhooks" ON public.webhooks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own webhooks" ON public.webhooks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own webhooks" ON public.webhooks FOR DELETE USING (auth.uid() = user_id);

-- Webhook deliveries log
CREATE TABLE public.webhook_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id uuid NOT NULL REFERENCES public.webhooks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  event text NOT NULL,
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  response_code integer,
  response_body text,
  attempt integer NOT NULL DEFAULT 1,
  attempted_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own deliveries" ON public.webhook_deliveries FOR SELECT USING (auth.uid() = user_id);

CREATE INDEX webhook_deliveries_webhook_idx ON public.webhook_deliveries (webhook_id, attempted_at DESC);
CREATE INDEX webhook_deliveries_pending_idx ON public.webhook_deliveries (status, attempted_at) WHERE status = 'pending';

-- Watched tickers
CREATE TABLE public.watched_tickers (
  user_id uuid NOT NULL,
  ticker text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, ticker)
);

ALTER TABLE public.watched_tickers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own watched" ON public.watched_tickers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own watched" ON public.watched_tickers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own watched" ON public.watched_tickers FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX watched_tickers_ticker_idx ON public.watched_tickers (ticker);
CREATE INDEX sec_filings_ticker_filed_idx ON public.sec_filings (ticker, filed_at DESC);