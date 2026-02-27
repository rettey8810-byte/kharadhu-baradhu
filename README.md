# Kharadhu Baradhu - Family Expense Tracker

[![Live Demo](https://img.shields.io/badge/Live%20Demo-kharadhu--baradhu.vercel.app-emerald)](https://kharadhu-baradhu.vercel.app)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**Track family expenses, manage budgets, and save smarter.**

A modern expense tracking application built for Maldivian families. Track income, monitor spending, set savings goals, and manage grocery receipts with OCR. Built with React, TypeScript, Supabase, and Tailwind CSS.

🌐 **Live Site:** https://kharadhu-baradhu.vercel.app  
📱 **Mobile-friendly** | 🔐 **Secure Auth** | ⚡ **Real-time Sync** | 📊 **Smart Analytics**

---

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
- [Screenshots](#screenshots)
- [Deployment](#deployment)
- [Contributing](#contributing)

---

## 🚀 Features

### Core Features
- ✅ **Multi-Profile Support** - Separate profiles for Personal, Family, or Business
- ✅ **Expense Tracking** - Log expenses with categories, notes, and tags
- ✅ **Income Management** - Track multiple income sources (Salary, Allowances, etc.)
- ✅ **Smart Categories** - Default categories (Food, Transport, Bills, etc.) auto-created
- ✅ **Budget Planning** - Set monthly budgets and category limits
- ✅ **Savings Goals** - Track progress toward financial goals
- ✅ **Visual Analytics** - Charts and reports for spending insights
- ✅ **Recurring Expenses** - Auto-track bills and subscriptions
- ✅ **Bill Reminders** - Never miss a payment deadline
- ✅ **Grocery Receipt OCR** - Scan bills, auto-extract items, prices, GST
- ✅ **Search & Filter** - Find transactions by keyword, date, or amount
- ✅ **Monthly Comparison** - Compare current vs previous month spending

### Technical Features
- 🔐 **Supabase Auth** - Email/password and OAuth sign-in
- 🛡️ **Row Level Security** - Your data is private and secure
- ⚡ **Real-time Updates** - Live sync across devices
- 📱 **PWA Ready** - Install as mobile app
- 🎨 **Responsive Design** - Works on mobile, tablet, desktop
- 🌍 **Maldives Currency** - MVR (Maldivian Rufiyaa) support

---

## 🛠️ Tech Stack

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

## ⚡ Quick Start

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

## 📖 Database Setup

Run these SQL files in Supabase SQL Editor:

1. **Schema** - `supabase-expense-schema.sql`
2. **Additional Tables** - `supabase-expense-schema-additions.sql`
3. **Storage Setup** - `supabase-storage-setup.sql`

---

## � PWA Installation

Install Kharadhu Baradhu as a mobile app:

### Android (Chrome)
1. Open the live site in Chrome
2. Tap the menu (⋮)
3. Tap **"Install app"** or **"Add to Home screen"**

### iPhone (Safari)
1. Open the site in Safari
2. Tap **Share** button
3. Tap **"Add to Home Screen"**

---

## 🚀 Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Set environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy

### Supabase Configuration

1. **Authentication** → Enable Email + Google OAuth
2. **URL Configuration** → Add your Vercel domain to redirect URLs
3. **Database** → Run the SQL schema files
4. **Storage** → Create "receipts" bucket for bill photos

---

## 📄 Documentation

- [User Manual](./USER_MANUAL.md) - Complete user guide
- [Video Script](./VIDEO_SCRIPT.md) - App promotion video script
- [Changelog](./CHANGELOG.md) - Version history and updates

---

## 🗺️ Roadmap

- [x] Multi-profile expense tracking
- [x] Budget management
- [x] Savings goals
- [x] Charts and analytics
- [x] Recurring expenses
- [x] Bill reminders
- [x] Grocery receipt OCR
- [x] Search and filter
- [x] Monthly comparison
- [ ] Export to Excel/PDF
- [ ] Multi-currency support
- [ ] Dark mode
- [ ] Offline mode enhancement
- [ ] Push notifications

---

## 📄 License

MIT License - see [LICENSE](./LICENSE) file

---

## 📞 Contact & Support

- **Issues:** [GitHub Issues](https://github.com/rettey8810-byte/kharadhu-baradhu/issues)

---

Built with ❤️ for Maldivian families.

**Kharadhu Baradhu - Track Family Expenses**
