# FreeTime Jira

> A professional personal time-tracking and project management app that combines a Jira-style Kanban board with a ClockWatch Pro-style time tracker, calendar, and automatic gaming session monitoring.

[![Python](https://img.shields.io/badge/Python-3.12+-3776AB?logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Next.js-15+-000000?logo=next.js&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19+-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4+-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![SQLite](https://img.shields.io/badge/SQLite-3+-003B57?logo=sqlite&logoColor=white)](https://sqlite.org)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)](https://docker.com)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

---

## What is FreeTime Jira?

FreeTime Jira is a self-hosted personal productivity app that answers the question: **"Where does my free time go?"**

It combines three tools into one:

1. **Jira-style Kanban Board** - Plan exam prep (CNCF/CKA, TOEFL, ALES), personal projects, and tasks with epics, stories, bugs, story points, priorities, labels, comments, and sprint/backlog views
2. **ClockWatch Pro-style Time Tracker** - Log time with a live timer or manual time-range entries (e.g., "18:00-20:00 CNCF Certification Study"), categorized by activity type
3. **Automatic Gaming Tracker** - Monitors PSN, Xbox, Steam, and Switch 2 accounts via a monitoring account, plus a CFW Nintendo Switch homebrew collector that reports directly from the console

All time data flows into unified analytics with weekly/monthly reports, activity heatmaps, and category breakdowns.

---

## Features

### Board (Jira Clone)
- **5-column Kanban**: Backlog -> Selected for Sprint -> In Progress -> In Review -> Done
- **Issue types**: Epic (purple), Story (green), Task (blue), Bug (red), Sub-task (gray) - each with colored icons
- **5 priority levels**: Lowest to Highest with visual priority bars
- **Story points** with circular badges
- **Labels** - add/remove tags inline on cards
- **Due dates** with overdue indicators (red alert)
- **Assignee** with avatar initials
- **Sprint/Backlog toggle** - switch between sprint board and backlog view
- **Epic sidebar** - shows epic progress bars and time spent
- **Drag-and-drop** - move cards between columns AND reorder within columns
- **Issue detail modal** with 3 tabs:
  - Description (inline editable)
  - Comments (add/delete with author avatars)
  - Time tracking (original estimate, time spent, remaining + logged entries)
- **Create Issue modal** with all fields (type, status, priority, story points, labels, category)

### Calendar (Week View)
- **Drag-to-create** - click and drag across time slots to create entries
- **Click-to-edit** - click any entry to edit title, date, time, category
- **Drag-to-move** - drag entries to reschedule
- **Current time line** - red indicator line on today's column with live HH:mm
- **Today highlight** - today's column is shaded blue
- **Week navigation** - prev/next/today buttons

### Time Tracker (ClockWatch Pro Style)
- **Live timer** - start/pause/stop with HH:MM:SS display
- **Time Range entry** - pick date + start time + end time (e.g., 18:00 to 20:00)
- **Duration entry** - enter hours + minutes manually
- **Category breakdown** - progress bars showing time per category
- **Day grouping** - entries grouped by day with daily totals
- **Stats cards** - weekly total, today's total, entry count, daily average
- **Link to tasks** - associate time entries with board issues

### Reports & Analytics
- **Overview tab**: stat cards, GitHub-style activity heatmap, daily trend area chart, category pie, platform bar, category breakdown table
- **Weekly report tab**: per-day bar chart, daily detail with entries, streaks, active days, week-over-week comparison
- **Monthly report tab**: calendar grid heatmap, weekly bars, category distribution, monthly stats (daily avg, best day, active days), month-over-month comparison

### Gaming Tracker
- **Automatic monitoring** via monitoring account (Steam, PSN, Xbox, Switch 2)
- **CFW Switch collector** - ultra-lightweight C/libnx sysmodule runs on the console
- **Per-account tracking** - see which account played what game
- **Active session indicator** with pulsing green dot
- **Analytics** - time by platform, by game, by account, by device
- **Session feed** with start/end times and duration

### Top Bar (Fully Functional)
- **Search** - live search across tasks and time entries with dropdown results
- **Projects** - dropdown with project info and quick navigation
- **Create** - dropdown to create issues, time entries, or calendar entries
- **Notifications** - recent issues and time entries with status indicators
- **Profile** - avatar dropdown with navigation to all pages

### Settings
- **Watched accounts** - add/remove/pause PSN, Xbox, Steam, Switch 2 accounts
- **Platform API key config** - shows which env vars to set and their status
- **How monitoring works** - expandable explanation with numbered steps
- **Switch CFW info** - endpoint documentation for the homebrew collector

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Backend | Python 3.12 + FastAPI | Async, fast, auto-docs, type-safe |
| Database | SQLite (file-based) | Zero setup, lightweight, portable |
| Frontend | Next.js 15 + React 19 + TypeScript | SSR, fast, modern |
| Styling | Tailwind CSS 3.4 | Utility-first, consistent, fast |
| Charts | Recharts | Responsive, composable, React-native |
| Drag & Drop | @hello-pangea/dnd | Accessible, performant, smooth |
| Date Utils | date-fns | Tree-shakeable, immutable |
| Background Jobs | APScheduler | Lightweight, in-process scheduling |
| Gaming APIs | httpx (async HTTP) | Non-blocking API calls to Steam/PSN/Xbox/NSO |
| Switch Collector | C + libnx | Ultra-lightweight, ~8KB heap, no UI |

---

## Project Structure

```
free-time-jira-app/
├── backend/                          # FastAPI + SQLite + SQLAlchemy
│   ├── Dockerfile
│   ├── .dockerignore
│   ├── requirements.txt
│   ├── config.py                     # Settings (reads .env)
│   ├── database.py                   # SQLite engine
│   ├── models.py                     # Task, TimeEntry, Comment, Sprint, GamingSession, WatchedAccount
│   ├── schemas.py                    # Pydantic schemas
│   ├── main.py                       # FastAPI app entry
│   ├── tracker_daemon.py             # Background poller for watched accounts
│   ├── routers/
│   │   ├── tasks.py                  # Jira-style task CRUD + move
│   │   ├── time_entries.py           # Time logging CRUD + update
│   │   ├── categories.py             # Category management
│   │   ├── comments.py               # Issue comments CRUD
│   │   ├── sprints.py                # Sprint management
│   │   ├── analytics.py              # Summary, daily, gaming, weekly/monthly reports, heatmap
│   │   ├── gaming.py                 # Gaming sessions + Switch ingest
│   │   └── watched_accounts.py       # Monitored accounts CRUD
│   └── services/
│       ├── __init__.py               # Service router + resolver
│       ├── steam.py                  # Steam Web API (monitoring account)
│       ├── psn.py                    # PSN presence API (NPSSO token)
│       ├── xbox.py                   # OpenXBL API (monitoring account)
│       └── switch2.py               # Nintendo Switch Online API
├── frontend/                         # Next.js + React + Tailwind
│   ├── Dockerfile
│   ├── .dockerignore
│   ├── package.json
│   ├── next.config.js                # API proxy (reads BACKEND_URL env)
│   ├── tailwind.config.ts            # Jira Cloud color palette
│   ├── tsconfig.json
│   ├── lib/
│   │   ├── api.ts                    # API client + TypeScript interfaces
│   │   └── utils.ts                  # Format helpers
│   ├── components/
│   │   ├── TopBar.tsx                # Search, notifications, profile, create
│   │   ├── Sidebar.tsx               # Navigation with sections
│   │   └── IssueTypes.tsx            # Jira issue type icons + priorities
│   └── app/
│       ├── layout.tsx                # Root layout (TopBar + Sidebar)
│       ├── globals.css               # Tailwind + Jira component classes
│       ├── page.tsx                  # Board (Kanban, Jira clone)
│       ├── calendar/page.tsx         # Calendar (week view, drag-to-create)
│       ├── time/page.tsx             # Time Tracker (timer + manual entry)
│       ├── analytics/page.tsx        # Reports (overview + weekly + monthly)
│       ├── gaming/page.tsx           # Gaming activity
│       └── settings/page.tsx         # Watched accounts + API config
├── switch-collector/                 # CFW Nintendo Switch collector (C/libnx)
│   ├── source/
│   │   ├── main.c                    # Main polling loop (30s interval)
│   │   ├── game_detect.c             # Detect running game via pmdmnt/ns
│   │   ├── game_detect.h
│   │   ├── http.c                    # HTTP POST to backend
│   │   └── http.h
│   ├── ftj-collector.json            # devkitPro build config
│   └── README.md                     # Build + install instructions
├── docker-compose.yml                # Backend + Frontend (no external DB)
├── .env.example                      # Environment variable template
├── .gitignore
├── start.bat                         # Windows quick start script
└── README.md                         # This file
```

---

## Quick Start

### Option 1: Docker Compose (Recommended)

```bash
# Clone
git clone https://github.com/erdo-enes/free-time-tracker.git
cd free-time-tracker

# (Optional) Configure gaming API keys
cp .env.example .env
# Edit .env with your Steam/PSN/Xbox/Switch2 keys

# Build and run
docker compose up --build

# Open http://localhost:3001
```

That's it. No database setup, no external services. SQLite is embedded in the backend container with a persistent volume.

### Option 2: Local Development

#### Backend
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env   # Edit with your API keys
uvicorn main:app --reload --port 8000
```

#### Frontend
```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3001

### Option 3: Windows Quick Start

Double-click `start.bat` (starts both backend and frontend in separate windows).

---

## Docker Architecture

```
┌─────────────────────────────────────────────────────┐
│                  docker-compose                      │
│                                                      │
│  ┌──────────────────┐    ┌──────────────────────┐  │
│  │  ftj-frontend     │    │  ftj-backend          │  │
│  │  (Next.js)         │───>│  (FastAPI)            │  │
│  │  port 3001         │    │  port 8000            │  │
│  │                    │    │                       │  │
│  │  BACKEND_URL=      │    │  SQLite: /data/       │  │
│  │  http://backend:   │    │  freetime.db          │  │
│  │  8000              │    │  (persistent volume)  │  │
│  └──────────────────┘    └──────────────────────┘  │
│                                      │              │
│                            ┌─────────▼──────────┐  │
│                            │  backend-data       │  │
│                            │  (Docker volume)    │  │
│                            └────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

- **No external database** - SQLite is embedded, stored in a Docker volume
- **Lightweight** - Python slim + Node alpine images, ~200MB total
- **Persistent** - Database survives container restarts via named volume
- **Local only** - No ports exposed to the outside world beyond localhost

---

## Gaming Platform Setup

### Steam (Monitoring Account)
1. Get your API key at https://steamcommunity.com/dev/apikey
2. Set `FREETIME_STEAM_API_KEY` in `.env`
3. Add watched accounts in Settings (by Steam vanity URL or SteamID64)
4. Monitoring account must be friends with watched accounts

### PSN (Monitoring Account)
1. Log into https://my.playstation.com in your browser
2. Find the `npsso` cookie value (DevTools -> Application -> Cookies)
3. Set `FREETIME_PSN_NPSSO_TOKEN` in `.env`
4. Add watched PSN accounts in Settings (by Online ID)

### Xbox (Monitoring Account)
1. Get an API key from https://xbl.io
2. Set `FREETIME_XBOX_OPENXBL_KEY` in `.env`
3. Add watched Xbox accounts in Settings (by Gamertag)

### Nintendo Switch 2 (Monitoring Account)
1. Get your NSO session token
2. Set `FREETIME_SWITCH2_NSO_TOKEN` in `.env`
3. Add watched Switch 2 accounts in Settings

### Nintendo Switch (Original, CFW Collector)
The original Switch uses a homebrew sysmodule that runs directly on the console - no monitoring account needed.

See `switch-collector/README.md` for build (devkitPro + libnx) and installation instructions.

The collector POSTs to `/api/gaming/switch/ingest` every 30 seconds when a game is running.

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET/POST | `/api/tasks` | List/create board issues |
| PATCH/DELETE | `/api/tasks/{id}` | Update/delete issue |
| POST | `/api/tasks/{id}/move` | Move issue to column |
| GET/POST | `/api/tasks/{id}/comments` | List/add comments |
| DELETE | `/api/tasks/comments/{id}` | Delete comment |
| GET/POST | `/api/time-entries` | List/create time entries |
| PATCH/DELETE | `/api/time-entries/{id}` | Update/delete time entry |
| GET/POST | `/api/categories` | List/create categories |
| DELETE | `/api/categories/{id}` | Delete category |
| GET/POST | `/api/sprints` | List/create sprints |
| GET | `/api/analytics/summary` | Time summary by category/platform |
| GET | `/api/analytics/daily` | Daily breakdown by platform |
| GET | `/api/analytics/gaming` | Gaming summary |
| GET | `/api/analytics/weekly-report` | Weekly report with per-day details |
| GET | `/api/analytics/monthly-report` | Monthly report with week-by-week summary |
| GET | `/api/analytics/heatmap` | GitHub-style activity heatmap |
| GET/POST | `/api/gaming/sessions` | List gaming sessions |
| POST | `/api/gaming/switch/ingest` | Switch CFW collector ingestion |
| GET/POST | `/api/watched-accounts` | List/create watched accounts |
| PATCH/DELETE | `/api/watched-accounts/{id}` | Update/delete watched account |

---

## Monitoring Account Architecture

```
                    ┌─────────────────────────┐
                    │   Monitoring Account     │
                    │   (authenticated via     │
                    │    .env API keys)        │
                    └──────────┬──────────────┘
                               │ polls every 5 min
                    ┌──────────▼──────────────┐
                    │   Watched Accounts       │
                    │   (added via Settings)   │
                    └──────────┬──────────────┘
                               │
          ┌──────────┬─────────┼──────────┬──────────┐
          ▼          ▼         ▼          ▼          ▼
       Steam       PSN       Xbox     Switch 2    Switch (CFW)
       API         API       API       API        Collector
                                                   (on console)
```

The monitoring account must be friends with watched accounts on each platform. The tracker daemon polls all active watched accounts every 5 minutes, detects when they start/stop playing, and automatically creates gaming sessions + time entries.

---

## Tags

`productivity` `time-tracking` `jira-clone` `kanban` `calendar` `clockwatch` `gaming-tracker` `psn` `xbox` `steam` `nintendo-switch` `cncf` `toefl` `exam-prep` `self-hosted` `docker` `fastapi` `nextjs` `react` `tailwind` `sqlite` `homebrew` `libnx`

---

## License

MIT

---

## Author

Enes Erdogan - [GitHub](https://github.com/erdo-enes)
