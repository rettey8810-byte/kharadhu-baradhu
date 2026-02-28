# Kharadhu Baradhu - Family Expense Tracker

[![Live Demo](https://img.shields.io/badge/Live%20Demo-kharadhu--baradhu.vercel.app-emerald)](https://kharadhu-baradhu.vercel.app)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**Track family expenses, manage budgets, and save smarter.**

A modern expense tracking application built for Maldivian families. Track income, monitor spending, set savings goals, and manage grocery receipts with OCR. Features enhanced recurring bill management with variable amounts, due dates, and smart reminders.

**Live Site:** https://kharadhu-baradhu.vercel.app  
**Mobile-friendly** | **Secure Auth** | **Real-time Sync** | **Smart Analytics**

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
- [Screenshots](#screenshots)
- [Deployment](#deployment)
- [Contributing](#contributing)

---

## Features

### Core Features
- **Multi-Profile Support** - Separate profiles for Personal, Family, or Business
- **Expense Tracking** - Log expenses with categories, notes, and tags
- **Income Management** - Track multiple income sources (Salary, Allowances, etc.)
- **Smart Categories** - Default categories auto-created (Food, Transport, Bills, Groceries, etc.)
- **Budget Planning** - Set monthly budgets and category limits with alert thresholds
- **Savings Goals** - Track progress toward financial goals with visual progress bars
- **Visual Analytics** - Charts and reports for spending insights
- **Search & Filter** - Find transactions by keyword, date, or amount
- **Monthly Comparison** - Compare current vs previous month spending
- **Yearly View** - Browse transactions by year and month
- **All Transactions** - View, edit, and delete all expenses and income in one place

### Enhanced Recurring Bills (NEW!)
- **Bill Type Presets** - Quick-setup for STELCO, MWSC, Dhiraagu, Ooredoo, Medianet, Netflix, etc.
- **Variable Amounts** - Handle bills that change monthly (electricity, water)
- **Due Date Management** - Set exact due day of month with grace periods
- **Smart Reminders** - Get reminded X days before due date
- **Pause/Resume** - Temporarily disable bills without deleting
- **Account Numbers** - Store meter numbers, account IDs for reference

### Grocery Receipt OCR
- **Supabase Auth** - Email/password and OAuth sign-in
- **Row Level Security** - Your data is private and secure
- **Real-time Updates** - Live sync across devices
- **PWA Ready** - Install as mobile app
- **Responsive Design** - Works on mobile, tablet, desktop
- **Maldives Currency** - MVR (Maldivian Rufiyaa) support

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, TypeScript, Tailwind CSS |
| **State Management** | React Hooks, Context API |
| **Backend** | Supabase (Auth, Database, Storage) |
| **Database** | PostgreSQL |
| **OCR** | Tesseract.js (Free, client-side) |
| **Charts** | Recharts |
| **Icons** | Lucide React |
| **Build Tool** | Vite |
| **Deployment** | Vercel |

---

## Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account (free tier works)

### Installation

```bash
# 1. Clone repository
git clone https://github.com/rettey8810-byte/kharadhu-baradhu.git
cd kharadhu-baradhu

# 2. Install dependencies
npm install

# 3. Create environment file
cp .env.example .env.local

# 4. Add your Supabase credentials to .env.local
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here

# 5. Start development server
npm run dev
```

Open http://localhost:5173

---

## Database Setup

Run these SQL files in Supabase SQL Editor:

1. **Main Schema** - `supabase-expense-schema.sql`
2. **Additional Tables** - `supabase-expense-schema-additions.sql`
3. **Enhanced Recurring Bills** - `supabase-recurring-bills-enhancement.sql` (NEW!)
4. **Storage Setup** - `supabase-storage-setup.sql`

### Required SQL Migrations

**For Existing Users - Update Recurring Bills:**
```sql
-- Add new columns for enhanced recurring bills
ALTER TABLE public.recurring_expenses 
  ADD COLUMN IF NOT EXISTS is_variable_amount boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS due_day_of_month integer,
  ADD COLUMN IF NOT EXISTS grace_period_days integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bill_type text,
  ADD COLUMN IF NOT EXISTS provider text,
  ADD COLUMN IF NOT EXISTS account_number text,
  ADD COLUMN IF NOT EXISTS meter_number text;

-- Make amount nullable for variable bills
ALTER TABLE public.recurring_expenses
  ALTER COLUMN amount DROP NOT NULL;
```

---

##  PWA Installation

Install Kharadhu Baradhu as a mobile app:

You will also see an **Install banner** at the top of the Dashboard when your device/browser supports installation.

### Android (Chrome)
1. Open the live site in Chrome
2. Tap the **Install** button in the in-app banner (recommended)
3. OR tap the browser menu (three dots)
4. Tap **"Install app"** or **"Add to Home screen"**

### iPhone (Safari)
1. Open the site in Safari
2. Tap **Share** button
3. Tap **"Add to Home Screen"**

### Notes
- **Install prompt not showing?** iOS does not support the same install prompt as Android. Use Safari  Share  Add to Home Screen.
- **Mobile UI** is optimized to avoid clipping/hidden values for large budgets and long profile names.

---

## Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Set environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy

### Supabase Configuration

1. **Authentication** -> Enable Email + Google OAuth
2. **URL Configuration** -> Add your Vercel domain to redirect URLs
3. **Database** -> Run the SQL schema files
4. **Storage** -> Create "receipts" bucket for bill photos

---

## Documentation

- [User Manual](./USER_MANUAL.md) - Complete user guide
- [Video Script](./VIDEO_SCRIPT.md) - App promotion video script
- [Changelog](./CHANGELOG.md) - Version history and updates

---

## Roadmap

- [x] Multi-profile expense tracking
- [x] Budget management
- [x] Savings goals
- [x] Charts and analytics
- [x] Enhanced recurring bills (presets, variable amounts, due dates, grace periods)
- [x] Bill reminders with smart notifications
- [x] Grocery receipt OCR
- [x] Search and filter
- [x] Income source management

### Upcoming
- [ ] Multi-currency support
- [ ] Dark mode
- [ ] Offline mode enhancement
- [ ] Push notifications

---

## License

MIT License - see [LICENSE](./LICENSE) file

---

## Contact & Support

- **Issues:** [GitHub Issues](https://github.com/rettey8810-byte/kharadhu-baradhu/issues)

---

Built for Maldivian families.

**Kharadhu Baradhu - Track Family Expenses**
