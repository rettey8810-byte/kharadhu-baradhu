-- Loan Management Tables
-- Tracks loans taken (borrowed) and money lended to others

-- Main loans table
CREATE TABLE IF NOT EXISTS public.loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.expense_profiles(id) ON DELETE CASCADE,
  
  -- Loan type: 'borrowed' (we owe) or 'lended' (others owe us)
  loan_type VARCHAR(20) NOT NULL CHECK (loan_type IN ('borrowed', 'lended')),
  
  -- Loan category: 'bank', 'individual', 'credit_card', 'family', 'friend', 'other'
  category VARCHAR(30) NOT NULL DEFAULT 'individual',
  
  -- Party involved
  lender_name VARCHAR(255),        -- If borrowed: who lent us money
  borrower_name VARCHAR(255),      -- If lended: who borrowed from us
  
  -- Loan details
  principal_amount DECIMAL(12, 2) NOT NULL,
  interest_rate DECIMAL(5, 2) DEFAULT 0,  -- Annual interest rate %
  interest_type VARCHAR(20) DEFAULT 'simple' CHECK (interest_type IN ('simple', 'compound', 'none')),
  
  -- Dates
  loan_date DATE NOT NULL,
  due_date DATE,                   -- Maturity date (optional)
  
  -- Repayment
  total_amount DECIMAL(12, 2),     -- Principal + calculated interest
  amount_paid DECIMAL(12, 2) DEFAULT 0,
  
  -- EMI/Installment details
  emi_amount DECIMAL(12, 2),       -- Fixed monthly payment amount
  total_installments INTEGER,
  installments_paid INTEGER DEFAULT 0,
  
  -- Status
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paid', 'overdue', 'defaulted', 'cancelled')),
  
  -- Notes
  description TEXT,
  account_number VARCHAR(100),     -- For bank loans
  bank_name VARCHAR(100),          -- For bank loans
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Loan payments tracking
CREATE TABLE IF NOT EXISTS public.loan_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID NOT NULL REFERENCES public.loans(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.expense_profiles(id) ON DELETE CASCADE,
  
  -- Payment details
  payment_date DATE NOT NULL,
  amount_paid DECIMAL(12, 2) NOT NULL,
  principal_paid DECIMAL(12, 2),   -- Portion that went to principal
  interest_paid DECIMAL(12, 2),    -- Portion that went to interest
  
  -- Links to transaction (for budget tracking)
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  
  -- Payment method/notes
  payment_method VARCHAR(50),
  notes TEXT,
  
  -- Installment number if EMI
  installment_number INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_loans_profile_id ON public.loans(profile_id);
CREATE INDEX idx_loans_status ON public.loans(status);
CREATE INDEX idx_loans_type ON public.loans(loan_type);
CREATE INDEX idx_loan_payments_loan_id ON public.loan_payments(loan_id);
CREATE INDEX idx_loan_payments_transaction_id ON public.loan_payments(transaction_id);

-- RLS Policies
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_payments ENABLE ROW LEVEL SECURITY;

-- Loans policies
CREATE POLICY "Users can view their profile's loans"
  ON public.loans FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.expense_profiles ep
    JOIN public.profile_shares ps ON ps.profile_id = ep.id
    WHERE ep.id = loans.profile_id
    AND ps.shared_with = auth.uid()
  ));

CREATE POLICY "Users can insert loans for their profiles"
  ON public.loans FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.expense_profiles ep
    JOIN public.profile_shares ps ON ps.profile_id = ep.id
    WHERE ep.id = loans.profile_id
    AND ps.shared_with = auth.uid()
  ));

CREATE POLICY "Users can update their profile's loans"
  ON public.loans FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.expense_profiles ep
    JOIN public.profile_shares ps ON ps.profile_id = ep.id
    WHERE ep.id = loans.profile_id
    AND ps.shared_with = auth.uid()
  ));

