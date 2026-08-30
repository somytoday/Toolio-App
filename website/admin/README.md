# Toolio Admin Dashboard

Static admin dashboard for Vercel Free.

## Deploy

Deploy the `website/` directory as the Vercel project root. The dashboard is served at:

```text
https://toolio.live/admin/
```

## Supabase Redirect URL

Add this Redirect URL in Supabase Auth:

```text
https://toolio.live/admin/
```

For local testing, serve the repo root and add the matching local `/admin/` URL to Supabase redirects.

## Security

The dashboard uses the public Supabase anon key only. Admin permissions come from `public.admins` and RPC checks.
