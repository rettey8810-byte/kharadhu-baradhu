# Maraamathu - Maldives Service Marketplace Platform

[![Live Demo](https://img.shields.io/badge/Live%20Demo-maramaathu.vercel.app-blue)](https://maramaathu.vercel.app)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

A modern service marketplace platform connecting customers with skilled workers for home and business services. Built with React, TypeScript, Supabase, and Tailwind CSS.

🌐 **Live Site:** https://maramaathu.vercel.app  
📱 **Mobile-friendly** | 🔐 **Secure Auth** | ⚡ **Real-time Updates**

---

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
- [User Guide](#user-guide)
- [Admin Setup](#admin-setup)
- [Deployment](#deployment)
- [Contributing](#contributing)

---

## 🚀 Features

### For Customers
- ✅ **Post Jobs** - Create service requests in 30 seconds
- ✅ **Browse Workers** - View verified worker profiles with ratings
- ✅ **Compare Quotes** - Receive and compare multiple quotations
- ✅ **Track Progress** - Real-time updates on job status
- ✅ **Secure Reviews** - Rate and review completed jobs
- ✅ **Service Categories** - AC, Plumbing, Electrical, Carpentry, Painting, and more

### For Workers
- ✅ **Create Profile** - Showcase skills, experience, and portfolio
- ✅ **Job Notifications** - Get alerted for matching jobs nearby
- ✅ **Submit Quotes** - Competitive pricing for each job
- ✅ **Manage Schedule** - Track inspections, work, and payments
- ✅ **Build Reputation** - Earn ratings and reviews
- ✅ **Dashboard Analytics** - View job history and earnings

### For Admins
- ✅ **User Management** - Create, update, delete users
- ✅ **Password Reset** - Reset passwords for any user
- ✅ **Account Control** - Activate/deactivate accounts
- ✅ **Platform Monitoring** - View all jobs and users
- ✅ **Secure Edge Functions** - Server-side admin operations

### Technical Features
- 🔐 **Google OAuth** - One-click sign-in
- ⚡ **Real-time Sync** - Live data updates across all users
- 📱 **PWA Ready** - Install as mobile app
- 🎨 **Responsive Design** - Works on all devices
- 🛡️ **RLS Security** - Row Level Security with Supabase
- 🌍 **Maldives-focused** - Local service categories and currency (MVR)

### PWA (Install as App)

The website can be installed like a normal app.

- **Android (Chrome)**
  - Open https://maramaathu.vercel.app
  - Tap the browser menu
  - Tap **"Install app"** or **"Add to Home screen"**

- **iPhone (Safari)**
  - Open https://maramaathu.vercel.app in **Safari** (not inside Facebook/Instagram browser)
  - Tap **Share**
  - Tap **"Add to Home Screen"**

If the install option does not show:
- Make sure you are on **HTTPS**
- Hard refresh and try again
- Avoid opening inside an in-app browser

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, TypeScript, Tailwind CSS |
| **Backend** | Supabase (Auth, Database, Realtime) |
| **Edge Functions** | Deno/TypeScript (Admin operations) |
| **Build** | Vite |
| **Icons** | Lucide React |
| **Deployment** | Vercel |
| **Database** | PostgreSQL + Supabase |

---

## ⚡ Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
# 1. Clone repository
git clone https://github.com/Rettey-G/Maramaathu.git
cd Maramaathu

# 2. Install dependencies
npm install

# 3. Create environment file
cp .env.example .env.local

# 4. Add your Supabase credentials to .env.local
# VITE_SUPABASE_URL=your_supabase_url
# VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# 5. Start development server
npm run dev
```

Open http://localhost:5173

---

## 📖 User Guide

### Getting Started

1. **Sign Up/Login**
   - Visit https://maramaathu.vercel.app
   - Click "Sign In"
   - Use Google sign-in or email/password

2. **Choose Your Role**
   - **Customer** - Need services done
   - **Worker** - Provide skilled services
   - **Admin** - Manage the platform

### Customer Workflow

```
Post Job → Workers Show Interest → Review Quotes → 
Accept Quote → Inspection → Work → Payment → Review
```

1. **Post a Service Request**
   - Select category (Plumbing, AC, etc.)
   - Describe the job
   - Set budget (optional)
   - Set urgency

2. **Review Interested Workers**
   - View worker profiles
   - Check ratings and reviews
   - Compare quotations

3. **Approve and Track**
   - Accept a worker/quote
   - Schedule inspection
   - Confirm work completion
   - Leave a review

### Worker Workflow

```
Create Profile → Browse Jobs → Submit Quote → 
Get Selected → Complete Work → Receive Payment
```

1. **Complete Your Profile**
   - Add skills and categories
   - Upload work photos
   - Set contact info

2. **Find Jobs**
   - Browse available requests
   - Filter by category
   - Express interest

3. **Submit Quotes**
   - Competitive pricing
   - Add notes
   - Wait for customer selection

4. **Manage Jobs**
   - Schedule inspections
   - Update progress
   - Mark completion

---

## 🔐 Admin Setup

### Initial Admin User

1. Sign up as a regular user
2. In Supabase Dashboard, go to `profiles` table
3. Find your user and change `role` to `admin`

### Deploy Admin Edge Function

```bash
# 1. Install Supabase CLI via Scoop (Windows)
scoop install supabase

# 2. Login
supabase login

# 3. Link project
supabase link --project-ref your-project-ref

# 4. Set Service Role Key secret
supabase secrets set SERVICE_ROLE_KEY=your_service_role_key

# 5. Deploy function
supabase functions deploy admin-users --no-verify-jwt
```

### Admin Capabilities

- **Create Users** - Add customers/workers with temporary passwords
- **Reset Passwords** - Reset any user's password
- **Delete Users** - Remove accounts permanently
- **Activate/Deactivate** - Control account access

---

## 🚀 Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project in Vercel
3. Set environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy

### Supabase Configuration

1. **Authentication** → Enable Email + Google OAuth
2. **URL Configuration** → Add your Vercel domain
3. **Edge Functions** → Deploy `admin-users` function
4. **Database** → Run schema from `supabase-schema.sql`

### Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | (Server-side only) Admin operations |

---

## 📊 Database Schema

### Tables

- **profiles** - User accounts (customer/worker/admin)
- **worker_profiles** - Extended worker details
- **customer_profiles** - Extended customer details
- **service_requests** - Job postings
- **reviews** - Ratings and feedback

### Security

All tables have Row Level Security (RLS) enabled:
- Users can only access their own data
- Workers see relevant jobs
- Admins have full read access
- Edge Functions bypass RLS with Service Role

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/my-feature`
3. Commit changes: `git commit -m 'Add new feature'`
4. Push to branch: `git push origin feature/my-feature`
5. Open a Pull Request

### Code Style
- TypeScript strict mode
- ESLint + Prettier
- Component-based architecture
- Hooks for state management

---

## � Documentation

- [Video Script](./docs/VIDEO_SCRIPT.md) - Marketing video script
- [Changelog](./CHANGELOG.md) - Version history
- [User Handbook](./HANDBOOK.md) - Detailed user guide
- [Setup Guide](./SETUP.md) - Developer setup instructions

---

## �️ Roadmap

- [ ] Push notifications
- [ ] In-app messaging
- [ ] Payment gateway integration
- [ ] Mobile app (React Native)
- [ ] Advanced analytics
- [ ] Multi-language support
- [ ] Photo upload for jobs

---

## 📄 License

MIT License - see [LICENSE](./LICENSE) file

---

## 📞 Contact & Support

- **Issues:** [GitHub Issues](https://github.com/Rettey-G/Maramaathu/issues)

---

Built with ❤️ for the Maldives service community.

**Maraamathu - Get it done.**
