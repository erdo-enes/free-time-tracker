from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_

from database import get_db
from models import IssueLink, IssueHistory, Task
from schemas import IssueLinkCreate, IssueLinkOut, IssueHistoryOut
from security import get_current_user

router = APIRouter(dependencies=[Depends(get_current_user)])

VALID_LINK_TYPES = {"blocks", "relates", "duplicates"}


@router.get("/{task_id}/links", response_model=list[IssueLinkOut])
def list_links(task_id: int, db: Session = Depends(get_db)):
    links = db.query(IssueLink).filter(
        or_(IssueLink.source_task_id == task_id, IssueLink.target_task_id == task_id)
    ).all()
    out = []
    for l in links:
        target = db.query(Task).get(l.target_task_id if l.source_task_id == task_id else l.source_task_id)
        out.append(IssueLinkOut(
            id=l.id,
            source_task_id=l.source_task_id,
            target_task_id=l.target_task_id,
            target_key=target.key if target else None,
            target_title=target.title if target else None,
            target_status=target.status.value if target and target.status else None,
            link_type=l.link_type,
            created_at=l.created_at,
        ))
    return out


@router.post("/{task_id}/links", response_model=IssueLinkOut, status_code=201)
def create_link(task_id: int, body: IssueLinkCreate, db: Session = Depends(get_db)):
    if body.link_type not in VALID_LINK_TYPES:
        raise HTTPException(400, f"Invalid link type. Use one of {VALID_LINK_TYPES}")
    if body.target_task_id == task_id:
        raise HTTPException(400, "Cannot link an issue to itself")
    target = db.query(Task).get(body.target_task_id)
    if not target:
        raise HTTPException(404, "Target issue not found")
    existing = db.query(IssueLink).filter(
        IssueLink.source_task_id == task_id,
        IssueLink.target_task_id == body.target_task_id,
        IssueLink.link_type == body.link_type,
    ).first()
    if existing:
        raise HTTPException(409, "Link already exists")
    link = IssueLink(source_task_id=task_id, target_task_id=body.target_task_id, link_type=body.link_type)
    db.add(link)
    db.commit()
    db.refresh(link)
    return IssueLinkOut(
        id=link.id, source_task_id=link.source_task_id, target_task_id=link.target_task_id,
        target_key=target.key, target_title=target.title, target_status=target.status.value,
        link_type=link.link_type, created_at=link.created_at,
    )


@router.delete("/links/{link_id}", status_code=204)
def delete_link(link_id: int, db: Session = Depends(get_db)):
    link = db.query(IssueLink).get(link_id)
    if not link:
        raise HTTPException(404, "Link not found")
    db.delete(link)
    db.commit()


@router.get("/{task_id}/history", response_model=list[IssueHistoryOut])
def list_history(task_id: int, db: Session = Depends(get_db)):
    return db.query(IssueHistory).filter(IssueHistory.task_id == task_id).order_by(IssueHistory.created_at.desc()).all()
