# Environment Variables Setup

Environment variables extracted from the frontend repository: https://github.com/as12711/MUI-Fatherhood

## Extracted Values

The following values were found in the frontend HTML files:

### Supabase Configuration (Extracted)

```env
SUPABASE_URL=https://zagzyiyhomvwhhsibbxv.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InphZ3p5aXlob212d2hoc2liYnh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1NTAyODQsImV4cCI6MjA4MTEyNjI4NH0.oVaFmhT2t44v45TEq4e_FtAfyqG1-or-0d4VTeOtxNE
```

### Values That Need to Be Configured

These values were NOT found in the frontend repo (for security reasons) and need to be obtained/configured:

#### 1. SUPABASE_SERVICE_KEY (Required for admin functions)

**How to get it:**
1. Go to: https://supabase.com/dashboard/project/zagzyiyhomvwhhsibbxv/settings/api
2. Find the **`service_role`** key section
3. Click the copy button (📋) to copy the key
4. Add it to your `.env` file

**Important:** 
- ⚠️ Never commit this key to version control
- ⚠️ The service_role key bypasses Row Level Security - it has full database access
- ⚠️ Keep this key secret!

#### 2. JWT_SECRET (Required for authentication)

**How to generate it:**
```bash
# Using OpenSSL (recommended)
openssl rand -base64 32

# Or using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**Requirements:**
- Minimum 32 characters
- Should be a long, random, secure string
- Never commit to version control

## Complete .env File Template

Create a `.env` file in the root of your project with the following content:

```env
# Supabase Configuration (Extracted from frontend)
SUPABASE_URL=https://zagzyiyhomvwhhsibbxv.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InphZ3p5aXlob212d2hoc2liYnh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1NTAyODQsImV4cCI6MjA4MTEyNjI4NH0.oVaFmhT2t44v45TEq4e_FtAfyqG1-or-0d4VTeOtxNE

# Supabase Service Role Key (REQUIRED - Get from Supabase Dashboard)
SUPABASE_SERVICE_KEY=your_service_role_key_here

# JWT Secret (REQUIRED - Generate a secure random string)
JWT_SECRET=your_jwt_secret_here

# Node Environment
NODE_ENV=development

# Server Port (optional, defaults vary by deployment)
PORT=3000

# Allowed Origins for CORS (comma-separated)
# For production, update this with your actual domain(s)
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5500,http://127.0.0.1:5500
```

## For Vercel Deployment

When deploying to Vercel, add these environment variables in the Vercel dashboard:

1. Go to your project settings → Environment Variables
2. Add each variable:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_KEY`
   - `JWT_SECRET`
   - `NODE_ENV` (set to `production`)
   - `ALLOWED_ORIGINS` (your production domain)

## API Base URL

From `admin.html`, the frontend uses:
- **Development:** `http://localhost:3001/api`
- **Production:** Update `API_BASE_URL` in your frontend to match your Vercel deployment URL

## Supabase Dashboard Links

- Project Dashboard: https://supabase.com/dashboard/project/zagzyiyhomvwhhsibbxv
- API Settings: https://supabase.com/dashboard/project/zagzyiyhomvwhhsibbxv/settings/api
