# FreeTime Jira - Switch CFW Collector

An ultra-lightweight sysmodule for CFW Nintendo Switch (Atmosphere) that reports
currently-playing game sessions to the FreeTime Jira backend.

## Design Goals

- **Minimal RAM/CPU**: Runs as a background sysmodule, polls every 30 seconds
- **Zero gameplay impact**: Uses libnx's `glsl` and `pmdmnt` APIs only
- **No UI**: Completely headless, runs silently in background
- **Auto start/stop**: Detects when a game launches/exits and reports to backend

## Building

### Prerequisites
- [devkitPro](https://devkitpro.org/) with switch-dev package
- libnx

### Build
```bash
# Install devkitPro switch toolchain (one time)
sudo dkp-pacman -S switch-dev switch-libnx switch-sdl2 --noconfirm

# Build
cd switch-collector
make
```

Output: `ftj-collector.nro`

## Installation

1. Copy `ftj-collector.nro` to your Switch SD card:
   ```
   /atmosphere/contents/42000000000FTJ00/exefs.nsp
   ```

2. Edit the `SERVER_URL` in `source/main.c` to point to your backend server IP.

3. Rebuild and copy to SD card.

4. Reboot Switch with Atmosphere CFW.

## How It Works

1. Every 30 seconds, checks the currently running process via `pmdmntGetProcessId`
2. Resolves the Title ID to a game name via `nsGetApplicationControlData`
3. If a new game started, POSTs `{ "game_name": "...", "started_at": "..." }` to the backend
4. If the game stopped, POSTs `{ "game_name": "...", "ended_at": "..." }` to close the session
5. The backend creates `GamingSession` + `TimeEntry` records automatically

## Memory Footprint

- Stack: 1KB (sysmodule default)
- Heap: ~8KB peak (for NACP data buffer during game name lookup)
- No graphics, no audio, no input - pure background polling

## Configuration

Edit `source/main.c`:

```c
#define SERVER_URL "http://YOUR_SERVER_IP:8000/api/gaming/switch/ingest"
#define POLL_INTERVAL_NS 30000000000ULL  // 30 seconds in nanoseconds
```
