# How to get the credentials (one-time)

You need these for the auth setup script and for “Sign in with Google” to work.

---

## 1. Google OAuth client (Web application)

### 1.1 Open Google Cloud Console

- Go to: **https://console.cloud.google.com/**
- Sign in with your Google account.

### 1.2 Select or create a project

- Top bar: click the project dropdown (says “Select a project” or the current project name).
- Either pick an existing project or click **New Project** → give it a name (e.g. “SiteScore”) → **Create** → select it.

### 1.3 Configure the OAuth consent screen (if asked)

- Left menu: **APIs & Services** → **OAuth consent screen**.
- Choose **External** (so any Google user can sign in) → **Create**.
- Fill only the **required** fields:
  - **App name**: e.g. `SiteScore`
  - **User support email**: your email
  - **Developer contact**: your email
- **Save and Continue** through Scopes (no need to add any) → **Save and Continue** → **Back to Dashboard**.

### 1.4 Create the OAuth client

- Left menu: **APIs & Services** → **Credentials**.
- Click **+ Create Credentials** → **OAuth client ID**.
- **Application type**: **Web application**.
- **Name**: e.g. `SiteScore Web` (any name is fine).
- **Authorized redirect URIs** → click **+ ADD URI** and add **both**:
  1. Your production callback (replace with your real domain if different):
     ```text
     https://siteaudit-rho.vercel.app/auth/callback
     ```
  2. For local testing:
     ```text
     http://localhost:3000/auth/callback
     ```
- Click **Create**.
- In the popup, copy and save:
  - **Client ID** (long string ending in `.apps.googleusercontent.com`)
  - **Client secret** (click “Copy” or copy the value)

Put these in `.env.setup` as `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.

---

## 2. Supabase Personal Access Token and project ref

### 2.1 Personal Access Token (PAT)

- Go to: **https://supabase.com/dashboard**
- Sign in.
- Click your **profile/avatar** (bottom-left) → **Account** (or go to **https://supabase.com/dashboard/account/tokens**).
- Open the **Access Tokens** tab.
- Click **Generate new token**.
- Name it (e.g. `Auth setup`).
- Copy the token and save it somewhere safe (it’s shown only once).

Put this in `.env.setup` as `SUPABASE_ACCESS_TOKEN`.

### 2.2 Project reference (project ref)

- In Supabase, go to your **project** (the one used by SiteScore).
- In the left sidebar, click **Project Settings** (gear icon).
- Under **General**, find **Reference ID** (or look at the **Project URL**).
- **Project URL** looks like: `https://abcdefghijk.supabase.co`  
  The **project ref** is the part before `.supabase.co`: e.g. `abcdefghijk`.

Put this in `.env.setup` as `SUPABASE_PROJECT_REF`.

---

## 3. Fill `.env.setup` and run the script

Your `.env.setup` should look like (use your real values):

```env
SUPABASE_ACCESS_TOKEN=sbp_xxxxxxxxxxxxxxxxxxxxxxxx
SUPABASE_PROJECT_REF=abcdefghijk
SITE_URL=https://siteaudit-rho.vercel.app
GOOGLE_CLIENT_ID=123456789-xxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxxxx
```

Then run:

```bash
node scripts/setup-supabase-auth.mjs
```

After that, “Sign in with Google” and redirects will use these settings.
