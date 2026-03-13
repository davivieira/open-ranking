## Open Ranking – Roadmap

### Overview

Open Ranking is a CrossFit competition ranking app with:

- **Frontend**: React 19 + Chakra UI + Zustand.
- **Backend**: Python (FastAPI) + SQLAlchemy.
- **Database**: Postgres.
- **Infra**: Three Docker services (`frontend`, `backend`, `db`) orchestrated via `docker-compose`.

Branding follows a **dark purple** base with **yellow/orange** highlights and **neon green** accents, inspired by the attached VStrong image. The app supports multiple competition types (Open, Strong Games, others), each with its own phases and events, but all using the same points scheme (100, 97, 94, 91, ...).

---

### Domain Model (High Level)

- **Competition**
  - Multiple competitions (e.g., Open 2026, Strong Games 2026).
  - Fields: `id`, `name`, `slug`, `type` (`OPEN`, `STRONG_GAMES`, `OTHER`), `year`, `description`, `is_active`, timestamps.

- **Phase**
  - Represents a phase within a competition (e.g., `YEAR.1`, `YEAR.2`, finals).
  - Fields: `id`, `competition_id`, `code`, `name`, `order_index`, `start_date`, `end_date`.

- **Event**
  - Individual workouts inside a phase (e.g., `26.1`, `26.2`, `26.3`).
  - Fields: `id`, `phase_id`, `code`, `name`, `description`, `order_index`.

- **Athlete**
  - Fields: `id`, `name`, `level` (`RX`, `SCALED`, `BEGINNER`), `doubles_level` (`RX`, `SCALED`, `BEGINNER`), `age`, timestamps.

- **AthleteHistory**
  - Historical notes per athlete **per competition**, optionally tied to phase/event for deep links.
  - Fields: `id`, `athlete_id`, `competition_id`, `phase_id?`, `event_id?`, `entry`, `created_at`.

- **Score**
  - Performance of an athlete on an event.
  - Fields: `id`, `athlete_id`, `competition_id`, `phase_id?`, `event_id`, `level`, `raw_score`, `rank_within_level`, `points_awarded`, timestamps.

- **User**
  - Admin accounts only (viewers are anonymous).
  - Fields: `id`, `email`, `password_hash`, `role` (`ADMIN`), timestamps.

- **Points Scheme**
  - Global rule: `points = max(0, 100 - 3 * (rank - 1))`.
  - Same formula for all competitions, phases, and events.

---

### Frontend Architecture

- **Stack**
  - React 19 SPA.
  - Chakra UI for layout, theming, and components.
  - Zustand for global state (auth, filters, cached data).
  - React Router for routing (public vs admin).

- **Branding & Theme**
  - Custom Chakra theme configured in `frontend/src/theme`:
    - Colors (approximate from image):
      - `brand.purple.500`: `#4B2A7A`
      - `brand.purple.700`: `#2C1848`
      - `brand.yellow.400`: `#F7D23E`
      - `brand.orange.400`: `#F58634`
      - `brand.green.400`: `#2ECC71`
      - `brand.background`: `#1C1130`
      - `brand.card`: `#2A1743`
    - Global styles: dark background, light text.
    - Component variants for `Button`, `Badge`, `Table`, and `Switch` that match the visual identity.

- **Key Screens**
  - **Public leaderboard (main page)**:
    - Competition selector (Open, Strong Games, etc.).
    - Level filters: Rx, Scaled, Beginners (styled as pills/toggles).
    - Table with ranking, athlete info, and aggregated points.
  - **Athlete profile**:
    - Basic info and level.
    - History section pulling from `AthleteHistory` with links back to competitions/events.
  - **Admin area** (protected):
    - Login page (admins only).
    - Dashboards for managing athletes, competitions/phases/events, scores, and history entries.

---

### Backend Architecture

- **Stack**
  - FastAPI for the HTTP API.
  - SQLAlchemy for ORM and schema definitions.
  - Postgres as the primary data store.

