-- Expense Tracker Schema
-- Run this in your Supabase SQL Editor

-- User profiles (extends auth.users)
-- Each user can have multiple profiles (Personal, Family, Business)
CREATE TABLE IF NOT EXISTS public.expense_profiles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  name text NOT NULL, -- e.g., "Personal", "Family", "Business"
  type text NOT NULL CHECK (type IN ('personal', 'family', 'business')),
  currency text DEFAULT 'MVR',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Default profile per user
CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id uuid REFERENCES auth.users(id) PRIMARY KEY,
  default_profile_id uuid REFERENCES public.expense_profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Expense categories (custom per profile)
CREATE TABLE IF NOT EXISTS public.expense_categories (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id uuid REFERENCES public.expense_profiles(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  color text DEFAULT '#10b981', -- hex color
  icon text DEFAULT 'Wallet', -- Lucide icon name
  is_default boolean DEFAULT false,
  is_archived boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Income sources (custom per profile)
CREATE TABLE IF NOT EXISTS public.income_sources (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id uuid REFERENCES public.expense_profiles(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  color text DEFAULT '#3b82f6',
  icon text DEFAULT 'Banknote',
  is_archived boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Monthly budgets per profile
CREATE TABLE IF NOT EXISTS public.monthly_budgets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id uuid REFERENCES public.expense_profiles(id) ON DELETE CASCADE NOT NULL,
  year integer NOT NULL,
  month integer NOT NULL CHECK (month >= 1 AND month <= 12),
  total_budget numeric(12,2) NOT NULL DEFAULT 0,
  income_goal numeric(12,2) DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(profile_id, year, month)
);

-- Category budgets (optional)
CREATE TABLE IF NOT EXISTS public.category_budgets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id uuid REFERENCES public.expense_profiles(id) ON DELETE CASCADE NOT NULL,
  category_id uuid REFERENCES public.expense_categories(id) ON DELETE CASCADE NOT NULL,
  year integer NOT NULL,
  month integer NOT NULL CHECK (month >= 1 AND month <= 12),
  budget_amount numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(profile_id, category_id, year, month)
);

-- Transactions (expenses and income)
CREATE TABLE IF NOT EXISTS public.transactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id uuid REFERENCES public.expense_profiles(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL CHECK (type IN ('expense', 'income')),
  amount numeric(12,2) NOT NULL,
  
  -- For expenses
  category_id uuid REFERENCES public.expense_categories(id),
  
  -- For income
  income_source_id uuid REFERENCES public.income_sources(id),
  
  description text,
  transaction_date date NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Monthly summaries (for fast queries)
CREATE TABLE IF NOT EXISTS public.monthly_summaries (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id uuid REFERENCES public.expense_profiles(id) ON DELETE CASCADE NOT NULL,
  year integer NOT NULL,
  month integer NOT NULL CHECK (month >= 1 AND month <= 12),
  total_income numeric(12,2) DEFAULT 0,
  total_expense numeric(12,2) DEFAULT 0,
  remaining_balance numeric(12,2) DEFAULT 0,
  days_remaining integer,
  daily_safe_spend numeric(12,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(profile_id, year, month)
);

-- Auto-update timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
DROP TRIGGER IF EXISTS expense_profiles_updated_at ON public.expense_profiles;
DROP TRIGGER IF EXISTS user_settings_updated_at ON public.user_settings;
DROP TRIGGER IF EXISTS expense_categories_updated_at ON public.expense_categories;
DROP TRIGGER IF EXISTS income_sources_updated_at ON public.income_sources;
DROP TRIGGER IF EXISTS monthly_budgets_updated_at ON public.monthly_budgets;
DROP TRIGGER IF EXISTS category_budgets_updated_at ON public.category_budgets;
DROP TRIGGER IF EXISTS transactions_updated_at ON public.transactions;
DROP TRIGGER IF EXISTS monthly_summaries_updated_at ON public.monthly_summaries;

CREATE TRIGGER expense_profiles_updated_at BEFORE UPDATE ON public.expense_profiles FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER user_settings_updated_at BEFORE UPDATE ON public.user_settings FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER expense_categories_updated_at BEFORE UPDATE ON public.expense_categories FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER income_sources_updated_at BEFORE UPDATE ON public.income_sources FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER monthly_budgets_updated_at BEFORE UPDATE ON public.monthly_budgets FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER category_budgets_updated_at BEFORE UPDATE ON public.category_budgets FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER transactions_updated_at BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER monthly_summaries_updated_at BEFORE UPDATE ON public.monthly_summaries FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_expense_profiles_user_id ON public.expense_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_expense_categories_profile_id ON public.expense_categories(profile_id);
CREATE INDEX IF NOT EXISTS idx_income_sources_profile_id ON public.income_sources(profile_id);
CREATE INDEX IF NOT EXISTS idx_transactions_profile_id ON public.transactions(profile_id);
CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON public.transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_monthly_budgets_profile_year_month ON public.monthly_budgets(profile_id, year, month);
CREATE INDEX IF NOT EXISTS idx_monthly_summaries_profile_year_month ON public.monthly_summaries(profile_id, year, month);

-- RLS Policies
ALTER TABLE public.expense_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.income_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_summaries ENABLE ROW LEVEL SECURITY;

-- Expense profiles: users can only access their own
CREATE POLICY "Users can view their own profiles" ON public.expense_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profiles" ON public.expense_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profiles" ON public.expense_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own profiles" ON public.expense_profiles FOR DELETE USING (auth.uid() = user_id);

-- User settings
CREATE POLICY "Users can view their own settings" ON public.user_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own settings" ON public.user_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own settings" ON public.user_settings FOR UPDATE USING (auth.uid() = user_id);

-- Categories: access via profile ownership
CREATE POLICY "Users can view their categories" ON public.expense_categories FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.expense_profiles WHERE id = profile_id AND user_id = auth.uid())
);
CREATE POLICY "Users can insert categories" ON public.expense_categories FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.expense_profiles WHERE id = profile_id AND user_id = auth.uid())
);
CREATE POLICY "Users can update their categories" ON public.expense_categories FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.expense_profiles WHERE id = profile_id AND user_id = auth.uid())
);
CREATE POLICY "Users can delete their categories" ON public.expense_categories FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.expense_profiles WHERE id = profile_id AND user_id = auth.uid())
);

