from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
import logging

from database import SessionLocal
from models import GamingSession, TimeEntry, Platform, EntryType, WatchedAccount, AccountPlatform
from services import get_watched_status
from config import settings

logger = logging.getLogger("tracker")


async def _poll_account(account: WatchedAccount) -> dict | None:
    try:
        result = await get_watched_status(
            account.platform,
            account.platform_account_id or account.username,
            account.username,
        )
        return result
    except Exception as e:
        logger.warning(f"Poll error for {account.platform}:{account.username}: {e}")
        return None


def _platform_from_account(ap: AccountPlatform) -> Platform:
    return {
        AccountPlatform.steam: Platform.steam,
        AccountPlatform.psn: Platform.psn,
        AccountPlatform.xbox: Platform.xbox,
        AccountPlatform.switch2: Platform.switch2,
    }.get(ap, Platform.pc)


def poll_once():
    import asyncio
    db: Session = SessionLocal()
    try:
        accounts = db.query(WatchedAccount).filter(WatchedAccount.is_active == True).all()
        if not accounts:
            return

        now = datetime.now(timezone.utc)

        for account in accounts:
            result = asyncio.run(_poll_account(account))
            account.last_checked = now

            if result:
                plat = _platform_from_account(account.platform)
                active = (
                    db.query(GamingSession)
                    .filter(
                        GamingSession.is_active == True,
                        GamingSession.platform == plat,
                        GamingSession.account_username == account.username,
                    )
                    .first()
                )
                if active:
                    if active.game_name == result["game_name"]:
                        continue
                    _close_session(db, active, now)
                session = GamingSession(
                    platform=plat,
                    game_name=result["game_name"],
                    game_id=result.get("game_id"),
                    account_username=account.username,
                    started_at=now,
                    is_active=True,
                    raw_data={
                        "source": result["platform"],
                        "persona": result.get("persona_name", account.username),
                    },
                )
                db.add(session)
                account.last_status = f"Playing: {result['game_name']}"
                logger.info(f"Started session: {account.username} -> {result['game_name']} ({result['platform']})")
            else:
                active = (
                    db.query(GamingSession)
                    .filter(
                        GamingSession.is_active == True,
                        GamingSession.platform == _platform_from_account(account.platform),
                        GamingSession.account_username == account.username,
                    )
                    .first()
                )
                if active:
                    _close_session(db, active, now)
                account.last_status = "Offline / Not playing"

            db.commit()

    except Exception as e:
        logger.error(f"Tracker poll error: {e}")
    finally:
        db.close()


def _close_session(db: Session, session: GamingSession, ended_at: datetime):
    session.ended_at = ended_at
    duration = round((ended_at - session.started_at).total_seconds() / 60, 1)
    session.duration_minutes = duration
    session.is_active = False
    te = TimeEntry(
        title=f"Gaming: {session.game_name}",
        entry_type=EntryType.gaming,
        platform=session.platform,
        started_at=session.started_at,
        ended_at=ended_at,
        duration_minutes=duration,
        metadata_json={
            "source": (session.raw_data or {}).get("source", "auto"),
            "session_id": session.id,
            "account": session.account_username,
        },
    )
    db.add(te)
    db.commit()
    logger.info(f"Closed session: {session.account_username} -> {session.game_name} ({duration} min)")


_scheduler: BackgroundScheduler | None = None


def start_tracker():
    global _scheduler
    if _scheduler:
        return
    _scheduler = BackgroundScheduler()
    _scheduler.add_job(
        poll_once,
        "interval",
        seconds=settings.tracker_poll_interval_seconds,
        id="gaming_poll",
        next_run_time=datetime.now() + timedelta(seconds=5),
    )
    _scheduler.start()
    logger.info(f"Tracker started (interval={settings.tracker_poll_interval_seconds}s)")


def stop_tracker():
    global _scheduler
    if _scheduler:
        _scheduler.shutdown(wait=False)
        _scheduler = None
