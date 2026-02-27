# Changelog

All notable changes to Kharadhu Baradhu will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2025-02-27

### Added - Major Features

#### Core Expense Tracking
- **Multi-Profile Support** - Create and switch between Personal, Family, and Business profiles
- **Expense & Income Tracking** - Log transactions with amount, date, category, and notes
- **Smart Categories** - Default categories auto-created for new profiles (Food, Transport, Bills, etc.)
- **Tags System** - Add custom tags to transactions for better organization
- **Receipt Photos** - Attach receipt images to any transaction

#### Grocery Receipt OCR
- **Free OCR Integration** - Uses Tesseract.js (no paid API needed)
- **Auto-Extraction** - Scans receipts and extracts:
  - Shop name
  - Bill date
  - Subtotal, GST, Total (auto-fills transaction amount!)
  - Line items with quantities and prices
- **Editable Review** - Review and correct extracted data before saving
- **Structured Storage** - Saves grocery bills and items to database

#### Budget Management
- **Monthly Budgets** - Set total budget and income goals per month
- **Category Budgets** - Set individual category limits with alert thresholds
- **Progress Tracking** - Visual progress bars and daily safe spend calculations
- **Budget Alerts** - Get warned when approaching budget limits

#### Income Management
- **Income Sources** - Manage multiple income types (Salary, Allowances, etc.)
- **Income Sources Screen** - Add, edit, archive income sources
- **Income vs Expense** - Track net balance and remaining budget

#### Savings Goals
- **Goal Creation** - Set target amounts and deadlines
- **Progress Tracking** - Visual progress bars with color coding
- **Deposit History** - Add partial amounts toward goals
- **Goal Completion** - Mark goals as completed

#### Analytics & Reports
- **Dashboard Overview** - Monthly summary, budget status, recent transactions
- **Pie Charts** - Visual breakdown of spending by category
- **Monthly Comparison** - Compare current vs previous month (expense, income, count)
- **Yearly View** - Browse all transactions by year and month
- **Search & Filter** - Find transactions by keyword, amount, date range, type

#### Recurring Expenses
- **Bill Scheduling** - Set up recurring bills (daily, weekly, monthly, yearly)
- **Auto-Transactions** - Creates transactions automatically when bills are due
- **Next Due Tracking** - See upcoming bills on dashboard
- **Active/Inactive Toggle** - Pause recurring bills when needed

#### Bill Reminders
- **Automatic Reminders** - Generated from recurring expenses
- **Overdue Alerts** - Visual warnings for past-due bills
- **Dismissible** - Mark reminders as read/dismissed
- **Bell Icon** - Quick access from header

#### Data & Security
- **Supabase Auth** - Secure email/password and Google OAuth
- **Row Level Security (RLS)** - Users can only access their own data
- **Profile Isolation** - Complete data separation between profiles
- **Real-time Sync** - Changes sync across devices instantly
- **Storage Bucket** - Secure receipt photo storage

### Technical

#### Architecture
- **React 18** with TypeScript
- **Vite** for fast builds
- **Tailwind CSS** for styling
- **Supabase** for backend (Auth, Database, Storage)
- **Recharts** for data visualization
- **Tesseract.js** for OCR (free, client-side)
- **Lucide React** for icons

#### Database Schema
- `expense_profiles` - User profiles
- `expense_categories` - Expense categories
- `income_sources` - Income source types
- `transactions` - All expenses and income
- `monthly_budgets` - Monthly budget settings
- `category_budgets` - Per-category budgets
- `savings_goals` - Savings targets
- `recurring_expenses` - Recurring bill schedule
- `bill_reminders` - Generated reminders
- `receipts` - Receipt metadata
- `grocery_bills` - Structured grocery receipt data
- `grocery_bill_items` - Line items from grocery receipts

#### Security Features
- All tables have RLS enabled
- Users can only access data through their profiles
- Policies for SELECT, INSERT, UPDATE, DELETE on all tables
- Secure file storage with user-specific paths

### UI/UX
- **Responsive Design** - Works on mobile, tablet, desktop
- **PWA Ready** - Can be installed as mobile app
- **Bottom Navigation** - Quick access to main features
- **Side Menu** - Full navigation with all features
- **Profile Switcher** - Easy profile switching from header
- **Loading States** - Skeleton loaders and spinners
- **Error Handling** - Clear error messages
- **Empty States** - Helpful messages when no data

### Documentation
- README.md - Project overview and setup
- USER_MANUAL.md - Complete user guide
- VIDEO_SCRIPT.md - Marketing video scripts
- CHANGELOG.md - This file

---

## [Unreleased]

### Planned Features
- [ ] Export to Excel/PDF
- [ ] Multi-currency support
- [ ] Dark mode theme
- [ ] Enhanced offline mode
- [ ] Push notifications
- [ ] Budget reports via email
- [ ] Data backup/restore
- [ ] Shared family access (multiple users per profile)

---

## Version History Format

```
[MAJOR.MINOR.PATCH] - YYYY-MM-DD

MAJOR - Incompatible API changes
MINOR - Added functionality (backwards compatible)
PATCH - Bug fixes (backwards compatible)
```

---

**Legend:**
- **Added** - New features
- **Changed** - Changes to existing functionality
- **Deprecated** - Soon-to-be removed features
- **Removed** - Removed features
- **Fixed** - Bug fixes
- **Security** - Security improvements

---

*Last updated: February 27, 2025*
