-- Taxi / Vehicle Income & Expense Tracking
-- Global per-user vehicles (not per profile), but every trip/expense creates a normal transaction

-- Vehicles owned/used by the signed-in user
CREATE TABLE IF NOT EXISTS public.taxi_vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vehicle_type text NOT NULL CHECK (vehicle_type IN ('car', 'bike')),
  name text NOT NULL,
  plate_number text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Trips (income) for a specific vehicle
CREATE TABLE IF NOT EXISTS public.taxi_trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vehicle_id uuid NOT NULL REFERENCES public.taxi_vehicles(id) ON DELETE CASCADE,

  trip_date date NOT NULL,
  trip_count integer NOT NULL CHECK (trip_count > 0),
  rate numeric(12,2) NOT NULL CHECK (rate > 0),
  total_income numeric(12,2) NOT NULL CHECK (total_income > 0),

  -- Links to general transaction table for reporting/budgets
  transaction_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL,

  notes text,
  app_name text,
  route text,
  created_at timestamptz DEFAULT now()
);

-- Vehicle expenses
CREATE TABLE IF NOT EXISTS public.taxi_vehicle_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vehicle_id uuid NOT NULL REFERENCES public.taxi_vehicles(id) ON DELETE CASCADE,

  expense_date date NOT NULL,
  expense_type text NOT NULL,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),

  -- Links to general transaction table for reporting/budgets
  transaction_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL,

  notes text,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_taxi_vehicles_user_id ON public.taxi_vehicles(user_id);
CREATE INDEX IF NOT EXISTS idx_taxi_trips_user_id ON public.taxi_trips(user_id);
CREATE INDEX IF NOT EXISTS idx_taxi_trips_vehicle_id ON public.taxi_trips(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_taxi_trips_trip_date ON public.taxi_trips(trip_date);
CREATE INDEX IF NOT EXISTS idx_taxi_vehicle_expenses_user_id ON public.taxi_vehicle_expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_taxi_vehicle_expenses_vehicle_id ON public.taxi_vehicle_expenses(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_taxi_vehicle_expenses_expense_date ON public.taxi_vehicle_expenses(expense_date);

-- Auto-update updated_at
CREATE TRIGGER set_updated_at_taxi_vehicles
  BEFORE UPDATE ON public.taxi_vehicles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- RLS
ALTER TABLE public.taxi_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.taxi_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.taxi_vehicle_expenses ENABLE ROW LEVEL SECURITY;

-- Policies (owner-only)
CREATE POLICY "Users can view their taxi vehicles"
  ON public.taxi_vehicles FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their taxi vehicles"
  ON public.taxi_vehicles FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their taxi vehicles"
  ON public.taxi_vehicles FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their taxi vehicles"
  ON public.taxi_vehicles FOR DELETE
  USING (user_id = auth.uid());

CREATE POLICY "Users can view their taxi trips"
  ON public.taxi_trips FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their taxi trips"
  ON public.taxi_trips FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their taxi trips"
  ON public.taxi_trips FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their taxi trips"
  ON public.taxi_trips FOR DELETE
  USING (user_id = auth.uid());

CREATE POLICY "Users can view their taxi vehicle expenses"
  ON public.taxi_vehicle_expenses FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their taxi vehicle expenses"
  ON public.taxi_vehicle_expenses FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their taxi vehicle expenses"
  ON public.taxi_vehicle_expenses FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their taxi vehicle expenses"
  ON public.taxi_vehicle_expenses FOR DELETE
  USING (user_id = auth.uid());

-- Migration: Add app_name and route columns if they don't exist (for existing tables)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'taxi_trips' AND column_name = 'app_name') THEN
    ALTER TABLE public.taxi_trips ADD COLUMN app_name text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'taxi_trips' AND column_name = 'route') THEN
    ALTER TABLE public.taxi_trips ADD COLUMN route text;
  END IF;
END $$;
