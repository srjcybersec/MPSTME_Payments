# MPSTME Smart Canteen - `.env` Fill Guide

This guide tells you exactly what to fill in `/.env`, and where to click to get each value.

## 1) Quick Fill (local dev)

Keep these as-is for local development:

- `NODE_ENV=development`
- `FRONTEND_ORIGIN=http://localhost:3000`
- `BACKEND_ORIGIN=http://localhost:4000`
- `PORT=4000`
- `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/mpstme_canteen?schema=public` (only if your local Postgres user/password/db matches)
- `REDIS_URL=redis://localhost:6379`
- `LOG_LEVEL=info`
- `NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api`

## 2) Keys you MUST generate yourself

### JWT_ACCESS_SECRET
- **What to put:** random string, at least 32 chars.
- **Mouse clicks (Windows, no coding tool needed):**
  1. Open browser.
  2. Go to [https://www.uuidgenerator.net/](https://www.uuidgenerator.net/).
  3. Click `Generate`.
  4. Copy a UUID and paste into `JWT_ACCESS_SECRET`.
  5. Repeat 2-3 times and join together if you want a longer secret.

### JWT_REFRESH_SECRET
- **What to put:** different random string, at least 32 chars.
- **Mouse clicks:**
  1. In the same UUID site, click `Generate` again.
  2. Copy a new value.
  3. Paste into `JWT_REFRESH_SECRET`.

### CSRF_SECRET
- **What to put:** another random string.
- **Mouse clicks:**
  1. Click `Generate` on UUID site one more time.
  2. Paste into `CSRF_SECRET`.

## 3) Razorpay (payments)

Fill:
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`
- `NEXT_PUBLIC_RAZORPAY_KEY_ID` (same as `RAZORPAY_KEY_ID`)

### Mouse clicks to get Key ID + Secret
1. Open [https://dashboard.razorpay.com/](https://dashboard.razorpay.com/).
2. Login.
3. Top bar: ensure `Test Mode` is enabled (for development).
4. Left menu -> `Settings`.
5. Click `API Keys`.
6. Click `Generate Key`.
7. Copy `Key ID` -> paste into:
   - `RAZORPAY_KEY_ID`
   - `NEXT_PUBLIC_RAZORPAY_KEY_ID`
8. Click `Download Key Details` or copy `Key Secret` -> paste into `RAZORPAY_KEY_SECRET`.

### Mouse clicks to get Webhook Secret
1. Razorpay dashboard -> `Settings`.
2. Click `Webhooks`.
3. Click `+ Add New Webhook`.
4. Enter your backend webhook URL (for local, use tunnel URL like ngrok + your webhook path).
5. In secret field, type your own strong string and save.
6. Copy that exact same string into `RAZORPAY_WEBHOOK_SECRET`.

## 4) PostgreSQL (DATABASE_URL)

If local Postgres setup is different from defaults:

### Mouse clicks (pgAdmin)
1. Open `pgAdmin`.
2. Left tree -> `Servers` -> your server -> `Login/Group Roles` (note username).
3. Left tree -> `Databases` (note database name).
4. Right click your DB -> `Properties` (confirm DB name and owner).
5. Build URL format and paste:
   - `postgresql://<username>:<password>@localhost:5432/<database>?schema=public`

## 5) Redis (REDIS_URL)

For local Redis, keep:
- `REDIS_URL=redis://localhost:6379`

For hosted Redis (Upstash/Redis Cloud), copy the provider URL and paste directly.

## 6) Storage (S3 / Supabase)

You currently use S3-style keys:
- `STORAGE_PROVIDER=s3`
- `S3_BUCKET`
- `S3_REGION`
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`
- `S3_ENDPOINT` (blank for AWS S3; set for Supabase/minio-compatible endpoint)

### A) AWS S3 mouse clicks (detailed)
1. Open [https://console.aws.amazon.com/](https://console.aws.amazon.com/) and sign in.
2. Top search bar -> type `S3` -> click `S3` service.
3. In S3 page, click orange `Create bucket`.
4. In `General configuration`:
   - `Bucket name`: enter a globally unique name (example: `mpstme-receipts-prod-001`).
   - `AWS Region`: pick one region (example: `Asia Pacific (Mumbai) ap-south-1`).
5. Leave defaults for now unless you need custom settings:
   - `Block Public Access`: keep enabled.
   - `Bucket Versioning`: optional.
6. Scroll down -> click `Create bucket`.
7. Open the newly created bucket from the list, then copy the exact bucket name for `.env`:
   - `S3_BUCKET=<that bucket name>`
8. Go to top search bar -> type `IAM` -> click `IAM`.
9. In IAM left menu, click `Users`.
10. Click `Create user`.
11. Enter username (example: `mpstme-s3-user`) -> click `Next`.
12. On `Set permissions` page:
   - Choose `Attach policies directly`.
   - Search policy list for `AmazonS3FullAccess` (quick setup), OR use a custom least-privilege policy.
   - Tick the policy checkbox.
   - Click `Next`.
13. Review page -> click `Create user`.
14. Click the newly created user name in the users table.
15. Open `Security credentials` tab.
16. Scroll to `Access keys` section -> click `Create access key`.
17. Use case screen: pick `Application running outside AWS` -> click `Next`.
18. (Optional description tag) -> click `Create access key`.
19. Copy values immediately:
   - `Access key ID` -> `.env` `S3_ACCESS_KEY_ID`
   - `Secret access key` -> `.env` `S3_SECRET_ACCESS_KEY`
   - You can also click `Download .csv` as backup (do not commit it).
20. Fill final AWS S3 env values:
   - `S3_BUCKET=<bucket name from step 7>`
   - `S3_REGION=<region code, e.g. ap-south-1>`
   - `S3_ENDPOINT=` (keep empty for AWS S3)

### B) Supabase Storage mouse clicks (S3 compatible mode)
1. Open [https://supabase.com/dashboard](https://supabase.com/dashboard).
2. Open your project.
3. Left menu -> `Storage` -> create bucket.
4. Left menu -> `Project Settings` -> `S3` (or storage credentials section).
5. Copy access key, secret, endpoint, region/bucket info.
6. Fill:
   - `S3_BUCKET`
   - `S3_REGION`
   - `S3_ACCESS_KEY_ID`
   - `S3_SECRET_ACCESS_KEY`
   - `S3_ENDPOINT=<supabase-s3-endpoint>`

## 7) FCM (optional notifications)

Fill only if using push notifications now:
- `FCM_PROJECT_ID`
- `FCM_CLIENT_EMAIL`
- `FCM_PRIVATE_KEY`

### Mouse clicks
1. Open [https://console.firebase.google.com/](https://console.firebase.google.com/).
2. Select project.
3. Click gear icon -> `Project settings`.
4. Open `Service accounts` tab.
5. Click `Generate new private key`.
6. Download JSON and copy:
   - `project_id` -> `FCM_PROJECT_ID`
   - `client_email` -> `FCM_CLIENT_EMAIL`
   - `private_key` -> `FCM_PRIVATE_KEY` (keep quotes/newlines properly escaped if needed)

## 8) Twilio (optional SMS OTP/fallback)

Fill only if using SMS now:
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_PHONE_NUMBER`

### Mouse clicks
1. Open [https://console.twilio.com/](https://console.twilio.com/).
2. Login.
3. On dashboard, copy:
   - `Account SID` -> `TWILIO_ACCOUNT_SID`
   - `Auth Token` -> `TWILIO_AUTH_TOKEN`
4. Left menu -> `Phone Numbers` -> `Manage` -> `Active numbers`.
5. Copy your Twilio number in E.164 format (`+91...`) -> `TWILIO_PHONE_NUMBER`.

## 9) Final checklist before run

1. Save `/.env`.
2. Make sure these are not placeholders anymore:
   - `JWT_ACCESS_SECRET`
   - `JWT_REFRESH_SECRET`
   - `CSRF_SECRET`
   - `RAZORPAY_KEY_SECRET`
   - `RAZORPAY_WEBHOOK_SECRET`
3. Restart backend and web servers after `.env` updates.
4. Run:
   - `npm run typecheck`
   - `npm run build --workspace=@mpstme/web`

## 10) Minimum required to run now

For immediate local run without optional services:

- Required now:
  - `DATABASE_URL`
  - `REDIS_URL`
  - `JWT_ACCESS_SECRET`
  - `JWT_REFRESH_SECRET`
  - `CSRF_SECRET`
  - `NEXT_PUBLIC_API_BASE_URL`
- Required if payment flows are tested:
  - `RAZORPAY_KEY_ID`
  - `RAZORPAY_KEY_SECRET`
  - `RAZORPAY_WEBHOOK_SECRET`
  - `NEXT_PUBLIC_RAZORPAY_KEY_ID`
- Optional until features are enabled:
  - `FCM_*`
  - `TWILIO_*`
  - storage keys (if receipt/media upload not used yet)
