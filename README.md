# Supabase User Management Platform

A complete user management system with role-based access control, credit management, and secure admin operations.

## 🚀 Features

- **User Authentication**: Email/password signup and signin
- **Profile Management**: Auto-created profiles with role-based access
- **Credit System**: User credits with admin management capabilities
- **Admin Panel**: Secure backend-powered admin operations
- **Row Level Security**: Proper RLS policies for data protection

## 🔧 Environment Setup

Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

**Important**: Never expose the service role key to the frontend. It's only used in backend functions.

## 🗄️ Database Schema

### Profiles Table
```sql
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE,
  full_name text,
  role text DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  credits integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### RLS Design

The app uses a **minimal, non-recursive RLS approach**:

1. **User Policies**: Users can only read/update their own profile
   ```sql
   -- Read own profile
   CREATE POLICY "read own profile" ON profiles 
   FOR SELECT USING (id = auth.uid());
   
   -- Update own profile  
   CREATE POLICY "update own profile" ON profiles 
   FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());
   ```

2. **Admin Operations**: Handled via secure backend functions with service role
   - No recursive policies that query the same table
   - Admin functions use `SECURITY DEFINER` with proper permission revocation
   - Backend verifies admin status before allowing operations

## 🔐 Admin Flow

### Frontend (Browser)
1. User authenticates with regular anon key
2. Frontend calls backend endpoint with user's JWT token
3. UI shows admin panel only if user has admin role

### Backend (Secure)
1. Validates user's JWT token
2. Uses service role to check user's admin status
3. Executes admin operations with elevated privileges
4. Returns results to frontend

### Admin Functions
- `admin_list_profiles()`: Returns all user profiles
- `admin_update_credits(user_id, change, reason)`: Updates user credits with logging

## 🏃‍♂️ Running Locally

### Frontend
```bash
npm install
npm run dev
```

### Backend (Supabase Edge Functions)
The admin backend runs as a Supabase Edge Function at:
```
https://your-project.supabase.co/functions/v1/admin-profiles
```

**Endpoints:**
- `GET /admin-profiles` - List all profiles (admin only)
- `POST /admin-profiles` - Update user credits (admin only)

### Security Hardening

All admin functions are secured with:
- `SECURITY DEFINER` with `postgres` owner
- `search_path` set to `public, pg_temp` to prevent injection
- Execute permissions granted only to `service_role`
- All public, anon, and authenticated access revoked

### Database Migrations
Run the migration to set up the complete schema:
```sql
-- Run supabase/migrations/security_hardening_final.sql
```

## 🧪 Testing

### Quick Edge Function Tests

```bash
# List profiles as admin (replace with your project URL and service role JWT)
curl -i https://YOUR-PROJECT.supabase.co/functions/v1/admin-profiles \
  -H "Authorization: Bearer $SERVICE_ROLE_JWT"

# Update credits as admin
curl -i -X POST https://YOUR-PROJECT.supabase.co/functions/v1/admin-profiles \
  -H "Authorization: Bearer $SERVICE_ROLE_JWT" \
  -H "Content-Type: application/json" \
  -d '{"action":"update_credits","p_user_id":"<uuid>","p_delta":25,"p_reason":"adjustment"}'
```

### Manual Tests

1. **User Profile Access**
   - Sign in as regular user
   - Click "Ping Supabase" - should see own profile only
   - Network tab should show `rest/v1/profiles` request returning 200

2. **Admin Access**
   - Sign in as admin user (role='admin' in profiles table)
   - Admin panel should show all users
   - Credit updates should work via backend endpoint

3. **Security Tests**
   - Non-authenticated requests should return 401/403
   - Regular users should not access admin functions
   - RLS should prevent cross-user data access

### Network Verification
Open DevTools → Network tab and look for:
- `rest/v1/profiles` - User profile queries (200 OK)
- `functions/v1/admin-profiles` - Admin operations (200 OK for admins, 403 for users)

## 🔍 Troubleshooting

### App Stuck Loading
1. Check console for auth bootstrap errors
2. Verify environment variables are set
3. Ensure RLS policies are not recursive
4. Check Network tab for failed requests

### 42P17 Recursive Policy Error
This happens when RLS policies query the same table they're protecting:
```sql
-- ❌ BAD: Recursive policy
CREATE POLICY "admin access" ON profiles 
USING (EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ✅ GOOD: Simple policy
CREATE POLICY "read own profile" ON profiles 
USING (id = auth.uid());
```

### Admin Functions Not Working
1. Verify user has `role = 'admin'` in profiles table
2. Check that admin functions exist and have proper permissions
3. Ensure backend endpoint is deployed and accessible

## 📝 Development Notes

- **No Mocks**: All data comes from real Supabase queries
- **Proper Error Handling**: All async operations have try/catch with logging
- **Loading States**: Always resolved in finally blocks
- **Security First**: Service role never exposed to frontend
- **Scalable**: Admin operations can handle large user bases via backend

## 🚀 Production Deployment

1. Deploy frontend to your preferred hosting platform
2. Supabase Edge Functions are automatically deployed
3. Set up proper CORS for your domain
4. Monitor admin operations via Supabase dashboard
5. Consider rate limiting for admin endpoints