CREATE POLICY "Users can delete their profile's loans"
  ON public.loans FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.expense_profiles ep
    JOIN public.profile_shares ps ON ps.profile_id = ep.id
    WHERE ep.id = loans.profile_id
    AND ps.shared_with = auth.uid()
  ));

-- Loan payments policies
CREATE POLICY "Users can view their profile's loan payments"
  ON public.loan_payments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.expense_profiles ep
    JOIN public.profile_shares ps ON ps.profile_id = ep.id
    WHERE ep.id = loan_payments.profile_id
    AND ps.shared_with = auth.uid()
  ));

CREATE POLICY "Users can insert loan payments for their profiles"
  ON public.loan_payments FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.expense_profiles ep
    JOIN public.profile_shares ps ON ps.profile_id = ep.id
    WHERE ep.id = loan_payments.profile_id
    AND ps.shared_with = auth.uid()
  ));

CREATE POLICY "Users can update their profile's loan payments"
  ON public.loan_payments FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.expense_profiles ep
    JOIN public.profile_shares ps ON ps.profile_id = ep.id
    WHERE ep.id = loan_payments.profile_id
    AND ps.shared_with = auth.uid()
  ));

CREATE POLICY "Users can delete their profile's loan payments"
  ON public.loan_payments FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.expense_profiles ep
    JOIN public.profile_shares ps ON ps.profile_id = ep.id
    WHERE ep.id = loan_payments.profile_id
    AND ps.shared_with = auth.uid()
  ));

-- Function to update loan amounts after payment
CREATE OR REPLACE FUNCTION public.update_loan_after_payment()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the loan's amount_paid
  UPDATE public.loans
  SET 
    amount_paid = amount_paid + NEW.amount_paid,
    installments_paid = installments_paid + 1,
    status = CASE 
      WHEN (amount_paid + NEW.amount_paid) >= total_amount THEN 'paid'
      WHEN due_date < CURRENT_DATE AND (amount_paid + NEW.amount_paid) < total_amount THEN 'overdue'
      ELSE status
    END,
    updated_at = now()
  WHERE id = NEW.loan_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-update loan after payment
CREATE TRIGGER after_loan_payment
  AFTER INSERT ON public.loan_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_loan_after_payment();

-- Function to calculate loan summary for a profile
CREATE OR REPLACE FUNCTION public.get_loan_summary(p_profile_id UUID)
RETURNS TABLE (
  total_borrowed DECIMAL,
  total_lended DECIMAL,
  borrowed_paid DECIMAL,
  borrowed_remaining DECIMAL,
  lended_received DECIMAL,
  lended_outstanding DECIMAL,
  active_borrowed_count INTEGER,
  active_lended_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(CASE WHEN loan_type = 'borrowed' THEN principal_amount ELSE 0 END), 0) as total_borrowed,
    COALESCE(SUM(CASE WHEN loan_type = 'lended' THEN principal_amount ELSE 0 END), 0) as total_lended,
    COALESCE(SUM(CASE WHEN loan_type = 'borrowed' THEN amount_paid ELSE 0 END), 0) as borrowed_paid,
    COALESCE(SUM(CASE WHEN loan_type = 'borrowed' THEN total_amount - amount_paid ELSE 0 END), 0) as borrowed_remaining,
    COALESCE(SUM(CASE WHEN loan_type = 'lended' THEN amount_paid ELSE 0 END), 0) as lended_received,
    COALESCE(SUM(CASE WHEN loan_type = 'lended' THEN total_amount - amount_paid ELSE 0 END), 0) as lended_outstanding,
    COUNT(CASE WHEN loan_type = 'borrowed' AND status = 'active' THEN 1 END)::INTEGER as active_borrowed_count,
    COUNT(CASE WHEN loan_type = 'lended' AND status = 'active' THEN 1 END)::INTEGER as active_lended_count
  FROM public.loans
  WHERE profile_id = p_profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
