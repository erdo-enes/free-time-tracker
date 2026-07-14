from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from datetime import datetime, timedelta, timezone, date
from calendar import monthrange
from database import get_db
from models import TimeEntry, GamingSession, Platform, Category, Sprint, Task, TaskStatus, IssueHistory
from security import get_current_user

router = APIRouter(dependencies=[Depends(get_current_user)])


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


@router.get("/weekly-report")
def weekly_report(offset: int = 0, db: Session = Depends(get_db)):
    """Weekly report: per-day breakdown with categories, totals, streaks."""
    today = datetime.now(timezone.utc).date()
    start_of_week = today - timedelta(days=today.weekday()) - timedelta(weeks=offset)
    end_of_week = start_of_week + timedelta(days=6)

    entries = db.query(TimeEntry).filter(
        TimeEntry.started_at >= datetime.combine(start_of_week, datetime.min.time()),
        TimeEntry.started_at <= datetime.combine(end_of_week, datetime.max.time()),
    ).all()

    days = []
    total_minutes = 0
    active_days = 0
    by_category = {}
    longest_streak = 0
    current_streak = 0

    for i in range(7):
        d = start_of_week + timedelta(days=i)
        day_entries = [e for e in entries if e.started_at.date() == d]
        day_minutes = sum(e.duration_minutes or 0 for e in day_entries)
        total_minutes += day_minutes
        if day_minutes > 0:
            active_days += 1
            current_streak += 1
            longest_streak = max(longest_streak, current_streak)
        else:
            current_streak = 0

        day_cats = {}
        for e in day_entries:
            cat_name = e.category.name if e.category else "Uncategorized"
            day_cats[cat_name] = day_cats.get(cat_name, 0) + (e.duration_minutes or 0)
            by_category[cat_name] = by_category.get(cat_name, 0) + (e.duration_minutes or 0)

        days.append({
            "date": d.isoformat(),
            "day_name": d.strftime("%A"),
            "short_date": d.strftime("%b %d"),
            "is_today": d == today,
            "is_weekend": d.weekday() >= 5,
            "total_minutes": round(day_minutes, 1),
            "entry_count": len(day_entries),
            "by_category": {k: round(v, 1) for k, v in sorted(day_cats.items(), key=lambda x: -x[1])},
            "entries": [
                {
                    "id": e.id,
                    "title": e.title,
                    "duration_minutes": round(e.duration_minutes or 0, 1),
                    "category": e.category.name if e.category else None,
                    "category_color": e.category.color if e.category else None,
                    "started_at": e.started_at.isoformat(),
                }
                for e in sorted(day_entries, key=lambda x: x.started_at)
            ],
        })

    # Previous week comparison
    prev_start = start_of_week - timedelta(days=7)
    prev_entries = db.query(TimeEntry).filter(
        TimeEntry.started_at >= datetime.combine(prev_start, datetime.min.time()),
        TimeEntry.started_at < datetime.combine(start_of_week, datetime.min.time()),
    ).all()
    prev_total = sum(e.duration_minutes or 0 for e in prev_entries)
    change_pct = round(((total_minutes - prev_total) / prev_total * 100), 1) if prev_total > 0 else 0

    return {
        "period": "weekly",
        "offset": offset,
        "start_date": start_of_week.isoformat(),
        "end_date": end_of_week.isoformat(),
        "total_minutes": round(total_minutes, 1),
        "total_hours": round(total_minutes / 60, 2),
        "active_days": active_days,
        "longest_streak": longest_streak,
        "entry_count": len(entries),
        "change_pct": change_pct,
        "prev_week_minutes": round(prev_total, 1),
        "by_category": {k: round(v, 1) for k, v in sorted(by_category.items(), key=lambda x: -x[1])},
        "days": days,
    }


