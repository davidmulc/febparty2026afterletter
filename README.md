# February Party Newsletter (Vercel + Supabase)

This is a one-page static newsletter with:
- your party write-up
- image gallery
- text/emoji memory submissions at the bottom
- `robots.txt` blocking crawlers

## Quick deploy (recommended)

### 1. Create Supabase project

1. Go to Supabase and create a new project.
2. Open **SQL Editor**.
3. Run the SQL in:
   - `supabase/schema.sql`

That creates the `memories` table and public read/insert policies for anonymous users.

### 2. Copy Supabase keys

From Supabase project settings, copy:
- **Project URL**
- **anon public key**

Put them in:
- `config.js`

```js
window.SUPABASE_URL = "https://YOUR_PROJECT.supabase.co";
window.SUPABASE_ANON_KEY = "YOUR_ANON_KEY";
```

### 3. Update photos (already done in your case)

Current page expects:
- `images/image1.jpg`
- `images/image2.jpg`
- `images/image3.jpg`
- `images/image4.jpg`

### 4. Deploy to Vercel

### Option A: Git-based (best)

1. Push this folder to a GitHub repo.
2. In Vercel, **Add New Project** and import the repo.
3. Framework preset: **Other** (static site).
4. Build command: leave empty.
5. Output directory: leave empty (root static files).
6. Deploy.

### Option B: Vercel CLI

```bash
cd /Users/davidmulcair/workspace/febparty26-afterletter
npm i -g vercel
vercel
vercel --prod
```

### 5. Verify

1. Open deployed URL.
2. Confirm photos render.
3. Submit a memory (with emoji).
4. Refresh and confirm it persists.
5. Check `/robots.txt` returns:

```txt
User-agent: *
Disallow: /
```

## Notes

- `robots.txt` and meta robots tags are both enabled.
- The old AWS backend scaffolding is still in `backend/` but is no longer required for this deployment path.
- If you later want anti-spam/rate-limit, add a small Vercel serverless function in front of Supabase.
