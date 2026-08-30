# Toolio Web Deployment

Deploy this directory as the single Vercel project root.

## Routes

- `/` — marketing website
- `/store/` — store catalog
- `/store/product.html` — product details
- `/download/` — download page
- `/admin/` — admin dashboard

## Verification

Run from the repository root:

```powershell
node website/tests/check-deployment-layout.js
node website/tests/check-unified-auth.js
node website/tests/check-home-showcase.js
node website/tests/check-store-images.js
node scripts/check-admin-dashboard.js
```

## OAuth

Before production testing, configure the Site URL and Redirect URLs listed in `docs/SUPABASE_AUTH_SETTINGS.md`.

Create and verify a Vercel preview before promoting it to `toolio.live`.
