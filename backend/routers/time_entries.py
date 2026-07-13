from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from database import get_db
from models import TimeEntry
from schemas import TimeEntryCreate, TimeEntryOut, TimeEntryUpdate

router = APIRouter()


@router.get("", response_model=list[TimeEntryOut])
def list_entries(
    category_id: int | None = None,
    platform: str | None = None,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    q = db.query(TimeEntry)
    if category_id:
        q = q.filter(TimeEntry.category_id == category_id)
    if platform:
        q = q.filter(TimeEntry.platform == platform)
    return q.order_by(TimeEntry.started_at.desc()).limit(limit).all()


@router.post("", response_model=TimeEntryOut, status_code=201)
def create_entry(body: TimeEntryCreate, db: Session = Depends(get_db)):
    data = body.model_dump()
    if data.get("started_at") is None:
        data["started_at"] = datetime.now(timezone.utc)
    if data.get("ended_at") and data.get("duration_minutes") is None:
        delta = data["ended_at"] - data["started_at"]
        data["duration_minutes"] = round(delta.total_seconds() / 60, 1)
    if data.get("metadata_json") is None:
        data["metadata_json"] = {}
    entry = TimeEntry(**data)
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.patch("/{entry_id}", response_model=TimeEntryOut)
def update_entry(entry_id: int, body: TimeEntryUpdate, db: Session = Depends(get_db)):
    entry = db.query(TimeEntry).get(entry_id)
    if not entry:
        raise HTTPException(404, "Not found")
    data = body.model_dump(exclude_unset=True)
    if data.get("started_at") and data.get("ended_at") and not data.get("duration_minutes"):
        delta = data["ended_at"] - data["started_at"]
        data["duration_minutes"] = round(delta.total_seconds() / 60, 1)
    for k, v in data.items():
        setattr(entry, k, v)
    db.commit()
    db.refresh(entry)
    return entry


@router.delete("/{entry_id}", status_code=204)
def delete_entry(entry_id: int, db: Session = Depends(get_db)):
    entry = db.query(TimeEntry).get(entry_id)
    if not entry:
        raise HTTPException(404, "Not found")
    db.delete(entry)
    db.commit()
