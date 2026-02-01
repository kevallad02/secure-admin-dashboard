# Supabase Setup Instructions

## 1. Run SQL Migrations

Go to your Supabase project → SQL Editor → New Query and run the following SQL:

```sql
-- Copy the content from: supabase/migrations/001_initial_schema.sql
```

This will create:
- `profiles` table with role-based access
- `activity_logs` table for tracking user actions
- Row Level Security (RLS) policies
- Automatic profile creation trigger

## 2. Create Your First Admin User

After running the migrations:

1. Sign up for an account in your app
2. Go to Supabase → Table Editor → profiles
3. Find your user and manually change the `role` from 'user' to 'admin'

## 3. Deploy Edge Function

Install Supabase CLI if you haven't:
```bash
npm install -g supabase
```

Login to Supabase:
```bash
supabase login
```

Link your project:
```bash
supabase link --project-ref YOUR_PROJECT_REF
```

Deploy the edge function:
```bash
supabase functions deploy get_dashboard_stats
```

## 4. Test Edge Function

You can test the edge function in Supabase Dashboard:
- Go to Edge Functions → get_dashboard_stats
- Click "Invoke Function"
- Add Authorization header with a valid JWT token

## 5. Environment Variables

Create a .env file for local development and a .env.production file for build/preview.
Use the template in .env.example:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Notes:
- Vite embeds env values at build time. For npm run build + npm run preview, .env.production must be present before building.
- For local dev (npm run dev), use .env.

## 6. Verify Setup

1. Start your dev server: `npm run dev`
2. Sign up with a new account
3. Check Supabase Table Editor - you should see:
   - A new row in `profiles` table with role='user'
4. Manually change your role to 'admin'
5. Refresh the app - you should now see dashboard stats

## Troubleshooting

### RLS Policies Blocking Access
- Make sure you're logged in
- Verify your role is set to 'admin' in the profiles table
- Check browser console for any auth errors

### Edge Function Errors
- Check function logs in Supabase Dashboard
- Verify SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in function secrets
- Make sure you're passing Authorization header with Bearer token

### No Stats Showing
- Check if edge function is deployed successfully
- Open browser DevTools → Network tab to see if function call succeeds
- Verify you have at least one profile in the database