- **Core Endpoints (Overview)**
  - **Auth (Admin only)**
    - `POST /auth/login` → JWT-based login for admins.
    - `GET /auth/me` → current admin profile.
  - **Competitions / Structure**
    - CRUD for competitions, phases, and events.
  - **Athletes**
    - CRUD for athletes.
  - **Scores**
    - `POST /scores` to add/update scores.
    - Supports both existing athletes and inline new athlete creation.
    - Triggers ranking recalculation and points assignment.
  - **Leaderboard**
    - `GET /leaderboard` with filters:
      - `competition_id` (required).
      - `level` (`RX`, `SCALED`, `BEGINNER`).
      - Optional `phase_id` / `event_id`.
  - **Athlete History**
    - CRUD on `AthleteHistory`, linked to competitions/phases/events for deep navigation.

- **Roles & Access**
  - Viewer: anonymous, read-only on leaderboard, competitions, athletes, and history.
  - Admin: authenticated via JWT, allowed to mutate data (athletes, scores, competitions, history).

---

### Docker & Infrastructure

- **Services (docker-compose)**
  - `frontend`:
    - Node-based build stage (Vite or similar) and a static serving stage (e.g., Nginx or lightweight HTTP server).
  - `backend`:
    - Python base image with FastAPI and Uvicorn.
  - `db`:
    - Official Postgres image with a named volume and environment variables for credentials.

- **Networking**
  - Single Docker network so:
    - `backend` can reach `db` via hostname `db`.
    - `frontend` can call `backend` via `http://backend:<port>`.

- **Configuration**
  - `.env` / `.env.backend` / `.env.frontend` for secrets and host/port configuration.

---

### Implementation Phases

#### Phase 1 – Project scaffolding & core models

- Initialize repository structure:
  - `frontend/` – React 19 + Chakra UI + Zustand setup with a basic layout and theme stub.
  - `backend/` – FastAPI app with DB connection and SQLAlchemy models for all core entities:
    - `Competition`, `Phase`, `Event`, `Athlete`, `AthleteHistory`, `Score`, `User`.
  - `docker-compose.yml` – three services: `frontend`, `backend`, `db`.
- Add basic configuration files:
  - Node/TypeScript config for the frontend.
  - Python dependency file (`requirements.txt` or `pyproject.toml`) for the backend.
  - Example `.env` files for DB credentials and JWT secrets.
- (Optional in Phase 1) Set up initial Alembic migrations for the database schema.

#### Phase 2 – Authentication and basic admin

- Implement user model and JWT-based auth in the backend.
- Seed an initial `ADMIN` user.
- Create login UI and auth store in the frontend (Zustand).
- Guard admin routes in the frontend and enforce role checks in the backend.

#### Phase 3 – Scores and ranking logic

- Implement the scores API with support for:
  - Adding scores for existing athletes.
  - Creating a new athlete as part of the \"add score\" flow.
- Implement ranking recalculation and universal points assignment (100, 97, 94, ...).
- Build admin UI to manage scores per competition/phase/event and view per-event rankings.

#### Phase 4 – Public leaderboard & filtering

- Implement the leaderboard API aggregating `points_awarded` per athlete with filters by:
  - Competition.
  - Level.
  - Optional phase or event.
- Build the public main page:
  - Competition selector.
  - Level filters.
  - Responsive ranking table.
- Implement athlete profile with history, including links back to competitions/events.

#### Phase 5 – Polishing, performance & UX

- Finalize Chakra theme and refine components to closely match the reference branding.
- Improve UX:
  - Loading/empty/error states.
  - Sorting, sticky table headers, and mobile-friendly layouts.
- Add targeted tests:
  - Backend: points calculation and key endpoint tests.
  - Frontend: snapshot tests for leaderboard and forms.

#### Phase 6 – Future extensions

- Multiple admin roles and audit logs.
- Data export/import (CSV/JSON).
- Printable and shareable views of leaderboards and athlete profiles.
