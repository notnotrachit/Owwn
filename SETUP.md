# Owwn - Setup Instructions

## Convex Auth Configuration

### 1. Generate JWT Keys

Run the following command to generate the required JWT keys:

```bash
node generateKeys.mjs
```

This will output two environment variables. Copy the entire output.

### 2. Set Environment Variables in Convex Dashboard

1. Go to your Convex dashboard: https://dashboard.convex.dev
2. Select your project: `owwn`
3. Go to Settings → Environment Variables
4. Paste the output from step 1 (this will set `JWT_PRIVATE_KEY` and `JWKS`)

### 3. Set SITE_URL for Local Development

Run this command to set the SITE_URL for local development:

```bash
npx convex env set SITE_URL http://localhost:5173
```

**Note:** Adjust the port number if your dev server runs on a different port.

### 4. Start Development

Run the development server:

```bash
npm run dev
```

This will:
- Start the Convex backend (watches for changes)
- Start the Vite dev server for the frontend
- Open your browser to the app

## Features

### Authentication
- **Password-based auth** using Convex Auth
- Sign up with email, password, and name
- Sign in with email and password
- Automatic user profile creation

### Groups
- Create groups for different expense contexts (roommates, trips, etc.)
- Add/remove members
- Admin and member roles

### Expenses
- Add expenses with description, amount, and category
- Split expenses equally among selected members
- Track who paid and who owes
- View expense history

### Balance Tracking
- Real-time balance calculations
- See who owes whom
- Suggested settlement paths (optimized to minimize transactions)

### Settlements
- Record payments between users
- Track settlement history
- Automatic balance updates

## Tech Stack

- **Frontend:** TanStack Start (React Router + SSR)
- **Backend:** Convex (serverless backend)
- **Auth:** Convex Auth with Password provider
- **Styling:** Tailwind CSS
- **Type Safety:** TypeScript throughout

## Project Structure

```
owwn/
├── convex/                 # Backend functions and schema
│   ├── auth.ts            # Auth configuration
│   ├── auth.config.ts     # Auth provider config
│   ├── http.ts            # HTTP routes for auth
│   ├── schema.ts          # Database schema
│   ├── users.ts           # User management functions
│   ├── groups.ts          # Group management functions
│   ├── expenses.ts        # Expense tracking functions
│   └── settlements.ts     # Settlement tracking functions
├── src/
│   ├── routes/            # TanStack Start routes
│   │   ├── index.tsx      # Home/Dashboard page
│   │   ├── groups/
│   │   │   ├── new.tsx    # Create group page
│   │   │   └── $groupId.tsx # Group detail page
│   │   └── __root.tsx     # Root layout
│   ├── lib/
│   │   └── auth-context.tsx # Auth hooks
│   └── styles/
│       └── app.css        # Global styles
└── package.json
```

## Next Steps

1. **Add more split types:** Currently only "equal" split is implemented. Add percentage and custom amount splits.
2. **Add receipts:** Allow users to upload receipt images for expenses.
3. **Add categories:** Predefined expense categories (Food, Transport, Entertainment, etc.)
4. **Add notifications:** Notify users when they're added to groups or expenses.
5. **Add export:** Export expense reports as CSV or PDF.
6. **Add currency support:** Multi-currency support with exchange rates.
7. **Mobile app:** Build a React Native version.

## Troubleshooting

### "Cannot find name 'process'" error in auth.config.ts
This is a TypeScript error that can be safely ignored. The code will work correctly at runtime.

### Authentication not working
1. Make sure you've set the JWT keys in the Convex dashboard
2. Make sure SITE_URL is set correctly
3. Check the browser console for errors
4. Try clearing your browser cache and localStorage

### Convex functions not updating
1. Make sure `npm run dev` is running
2. Check that the Convex CLI is watching for changes
3. Try restarting the dev server

## License

MIT