@router.get("/monthly-report")
def monthly_report(offset: int = 0, db: Session = Depends(get_db)):
    """Monthly report: per-week breakdown with categories, totals, trends."""
    today = datetime.now(timezone.utc).date()
    if offset == 0:
        year, month = today.year, today.month
    else:
        d = today.replace(day=1) - timedelta(days=offset * 31)
        year, month = d.year, d.month

    _, days_in_month = monthrange(year, month)
    month_start = date(year, month, 1)
    month_end = date(year, month, days_in_month)

    entries = db.query(TimeEntry).filter(
        TimeEntry.started_at >= datetime.combine(month_start, datetime.min.time()),
        TimeEntry.started_at <= datetime.combine(month_end, datetime.max.time()),
    ).all()

    total_minutes = 0
    by_category = {}
    by_day = {}
    active_days = set()

    for e in entries:
        mins = e.duration_minutes or 0
        total_minutes += mins
        d = e.started_at.date()
        by_day[d.isoformat()] = by_day.get(d.isoformat(), 0) + mins
        if mins > 0:
            active_days.add(d.isoformat())
        cat_name = e.category.name if e.category else "Uncategorized"
        by_category[cat_name] = by_category.get(cat_name, 0) + mins

    # Build week summaries
    weeks = []
    current_week_start = month_start
    week_num = 1
    while current_week_start <= month_end:
        week_end = min(current_week_start + timedelta(days=6), month_end)
        week_minutes = 0
        week_active = 0
        week_days = []
        for i in range((week_end - current_week_start).days + 1):
            d = current_week_start + timedelta(days=i)
            d_mins = by_day.get(d.isoformat(), 0)
            week_minutes += d_mins
            if d_mins > 0:
                week_active += 1
            week_days.append({
                "date": d.isoformat(),
                "day": d.day,
                "minutes": round(d_mins, 1),
                "is_today": d == today,
                "is_weekend": d.weekday() >= 5,
            })
        weeks.append({
            "week_num": week_num,
            "start_date": current_week_start.isoformat(),
            "end_date": week_end.isoformat(),
            "total_minutes": round(week_minutes, 1),
            "active_days": week_active,
            "days": week_days,
        })
        current_week_start = week_end + timedelta(days=1)
        week_num += 1

    # Previous month comparison
    prev_month_end = month_start - timedelta(days=1)
    prev_month_start = prev_month_end.replace(day=1)
    prev_entries = db.query(TimeEntry).filter(
        TimeEntry.started_at >= datetime.combine(prev_month_start, datetime.min.time()),
        TimeEntry.started_at <= datetime.combine(prev_month_end, datetime.max.time()),
    ).all()
    prev_total = sum(e.duration_minutes or 0 for e in prev_entries)
    change_pct = round(((total_minutes - prev_total) / prev_total * 100), 1) if prev_total > 0 else 0

    # Daily average and best day
    daily_avg = total_minutes / days_in_month if days_in_month > 0 else 0
    best_day = max(by_day.items(), key=lambda x: x[1]) if by_day else None

    return {
        "period": "monthly",
        "offset": offset,
        "month_name": month_start.strftime("%B %Y"),
        "days_in_month": days_in_month,
        "total_minutes": round(total_minutes, 1),
        "total_hours": round(total_minutes / 60, 2),
        "active_days": len(active_days),
        "daily_avg_minutes": round(daily_avg, 1),
        "best_day": {"date": best_day[0], "minutes": round(best_day[1], 1)} if best_day else None,
        "entry_count": len(entries),
        "change_pct": change_pct,
        "prev_month_minutes": round(prev_total, 1),
        "by_category": {k: round(v, 1) for k, v in sorted(by_category.items(), key=lambda x: -x[1])},
        "weeks": weeks,
    }


@router.get("/heatmap")
def heatmap(months: int = 3, db: Session = Depends(get_db)):
    """GitHub-style activity heatmap: minutes per day for the last N months."""
    today = datetime.now(timezone.utc).date()
    start = today - timedelta(days=months * 30)

    entries = db.query(TimeEntry).filter(
        TimeEntry.started_at >= datetime.combine(start, datetime.min.time()),
    ).all()

    day_map = {}
    for e in entries:
        d = e.started_at.date().isoformat()
        day_map[d] = day_map.get(d, 0) + (e.duration_minutes or 0)

    days = []
    current = start
    while current <= today:
        mins = day_map.get(current.isoformat(), 0)
        days.append({
            "date": current.isoformat(),
            "minutes": round(mins, 1),
            "level": 0 if mins == 0 else 1 if mins < 30 else 2 if mins < 60 else 3 if mins < 120 else 4,
        })
        current += timedelta(days=1)

    max_minutes = max((d["minutes"] for d in days), default=0)
    total_minutes = sum(d["minutes"] for d in days)
    active_days = sum(1 for d in days if d["minutes"] > 0)

    return {
        "months": months,
        "start_date": start.isoformat(),
        "end_date": today.isoformat(),
        "days": days,
        "max_minutes": round(max_minutes, 1),
        "total_minutes": round(total_minutes, 1),
        "active_days": active_days,
        "total_days": len(days),
    }


