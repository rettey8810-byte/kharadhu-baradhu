-- Savings goals table
CREATE TABLE IF NOT EXISTS public.savings_goals (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id uuid REFERENCES public.expense_profiles(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  target_amount numeric(12,2) NOT NULL,
  current_amount numeric(12,2) DEFAULT 0,
  deadline date,
  color text DEFAULT '#10b981',
  is_completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Recurring expenses/bills table
CREATE TABLE IF NOT EXISTS public.recurring_expenses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id uuid REFERENCES public.expense_profiles(id) ON DELETE CASCADE NOT NULL,
  category_id uuid REFERENCES public.expense_categories(id),
  name text NOT NULL,
  amount numeric(12,2) NOT NULL,
  frequency text NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
  start_date date NOT NULL,
  end_date date,
  next_due_date date NOT NULL,
  reminder_days integer DEFAULT 3,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Category budgets (already in schema but ensure it's complete)
CREATE TABLE IF NOT EXISTS public.category_budgets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id uuid REFERENCES public.expense_profiles(id) ON DELETE CASCADE NOT NULL,
  category_id uuid REFERENCES public.expense_categories(id) ON DELETE CASCADE NOT NULL,
  year integer NOT NULL,
  month integer NOT NULL CHECK (month >= 1 AND month <= 12),
  budget_amount numeric(12,2) NOT NULL DEFAULT 0,
  alert_threshold integer DEFAULT 80,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(profile_id, category_id, year, month)
);

-- Receipts storage (metadata, actual files in Supabase Storage)
CREATE TABLE IF NOT EXISTS public.receipts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id uuid REFERENCES public.transactions(id) ON DELETE CASCADE NOT NULL,
  storage_path text NOT NULL,
  file_name text NOT NULL,
  file_size integer,
  mime_type text,
  created_at timestamptz DEFAULT now()
);

-- Bill reminders/notifications
CREATE TABLE IF NOT EXISTS public.bill_reminders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id uuid REFERENCES public.expense_profiles(id) ON DELETE CASCADE NOT NULL,
  recurring_expense_id uuid REFERENCES public.recurring_expenses(id) ON DELETE CASCADE,
  title text NOT NULL,
  amount numeric(12,2),
  due_date date NOT NULL,
  is_read boolean DEFAULT false,
  is_dismissed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Apply updated_at triggers to new tables
DROP TRIGGER IF EXISTS savings_goals_updated_at ON public.savings_goals;
CREATE TRIGGER savings_goals_updated_at BEFORE UPDATE ON public.savings_goals FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

DROP TRIGGER IF EXISTS recurring_expenses_updated_at ON public.recurring_expenses;
CREATE TRIGGER recurring_expenses_updated_at BEFORE UPDATE ON public.recurring_expenses FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

DROP TRIGGER IF EXISTS category_budgets_updated_at ON public.category_budgets;
CREATE TRIGGER category_budgets_updated_at BEFORE UPDATE ON public.category_budgets FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_savings_goals_profile_id ON public.savings_goals(profile_id);
CREATE INDEX IF NOT EXISTS idx_recurring_expenses_profile_id ON public.recurring_expenses(profile_id);
CREATE INDEX IF NOT EXISTS idx_recurring_expenses_next_due ON public.recurring_expenses(next_due_date);
CREATE INDEX IF NOT EXISTS idx_receipts_transaction_id ON public.receipts(transaction_id);
CREATE INDEX IF NOT EXISTS idx_bill_reminders_profile_id ON public.bill_reminders(profile_id);
CREATE INDEX IF NOT EXISTS idx_bill_reminders_due_date ON public.bill_reminders(due_date);

-- RLS Policies for new tables
ALTER TABLE public.savings_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bill_reminders ENABLE ROW LEVEL SECURITY;

-- Savings goals RLS
CREATE POLICY "Users can view their savings goals" ON public.savings_goals FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.expense_profiles WHERE id = profile_id AND user_id = auth.uid())
);
CREATE POLICY "Users can insert savings goals" ON public.savings_goals FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.expense_profiles WHERE id = profile_id AND user_id = auth.uid())
);
CREATE POLICY "Users can update their savings goals" ON public.savings_goals FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.expense_profiles WHERE id = profile_id AND user_id = auth.uid())
);
CREATE POLICY "Users can delete their savings goals" ON public.savings_goals FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.expense_profiles WHERE id = profile_id AND user_id = auth.uid())
);

