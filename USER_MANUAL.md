# Kharadhu Baradhu - User Manual

Complete guide to using the Family Expense Tracker.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Managing Profiles](#managing-profiles)
3. [Adding Transactions](#adding-transactions)
4. [Managing Categories](#managing-categories)
5. [Income Sources](#income-sources)
6. [Budget Planning](#budget-planning)
7. [Savings Goals](#savings-goals)
8. [Grocery Receipt OCR](#grocery-receipt-ocr)
9. [Reports & Analytics](#reports--analytics)
10. [Recurring Expenses](#recurring-expenses)
11. [Bill Reminders](#bill-reminders)
12. [Search & Filter](#search--filter)
13. [Tips & Best Practices](#tips--best-practices)

---

## Getting Started

### 1. Sign Up / Log In

1. Open the app at https://kharadhu-baradhu.vercel.app
2. Click **"Sign In"**
3. Choose one of:
   - **Email/Password** - Create account with email
   - **Google** - One-click sign-in (recommended)

### 2. Your First Profile

When you sign up, a **"Personal"** profile is automatically created with default categories.

To switch or add profiles:
1. Look at the **Active Profile** dropdown in the header
2. Select a different profile, or
3. Go to **Profiles** page to create new ones

### 2.1 Install as a Mobile App (PWA)

You can install Kharadhu Baradhu like a mobile app for faster access.

#### Android (Chrome)
1. Open the app in Chrome
2. On the Dashboard, tap the **Install** banner button, or
3. Chrome menu (three dots) -> **Install app** / **Add to Home screen**

#### iPhone (Safari)
1. Open the app in Safari
2. Tap **Share**
3. Tap **Add to Home Screen**

**Tip:** If you don't see an install prompt, iOS requires the Safari Share method.

### 3. Profile Types

- **Personal** - Your individual expenses
- **Family** - Shared household expenses
- **Business** - Work-related expenses

---

## Managing Profiles

### Create a New Profile

1. Go to **Profiles** (from side menu or bottom navigation)
2. Click **"Add Profile"**
3. Enter:
   - Profile name (e.g., "Family 2024")
   - Type (Personal/Family/Business)
4. Click **Create**

**Note:** New profiles automatically get default categories (Food, Transport, Bills, etc.).

### Switch Profiles

Use the **Active Profile** dropdown in the header to quickly switch between profiles. All your data (transactions, budgets, goals) is separated by profile.

### Delete a Profile

**Warning:** Deleting a profile removes ALL its data permanently.

1. Go to **Profiles** page
2. Find the profile you want to delete
3. Click the **trash icon**
4. Confirm deletion

---

## Adding Transactions

### Add an Expense

1. Click **"Add"** in bottom navigation
2. Select **"Expense"** type
3. Fill in:
   - **Amount** - Enter in MVR
   - **Date** - Defaults to today
   - **Category** - Select from dropdown
   - **Description** - Optional (e.g., "Lunch at restaurant")
   - **Notes** - Optional detailed notes
   - **Tags** - Optional keywords (press Enter after each)
   - **Receipt Photo** - Optional image upload
4. Click **"Save Transaction"**

### Add Income

1. Click **"Add"** in bottom navigation
2. Select **"Income"** type
3. Fill in:
   - **Amount** - Enter in MVR
   - **Date** - Defaults to today
   - **Income Source** - Select or create sources (Salary, Food Allowance, etc.)
   - **Description** - Optional
4. Click **"Save Transaction"**

### Edit/Delete a Transaction

1. Go to **Dashboard** or **Search** to find the transaction
2. Click on the transaction
3. Choose **Edit** or **Delete**

---

## Managing Categories

Categories help you organize expenses. Default categories are created automatically, but you can customize them.

### View All Categories

Go to **Categories** from the side menu.

### Add a New Category

1. Go to **Categories** page
2. Enter category name in the input field
3. Click **"Add"**

### Archive/Unarchive a Category

Archived categories won't appear in the Add Transaction dropdown, but old transactions keep the category.

1. Go to **Categories** page
2. Find the category
3. Click **"Archive"** or **"Unarchive"**

**Default Categories:**
- Food & Dining
- Transport
- Bills & Utilities
- Shopping
- Entertainment
- Health
- Education
- Other

---

## Income Sources

Manage your income sources (Salary, Allowances, etc.).

### Add Income Source

1. Go to **Income Sources** from the side menu
2. Enter source name (e.g., "Monthly Salary", "Food Allowance")
3. Click **"Add"**

### Rename Income Source

1. Go to **Income Sources** page
2. Click on the source name
3. Type new name
4. Press Enter or click outside to save

### Archive Income Source

1. Go to **Income Sources** page
2. Click **"Archive"** next to the source
3. Archived sources won't appear in the dropdown

**Suggested Income Sources:**
- Monthly Salary
- Food Allowance
- Accommodation Allowance
- Transport Allowance
- Other Income
- Bonus
- Freelance

---

## Budget Planning

Set monthly budgets to control spending.

### Set Monthly Budget

1. Go to **Budget** from bottom navigation
2. You'll see the current month's budget view
3. Enter your **Total Budget** for the month
4. Enter your **Income Goal** (expected income)
5. Add any **Notes**
6. Budget automatically saves

### Set Category Budgets

1. Go to **Category Budgets** from the side menu
2. Select a category
3. Enter budget amount
4. Set **Alert Threshold** (e.g., 80% - you'll get warned when you reach 80% of budget)
5. Click **"Save Budget"**

### View Budget Progress

On the **Dashboard**, you'll see:
- How much you've spent vs. budget
- Remaining balance
- Daily safe spend amount
- Progress bar showing budget usage

---

## Savings Goals

Track progress toward financial goals.

### Create a Savings Goal

1. Go to **Savings** from bottom navigation
2. Click **"Add Goal"**
3. Enter:
   - **Goal Name** (e.g., "New Phone", "Hajj Fund", "Emergency Fund")
   - **Target Amount** - How much you need
   - **Deadline** - Optional target date
   - **Color** - Pick a color for the goal
4. Click **"Create Goal"**

### Update Progress

1. Go to **Savings** page
2. Find your goal
3. Click **"Add"** to add money to the goal
4. Enter amount and click **"Add to Goal"**

### Mark Goal Complete

When you reach your target:
1. Find the goal
2. Click the **checkmark icon**
3. The goal moves to "Completed" section

---

## Grocery Receipt OCR

**Special feature for Groceries category!** Scan your grocery receipts and automatically extract items, prices, GST, and totals.

### How to Use

1. Add a new transaction
2. Select **Category = Groceries**
3. **Receipt becomes required**
4. Take or upload a photo of your grocery receipt
5. Click **"Extract Bill"**
6. The app will read the receipt and extract:
   - Shop name
   - Date
   - Subtotal
   - GST amount
   - Total (auto-fills the transaction amount!)
   - List of items with quantities and prices

7. **Review and Edit** - Check the extracted data and fix any errors
8. Click **"Save Transaction"**

### Tips for Best OCR Results

- Take photo in good lighting
- Keep receipt flat (not crumpled)
- Make sure all text is visible
- English receipts work best
- Review extracted items before saving

### What Gets Saved

- Original receipt photo (in Storage)
- Transaction with total amount
- Grocery bill details (shop, date, GST, subtotal, total)
- List of all items with quantities and prices
- Raw OCR text (for reference)

### Grocery Bills (History + Price Compare)

After you save grocery transactions with receipts, you can view them later:

1. Open the side menu
2. Tap **Grocery Bills**
3. Use tabs:
   - **Bills** - View saved bills and expand to see items
   - **Price Compare** - Compare prices across shops for the same item

---

## Reports & Analytics

### View Charts

1. Go to **Charts** from bottom navigation
2. Select month to view
3. See:
   - **Pie Chart** - Spending by category
   - Breakdown of expenses

### Monthly Comparison

1. Go to **Monthly Compare** from side menu
2. Select **Month** and **Year** from the dropdowns
2. See:
   - Current month vs. previous month
   - Total expense comparison
   - Total income comparison
   - Percentage change
   - Transaction count

### Yearly View

1. Go to **Yearly** from side menu
2. See all transactions for the year
3. Navigate by month

---

## Recurring Expenses

Set up automatic tracking for bills that repeat monthly/weekly. Perfect for tracking STELCO electricity, MWSC water, phone bills, rent, and subscriptions.

### Add Recurring Bill

1. Go to **Recurring Bills** from side menu
2. Click **"Add Recurring"**
3. **Select Bill Type** (or skip to enter manually):
   - STELCO Electricity
   - MWSC Water
   - Dhiraagu / Ooredoo Phone
   - Medianet TV/Internet
   - Netflix, Disney+, YouTube Premium
   - House Rent
   - Tuition / School Fees
   - Other
4. Choose **Fixed** or **Variable Amount**:
   - **Fixed** - Same amount every month (e.g., Rent 5000 MVR)
   - **Variable** - Amount changes (e.g., Electricity, Water)
5. Enter amount (for fixed bills)
6. Set **Due Day of Month** (e.g., "5" for 5th of every month)
7. Set **Grace Period** - Days to pay before marked overdue (e.g., 5 days)
8. Set **Reminder Days** - How many days before due date to remind you
9. Add optional **Provider** and **Account/Meter Number**
10. Click **"Add Bill"**

### How It Works

- **Manual Mark as Paid** (Recommended):
  - When bill is due, click **"Mark Paid"** button
  - Enter the amount you paid (for variable bills)
  - App creates expense transaction automatically
  - Next due date advances automatically
  - Bill shows **"Paid"** badge until next cycle

- **Auto Processing**:
  - Recurring items are processed automatically when you open the **Dashboard**
  - If you missed opening the app for some time, it will safely catch up due items
  
- **Fixed Amount Bills** - Can add estimated amount when creating
- **Variable Amount Bills** - Leave amount empty, enter when paying
- **Smart Reminders** - Get notified X days before due date
- **Grace Period** - Extra days to pay without being marked overdue
- **Visual Status**:
  - Red = Overdue (past grace period)
  - Yellow = Due today
  - Orange = In grace period
  - Gray = Normal

### Managing Bills

**Pause/Unpause:** Click the checkmark icon to temporarily disable a bill without deleting it.

**Delete:** Click the trash icon to permanently remove a bill.

**View Account Numbers:** Each bill card shows the stored account/meter number for easy reference.

---

## Bill Reminders

View all upcoming bills and due dates.

### View Reminders

Go to **Reminders** from the header bell icon or side menu.

### Types of Reminders

1. **Recurring Bill Reminders** - Auto-generated from your recurring expenses
2. **Overdue Alerts** - When a bill is past due

### Dismiss Reminders

Click the **X** to dismiss a reminder (won't show again for that bill).

---

## All Transactions

Central page to view, edit, and delete all your expenses and income in one place.

### Access

Go to **All Transactions** from the side menu.

### Features

- **View All** - See every transaction (expenses + income) in one list
- **Search** - Type to search by description, category, or income source
- **Filter** - Show: All | Expenses only | Income only
- **Summary Cards** - Total expenses and income at the top
- **Edit** - Click pencil icon to change amount, date, description, category
- **Delete** - Click trash icon to remove a transaction

### Editing Transactions

1. Click **pencil icon** on any transaction
2. Change:
   - Amount
   - Date
   - Description
   - Category (for expenses)
   - Income Source (for income)
3. Click **checkmark** to save
4. Click **X** to cancel

---

## Search & Filter

Find any transaction quickly.

### Search Transactions

1. Go to **Search** from side menu
2. Use filters:
   - **Keyword** - Search in description, notes, tags
   - **Type** - Expense or Income
   - **Amount Range** - Min and max amount
   - **Date Range** - From and to dates
3. Click **"Search"** or results update automatically

### Results

See matching transactions with:
- Date and amount
- Category or Income Source
- Description preview
- Click any transaction to view full details

---

## Tips & Best Practices

### Daily Habits

1. **Log expenses immediately** - Don't wait, log right after spending
2. **Use categories consistently** - Helps with accurate reports
3. **Add receipts** - Especially for Groceries (OCR saves time!)
4. **Review weekly** - Check your spending vs. budget weekly

### Monthly Routine

1. **Set budget at month start** - Plan your spending
2. **Review previous month** - Use Monthly Compare to see trends
3. **Update savings goals** - Add progress regularly
4. **Check recurring bills** - Make sure they're accurate

### Family Usage

1. **Create Family profile** - For shared household expenses
2. **Personal profile** - For individual spending
3. **Switch easily** - Use the profile dropdown

### Data Safety

- Data is stored securely in Supabase
- Your data is private (RLS policies protect it)
- Photos stored in your private Supabase storage
- Only you can access your data

---

## Troubleshooting

### Categories not showing?

- Check if profile was created properly
- Go to **Categories** page to see all categories
- If empty, there may be a sync issue - refresh the page

### Receipt OCR not working?

- Ensure photo is clear and well-lit
- English receipts work best
- You can manually enter data if OCR fails
- Check that you're on the Groceries category

### Can't save transaction?

- Check all required fields are filled
- Ensure you have an active profile selected
- Check internet connection

### Budget not showing on dashboard?

- Go to **Budget** page and set a budget for the current month
- Budget must be set for each month separately

---

## Dark Mode

Switch between light and dark themes for comfortable viewing day or night.

### Toggle Dark Mode

1. Look for the **Moon/Sun icon** in the header (top right)
2. Click to toggle between light and dark mode
3. Your preference is saved automatically

### Automatic Detection

- The app automatically detects your system theme preference on first load
- You can still manually override it anytime

---

## Recurring Income

Set up automatic tracking for income that repeats monthly (salary, allowances, etc.). Never forget to log your income!

### Add Recurring Income

1. Go to **Recurring Income** from the side menu
2. Click **"Add Recurring"**
3. **Select Income Type** (or enter manually):
   - Monthly Salary
   - Food/Accommodation/Transport Allowances
   - Bonus/Commission
   - Freelance Income
   - Other Income
4. Enter **Amount** (leave empty if variable)
5. Set **Due Day of Month** (e.g., "25" for 25th of every month)
6. Set **Reminder Days** - How many days before due date to remind you
7. Select **Income Source**
8. Click **"Add Income"**

### How It Works

- **Auto-Creation** - Income transaction created automatically on due date
- **Smart Reminders** - Get notified X days before income is expected
- **Next Due Tracking** - See upcoming income dates
- **Pause/Resume** - Click checkmark icon to temporarily disable

---

## Export Reports

Download your financial data for tax preparation, analysis, or backup.

### Generate Report

1. Go to **Export Reports** from the side menu
2. Choose **Report Type**:
   - Monthly - Specific month report
   - Yearly - Full year summary
3. Select **Period** (year and month if applicable)
4. Choose **Export Format**:
   - CSV - Opens in Excel, Google Sheets, Numbers
   - JSON - Structured data for analysis
5. Click **Download Report**

### What's Included

- Complete transaction list (date, type, category, amount)
- Summary with totals, savings, budget status
- Transaction count
- Budget vs Actual comparison (monthly reports)

### Use Cases

- **Tax Preparation** - Export yearly report for tax filing
- **Analysis** - Import CSV into spreadsheet for custom charts
- **Backup** - Keep offline copy of your financial data

---

## Quick Widget

Fastest way to add expenses - no navigation, just add and go!

### Access Quick Add

1. Go to **Quick Add** from side menu, OR
2. Bookmark `/quick-add` page, OR
3. Add to home screen for instant access

### Use Presets

Tap any preset to pre-fill:
- **Coffee** - 35 MVR
- **Lunch** - 80 MVR
- **Transport** - 15 MVR
- **Groceries** - 200 MVR
- **Electricity** - 500 MVR

### Custom Entry

1. Adjust the amount if needed
2. Add description (optional)
3. Select category
4. Tap **Add Expense**
5. Done! Auto-redirects to Dashboard

### Pro Tip

Add `/quick-add` to your phone's home screen for one-tap expense tracking!

---

## Smart Insights

AI-powered financial analysis that watches your spending patterns and alerts you to important trends.

### Viewing Insights

1. Go to **Dashboard** - Insights appear automatically below your budget card
2. Look for colored alert cards:
   - **Red** - Critical issues (running out of money, spending > income)
   - **Yellow** - Warnings (category overspend, unusual expenses)
   - **Green** - Positive (under budget, healthy spending)

### Types of Insights

- **Spending Alert** - "You've spent more than your income this month"
- **Category Warning** - "Food is 40% of your budget (usual: 25%)"
- **Unusual Expense** - Flags transactions >500 MVR
- **Spending Prediction** - "At this rate, you'll have 200 MVR left at month-end"
- **Income Reminder** - "No income recorded yet this month"
- **Savings Opportunity** - "You're under budget - potential to save 300 MVR"

---

## Cash Flow Forecast

Predict your financial future - see if you'll run out of money before month-end.

### Viewing Forecast

1. Go to **Dashboard** - Cash Flow card appears below Smart Insights
2. View your financial health at a glance:
   - Current Balance (income - expenses so far)
   - Projected End Balance (including upcoming recurring items)
   - Daily Burn Rate (average daily spending)

### Understanding the Colors

- **Green** - Healthy balance, you'll save money this month
- **Yellow** - Small buffer, be careful with spending
- **Orange** - Expenses exceed income, need to cut back
- **Red** - At risk of running out before month-end

### Run-out Prediction

If you're spending faster than earning, the app predicts:
- **Days until zero** - How long current money will last
- **Run-out date** - When you'll run out at current rate
- **Warning** - Early alert to adjust spending

---

## Voice Input

Hands-free expense entry - just speak your expense details!

### Using Voice Input

1. Go to **Add Transaction** page
2. Look for the **🎤 Voice** button next to Description field
3. Tap and speak clearly:
   - "Add 50 MVR for lunch"
   - "Coffee 35"
   - "Transport 15 MVR"
   - "Spent 200 on groceries"
4. The app auto-parses amount and description

### What You Can Say

- **Amount + Description**: "Add 50 MVR for lunch"
- **Just Amount**: "35 MVR"
- **Common Items**: "Coffee", "Lunch", "Transport", "Groceries"
- **Full Sentences**: "I spent 100 on food today"

### Browser Support

- **Chrome** - Full support (desktop & Android)
- **Safari** - Supported on iOS 14.5+
- **Edge** - Supported
- **Firefox** - Limited support

### Troubleshooting

- **"No speech detected"** - Speak louder or check microphone
- **"Microphone permission denied"** - Allow microphone access in browser settings
- **Wrong amount parsed** - Speak numbers clearly, e.g., "fifty" or "five zero"

---

## Profile Sharing (Multi-User Access)

Share your Family profile with spouse, parents, or household members for collaborative expense tracking.

### Access Profile Sharing

1. Go to **Profile Sharing** from side menu
2. View current members and their roles
3. Invite new family members

### Member Roles

- **Owner** - Full control, can delete profile, manage all members
- **Admin** - Can add/edit transactions, invite members, manage settings
- **Member** - Can add transactions and view reports only

### Inviting Family Members

1. Go to **Profile Sharing**
2. Enter **Email Address** of family member
3. Select **Role** (Member or Admin)
4. Click **"Send Invitation"**
5. They receive email with acceptance link

### Accepting Invitations

1. Check your email for invitation
2. Click **Accept Invitation** link
3. Sign in (or create account if new)
4. Profile appears in your profile selector

### Real-time Sync

- All members see updates instantly
- No refresh needed
- Works across all devices
- Changes are live for everyone

### Managing Members

- **Remove Member** - Click trash icon (Owner/Admin only)
- **Change Role** - Contact Owner to upgrade/downgrade
- **Leave Profile** - Switch to another profile, contact Owner to remove you

---

## Offline Mode

Work without internet connection - your changes sync automatically when you're back online.

### How It Works

1. **Go Offline** - App continues working normally
2. **Make Changes** - Add transactions, edit entries - all saved locally
3. **Offline Indicator** - Yellow toast shows "Offline - Changes will sync when connected"
4. **Go Online** - App automatically syncs all queued changes
5. **Sync Complete** - Green toast confirms sync finished

### What Works Offline

- Add new transactions
- Edit existing transactions
- Add recurring expenses/income
- View all data (cached)

### What Requires Internet

- Profile sharing/sync
- Export reports
- Initial login
- Some analytics

### Sync Status

- **Pending Changes** - Number shown in sync indicator
- **Syncing** - Spinning indicator with count
- **Last Sync** - Timestamp of successful sync

### Troubleshooting

- **Changes not syncing** - Check internet connection, app will retry
- **Sync stuck** - Refresh page after connection restored
- **Data conflict** - Last edit wins (timestamp-based)

---

## Troubleshooting

- **GitHub Issues:** https://github.com/rettey8810-byte/kharadhu-baradhu/issues
- Check the **README** for technical details

---

**Happy Tracking!**

*Kharadhu Baradhu - Track Family Expenses*