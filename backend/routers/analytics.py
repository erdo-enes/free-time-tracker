from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from datetime import datetime, timedelta, timezone
from database import get_db
from models import TimeEntry, GamingSession, Platform, Category

router = APIRouter()


@router.get("/summary")
def summary(days: int = 7, db: Session = Depends(get_db)):
    since = datetime.now(timezone.utc) - timedelta(days=days)
    entries = db.query(TimeEntry).filter(TimeEntry.started_at >= since).all()
    total_minutes = sum(e.duration_minutes or 0 for e in entries)
    by_category = {}
    for e in entries:
        cat_name = "Uncategorized"
        if e.category:
            cat_name = e.category.name
        by_category[cat_name] = by_category.get(cat_name, 0) + (e.duration_minutes or 0)
    by_platform = {}
    for e in entries:
        p = e.platform.value if e.platform else "manual"
        by_platform[p] = by_platform.get(p, 0) + (e.duration_minutes or 0)
    return {
        "days": days,
        "total_minutes": round(total_minutes, 1),
        "total_hours": round(total_minutes / 60, 2),
        "by_category": {k: round(v, 1) for k, v in sorted(by_category.items(), key=lambda x: -x[1])},
        "by_platform": {k: round(v, 1) for k, v in sorted(by_platform.items(), key=lambda x: -x[1])},
        "entry_count": len(entries),
    }


@router.get("/daily")
def daily_breakdown(days: int = 30, db: Session = Depends(get_db)):
    since = datetime.now(timezone.utc) - timedelta(days=days)
    rows = (
        db.query(
            func.date(TimeEntry.started_at).label("day"),
            TimeEntry.platform,
            func.sum(TimeEntry.duration_minutes).label("minutes"),
        )
        .filter(TimeEntry.started_at >= since)
        .group_by("day", TimeEntry.platform)
        .all()
    )
    result = {}
    for r in rows:
        day_str = str(r.day)
        if day_str not in result:
            result[day_str] = {}
        plat = r.platform.value if r.platform else "manual"
        result[day_str][plat] = round(r.minutes or 0, 1)
    return result


@router.get("/gaming")
def gaming_summary(days: int = 30, db: Session = Depends(get_db)):
    since = datetime.now(timezone.utc) - timedelta(days=days)
    sessions = db.query(GamingSession).filter(GamingSession.started_at >= since).all()
    by_game = {}
    by_platform = {}
    by_device = {}
    by_account = {}
    total_minutes = 0
    for s in sessions:
        mins = s.duration_minutes or 0
        total_minutes += mins
        by_game[s.game_name] = by_game.get(s.game_name, 0) + mins
        p = s.platform.value if s.platform else "unknown"
        by_platform[p] = by_platform.get(p, 0) + mins
        device = (s.raw_data or {}).get("device_name", p)
        by_device[device] = by_device.get(device, 0) + mins
        if s.account_username:
            by_account[s.account_username] = by_account.get(s.account_username, 0) + mins
    return {
        "days": days,
        "total_minutes": round(total_minutes, 1),
        "total_hours": round(total_minutes / 60, 2),
        "session_count": len(sessions),
        "by_game": {k: round(v, 1) for k, v in sorted(by_game.items(), key=lambda x: -x[1])},
        "by_platform": {k: round(v, 1) for k, v in sorted(by_platform.items(), key=lambda x: -x[1])},
        "by_device": {k: round(v, 1) for k, v in sorted(by_device.items(), key=lambda x: -x[1])},
        "by_account": {k: round(v, 1) for k, v in sorted(by_account.items(), key=lambda x: -x[1])},
    }
