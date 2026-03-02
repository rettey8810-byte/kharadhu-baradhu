-- Grocery Item History - stores unique item names per user for autocomplete
CREATE TABLE IF NOT EXISTS public.grocery_item_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_name text NOT NULL,
  last_used_at timestamptz DEFAULT now(),
  use_count integer DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  
  -- Ensure unique item names per user (case-insensitive)
  UNIQUE (user_id, LOWER(item_name))
);

-- Enable RLS
ALTER TABLE public.grocery_item_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own grocery item history"
  ON public.grocery_item_history
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own grocery item history"
  ON public.grocery_item_history
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own grocery item history"
  ON public.grocery_item_history
  FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own grocery item history"
  ON public.grocery_item_history
  FOR DELETE
  USING (user_id = auth.uid());

-- Index for fast autocomplete lookups
CREATE INDEX IF NOT EXISTS idx_grocery_item_history_user_id ON public.grocery_item_history(user_id);
CREATE INDEX IF NOT EXISTS idx_grocery_item_history_name ON public.grocery_item_history USING gin (item_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_grocery_item_history_last_used ON public.grocery_item_history(last_used_at DESC);

-- Function to upsert grocery item history
CREATE OR REPLACE FUNCTION upsert_grocery_item_history(p_user_id uuid, p_item_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.grocery_item_history (user_id, item_name, last_used_at, use_count)
  VALUES (p_user_id, TRIM(p_item_name), now(), 1)
  ON CONFLICT (user_id, LOWER(item_name))
  DO UPDATE SET
    last_used_at = now(),
    use_count = public.grocery_item_history.use_count + 1;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION upsert_grocery_item_history(uuid, text) TO authenticated;
