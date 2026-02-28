# Changelog

All notable changes to Kharadhu Baradhu will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.3.1] - 2026-03-01

### Added
- **Monthly Comparison Month/Year Selector** - View and compare any month (not only current vs previous)
- **Auto Recurring Processing on Dashboard** - Recurring expenses/income are processed when Dashboard loads (with safe catch-up)

### Fixed
- **Timezone Date Range Bugs** - Use local date formatting for month/year boundaries across Dashboard, Yearly View, and Monthly Comparison
- **Yearly View Missing Data** - Now aggregates across all profiles and shows both income and expense totals
- **Grocery Bills Filtering** - Added `profile_id` support for `grocery_bills` filtering (migration required for existing DB)
- **Auth Refresh Token Errors** - Invalid refresh token now triggers a clean sign-out so you can log in again

---

## [1.3.0] - 2026-02-28

### Added - Advanced Features

#### Smart Insights
- **Spending Alerts** - Warns when expenses exceed income
- **Category Analysis** - Alerts when one category exceeds 30% of budget
- **Unusual Expense Detection** - Flags large transactions (>500 MVR)
- **Spending Predictions** - Projects month-end balance based on current rate
- **Income Reminders** - Alerts when no income logged this month
- **Savings Opportunities** - Highlights when you're under budget

#### Cash Flow Forecast
- **Current Balance** - Real-time income minus expenses
- **Projected End Balance** - Predicts month-end based on upcoming recurring items
- **Upcoming Bills/Income** - Shows expected transactions this month
- **Run-out Prediction** - Calculates days until money runs out
- **Daily Burn Rate** - Average daily spending tracker
- **Visual Status** - Color-coded health indicator (green/yellow/red)

#### Voice Input
- **Hands-free Entry** - Add expenses by speaking
- **Smart Parsing** - Understands "Add 50 MVR for lunch" or "Coffee 35"
- **Category Detection** - Auto-detects from keywords (coffee, transport, groceries)
- **Browser Support** - Chrome/Safari Web Speech API
- **Quick Access** - Voice button on Add Transaction page

#### Multi-User Access (Profile Sharing)
- **Family Sharing** - Invite members to shared profiles
- **Role Management** - Owner, Admin, Member permissions
- **Real-time Sync** - All members see updates instantly
- **Invitation System** - Email-based invites with acceptance
- **Access Control** - `/profile-sharing` page to manage members

#### Offline Mode with Auto-Sync
- **Work Offline** - App functions without internet
- **Auto-Sync** - Uploads queued changes when connection restored
- **IndexedDB Storage** - Local queue for pending changes
- **Offline Indicator** - Visual toast when disconnected
- **Sync Progress** - Shows syncing status and pending count
- **Mutation Hook** - `useOfflineMutation()` for offline-aware operations

---

## [1.2.0] - 2026-02-28

### Added - New Features

#### Dark Mode
- **Theme Toggle** - Switch between light and dark mode from header
- **System Preference** - Automatically detects and respects system theme preference
- **Persistent** - Saves your preference to localStorage
- **Modern UI** - Complete dark theme support across all pages

#### Recurring Income
- **Income Presets** - Quick-setup for common income types:
  - Monthly Salary
  - Food/Accommodation/Transport Allowances
  - Bonus/Commission
  - Freelance Income
- **Auto-Tracking** - Automatically creates income transactions when due
- **Due Date Management** - Set pay day of month with reminders
- **Smart Reminders** - Get notified X days before income is expected
- **Pause/Resume** - Temporarily disable without deleting

#### Export Reports
- **Monthly/Yearly Reports** - Download complete financial reports
- **CSV Export** - Excel-compatible format for tax preparation and analysis
- **JSON Export** - Structured data for backups and integrations
- **Summary Included** - Totals, savings, budget status, transaction count
- **All Profiles** - Report includes data from all your profiles

#### Quick Widget
- **Standalone Page** - Fast expense entry at `/quick-add`
- **Common Presets** - One-tap adding for Coffee, Lunch, Transport, Groceries
- **Custom Amounts** - Adjust preset amounts before saving
- **PWA Shortcut** - Can be bookmarked or added to home screen for instant access
- **Minimal UI** - No navigation, just add and go

---

## [1.1.1] - 2026-02-28

### Added
- **PWA Install Banner** - Install button shown on Dashboard when supported
- **iOS Install Fallback** - Instructions shown when install prompt is not available (Safari Add to Home Screen)

### Fixed
- **Mobile Dashboard Cards** - Budget/Remaining values no longer get cut off on small screens
- **Mobile Header** - Active Profile selector no longer clipped on mobile

---

## [1.1.0] - 2025-02-27

### Added - Enhanced Recurring Bills
- **Bill Type Presets** - Quick-setup buttons for common Maldives bills:
  - STELCO Electricity, MWSC Water
  - Dhiraagu/Ooredoo Phone
  - Medianet TV/Internet
  - Netflix, Disney+, YouTube Premium
  - House Rent, Tuition/School Fees
- **Variable Amount Bills** - Handle bills that change monthly (electricity, water, phone)
  - Toggle between fixed and variable amounts
  - Optional estimated amount for variable bills
- **Manual Mark as Paid** - Option 2 workflow:
  - Click "Mark Paid" when bill is due
  - Enter actual amount paid
  - Creates expense transaction automatically
  - Advances next due date automatically
  - Shows "Paid" badge for paid bills
- **Due Date Management** - Set exact due day of month with smart calculations
- **Grace Period** - Days to pay before marked overdue (e.g., 5 days grace period)
- **Smart Reminders** - Get reminded X days before due date (customizable per bill)
- **Account/Meter Numbers** - Store reference numbers for each bill (separate fields)
- **Visual Status Indicators** - Color-coded status:
  - Red = Overdue (past grace period)
  - Yellow = Due today
  - Orange = In grace period
  - Gray = Normal

### Added - All Transactions Page
- **Central Transaction Management** - View all expenses and income in one place
- **CRUD Operations** - Edit and delete any transaction
- **Search & Filter** - Search by description, category, or income source
- **Type Filter** - Filter by All, Expenses, or Income
- **Summary Cards** - Total expenses and income displayed at top

### Added - Default Categories Enhancement
- **Groceries Category** - Added as default category for all new profiles
- **Income Sources** - Auto-created for new profiles (Salary, Food Allowance, Bonus, Other)

### Fixed
- **Income Display** - Dashboard now shows income source name instead of profile name
- **Side Menu Navigation** - Fixed navigation not working when clicking menu items
- **Income Source Dropdown** - Now shows placeholder when no sources available

### Technical
- Added new database columns: `is_variable_amount`, `due_day_of_month`, `grace_period_days`, `bill_type`, `provider`, `account_number`, `meter_number`
- Made `amount` column nullable for variable bills
- Added `bill_payments` table with transaction linking
- Updated `RecurringExpense` TypeScript interface
- New SQL file: `supabase-recurring-bills-enhancement.sql`

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

*Last updated: March 1, 2026*
