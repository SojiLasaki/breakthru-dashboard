# Breakthru Dashboard + Fix-it Felix

React + Vite dashboard for Breakthru operations and Fix-it Felix AI chat assistant.

## Table of Contents

- [Quick Start](#quick-start)
- [Prerequisites](#prerequisites)
- [Automated Setup](#automated-setup)
- [Manual Setup](#manual-setup)
- [Environment Configuration](#environment-configuration)
- [Running the Application](#running-the-application)
- [Demo Credentials](#demo-credentials)
- [Service URLs](#service-urls)
- [Features](#features)
- [Make Commands](#make-commands)
- [Troubleshooting](#troubleshooting)

---

## Quick Start

```bash
# From the parent directory containing both repos
./setup.sh

# Start all services
make start

# Open http://127.0.0.1:8080
# Login: engine / engine
```

---

## Prerequisites

### Required Tools

| Tool | Version | Purpose |
|------|---------|---------|
| **Git** | Any | Version control |
| **Node.js** | 20+ | Frontend runtime |
| **npm** | 10+ | Frontend package manager |
| **Python** | 3.12+ | Backend runtime |
| **uv** | Latest | Python dependency manager |

### Optional Tools

| Tool | Purpose |
|------|---------|
| **tmux** | Run services in split terminal (for dev-up.sh) |
| **Ollama** | Local AI model inference |

### Installation by OS

#### macOS (Homebrew)

```bash
# Install Homebrew (if not installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install required tools
brew install git node@20 python@3.12 tmux

# Install uv
curl -LsSf https://astral.sh/uv/install.sh | sh

# Optional: Install Ollama for local AI
brew install ollama
```

#### Ubuntu/Debian Linux

```bash
# Update package list
sudo apt-get update

# Install required tools
sudo apt-get install -y git curl tmux

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Python
sudo apt-get install -y python3 python3-pip python3-venv

# Install uv
curl -LsSf https://astral.sh/uv/install.sh | sh

# Optional: Install Ollama for local AI
curl -fsSL https://ollama.ai/install.sh | sh
```

#### Fedora/RHEL Linux

```bash
# Install required tools
sudo dnf install -y git curl tmux python3 python3-pip

# Install Node.js 20
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf install -y nodejs

# Install uv
curl -LsSf https://astral.sh/uv/install.sh | sh

# Optional: Install Ollama for local AI
curl -fsSL https://ollama.ai/install.sh | sh
```

#### Arch Linux

```bash
# Install required tools
sudo pacman -S --noconfirm git nodejs npm python python-pip tmux

# Install uv
curl -LsSf https://astral.sh/uv/install.sh | sh

# Optional: Install Ollama for local AI
curl -fsSL https://ollama.ai/install.sh | sh
```

---

## Automated Setup

The `setup.sh` script automates the entire installation process for macOS and Linux.

```bash
# Full setup (install deps + configure project)
./setup.sh

# Only install system dependencies
./setup.sh --deps-only

# Only setup project (deps already installed)
./setup.sh --project-only

# Include Ollama installation
./setup.sh --with-ollama

# Show help
./setup.sh --help
```

---

## Manual Setup

### Repository Structure

Ensure both repositories are side-by-side:

```
cummins/
├── Cummins-Backend/      # Django backend
├── breakthru-dashboard/  # React frontend
├── setup.sh              # Automated setup script
└── Makefile              # Make commands
```

### Step 1: Backend Setup

```bash
cd Cummins-Backend

# Install Python dependencies
uv sync

# Run database migrations
uv run --no-sync python manage.py migrate

# Seed demo users
uv run --no-sync python manage.py seed_demo_users
```

### Step 2: Frontend Setup

```bash
cd breakthru-dashboard

# Install Node dependencies
npm install
```

### Step 3: MCP Services Setup (Optional)

```bash
cd Cummins-Backend/mcp-demo

# Install MCP dependencies
uv sync
```

---

## Environment Configuration

### Backend Environment (Cummins-Backend/.env)

Create `Cummins-Backend/.env` with your AI provider configuration:

#### Option A: OpenRouter (Free tier available)

```bash
OPENROUTER_API_KEY=your_key_from_openrouter.ai
FELIX_DEFAULT_PROVIDER=openrouter
FELIX_OPENROUTER_MODEL=meta-llama/llama-3.2-3b-instruct:free
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
```

#### Option B: OpenAI

```bash
OPENAI_API_KEY=your_openai_key
FELIX_DEFAULT_PROVIDER=openai
FELIX_OPENAI_MODEL=gpt-4.1-mini
```

#### Option C: Local Ollama (Default)

```bash
FELIX_DEFAULT_PROVIDER=ollama
FELIX_OLLAMA_MODEL=llama3.2:latest
OLLAMA_BASE_URL=http://localhost:11434/v1
```

#### Option D: Other Providers

```bash
# Google
GOOGLE_API_KEY=your_google_key
FELIX_DEFAULT_PROVIDER=google
FELIX_GOOGLE_MODEL=gemini-3-flash-preview

# Anthropic
ANTHROPIC_API_KEY=your_anthropic_key
FELIX_DEFAULT_PROVIDER=anthropic
FELIX_ANTHROPIC_MODEL=claude-3-5-sonnet-latest

# Local vLLM
FELIX_DEFAULT_PROVIDER=vllm
FELIX_VLLM_MODEL=Qwen/Qwen2.5-7B-Instruct
VLLM_BASE_URL=http://localhost:8001/v1

# Local llama.cpp
FELIX_DEFAULT_PROVIDER=llamacpp
FELIX_LLAMACPP_MODEL=local-model
LLAMACPP_BASE_URL=http://localhost:8088/v1
```

### Frontend Environment (breakthru-dashboard/.env)

```bash
VITE_API_URL=http://127.0.0.1:8000/api
```

> **Note:** If `VITE_API_URL` is not set, frontend defaults to `http://<current-host>:8000/api`

---

## Running the Application

### Option A: Using dev-up.sh (Recommended)

```bash
cd Cummins-Backend
./scripts/dev-up.sh
```

This starts all services in tmux sessions:
- Backend API (port 8000)
- Frontend (port 8080)
- MCP Services (ports 9101-9103)

Control commands:
```bash
./scripts/dev-status.sh  # Check service status
./scripts/dev-check.sh   # Run health checks
./scripts/dev-down.sh    # Stop all services
```

### Option B: Using Make

```bash
# From parent directory
make start   # Start all services
make stop    # Stop all services
make status  # Check status
```

### Option C: Manual (Separate Terminals)

**Terminal 1 - Backend:**
```bash
cd Cummins-Backend
uv run --no-sync python manage.py runserver 127.0.0.1:8000
```

**Terminal 2 - Frontend:**
```bash
cd breakthru-dashboard
npm run dev -- --host 127.0.0.1 --port 8080
```

**Terminal 3-5 - MCP Services (Optional):**
```bash
cd Cummins-Backend/mcp-demo
uv run python supply_chain_server/server.py   # Port 9101
uv run python ticketing_server/server.py      # Port 9102
uv run python employee_server/server.py       # Port 9103
```

### Option D: Frontend Only

```bash
cd breakthru-dashboard
npm run dev -- --host 127.0.0.1 --port 8080
```

---

## Demo Credentials

All demo accounts use `username = password`:

| Username | Role | Description |
|----------|------|-------------|
| `admin` | Administrator | Full system access |
| `office` | Office Staff | Administrative tasks |
| `engine` | Engine Technician | Engine repair workflows |
| `electrical` | Electrical Technician | Electrical repair workflows |
| `customer` | Customer | Limited customer view |
| `login_probe` | Test Account | For automated testing |

If login fails, re-seed users:
```bash
cd Cummins-Backend
uv run --no-sync python manage.py seed_demo_users
```

---

## Service URLs

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend** | http://127.0.0.1:8080 | Main dashboard UI |
| **Backend API** | http://127.0.0.1:8000/api | REST API |
| **MCP Supply Chain** | http://127.0.0.1:9101/mcp | Parts & inventory |
| **MCP Ticketing** | http://127.0.0.1:9102/mcp | Ticket management |
| **MCP Employee** | http://127.0.0.1:9103/mcp | Workforce management |
| **Ollama** | http://localhost:11434 | Local AI (if running) |

---

## Features

### Fix-it Felix AI Chat

1. Open **Fix-it Felix** from the left navigation
2. Select **Model** and **Execution Policy** from the top bar
3. Use the paperclip icon to add resources:
   - Upload documents
   - Add URL references
   - Ingest/retrieve knowledge snippets
4. Type URLs directly in chat to auto-register them
5. Use `@resource` mentions to scope context

**Demo Prompts:**
```
Create a ticket for fuel injector leak on truck 5678
Show me low stock parts
Order 5 fuel injectors
How to diagnose turbo boost pressure issues?
Explain how to replace fuel injectors
```

### Agent Studio

1. Open **Agent Studio**
2. **Connectors**: Add or seed MCP connectors
3. **Approvals**: Review/approve/execute agent actions
4. **Prompt Studio**: Update system and guardrail prompts

---

## Make Commands

```bash
# Setup
make setup        # One-time setup (install + migrate + seed)
make install      # Install all dependencies
make migrate      # Run database migrations
make seed         # Seed demo users

# Running
make start        # Start all services (background)
make stop         # Stop all services
make status       # Check service status
make logs         # Show recent logs

# Development
make dev-up       # Start in tmux sessions
make dev-down     # Stop tmux sessions
make dev-check    # Run validation checks

# Testing
make test         # Run all tests
make test-backend # Run backend tests only
make test-frontend# Run frontend tests only
make check        # Health check all endpoints

# Utilities
make build        # Build frontend for production
make lint         # Run linters
make clean        # Stop services, clean temp files
make reset-db     # Reset database (WARNING: deletes data)
make pull-model   # Pull Ollama model
```

---

## Local AI with Ollama

```bash
# Install Ollama (macOS)
brew install ollama

# Install Ollama (Linux)
curl -fsSL https://ollama.ai/install.sh | sh

# Start Ollama service
ollama serve

# Pull the default model
ollama pull llama3.2:latest

# Configure backend
echo "FELIX_DEFAULT_PROVIDER=ollama" >> Cummins-Backend/.env
echo "FELIX_OLLAMA_MODEL=llama3.2:latest" >> Cummins-Backend/.env
echo "OLLAMA_BASE_URL=http://localhost:11434/v1" >> Cummins-Backend/.env
```

---

## Build and Test

```bash
# Build frontend for production
cd breakthru-dashboard
npm run build

# Run frontend tests
npm test -- --run

# Run E2E tests (requires services running)
npx playwright test

# Run backend tests
cd Cummins-Backend
uv run --no-sync python manage.py test apps.ai apps.users apps.tickets
```

---

## Troubleshooting

### UI loads but login fails

1. Verify backend is running on `127.0.0.1:8000`
2. Verify seeded users exist:
   ```bash
   cd Cummins-Backend
   uv run --no-sync python manage.py seed_demo_users
   ```

### Chat requests fail

1. Verify backend `/api/ai/chat/` is reachable
2. Verify AI provider is configured:
   ```bash
   # Check .env file
   cat Cummins-Backend/.env
   ```
3. If using Ollama, ensure it's running:
   ```bash
   ollama serve
   ```

### Connector-dependent actions missing

1. Verify connectors are enabled in Agent Studio
2. Ensure MCP services are running:
   ```bash
   ./scripts/dev-status.sh
   ```

### Port already in use

```bash
# Kill processes on specific ports
lsof -ti:8000 | xargs kill -9  # Backend
lsof -ti:8080 | xargs kill -9  # Frontend
lsof -ti:9101 | xargs kill -9  # MCP Supply
lsof -ti:9102 | xargs kill -9  # MCP Ticket
lsof -ti:9103 | xargs kill -9  # MCP Employee
```

### Node/npm version issues

```bash
# Check versions
node -v  # Should be v20+
npm -v   # Should be v10+

# If using nvm
nvm install 20
nvm use 20
```

### uv not found after installation

```bash
# Add to PATH
export PATH="$HOME/.cargo/bin:$PATH"

# Or restart terminal
source ~/.bashrc  # or ~/.zshrc
```

---

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│   Frontend      │────▶│   Backend       │────▶│   MCP Services  │
│   (React+Vite)  │     │   (Django+DRF)  │     │   (FastAPI)     │
│   :8080         │     │   :8000         │     │   :9101-9103    │
│                 │     │                 │     │                 │
└─────────────────┘     └────────┬────────┘     └─────────────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │   AI Provider   │
                        │  (Ollama/OpenAI │
                        │   /OpenRouter)  │
                        └─────────────────┘
```

---

## License

Proprietary - Cummins Inc.
