# Owwn - Quick Start Guide

## 🚀 Get Started in 3 Steps

### Step 1: Generate JWT Keys

```bash
node generateKeys.mjs
```

Copy the entire output (both `JWT_PRIVATE_KEY` and `JWKS`).

### Step 2: Configure Convex

1. Open your [Convex Dashboard](https://dashboard.convex.dev)
2. Select the `owwn` project
3. Go to **Settings** → **Environment Variables**
4. Paste the output from Step 1
5. Set SITE_URL:
   ```bash
   npx convex env set SITE_URL http://localhost:5173
   ```

### Step 3: Run the App

```bash
npm run dev
```

Visit http://localhost:5173 and start tracking expenses!

## 📝 First Time Using the App?

1. **Sign Up:** Click "Sign Up" and create an account with email and password
2. **Create a Group:** Click "+ Create Group" and name it (e.g., "Roommates")
3. **Add an Expense:** Open the group and click "+ Add Expense"
4. **Split It:** Select who the expense should be split between
5. **Track Balances:** See who owes what in real-time!

## 🎯 Key Features

- ✅ **Password Authentication** - Secure sign up/sign in
- 👥 **Groups** - Organize expenses by context
- 💰 **Expense Tracking** - Add and split expenses
- 📊 **Balance Calculation** - Real-time who-owes-whom
- 💸 **Smart Settlements** - Optimized payment suggestions
- 🌙 **Dark Mode** - Automatic theme support

## 🛠️ Tech Stack

- **TanStack Start** - Modern React framework with SSR
- **Convex** - Serverless backend with real-time sync
- **Convex Auth** - Built-in authentication
- **Tailwind CSS** - Utility-first styling
- **TypeScript** - End-to-end type safety

## 📚 Need Help?

Check out [SETUP.md](./SETUP.md) for detailed documentation.

---

**Owwn** - Own what you owe 💙
