This project uploads company logos to Supabase Storage.

Bucket & path used by the app:
- Bucket name: `companies`
- Folder: `image/`
- File naming convention: `company-<timestamp>-<slug>.<ext>` (example: `company-1690000000000-acme-sas.png`)
- Uploaded file's public URL is saved to the `pr_companies.logo_url` column.

If uploads fail with "Bucket not found":
1. Create the `companies` bucket in the Supabase dashboard under Storage > Buckets and set the access to public (if you want public URLs).
2. Or run the provided script locally (requires SERVICE_ROLE key):
   SUPABASE_URL=https://your-project.supabase.co SUPABASE_SERVICE_ROLE_KEY=your-service-role-key node scripts/create-logos-bucket.js

Notes:
- The script can accept a custom bucket name via `BUCKET_NAME` env var.
- The service role key is sensitive; do not commit it to source control.
- If you prefer private uploads, change the code to use signed URLs and adjust the database column accordingly.
