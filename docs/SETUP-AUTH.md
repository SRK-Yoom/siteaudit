# One-time auth setup (Google + redirect URLs)

So you don’t have to click through the Supabase dashboard, use this script once. You only need to get the credentials below, put them in `.env.setup`, and run the script.

## 1. Get a Supabase Personal Access Token

1. Go to [Supabase Account → Access Tokens](https://supabase.com/dashboard/account/tokens).
2. Create a token (e.g. “Auth setup”), copy it.

## 2. Get your Supabase project ref

From your project URL: `https://XXXXXXXX.supabase.co` → the ref is `XXXXXXXX`.

## 3. Create Google OAuth credentials (one-time)

1. Open [Google Cloud Console](https://console.cloud.google.com/).
2. Select a project (or create one).
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID**.
4. If asked, configure the OAuth consent screen (external user type is fine).
5. Application type: **Web application**.
6. Name: e.g. “SiteScore” or “Site Audit”.
7. **Authorized redirect URIs** → Add:
   - `https://YOUR-PRODUCTION-DOMAIN/auth/callback`  
     (e.g. `https://siteaudit-rho.vercel.app/auth/callback`)
   - For local dev: `http://localhost:3000/auth/callback`
8. Create → copy **Client ID** and **Client secret**.

## 4. Run the script

```bash
cp .env.setup.example .env.setup
# Edit .env.setup and set:
#   SUPABASE_ACCESS_TOKEN
#   SUPABASE_PROJECT_REF
#   SITE_URL (e.g. https://siteaudit-rho.vercel.app)
#   GOOGLE_CLIENT_ID
#   GOOGLE_CLIENT_SECRET

node scripts/setup-supabase-auth.mjs
```

The script will:

- Add your site’s `/auth/callback` (and localhost) to Supabase redirect URLs.
- Enable the Google provider in Supabase with your Client ID and secret.

After it runs, “Continue with Google” in the app will work (as long as the redirect URI in Google matches the one the script used).

## Apple (optional)

Apple Sign In needs extra setup (Services ID, key, team ID, etc.). It’s easier to enable **Apple** once in the Supabase dashboard: **Authentication → Providers → Apple**. The script can enable Apple too if you set `APPLE_CLIENT_ID` and `APPLE_SECRET` in `.env.setup` (see Supabase Apple docs for the exact secret format).
