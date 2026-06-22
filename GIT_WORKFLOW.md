# Git Push Workflow Guide

This guide explains how to push changes from your local project to GitHub for automatic Vercel deployment.

## Quick Push (One Command)

```powershell
npm run build ; git add . ; git commit -m "Your commit message" ; git push origin main
```

> **Note:** On Windows PowerShell, use semicolons (`;`) to chain commands. Do NOT use `&&` as it causes parsing errors.

---

## Step-by-Step Push Process

### 1. Build the Project

First, verify your code compiles correctly:

```bash
npm run build
```

If the build succeeds, you'll see output like:
```
vite v5.x.x building for production...
✓ built in 26.99s
```

### 2. Stage Your Changes

Add the files you want to commit:

```bash
# Add specific file
git add src/pages/Loans.tsx

# Or add all changed files
git add .
```

### 3. Commit Changes

Create a commit with a descriptive message:

```bash
git commit -m "Description of what you changed"
```

**Good commit message examples:**
- `Add include_in_overall checkbox to EditLoanModal`
- `Fix bug in payment calculation`
- `Update styling for mobile responsive design`

### 4. Push to GitHub

Send your commits to the remote repository:

```bash
git push origin main
```

---

## What Happens Next

Once you push to GitHub:

1. **Vercel automatically detects the push**
2. **Build process starts** (usually takes 1-2 minutes)
3. **Deployment completes** and the live site is updated
4. **Check your site** at `https://kharadhu-baradhu.vercel.app`

---

## Common Commands Reference

| Command | Purpose |
|---------|---------|
| `git status` | See which files have been modified |
| `git log --oneline -5` | View last 5 commits |
| `git diff` | See what changes are unstaged |
| `git pull origin main` | Get latest changes from GitHub |

---

## Troubleshooting

### Build Errors
If `npm run build` fails:
1. Check the error message in the terminal
2. Fix the TypeScript/ESLint issues
3. Run `npm run build` again until it succeeds

### Push Rejected
If you get "rejected" errors:
```bash
git pull origin main   # Get latest changes first
git push origin main   # Then push again
```

### PowerShell Parsing Error
**Error:** `The token '&&' is not valid`

**Solution:** Use semicolons instead:
```powershell
# Wrong (causes error):
npm run build && git add . && git commit -m "test" && git push

# Correct:
npm run build ; git add . ; git commit -m "test" ; git push
```

---

## Project Information

- **Repository:** `rettey8810-byte/kharadhu-baradhu`
- **Deployment:** Vercel (auto-deploys on every push)
- **Live URL:** https://kharadhu-baradhu.vercel.app
- **Default Branch:** `main`

---

## Tips

1. **Always build before pushing** - Catch errors early
2. **Write clear commit messages** - Helps track changes
3. **Push frequently** - Small, regular commits are better than large ones
4. **Check Vercel dashboard** if deployment fails: https://vercel.com/dashboard
