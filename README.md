# FreeTime Jira

A personal free-time tracker that combines a Jira-like Kanban board with automatic gaming session tracking across PSN, Xbox, Steam, Switch 2, and original CFW Switch.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        BACKEND (FastAPI)                     │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────────┐ │
│  │ Kanban   │  │ Time     │  │ Analytics│  │ Watched     │ │
│  │ Tasks    │  │ Entries  │  │ Charts   │  │ Accounts    │ │
│  │ (Jira)   │  │ (Manual) │  │          │  │ (CRUD)      │ │
│  └──────────┘  └──────────┘  └──────────┘  └──────┬──────┘ │
│                                                    │        │
│  ┌─────────────────────────────────────────────────┐        │
│  │          TRACKER DAEMON (APScheduler)            │        │
│  │  Every 5 min: poll all watched accounts          │        │
│  └──────────┬──────────┬──────────┬────────────────┘        │
│             │          │          │                          │
│  ┌──────────▼──┐ ┌────▼─────┐ ┌──▼──────┐ ┌──────────────┐  │
│  │ Steam API   │ │ PSN API  │ │ Xbox API│ │ Switch 2 API │  │
│  │ (monitoring │ │(monitor. │ │(monitor.│ │ (monitoring  │  │
│  │  account)   │ │ account) │ │ account)│ │  account)    │  │
│  └─────────────┘ └──────────┘ └─────────┘ └──────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Switch (CFW) Ingest Endpoint                        │   │
│  │  POST /api/gaming/switch/ingest ← from Switch console│   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                    ▲
                    │ HTTP POST (every 30s)
