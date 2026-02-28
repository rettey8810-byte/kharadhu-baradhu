-- Recurring Income Table and Functions
-- This adds support for tracking recurring income (salary, allowances, etc.)

-- Create recurring_income table
CREATE TABLE IF NOT EXISTS public.recurring_income (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id uuid NOT NULL REFERENCES public.expense_profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  amount numeric,
  income_source_id uuid REFERENCES public.income_sources(id),
  frequency text NOT NULL DEFAULT 'monthly' CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
  start_date date NOT NULL,
  next_due_date date NOT NULL,
  reminder_days integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.recurring_income ENABLE ROW LEVEL SECURITY;

-- RLS Policies for recurring_income
CREATE POLICY "Users can view own recurring income"
  ON public.recurring_income
  FOR SELECT
  USING (
    profile_id IN (
      SELECT id FROM public.expense_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own recurring income"
  ON public.recurring_income
  FOR INSERT
  WITH CHECK (
    profile_id IN (
      SELECT id FROM public.expense_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own recurring income"
  ON public.recurring_income
  FOR UPDATE
  USING (
    profile_id IN (
      SELECT id FROM public.expense_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own recurring income"
  ON public.recurring_income
  FOR DELETE
  USING (
    profile_id IN (
      SELECT id FROM public.expense_profiles WHERE user_id = auth.uid()
    )
  );

-- Function to automatically create income transaction when recurring income is due
CREATE OR REPLACE FUNCTION public.process_recurring_income()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  rec record;
  next_date date;
BEGIN
  FOR rec IN
    SELECT * FROM public.recurring_income
    WHERE is_active = true
    AND next_due_date <= CURRENT_DATE
  LOOP
    -- Create income transaction
    INSERT INTO public.transactions (
      profile_id,
      type,
      amount,
      description,
      income_source_id,
      transaction_date
    ) VALUES (
      rec.profile_id,
      'income',
      rec.amount,
      rec.name,
      rec.income_source_id,
      rec.next_due_date
    );
    
    -- Calculate next due date
    next_date := rec.next_due_date;
    
    CASE rec.frequency
      WHEN 'daily' THEN next_date := next_date + INTERVAL '1 day';
      WHEN 'weekly' THEN next_date := next_date + INTERVAL '1 week';
      WHEN 'monthly' THEN next_date := next_date + INTERVAL '1 month';
      WHEN 'yearly' THEN next_date := next_date + INTERVAL '1 year';
    END CASE;
    
    -- Update next_due_date
    UPDATE public.recurring_income
    SET next_due_date = next_date
    WHERE id = rec.id;
  END LOOP;
END;
$$;

-- Function to generate income reminders
CREATE OR REPLACE FUNCTION public.generate_income_reminders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  rec record;
  reminder_date date;
BEGIN
  FOR rec IN
    SELECT * FROM public.recurring_income
    WHERE is_active = true
    AND reminder_days > 0
  LOOP
    reminder_date := rec.next_due_date - rec.reminder_days;
    
    IF reminder_date = CURRENT_DATE THEN
      -- Check if reminder already exists for this date
      IF NOT EXISTS (
        SELECT 1 FROM public.bill_reminders
        WHERE recurring_expense_id = rec.id
        AND due_date = rec.next_due_date
        AND type = 'income'
      ) THEN
        INSERT INTO public.bill_reminders (
          profile_id,
          recurring_expense_id,
          title,
          message,
          due_date,
          type
        ) VALUES (
          rec.profile_id,
          rec.id,
          'Income Due: ' || rec.name,
          'Expected income of MVR ' || rec.amount || ' is due on ' || rec.next_due_date,
          rec.next_due_date,
          'income'
        );
      END IF;
    END IF;
  END LOOP;
END;
$$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_recurring_income_profile_id ON public.recurring_income(profile_id);
CREATE INDEX IF NOT EXISTS idx_recurring_income_income_source_id ON public.recurring_income(income_source_id);
CREATE INDEX IF NOT EXISTS idx_recurring_income_next_due_date ON public.recurring_income(next_due_date);
CREATE INDEX IF NOT EXISTS idx_recurring_income_is_active ON public.recurring_income(is_active);

-- Grant permissions
GRANT ALL ON public.recurring_income TO authenticated;
GRANT ALL ON public.recurring_income TO anon;

COMMENT ON TABLE public.recurring_income IS 'Stores recurring income entries like salary, allowances, etc.';
