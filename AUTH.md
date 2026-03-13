## Authentication – Dev & Prod Usage

### Seeding the initial admin user

The backend includes a small helper script to create the first `ADMIN` user based on environment variables.

- **Required env vars (backend)**:
  - `INITIAL_ADMIN_EMAIL`
  - `INITIAL_ADMIN_PASSWORD`

In dev, `.env.dev` already contains example values:

- `INITIAL_ADMIN_EMAIL=admin@open-ranking.local`
- `INITIAL_ADMIN_PASSWORD=admin123`

To seed the admin inside Docker (dev stack running):

```bash
./dev.sh            # in another terminal, if not already running
docker-compose -f docker-compose.yml -f docker-compose.dev.yml exec backend python -m app.seed_admin
```

For prod (or prod-like) you must set strong values for `INITIAL_ADMIN_EMAIL` and `INITIAL_ADMIN_PASSWORD` and then run:

```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml exec backend python -m app.seed_admin
```

If an admin user already exists, the script is a no-op and simply prints the existing admin email.

### Manual backend auth testing

With the backend running (e.g., via `./dev.sh`):

1. **Login**

```bash
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@open-ranking.local","password":"admin123"}'
```

You should receive a JSON response containing an `access_token` and `user` object.

2. **Current user**

```bash
TOKEN="...paste access_token here..."
curl http://localhost:8000/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

You should see the current user with `role` set to `ADMIN`.

### Frontend auth flow (dev)

1. Start the dev stack:

```bash
./dev.sh
```

2. Seed the admin (if not already seeded) using the command above.

3. Visit `http://localhost:3000/login` and log in with the seeded admin credentials:
   - Email: `admin@open-ranking.local`
   - Password: `admin123`

4. On success, you will be redirected to `/admin`. The token and user are stored in local storage so that:
   - Refreshing the page keeps you logged in.
   - Navigating directly to `/admin` will stay authenticated.

5. Click **Logout** in the admin header to clear auth state. After logout:
   - Accessing `/admin` will redirect back to `/login`.

