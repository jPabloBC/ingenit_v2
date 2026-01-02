Deployment notes for cn.ingenit.cl reset flow

1) Files to copy into the cn.ingenit.cl repo
 - `src/app/admin/reset-password/page.tsx` -> use the file `cn-reset-page.tsx` provided.
 - `src/app/api/admin/cn/set-password/route.ts` -> use `set-password-route.ts` provided.
 - Migration: copy `migrations/20251230_create_cn_password_resets.sql` from the ingenit repo into cn repo migrations and apply.

2) Required environment variables (on cn.ingenit.cl hosting):
 - `SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_URL` (Supabase project URL)
 - `SUPABASE_SERVICE_ROLE_KEY` (service role key)  <-- sensitive, must be stored as secret in hosting
 - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` (if CN will send emails itself; optional if ingenit.cl sends emails)
 - `CN_BASE_URL` (set to https://cn.ingenit.cl)

3) Email flow options
 - Option A (recommended): keep email sending in `ingenit.cl` and point CN UI's reset page to `ingenit.cl` API. This avoids storing the service role key in two places.
 - Option B (you chose): CN hosts both UI and API. Ensure `SUPABASE_SERVICE_ROLE_KEY` is safely stored and migration applied in the same DB.

4) CORS and networking
 - If the CN page posts to a different host's API (ingenit.cl), ensure the API allows CORS from cn.ingenit.cl or use server-to-server calls.

5) Test flow
 - Create a test user in the admin UI.
 - Verify email with link: `https://cn.ingenit.cl/admin/reset-password?token=...`
 - Open the link, set password, confirm login works.

6) Security
 - Do NOT commit `SUPABASE_SERVICE_ROLE_KEY` to git.
 - Prefer using hosting secret storage (Vercel/Netlify/etc) for `SUPABASE_SERVICE_ROLE_KEY` and `SMTP_*`.

If you want, I can also produce a PR patch for the CN repo structure (single files) or a zip with the files ready to upload.