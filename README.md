# Teacher Eric Driving School

React/Vite public website and administrator dashboard backed by FastAPI and Supabase PostgreSQL/Auth. The browser talks only to FastAPI. The backend verifies Supabase Auth access tokens and uses its server-side database credential; private inquiry records are never exposed to the public client.

## Project layout

```text
backend/
  main.py                    FastAPI endpoints and validation
  requirements.txt           Python dependencies
  .env.example               Backend configuration template
  Supabase/Schema.sql         New-project table schema
  Supabase/migrations/        Repeatable upgrade migrations
frontend/
  src/App.jsx                 Public and administrator routes
  src/components/             Shared public layout, headings, and inquiry form
  src/pages/                  Home, about, courses, enrollment, contact, FAQ, 404
  src/services/api.js         Shared public API client
  src/Admin.jsx               Protected admin login and routed dashboard pages
  src/*.css                   Responsive styling
  .env.example                Public API URL template
```

## Requirements

- Python 3.10 or newer
- Node.js 20.19+ or 22.12+ (Vite 8 requirement)
- A Supabase project with Auth and PostgreSQL enabled

## Supabase setup

1. Create a Supabase project and copy its project URL and publishable key.
2. For a new database, run `Supabase/Schema.sql` in the Supabase SQL Editor. For an existing installation, run the existing inquiry migration and then `Supabase/migrations/20261028_add_course_videos.sql`. Both retain existing records. The video migration uses the existing stable course IDs `1`, `2`, and `3`.
3. Confirm RLS is enabled and `anon`/`authenticated` have no table grants. Only the backend server credential should have table access. `service_role` bypasses RLS, so protect it as a backend secret and rotate it if exposed.
4. Create the administrator in Supabase Authentication (email/password; confirm the email if project settings require it). Add the exact account email to backend `ADMIN_EMAILS`. Remove it there to revoke administrator API access.
5. Configure Supabase Auth's password policy and email confirmation according to the deployment's account-provisioning process. The app intentionally does not provide public admin registration.

Back up the Supabase project before schema changes. Use Supabase's managed backups or `pg_dump` for recovery; test restoration on a separate project. The migration is additive and repeatable, but validate the constraint after reviewing legacy values.

## Local development

From PowerShell at the project root:

```powershell
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
```

Edit `backend/.env` with the project URL, publishable key, server-side secret, and administrator email. Keep it out of version control. The server-side credential is never a frontend variable. Keep `frontend/.env` limited to `VITE_API_URL`.

Backend terminal:

```powershell
cd backend
py -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
uvicorn main:app --reload --host 192.168.2.65 --port 8000
```

Frontend terminal:

```powershell
cd frontend
npm ci
npm run dev
```

Open `http://localhost:5173`. Public routes include `/videos`, and `/courses/:id` displays published videos for that exact course. Administrator routes include `/admin/videos` for URL-based learning video management. Unknown URLs show a 404 page. API docs are at `http://127.0.0.1:8000/docs`.

Contact and enrollment forms use the existing inquiry endpoint. They do not send a separate generic contact request. No public phone, email, or street address is configured; the contact page states this instead of inventing details.

## API

- `GET /api/health` — process health
- `GET /api/courses` — available courses
- `POST /api/inquiries` — validated public enrollment inquiry
- `POST /api/admin/login` — Supabase email/password sign-in for allowlisted administrators
- `GET /api/admin/me` — validate current administrator session
- `GET /api/admin/stats` — exact counts across all inquiry records
- `GET /api/admin/inquiries?search=&status=all&page=1&page_size=25` — server-side search, status filter, and pagination
- `GET /api/admin/inquiries/{id}` — inquiry detail
- `PATCH /api/admin/inquiries/{id}/status` — persist an allowed status

Learning video endpoints are `GET /api/videos`, `GET /api/courses/{course_id}/videos`, `GET /api/admin/videos`, `POST /api/admin/videos`, `PATCH /api/admin/videos/{id}`, and `DELETE /api/admin/videos/{id}`. Public responses contain published videos only; admin endpoints support search, course/status filters, and full management.

Every `/api/admin/*` endpoint verifies its bearer token with Supabase Auth and checks the server allowlist. The login throttle is per backend process; use a shared rate-limit service or edge gateway before deploying multiple workers.

Videos support YouTube watch/short/embed URLs and direct HTTP(S) video URLs. File uploads are intentionally not shown because no Supabase Storage bucket is configured; configure managed storage before adding upload support.

## Checks

```powershell
cd frontend
npm run lint
npm test
npm run build
cd ..\backend
python -m compileall -q main.py
python -m pytest
```

The backend requires configured Supabase values at import time. API integration against Supabase also requires reachable infrastructure and a migrated database.

## Deployment

- Build the frontend with `npm run build`, set `VITE_API_URL` to the public HTTPS API origin, and serve `frontend/dist` from static hosting. Configure SPA fallback to `index.html` so nested public and admin routes work on refresh.
- Run the backend with `uvicorn main:app --host 0.0.0.0 --port $PORT` (without `--reload`) from `backend/`. Configure `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `ADMIN_EMAILS`, and exact production `CORS_ORIGINS` in the host's secret/config store. Require HTTPS.
- Apply and verify the SQL migration in the intended Supabase project. Provision and revoke admin access through Auth plus `ADMIN_EMAILS`.

## Security and known boundaries

Admin bearer tokens are kept in `sessionStorage`, which clears with the browser tab/session, but remains readable by same-origin JavaScript. A strict CSP and prevention of injected scripts are important. A production architecture needing stronger XSS resistance should replace this with a backend-managed `HttpOnly; Secure; SameSite` cookie and CSRF defenses. The current in-memory login limiter is per worker. Do not log credentials or expose the server key. Public RLS/grants prevent browser queries from reading private inquiry records. Set the CORS list to deployed origins only.

## Troubleshooting

- Backend startup configuration error: check that `backend/.env` exists and contains all required values; never paste its contents into support logs.
- `401` at admin endpoints: sign in again; the access token may have expired or been revoked.
- `403`: verify the Auth user's exact email is in `ADMIN_EMAILS`.
- Inquiry `503`: verify the migration/table, server credential, and Supabase availability.
- Browser CORS error: set the exact browser origin in backend `CORS_ORIGINS` and restart the API.
- A nested route refresh returns 404: enable SPA fallback on the frontend host.
