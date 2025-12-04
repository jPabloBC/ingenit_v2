create-company-with-admin.js

Usage (local - developer only):

SUPABASE_URL=https://your-project.supabase.co SUPABASE_SERVICE_ROLE_KEY=your-service-role-key node scripts/create-company-with-admin.js --company "ACME Ltd" --email admin@acme.com --password "S3cretP@ss"

What it does:
- Creates a Supabase Auth user (using Admin API) with the provided email and password (email confirmed).
- Creates a company row in `app_pr.pr_companies` with `created_by` set to the new user id and `status: 'active'`.
- Creates a profile row in `app_pr.users` linking `supabase_user_id` to the company and setting role 'owner'.

Security notes:
- This script requires the Service Role key. Keep it local and secret.
- Use only in development or administrative flows. For production onboarding, consider invite flows or a secure admin UI.

Using the admin UI instead of the script
--------------------------------------

If you prefer to create a company and its admin from the web UI (recommended for day-to-day dev workflows), there's a protected endpoint and UI flow:

- Start the app locally and sign in as a developer/admin at /admin/login using a Supabase account that has role 'dev' or 'admin' in `app_pr.users`.
- Go to the Companies admin page (e.g. http://localhost:3001/admin/pr/companies) and open the "Crear Empresa" modal.
- Fill the company fields and, optionally, the "Crear administrador" email and password. When both admin fields are provided the UI will call the protected endpoint `/api/admin/create-company` using your session token and the server will perform the Admin/API actions with the Service Role key.

Verification
------------

- Check Auth > Users in the Supabase dashboard to see the created admin user (email confirmed).
- Check `app_pr.pr_companies` table in Database > Table Editor to see the inserted company row.
- Check `app_pr.users` to see the created profile linking the new user to the company with role 'owner'.

If something fails, check your server logs for errors and ensure `SUPABASE_SERVICE_ROLE_KEY` is set in your deployment environment (not in client-side env). The server endpoint checks your session and requires a dev/admin role to execute.
