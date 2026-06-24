# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Frontend (frontend/)
```bash
npm start          # Dev server on http://localhost:3000
npm run build      # Production build
npm test           # Run tests in watch mode
```

### Backend (backend/)
```bash
uvicorn app.main:app --reload   # Dev server on http://localhost:8000
alembic upgrade head            # Apply database migrations
alembic revision --autogenerate -m "<message>"  # Generate new migration
```

## Architecture

### Overview
Full-stack monorepo: React SPA (`frontend/`) + FastAPI backend (`backend/`). The backend runs on port 8000 with CORS configured for `http://localhost:3000` only.

### Backend (`backend/app/`)
Layered architecture: **routers → services → models**

- `routers/` — HTTP endpoints only; delegate all logic to services
- `services/` — Business logic (`auth_service.py`, `post_service.py`, `category_service.py`)
- `models/` — SQLAlchemy ORM models (async); `user.py` for User, `post.py` for Post/Tag/Category
- `schemas/` — Pydantic models for request validation and response serialization
- `core/` — Config (Pydantic `BaseSettings` from `.env`), JWT/bcrypt security, FastAPI `Depends()` helpers
- `db/database.py` — Async SQLAlchemy engine and `AsyncSession`

**Auth**: JWT Bearer tokens (HS256, 60min expiry). Protected routes use `Depends(get_current_user)` from `core/dependencies.py`. Passwords hashed with bcrypt.

**Database**: MySQL via `aiomysql`. Migrations managed with Alembic. Tables are also auto-created on startup via `Base.metadata.create_all()`.

**Key constraints**:
- Categories are self-referential (parent_id) with a max depth of 3
- Tags are normalized (shared across posts via `post_tags` junction table)
- Post content is stored as raw HTML (produced by TipTap editor)

### Frontend (`frontend/src/`)
- `pages/` — Route-level components (HomePage, PostCreatePage, PostDetailPage, etc.)
- `components/` — Shared UI: `Navbar.jsx`, `Sidebar.jsx`, `RichTextEditor.jsx`
- `api/` — Axios functions grouped by domain (`auth.js`, `posts.js`, `categories.js`). All use `http://localhost:8000` as base URL and accept a `token` parameter for the `Authorization: Bearer` header.
- `context/AuthContext.js` — Global auth state (JWT token + user object) persisted to `localStorage`. Exposes `loginAction`, `logoutAction`, and `useAuth()` hook.

**Routing** (React Router v7): Root `/` renders `LandingPage` for unauthenticated users, `HomePage` for authenticated ones. Protected routes (`/posts/:id`, `/posts/create`, `/posts/:id/edit`) are wrapped in `PrivateRoute`, which redirects to `/login` if `useAuth().user` is null.

**State**: No Redux/Zustand — Context API for auth, `useState` for everything else.
