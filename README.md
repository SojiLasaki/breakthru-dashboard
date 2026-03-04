# breakthru Dashboard (Frontend)

React + Vite dashboard for breakthru operations and Fix-it Felix chat.

## Requirements

1. `git`
2. `node` 20+ and `npm` 10+
3. Backend repo available locally (`Cummins-Backend`)
4. `uv` installed (required to run backend commands)

## One-time setup

```bash
cd breakthru-dashboard
npm install
```

## Environment variables

Create `breakthru-dashboard/.env` (optional overrides):

```bash
VITE_API_URL=http://127.0.0.1:8000/api
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

Notes:

1. If `VITE_API_URL` is not set, frontend defaults to `http://<current-host>:8000/api`.
2. Supabase vars are optional for local backend-driven Felix usage.

## Run frontend only

```bash
cd breakthru-dashboard
npm run dev -- --host 127.0.0.1 --port 8080
```

Open: `http://127.0.0.1:8080`

## Run full stack (frontend + backend + demo MCP)

Recommended for complete replication.

```bash
cd Cummins-Backend
uv sync
uv run --no-sync python manage.py migrate
uv run --no-sync python manage.py seed_demo_users
cd ../breakthru-dashboard
npm install
cd ../Cummins-Backend
./scripts/dev-up.sh
```

Then open `http://127.0.0.1:8080`.

## Demo login credentials

Seeded accounts use `username = password`:

- `admin`
- `office`
- `engine`
- `electrical`
- `customer`
- `login_probe`

If login fails:

```bash
cd Cummins-Backend
uv run --no-sync python manage.py seed_demo_users
```

## Fix-it Felix usage flow

1. Open `Fix-it Felix` from the left nav.
2. Pick `Model` and `Execution Policy` from the top bar.
3. Use the paperclip icon to add resources:
   - upload docs
   - add URL references
   - ingest/retrieve knowledge snippets
4. Type URLs directly in chat to auto-register them as resources.
5. Use `@resource` mentions in chat to scope context.
6. Manage MCP connectors in `Agent Studio -> Connectors`.

## Agent Studio flow

1. Open `Agent Studio`.
2. In `Connectors`, add or seed connectors.
3. In `Approvals`, review/approve/execute proposed agent actions.
4. In `Prompt Studio`, update system and domain guardrail prompts.

## Build and test

```bash
cd breakthru-dashboard
npm run build
npm test -- --run
```

## Troubleshooting

1. UI loads but login fails:
   - verify backend is running on `127.0.0.1:8000`
   - verify seeded users exist
2. Chat requests fail:
   - verify backend `/api/ai/chat/` is reachable
   - verify backend `OPENAI_API_KEY` is set
3. Connector-dependent actions missing:
   - verify connectors are enabled in Agent Studio
   - for local demo connectors, ensure backend `./scripts/dev-up.sh` is running
