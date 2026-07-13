from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from database import get_db
from models import GamingSession, TimeEntry, Platform, EntryType
from schemas import GamingSessionOut, SwitchIngestPayload

router = APIRouter()


@router.get("/sessions", response_model=list[GamingSessionOut])
def list_sessions(limit: int = 50, db: Session = Depends(get_db)):
    return db.query(GamingSession).order_by(GamingSession.started_at.desc()).limit(limit).all()


@router.post("/switch/ingest", response_model=GamingSessionOut, status_code=201)
def switch_ingest(payload: SwitchIngestPayload, db: Session = Depends(get_db)):
    started = payload.started_at or datetime.now(timezone.utc)
    duration = 0.0
    if payload.ended_at:
        duration = round((payload.ended_at - started).total_seconds() / 60, 1)
    session = GamingSession(
        platform=Platform.switch,
        game_name=payload.game_name,
        game_id=payload.game_id,
        started_at=started,
        ended_at=payload.ended_at,
        duration_minutes=duration,
        is_active=payload.ended_at is None,
        raw_data={"device_name": payload.device_name or "Nintendo Switch"},
    )
    db.add(session)
    if payload.ended_at:
        te = TimeEntry(
            title=f"Gaming: {payload.game_name}",
            entry_type=EntryType.gaming,
            platform=Platform.switch,
            started_at=started,
            ended_at=payload.ended_at,
            duration_minutes=duration,
            metadata_json={"device": payload.device_name or "Nintendo Switch", "source": "switch_homebrew"},
        )
        db.add(te)
    db.commit()
    db.refresh(session)
    return session