-- Recurring expenses RLS
CREATE POLICY "Users can view their recurring expenses" ON public.recurring_expenses FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.expense_profiles WHERE id = profile_id AND user_id = auth.uid())
);
CREATE POLICY "Users can insert recurring expenses" ON public.recurring_expenses FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.expense_profiles WHERE id = profile_id AND user_id = auth.uid())
);
CREATE POLICY "Users can update their recurring expenses" ON public.recurring_expenses FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.expense_profiles WHERE id = profile_id AND user_id = auth.uid())
);
CREATE POLICY "Users can delete their recurring expenses" ON public.recurring_expenses FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.expense_profiles WHERE id = profile_id AND user_id = auth.uid())
);

-- Receipts RLS
CREATE POLICY "Users can view their receipts" ON public.receipts FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.transactions t
    JOIN public.expense_profiles p ON t.profile_id = p.id
    WHERE t.id = receipts.transaction_id AND p.user_id = auth.uid()
  )
);
CREATE POLICY "Users can insert receipts" ON public.receipts FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.transactions t
    JOIN public.expense_profiles p ON t.profile_id = p.id
    WHERE t.id = receipts.transaction_id AND p.user_id = auth.uid()
  )
);
CREATE POLICY "Users can delete their receipts" ON public.receipts FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.transactions t
    JOIN public.expense_profiles p ON t.profile_id = p.id
    WHERE t.id = receipts.transaction_id AND p.user_id = auth.uid()
  )
);

-- Bill reminders RLS
CREATE POLICY "Users can view their reminders" ON public.bill_reminders FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.expense_profiles WHERE id = profile_id AND user_id = auth.uid())
);
CREATE POLICY "Users can update their reminders" ON public.bill_reminders FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.expense_profiles WHERE id = profile_id AND user_id = auth.uid())
);
CREATE POLICY "Users can delete their reminders" ON public.bill_reminders FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.expense_profiles WHERE id = profile_id AND user_id = auth.uid())
);

-- Function to generate bill reminders from recurring expenses
CREATE OR REPLACE FUNCTION public.generate_bill_reminders()
RETURNS void AS $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN 
    SELECT re.*, p.user_id
    FROM public.recurring_expenses re
    JOIN public.expense_profiles p ON re.profile_id = p.id
    WHERE re.is_active = true
    AND re.next_due_date <= CURRENT_DATE + re.reminder_days
    AND NOT EXISTS (
      SELECT 1 FROM public.bill_reminders br
      WHERE br.recurring_expense_id = re.id
      AND br.due_date = re.next_due_date
      AND br.is_dismissed = false
    )
  LOOP
    INSERT INTO public.bill_reminders (profile_id, recurring_expense_id, title, amount, due_date)
    VALUES (rec.profile_id, rec.id, rec.name, rec.amount, rec.next_due_date);
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grocery bill (structured receipt data)
CREATE TABLE IF NOT EXISTS public.grocery_bills (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id uuid REFERENCES public.transactions(id) ON DELETE CASCADE NOT NULL,
  shop_name text,
  bill_date date,
  subtotal numeric(12,2),
  gst_amount numeric(12,2),
  total numeric(12,2),
  raw_text text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.grocery_bill_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  grocery_bill_id uuid REFERENCES public.grocery_bills(id) ON DELETE CASCADE NOT NULL,
  item_name text NOT NULL,
  qty numeric(12,3),
  unit_price numeric(12,2),
  line_total numeric(12,2)
);