-- Income sources: access via profile ownership
CREATE POLICY "Users can view their income sources" ON public.income_sources FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.expense_profiles WHERE id = profile_id AND user_id = auth.uid())
);
CREATE POLICY "Users can insert income sources" ON public.income_sources FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.expense_profiles WHERE id = profile_id AND user_id = auth.uid())
);
CREATE POLICY "Users can update their income sources" ON public.income_sources FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.expense_profiles WHERE id = profile_id AND user_id = auth.uid())
);
CREATE POLICY "Users can delete their income sources" ON public.income_sources FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.expense_profiles WHERE id = profile_id AND user_id = auth.uid())
);

-- Monthly budgets: access via profile ownership
CREATE POLICY "Users can view their budgets" ON public.monthly_budgets FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.expense_profiles WHERE id = profile_id AND user_id = auth.uid())
);
CREATE POLICY "Users can insert budgets" ON public.monthly_budgets FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.expense_profiles WHERE id = profile_id AND user_id = auth.uid())
);
CREATE POLICY "Users can update their budgets" ON public.monthly_budgets FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.expense_profiles WHERE id = profile_id AND user_id = auth.uid())
);
CREATE POLICY "Users can delete their budgets" ON public.monthly_budgets FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.expense_profiles WHERE id = profile_id AND user_id = auth.uid())
);

-- Category budgets: access via profile ownership
CREATE POLICY "Users can view their category budgets" ON public.category_budgets FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.expense_profiles WHERE id = profile_id AND user_id = auth.uid())
);
CREATE POLICY "Users can insert category budgets" ON public.category_budgets FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.expense_profiles WHERE id = profile_id AND user_id = auth.uid())
);
CREATE POLICY "Users can update their category budgets" ON public.category_budgets FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.expense_profiles WHERE id = profile_id AND user_id = auth.uid())
);
CREATE POLICY "Users can delete their category budgets" ON public.category_budgets FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.expense_profiles WHERE id = profile_id AND user_id = auth.uid())
);

-- Transactions: access via profile ownership
CREATE POLICY "Users can view their transactions" ON public.transactions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.expense_profiles WHERE id = profile_id AND user_id = auth.uid())
);
CREATE POLICY "Users can insert transactions" ON public.transactions FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.expense_profiles WHERE id = profile_id AND user_id = auth.uid())
);
CREATE POLICY "Users can update their transactions" ON public.transactions FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.expense_profiles WHERE id = profile_id AND user_id = auth.uid())
);
CREATE POLICY "Users can delete their transactions" ON public.transactions FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.expense_profiles WHERE id = profile_id AND user_id = auth.uid())
);

-- Monthly summaries: access via profile ownership
CREATE POLICY "Users can view their summaries" ON public.monthly_summaries FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.expense_profiles WHERE id = profile_id AND user_id = auth.uid())
);

-- Default categories function
CREATE OR REPLACE FUNCTION public.create_default_categories(profile_uuid uuid)
RETURNS void AS $$
BEGIN
  INSERT INTO public.expense_categories (profile_id, name, color, icon, is_default, sort_order) VALUES
  (profile_uuid, 'Food & Dining', '#ef4444', 'Utensils', true, 1),
  (profile_uuid, 'Transport', '#3b82f6', 'Car', true, 2),
  (profile_uuid, 'Bills & Utilities', '#f59e0b', 'Zap', true, 3),
  (profile_uuid, 'Shopping', '#8b5cf6', 'ShoppingBag', true, 4),
  (profile_uuid, 'Entertainment', '#ec4899', 'Film', true, 5),
  (profile_uuid, 'Health', '#10b981', 'Heart', true, 6),
  (profile_uuid, 'Education', '#6366f1', 'GraduationCap', true, 7),
  (profile_uuid, 'Other', '#6b7280', 'MoreHorizontal', true, 8);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to create default profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_profile_id uuid;
BEGIN
  -- Create default "Personal" profile
  INSERT INTO public.expense_profiles (user_id, name, type, is_active)
  VALUES (NEW.id, 'Personal', 'personal', true)
  RETURNING id INTO new_profile_id;
  
  -- Create default categories for the profile
  PERFORM public.create_default_categories(new_profile_id);
  
  -- Set as default profile
  INSERT INTO public.user_settings (user_id, default_profile_id)
  VALUES (NEW.id, new_profile_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Attach trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
