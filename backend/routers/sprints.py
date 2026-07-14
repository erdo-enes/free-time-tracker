from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from database import get_db
from models import Sprint, Task, TaskStatus
from schemas import SprintCreate, SprintOut
from security import get_current_user

router = APIRouter(dependencies=[Depends(get_current_user)])


@router.get("", response_model=list[SprintOut])
def list_sprints(project_id: int | None = None, db: Session = Depends(get_db)):
    q = db.query(Sprint)
    if project_id:
        q = q.filter(Sprint.project_id == project_id)
    return q.order_by(Sprint.created_at.desc()).all()


@router.post("", response_model=SprintOut, status_code=201)
def create_sprint(body: SprintCreate, db: Session = Depends(get_db)):
    sprint = Sprint(name=body.name, goal=body.goal, project_id=body.project_id, is_active=False)
    db.add(sprint)
    db.commit()
    db.refresh(sprint)
    return sprint


@router.post("/{sprint_id}/start", response_model=SprintOut)
def start_sprint(sprint_id: int, db: Session = Depends(get_db)):
    sprint = db.query(Sprint).get(sprint_id)
    if not sprint:
        raise HTTPException(404, "Sprint not found")
    if sprint.project_id:
        active = db.query(Sprint).filter(Sprint.project_id == sprint.project_id, Sprint.is_active == True).first()
        if active and active.id != sprint.id:
            raise HTTPException(400, "Another sprint is already active for this project. End it first.")
    sprint.is_active = True
    sprint.started_at = datetime.now(timezone.utc)
    sprint.ended_at = None
    db.commit()
    db.refresh(sprint)
    return sprint


@router.post("/{sprint_id}/end", response_model=SprintOut)
def end_sprint(sprint_id: int, db: Session = Depends(get_db)):
    sprint = db.query(Sprint).get(sprint_id)
    if not sprint:
        raise HTTPException(404, "Sprint not found")
    sprint.is_active = False
    sprint.ended_at = datetime.now(timezone.utc)
    incomplete = db.query(Task).filter(Task.sprint_id == sprint_id, Task.status != TaskStatus.done).all()
    for t in incomplete:
        t.sprint_id = None
        t.status = TaskStatus.backlog
    db.commit()
    db.refresh(sprint)
    return sprint


@router.delete("/{sprint_id}", status_code=204)
def delete_sprint(sprint_id: int, db: Session = Depends(get_db)):
    sprint = db.query(Sprint).get(sprint_id)
    if not sprint:
        raise HTTPException(404, "Sprint not found")
    if sprint.is_active:
        raise HTTPException(400, "Cannot delete an active sprint. End it first.")
    db.query(Task).filter(Task.sprint_id == sprint_id).update({"sprint_id": None})
    db.delete(sprint)
    db.commit()