┌───────────────────┴───────────────────────────────────┐
│              SWITCH CFW COLLECTOR (C/libnx)            │
│  Runs as sysmodule on Atmosphere CFW Switch            │
│  Polls running process → resolves game name → POSTs    │
│  Ultra-lightweight: ~8KB heap, no UI, no graphics      │
└───────────────────────────────────────────────────────┘
```

## Monitoring vs Collector Approach

| Platform   | Method             | How It Works                                    |
|------------|--------------------|-------------------------------------------------|
| Steam      | Monitoring account | API key checks friends' current game            |
| PSN        | Monitoring account | NPSSO token checks friends' presence            |
| Xbox       | Monitoring account | OpenXBL key checks friends' presence            |
| Switch 2   | Monitoring account | NSO token checks friends' presence              |
| Switch (1) | CFW collector      | Homebrew sysmodule runs ON the Switch, POSTs to backend |

The monitoring account must be friends with each watched account on each platform.

## Features

### Jira-Style Board
- **5 columns**: Backlog → Selected for Sprint → In Progress → In Review → Done
- **Issue types**: Epic, Story, Task, Bug, Sub-task (with colored icons)
- **Priorities**: Lowest → Low → Medium → High → Highest (with arrow indicators)
- **Story points**: Assign effort estimates
- **Categories**: Tag issues with custom categories/colors (CNCF Prep, TOEFL, ALES, etc.)
- **Drag-and-drop**: Move cards between columns
- **Detail modal**: Click any card to edit title, description, status, priority, story points, category

### Time Tracking
- **Live timer**: Start/stop a timer for any activity
- **Manual entry**: Log time for exam prep (CNCF, TOEFL, ALES) with categories
- **Categories**: Create custom categories with colors

### Gaming Tracking
- **Automatic**: Background daemon polls Steam/PSN/Xbox/Switch 2 every 5 minutes
- **Switch CFW**: Homebrew collector reports directly from the console
- **Per-account tracking**: See which account played what game
- **Analytics**: Time by platform, by game, by account, by device

### Settings
- **Watched accounts**: Add/remove PSN, Xbox, Steam, Switch 2 accounts to monitor
- **Toggle monitoring**: Pause/resume monitoring per account
- **Status visibility**: See last check time and current status for each account

## Project Structure

```
free-time-jira-app/
├── backend/                  # FastAPI + SQLite + SQLAlchemy
│   ├── main.py
│   ├── config.py
│   ├── database.py
│   ├── models.py             # Task, TimeEntry, GamingSession, WatchedAccount
│   ├── schemas.py
│   ├── tracker_daemon.py     # Background poller for watched accounts
│   ├── routers/
│   │   ├── tasks.py          # Jira-style task CRUD
│   │   ├── time_entries.py   # Manual time logging
│   │   ├── categories.py
│   │   ├── analytics.py      # Charts + breakdowns
│   │   ├── gaming.py         # Gaming sessions + Switch ingest
│   │   └── watched_accounts.py  # Add/remove monitored accounts
│   └── services/
│       ├── __init__.py       # Service router
│       ├── steam.py          # Steam Web API (monitoring account)
│       ├── psn.py            # PSN presence API (monitoring account)
│       ├── xbox.py           # OpenXBL API (monitoring account)
│       └── switch2.py        # Nintendo Switch Online API
├── frontend/                 # Next.js + React + Tailwind
│   ├── app/
│   │   ├── page.tsx          # Dashboard (analytics)
│   │   ├── board/page.tsx    # Full Jira-style Kanban
│   │   ├── time/page.tsx     # Time tracking + timer
│   │   ├── gaming/page.tsx   # Gaming activity + charts
│   │   └── settings/page.tsx # Watched accounts management
│   └── components/
│       └── Sidebar.tsx
├── switch-collector/         # CFW Nintendo Switch collector (C/libnx)
│   ├── source/
│   │   ├── main.c            # Main polling loop (30s interval)
│   │   ├── game_detect.c     # Detect running game via pmdmnt/ns
│   │   ├── game_detect.h
│   │   ├── http.c            # HTTP POST to backend
│   │   └── http.h
│   ├── ftj-collector.json    # devkitPro build config
│   └── README.md             # Build + install instructions
└── start.bat                 # Windows startup script
```

## Quick Start

### Backend
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env   # Edit with your API keys
py -m uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3001

### Windows Quick Start
Double-click `start.bat`

## API Key Setup

### Steam (Monitoring Account)
1. Get your API key at https://steamcommunity.com/dev/apikey
2. Set in `.env`:
   ```
   FREETIME_STEAM_API_KEY=your_key
   ```
3. Add watched accounts in Settings (by Steam vanity URL or SteamID64)
4. The monitoring account must be friends with watched accounts

### PSN (Monitoring Account)
1. Log into https://my.playstation.com
2. Find the `npsso` cookie value
3. Set in `.env`:
   ```
   FREETIME_PSN_NPSSO_TOKEN=your_npsso_token
   ```
4. Add watched PSN accounts in Settings (by Online ID)
5. The monitoring account must be friends with watched accounts

### Xbox (Monitoring Account)
1. Get an API key from https://xbl.io
2. Set in `.env`:
   ```
   FREETIME_XBOX_OPENXBL_KEY=your_key
   ```
3. Add watched Xbox accounts in Settings (by Gamertag)
4. The monitoring account must be friends with watched accounts

### Switch 2 (Monitoring Account)
1. Get your NSO session token
2. Set in `.env`:
   ```
   FREETIME_SWITCH2_NSO_TOKEN=your_token
   ```
3. Add watched Switch 2 accounts in Settings

### Switch (Original, CFW Collector)
See `switch-collector/README.md` for build and installation instructions.
No API key needed - the collector runs directly on the Switch and POSTs to the backend.

1. Build with devkitPro
2. Edit `SERVER_URL` in `source/main.c` to point to your backend
3. Copy `.nro` to Switch SD card
4. Boot with Atmosphere CFW

## Adding Watched Accounts

1. Open the app → Settings
2. Click "Add Account"
3. Select platform (Steam, PSN, Xbox, Switch 2)
4. Enter the username/gamertag/online ID
5. Click Add

The backend will resolve the username to a platform account ID and start polling every 5 minutes.
