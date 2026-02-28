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

## Need Help?

- **GitHub Issues:** https://github.com/rettey8810-byte/kharadhu-baradhu/issues
- Check the **README** for technical details

---

**Happy Tracking!**

*Kharadhu Baradhu - Track Family Expenses*