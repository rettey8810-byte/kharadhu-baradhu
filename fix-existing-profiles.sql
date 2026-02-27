-- FIX: Add default categories to existing profiles that don't have any
-- Run this in Supabase SQL Editor

-- This will create default categories for all profiles that have 0 categories
DO $$
DECLARE
  profile_rec RECORD;
  default_cats TEXT[] := ARRAY['Food & Dining', 'Transport', 'Bills & Utilities', 'Shopping', 'Entertainment', 'Health', 'Education', 'Other'];
  cat_colors TEXT[] := ARRAY['#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#10b981', '#6366f1', '#6b7280'];
  cat_icons TEXT[] := ARRAY['Utensils', 'Car', 'Zap', 'ShoppingBag', 'Film', 'Heart', 'GraduationCap', 'MoreHorizontal'];
  i INT;
BEGIN
  -- Loop through all profiles
  FOR profile_rec IN 
    SELECT id FROM public.expense_profiles
    WHERE NOT EXISTS (
      SELECT 1 FROM public.expense_categories 
      WHERE expense_categories.profile_id = expense_profiles.id
    )
  LOOP
    -- Create default categories for this profile
    FOR i IN 1..array_length(default_cats, 1) LOOP
      INSERT INTO public.expense_categories (profile_id, name, color, icon, is_default, sort_order)
      VALUES (profile_rec.id, default_cats[i], cat_colors[i], cat_icons[i], true, i)
      ON CONFLICT DO NOTHING;
    END LOOP;
    
    RAISE NOTICE 'Created categories for profile: %', profile_rec.id;
  END LOOP;
END $$;

-- Verify: Check all profiles and their category count
SELECT 
  p.id,
  p.name,
  p.type,
  COUNT(c.id) as category_count
FROM public.expense_profiles p
LEFT JOIN public.expense_categories c ON c.profile_id = p.id
GROUP BY p.id, p.name, p.type
ORDER BY category_count;
