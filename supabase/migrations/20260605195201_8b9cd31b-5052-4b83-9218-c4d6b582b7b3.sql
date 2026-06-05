
ALTER TABLE public.profiles ALTER COLUMN plan SET DEFAULT 'free';

ALTER TABLE public.profiles DISABLE TRIGGER USER;

UPDATE public.profiles
   SET plan = 'free'
 WHERE plan = 'active'
   AND stripe_customer_id IS NULL;

ALTER TABLE public.profiles ENABLE TRIGGER USER;
