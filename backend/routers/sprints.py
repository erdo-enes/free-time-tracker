from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Sprint
from schemas import SprintCreate, SprintOut

router = APIRouter()


@router.get("", response_model=list[SprintOut])
def list_sprints(db: Session = Depends(get_db)):
    return db.query(Sprint).order_by(Sprint.created_at.desc()).all()


@router.post("", response_model=SprintOut, status_code=201)
def create_sprint(body: SprintCreate, db: Session = Depends(get_db)):
    sprint = Sprint(name=body.name, goal=body.goal, is_active=True)
    db.add(sprint)
    db.commit()
    db.refresh(sprint)
    return sprint


@router.patch("/{sprint_id}", response_model=SprintOut)
def update_sprint(sprint_id: int, is_active: bool = True, db: Session = Depends(get_db)):
    sprint = db.query(Sprint).get(sprint_id)
    if not sprint:
        raise HTTPException(404, "Sprint not found")
    sprint.is_active = is_active
    db.commit()
    db.refresh(sprint)
    return sprint