@router.get("/velocity")
def velocity(project_id: int, db: Session = Depends(get_db)):
    """Story points completed per sprint (completed or active) for a project."""
    sprints = db.query(Sprint).filter(Sprint.project_id == project_id).order_by(Sprint.started_at).all()
    out = []
    for sp in sprints:
        tasks = db.query(Task).filter(Task.sprint_id == sp.id).all()
        total_pts = sum((t.story_points or 0) for t in tasks)
        done_pts = sum((t.story_points or 0) for t in tasks if t.status == TaskStatus.done)
        out.append({
            "sprint_id": sp.id,
            "name": sp.name,
            "is_active": sp.is_active,
            "started_at": sp.started_at.isoformat() if sp.started_at else None,
            "ended_at": sp.ended_at.isoformat() if sp.ended_at else None,
            "total_points": total_pts,
            "completed_points": done_pts,
            "issue_count": len(tasks),
            "done_count": sum(1 for t in tasks if t.status == TaskStatus.done),
        })
    return {"sprints": out}


@router.get("/burndown")
def burndown(sprint_id: int, db: Session = Depends(get_db)):
    """Ideal vs actual remaining story points over the sprint duration."""
    sprint = db.query(Sprint).get(sprint_id)
    if not sprint:
        from fastapi import HTTPException
        raise HTTPException(404, "Sprint not found")
    start = sprint.started_at or sprint.created_at
    end = sprint.ended_at or datetime.now(timezone.utc)
    total_pts = db.query(func.sum(Task.story_points)).filter(Task.sprint_id == sprint_id).scalar() or 0
    tasks = db.query(Task).filter(Task.sprint_id == sprint_id).all()
    # completion events from history (status -> done)
    completion_by_day = {}
    for t in tasks:
        if t.status != TaskStatus.done:
            continue
        done_entry = (
            db.query(IssueHistory)
            .filter(IssueHistory.task_id == t.id, IssueHistory.field == "status", IssueHistory.new_value == "done")
            .order_by(IssueHistory.created_at.desc())
            .first()
        )
        if done_entry:
            d = done_entry.created_at.date()
            completion_by_day[d] = completion_by_day.get(d, 0) + (t.story_points or 0)
        else:
            # no history: assume done by end
            d = end.date()
            completion_by_day[d] = completion_by_day.get(d, 0) + (t.story_points or 0)

    num_days = max((end.date() - start.date()).days, 0) + 1
    series = []
    burned = 0
    for i in range(num_days):
        d = (start.date() + timedelta(days=i))
        burned += completion_by_day.get(d, 0)
        remaining = max(total_pts - burned, 0)
        ideal = round(total_pts * (1 - (i / max(num_days - 1, 1))), 1)
        series.append({
            "date": d.isoformat(),
            "day": i + 1,
            "ideal": ideal,
            "remaining": remaining,
        })
    return {
        "sprint_id": sprint_id,
        "sprint_name": sprint.name,
        "is_active": sprint.is_active,
        "total_points": total_pts,
        "start_date": start.date().isoformat(),
        "end_date": end.date().isoformat(),
        "series": series,
    }


@router.get("/cumulative-flow")
def cumulative_flow(project_id: int, days: int = 30, db: Session = Depends(get_db)):
    """Count of issues in each status per day for the last N days (from history)."""
    today = datetime.now(timezone.utc).date()
    start = today - timedelta(days=days)
    tasks = db.query(Task).filter(Task.project_id == project_id).all()
    statuses = ["backlog", "selected", "in_progress", "review", "done"]

    # Build per-task status timeline from history
    def status_on_date(task, target_date):
        hist = (
            db.query(IssueHistory)
            .filter(IssueHistory.task_id == task.id, IssueHistory.field == "status",
                    IssueHistory.created_at <= datetime.combine(target_date, datetime.max.time()))
            .order_by(IssueHistory.created_at.asc())
            .all()
        )
        if not hist:
            # created before target_date? use current status if created before, else not existed
            if task.created_at.date() <= target_date:
                return task.status.value if task.status else "backlog"
            return None
        return hist[-1].new_value or "backlog"

    series = []
    for i in range(days + 1):
        d = start + timedelta(days=i)
        counts = {s: 0 for s in statuses}
        for t in tasks:
            if t.created_at.date() > d:
                continue
            st = status_on_date(t, d)
            if st in counts:
                counts[st] += 1
        series.append({"date": d.isoformat(), **counts})
    return {"project_id": project_id, "start_date": start.isoformat(), "end_date": today.isoformat(), "statuses": statuses, "series": series}
