ALTER TABLE public.boxes ADD COLUMN IF NOT EXISTS is_full boolean NOT NULL DEFAULT false;
