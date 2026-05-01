ALTER TABLE public.api_keys
ADD COLUMN IF NOT EXISTS scopes text[] NOT NULL DEFAULT ARRAY['read','webhooks']::text[];

-- Backfill any existing rows (in case default didn't apply)
UPDATE public.api_keys SET scopes = ARRAY['read','webhooks']::text[] WHERE scopes IS NULL OR array_length(scopes, 1) IS NULL;