CREATE INDEX IF NOT EXISTS idx_grocery_bills_transaction_id ON public.grocery_bills(transaction_id);
CREATE INDEX IF NOT EXISTS idx_grocery_bill_items_bill_id ON public.grocery_bill_items(grocery_bill_id);

ALTER TABLE public.grocery_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grocery_bill_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their grocery bills" ON public.grocery_bills;
CREATE POLICY "Users can view their grocery bills" ON public.grocery_bills FOR SELECT USING (
  EXISTS (
    SELECT 1
    FROM public.transactions t
    JOIN public.expense_profiles p ON t.profile_id = p.id
    WHERE t.id = grocery_bills.transaction_id
    AND p.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can insert their grocery bills" ON public.grocery_bills;
CREATE POLICY "Users can insert their grocery bills" ON public.grocery_bills FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.transactions t
    JOIN public.expense_profiles p ON t.profile_id = p.id
    WHERE t.id = grocery_bills.transaction_id
    AND p.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can delete their grocery bills" ON public.grocery_bills;
CREATE POLICY "Users can delete their grocery bills" ON public.grocery_bills FOR DELETE USING (
  EXISTS (
    SELECT 1
    FROM public.transactions t
    JOIN public.expense_profiles p ON t.profile_id = p.id
    WHERE t.id = grocery_bills.transaction_id
    AND p.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can view their grocery bill items" ON public.grocery_bill_items;
CREATE POLICY "Users can view their grocery bill items" ON public.grocery_bill_items FOR SELECT USING (
  EXISTS (
    SELECT 1
    FROM public.grocery_bills gb
    JOIN public.transactions t ON gb.transaction_id = t.id
    JOIN public.expense_profiles p ON t.profile_id = p.id
    WHERE gb.id = grocery_bill_items.grocery_bill_id
    AND p.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can insert their grocery bill items" ON public.grocery_bill_items;
CREATE POLICY "Users can insert their grocery bill items" ON public.grocery_bill_items FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.grocery_bills gb
    JOIN public.transactions t ON gb.transaction_id = t.id
    JOIN public.expense_profiles p ON t.profile_id = p.id
    WHERE gb.id = grocery_bill_items.grocery_bill_id
    AND p.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can delete their grocery bill items" ON public.grocery_bill_items;
CREATE POLICY "Users can delete their grocery bill items" ON public.grocery_bill_items FOR DELETE USING (
  EXISTS (
    SELECT 1
    FROM public.grocery_bills gb
    JOIN public.transactions t ON gb.transaction_id = t.id
    JOIN public.expense_profiles p ON t.profile_id = p.id
    WHERE gb.id = grocery_bill_items.grocery_bill_id
    AND p.user_id = auth.uid()
  )
);

-- Function to process recurring expenses and create transactions
CREATE OR REPLACE FUNCTION public.process_recurring_expenses()
RETURNS void AS $$
DECLARE
  rec RECORD;
  new_transaction_id uuid;
BEGIN
  FOR rec IN 
    SELECT * FROM public.recurring_expenses
    WHERE is_active = true
    AND next_due_date <= CURRENT_DATE
  LOOP
    -- Create transaction
    INSERT INTO public.transactions (profile_id, category_id, type, amount, description, transaction_date)
    VALUES (rec.profile_id, rec.category_id, 'expense', rec.amount, rec.name, rec.next_due_date)
    RETURNING id INTO new_transaction_id;
    
    -- Update next due date
    UPDATE public.recurring_expenses
    SET next_due_date = CASE frequency
      WHEN 'daily' THEN next_due_date + INTERVAL '1 day'
      WHEN 'weekly' THEN next_due_date + INTERVAL '1 week'
      WHEN 'monthly' THEN next_due_date + INTERVAL '1 month'
      WHEN 'yearly' THEN next_due_date + INTERVAL '1 year'
    END
    WHERE id = rec.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
