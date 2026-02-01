# Secure Admin Dashboard

A modern, secure admin dashboard starter built with React (Vite), Tailwind CSS, and Supabase. Features role-based access control, protected routes, and a responsive layout.

## Features

- ✅ **Authentication**: Email/password authentication with Supabase
- ✅ **Role-Based Access Control**: Three user roles (admin, manager, user)
- ✅ **Protected Routes**: Automatic route protection based on authentication and roles
- ✅ **Responsive Layout**: Mobile-friendly sidebar and topbar navigation
- ✅ **Pages Included**:
  - Login & Signup pages
  - Dashboard (all roles)
  - Users Management (admin only)
  - System Logs (all roles)

## Tech Stack

- **Frontend**: React 19 with Vite
- **Styling**: Tailwind CSS 4
- **Backend**: Supabase (Auth + Database)
- **Routing**: React Router DOM 7

## Prerequisites

- Node.js 18+ and npm
- A Supabase account and project

## Getting Started

### 1. Clone and Install

```bash
git clone <repository-url>
cd secure-admin-dashboard
npm install
```

### 2. Configure Supabase

Create a `.env` file in the root directory (use `.env.example` as template):

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Set Up Supabase Database

Run the following SQL in your Supabase SQL Editor to create the profiles table:

```sql
-- Create profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'manager', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Allow admins to view all profiles
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create a function to handle new user signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'user')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger to automatically create a profile when a user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### 4. Run the Application

```bash
# Development mode
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

The application will be available at `http://localhost:5173`

## Project Structure

```
src/
├── components/
│   ├── Layout.jsx          # Main layout with sidebar and topbar
│   ├── Sidebar.jsx         # Navigation sidebar
│   ├── Topbar.jsx          # Top navigation bar
│   └── ProtectedRoute.jsx  # Route protection wrapper
├── contexts/
│   └── AuthContext.jsx     # Authentication context provider
├── lib/
│   ├── supabase.js         # Supabase client configuration
│   └── auth.js             # Authentication service functions
├── pages/
│   ├── LoginPage.jsx       # Login page
│   ├── SignupPage.jsx      # Signup page
│   ├── DashboardPage.jsx   # Main dashboard
│   ├── UsersPage.jsx       # Users management (admin only)
│   └── LogsPage.jsx        # System logs viewer
├── App.jsx                 # Main app with routing
├── main.jsx                # Application entry point
└── index.css               # Global styles with Tailwind
```

## User Roles

The application supports three user roles with different access levels:

- **User**: Access to Dashboard and Logs
- **Manager**: Access to Dashboard and Logs
- **Admin**: Full access including Users management

Roles are assigned during signup and stored in the user's metadata and profiles table.

## Security Features

- ✅ No secrets in code (uses environment variables)
- ✅ Supabase Row Level Security (RLS) policies
- ✅ Protected routes with role-based access control
- ✅ Secure authentication flow
- ✅ Session management

## Development

### Linting

```bash
npm run lint
```

### Building

```bash
npm run build
```

The build output will be in the `dist` directory.

## Customization

### Adding New Pages

1. Create a new page component in `src/pages/`
2. Add the route in `src/App.jsx`
3. Update the sidebar navigation in `src/components/Sidebar.jsx`
4. Add role-based protection if needed using `<ProtectedRoute requiredRole="role">`

### Modifying Roles

To add or modify roles:

1. Update the role check in `src/components/ProtectedRoute.jsx`
2. Update the database constraint in Supabase
3. Update the role selector in `src/pages/SignupPage.jsx`

## Troubleshooting

### "Profiles table not found" error

Make sure you've run the SQL setup script in your Supabase SQL Editor to create the profiles table and triggers.

### Authentication not working

1. Verify your `.env` file has the correct Supabase URL and anon key
2. Check that your Supabase project is active
3. Ensure you've enabled email authentication in Supabase settings

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
