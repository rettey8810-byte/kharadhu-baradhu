-- Enhanced recurring expenses schema
-- Add support for variable amounts, due dates, and grace periods

-- Add new columns to recurring_expenses
ALTER TABLE public.recurring_expenses 
  ADD COLUMN IF NOT EXISTS is_variable_amount boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS due_day_of_month integer CHECK (due_day_of_month >= 1 AND due_day_of_month <= 31),
  ADD COLUMN IF NOT EXISTS grace_period_days integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bill_type text,
  ADD COLUMN IF NOT EXISTS provider text,
  ADD COLUMN IF NOT EXISTS account_number text,
  ADD COLUMN IF NOT EXISTS meter_number text;

-- Allow variable bills to store no amount until the bill arrives
ALTER TABLE public.recurring_expenses
  ALTER COLUMN amount DROP NOT NULL;

-- Bill type enum/check values
COMMENT ON COLUMN public.recurring_expenses.bill_type IS 'Type: electricity, water, phone, internet, streaming, education, rent, other';

-- Update bill reminders to include due date tracking
ALTER TABLE public.bill_reminders
  ADD COLUMN IF NOT EXISTS days_until_due integer,
  ADD COLUMN IF NOT EXISTS is_paid boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS paid_date date,
  ADD COLUMN IF NOT EXISTS actual_amount numeric(12,2);

-- Function to generate smarter bill reminders based on due date
CREATE OR REPLACE FUNCTION public.generate_bill_reminders_v2()
RETURNS void AS $$
DECLARE
  rec RECORD;
  days_until_due integer;
  reminder_trigger_date date;
BEGIN
  FOR rec IN 
    SELECT re.*, p.user_id
    FROM public.recurring_expenses re
    JOIN public.expense_profiles p ON re.profile_id = p.id
    WHERE re.is_active = true
    AND re.next_due_date IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.bill_reminders br
      WHERE br.recurring_expense_id = re.id
      AND br.due_date = re.next_due_date
      AND br.is_dismissed = false
      AND br.is_paid = false
    )
  LOOP
    -- Calculate reminder trigger date (reminder_days before due date)
    reminder_trigger_date := rec.next_due_date - rec.reminder_days;
    
    -- Only create reminder if we're within the reminder window
    IF CURRENT_DATE >= reminder_trigger_date AND CURRENT_DATE <= (rec.next_due_date + rec.grace_period_days) THEN
      
      days_until_due := rec.next_due_date - CURRENT_DATE;
      
      INSERT INTO public.bill_reminders (
        profile_id, 
        recurring_expense_id, 
        title, 
        amount, 
        due_date,
        days_until_due
      ) VALUES (
        rec.profile_id, 
        rec.id, 
        rec.name, 
        rec.amount, 
        rec.next_due_date,
        days_until_due
      );
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create bill payment tracking table for variable amounts
CREATE TABLE IF NOT EXISTS public.bill_payments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  recurring_expense_id uuid REFERENCES public.recurring_expenses(id) ON DELETE CASCADE NOT NULL,
  profile_id uuid REFERENCES public.expense_profiles(id) ON DELETE CASCADE NOT NULL,
  due_date date NOT NULL,
  paid_date date,
  amount numeric(12,2),
  is_paid boolean DEFAULT false,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.bill_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage bill payments" ON public.bill_payments FOR ALL USING (
  EXISTS (SELECT 1 FROM public.expense_profiles WHERE id = profile_id AND user_id = auth.uid())
);

CREATE INDEX IF NOT EXISTS idx_bill_payments_recurring_id ON public.bill_payments(recurring_expense_id);
CREATE INDEX IF NOT EXISTS idx_bill_payments_due_date ON public.bill_payments(due_date);

-- Function to process recurring expenses with variable amount support
CREATE OR REPLACE FUNCTION public.process_recurring_expenses_v2()
RETURNS void AS $$
DECLARE
  rec RECORD;
  new_transaction_id uuid;
  new_due_date date;
BEGIN
  FOR rec IN 
    SELECT * FROM public.recurring_expenses
    WHERE is_active = true
    AND next_due_date <= CURRENT_DATE
  LOOP
    -- For variable amount bills, create a pending bill_payment record instead of transaction
    IF rec.is_variable_amount THEN
      INSERT INTO public.bill_payments (
        recurring_expense_id,
        profile_id,
        due_date,
        is_paid
      ) VALUES (
        rec.id,
        rec.profile_id,
        rec.next_due_date,
        false
      )
      ON CONFLICT DO NOTHING;
    ELSE
      -- Fixed amount: create transaction automatically
      INSERT INTO public.transactions (profile_id, category_id, type, amount, description, transaction_date)
      VALUES (rec.profile_id, rec.category_id, 'expense', rec.amount, rec.name, rec.next_due_date)
      RETURNING id INTO new_transaction_id;
    END IF;
    
    -- Calculate next due date
    new_due_date := CASE rec.frequency
      WHEN 'daily' THEN rec.next_due_date + INTERVAL '1 day'
      WHEN 'weekly' THEN rec.next_due_date + INTERVAL '1 week'
      WHEN 'monthly' THEN 
        -- Handle month-end dates properly
        CASE 
          WHEN rec.due_day_of_month IS NOT NULL THEN
            DATE_TRUNC('month', rec.next_due_date + INTERVAL '1 month') + (rec.due_day_of_month - 1) * INTERVAL '1 day'
          ELSE
            rec.next_due_date + INTERVAL '1 month'
        END
      WHEN 'yearly' THEN rec.next_due_date + INTERVAL '1 year'
      ELSE rec.next_due_date + INTERVAL '1 month'
    END;
    
    -- Update next due date
    UPDATE public.recurring_expenses
    SET next_due_date = new_due_date
    WHERE id = rec.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Preset bill types for Maldives common bills
COMMENT ON TABLE public.recurring_expenses IS 
'Supported bill types: 
- stelco (Electricity)
- mwsc (Water)
- dhiraagu/ooredoo (Phone)
- medianet (TV/Internet)
- netflix/disney/youtube (Streaming)
- tuition/school (Education)
- rent (Housing)
- other';
