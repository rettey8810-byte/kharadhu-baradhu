-- MetaTrader 5 Trading Tracking
-- Global per-user trades and expenses (not per profile), but every trade/expense creates a normal transaction

-- MT5 Trades (profit/loss tracking)
CREATE TABLE IF NOT EXISTS public.mt5_trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  trade_date date NOT NULL,
  symbol text NOT NULL,
  trade_type text NOT NULL CHECK (trade_type IN ('buy', 'sell')),
  lot_size numeric(12,2) NOT NULL CHECK (lot_size > 0),
  entry_price numeric(12,5) NOT NULL CHECK (entry_price > 0),
  exit_price numeric(12,5) NOT NULL CHECK (exit_price > 0),
  profit_loss numeric(12,2) NOT NULL,

  -- Links to general transaction table for reporting/budgets
  transaction_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL,

  notes text,
  created_at timestamptz DEFAULT now()
);

-- MT5 Expenses (account fees, commission, VPS, etc.)
CREATE TABLE IF NOT EXISTS public.mt5_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  expense_date date NOT NULL,
  expense_type text NOT NULL,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),

  -- Links to general transaction table for reporting/budgets
  transaction_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL,

  notes text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mt5_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mt5_expenses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for mt5_trades
CREATE POLICY "Users can view their own mt5 trades"
  ON public.mt5_trades
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own mt5 trades"
  ON public.mt5_trades
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own mt5 trades"
  ON public.mt5_trades
  FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own mt5 trades"
  ON public.mt5_trades
  FOR DELETE
  USING (user_id = auth.uid());

-- RLS Policies for mt5_expenses
CREATE POLICY "Users can view their own mt5 expenses"
  ON public.mt5_expenses
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own mt5 expenses"
  ON public.mt5_expenses
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own mt5 expenses"
  ON public.mt5_expenses
  FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own mt5 expenses"
  ON public.mt5_expenses
  FOR DELETE
  USING (user_id = auth.uid());

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_mt5_trades_user_id ON public.mt5_trades(user_id);
CREATE INDEX IF NOT EXISTS idx_mt5_trades_trade_date ON public.mt5_trades(trade_date);
CREATE INDEX IF NOT EXISTS idx_mt5_trades_transaction_id ON public.mt5_trades(transaction_id);

CREATE INDEX IF NOT EXISTS idx_mt5_expenses_user_id ON public.mt5_expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_mt5_expenses_expense_date ON public.mt5_expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_mt5_expenses_transaction_id ON public.mt5_expenses(transaction_id);
