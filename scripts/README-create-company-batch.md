Usage: Batch create companies and admin users

1) Create a CSV with header:
   company_name,company_rut,company_email,company_phone,admin_email,admin_password,admin_first_name,admin_last_name,admin_rut,admin_phone

2) Set env vars:
   SUPABASE_URL
   SUPABASE_SERVICE_ROLE_KEY

3) Run:
   node scripts/create_companies_batch.js data.csv

Notes:
- Script uses the SERVICE_ROLE_KEY, keep secure.
- Requires Node 18+ (global fetch). If using older Node, install node-fetch and adjust script.
