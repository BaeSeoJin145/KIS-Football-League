# KFL (KIS Football League)

KFL is a static football league web app built with HTML, CSS, and vanilla JavaScript. It uses GitHub Pages for hosting and Supabase for league data, authentication, and live match updates.

## Features

- Live scores and match events with Supabase Realtime
- Match schedules, filters, timelines, lineups, and statistics
- League standings and player goal/assist rankings
- Team and player rosters with search
- YouTube highlight gallery
- Admin portal for match, team, player, and highlight management
- PWA install support and cached pages
- Local demo mode backed by sample data and browser storage

## Project structure

```text
KIS-Football-League/
├── index.html
├── matches.html
├── match-detail.html
├── standings.html
├── players.html
├── highlights.html
├── admin.html
├── manifest.json
├── sw.js
├── css/                   # Design tokens, layout, components, and page styles
├── js/
│   ├── config.js          # Supabase URL and public key
│   ├── supabase.js        # Supabase client and data access
│   ├── realtime.js        # Realtime subscriptions
│   └── ...                # Page logic and shared components
├── assets/icons/          # PWA icons
└── supabase/migrations/
    └── 001_initial_schema.sql
```

## Run locally

The project has no build step or npm dependencies. Serve the directory over HTTP:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>. Until Supabase is configured, the pages use sample data and the admin portal runs in local demo mode.

## Connect Supabase

### 1. Create a project and database schema

Create a project at [Supabase](https://supabase.com/). In the Supabase dashboard, open **SQL Editor**, paste the contents of `supabase/migrations/001_initial_schema.sql`, and run it. This creates the seven app tables, enables row-level security (RLS), configures Realtime for matches and match events, and inserts demo league data.

Run this migration once on a new project. It is not intended to be re-run as a general reset script.

### 2. Create a trusted admin account

In **Authentication > Settings**, disable public user signups. Then open **Authentication > Users** and add the email/password account that will be used on the admin page.

The migration's write policies grant access to the `authenticated` role; they do not distinguish admins from other signed-in users. Keep public signup disabled and only create accounts for trusted administrators. If the project needs other signed-in users, replace these broad policies with policies that explicitly check an admin role.

### 3. Set the project URL and public key

In **Project Settings > API**, copy the **Project URL** and the client-side **Publishable key** (or the legacy `anon` public key). Edit `js/config.js` and replace the placeholders:

```javascript
const KFL_CONFIG = {
  SUPABASE_URL: 'https://your-project-id.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_...', // or the legacy anon public key
  // Keep the other existing settings below.
};
```

This is a static site, so it does not load `.env` files. The values used by the browser must be set in `js/config.js`. The public key is expected to be visible in client-side code; database access must be protected by RLS.

Never put a `service_role` or `secret` key in `js/config.js`, HTML, browser code, or a public repository. Those keys bypass RLS.

### 4. Verify the connection

Restart or refresh the local site, open `admin.html`, and sign in with the account created in Supabase. The admin screen displays whether it is in Supabase or demo mode. Check the browser developer console if data does not load.

## Security and plans

The migration allows public read access to the league tables and write access to authenticated users. Review and adapt the RLS policies before using real or sensitive data. Supabase and GitHub Pages plan limits can change; check their dashboards for current quotas.

## Deploy with GitHub Pages

1. Push the project to a GitHub repository.
2. In the repository, open **Settings > Pages**.
3. Select the `main` branch and the repository root (`/`) as the source, then save.
4. Open the published URL and verify that `js/config.js` contains the Supabase project URL and public key.

## Install as a PWA

Use the browser's install action or the mobile share menu's **Add to Home Screen** option. Previously cached pages may open offline; Supabase data and live updates still require a network connection.
