from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import get_db
from models import Project, Task, TaskStatus
from schemas import ProjectCreate, ProjectUpdate, ProjectOut, TaskOut
from security import get_current_user
import re

router = APIRouter(dependencies=[Depends(get_current_user)])

KEY_RE = re.compile(r"^[A-Z][A-Z0-9]*$")


@router.get("", response_model=list[ProjectOut])
def list_projects(db: Session = Depends(get_db)):
    return db.query(Project).order_by(Project.created_at).all()


@router.post("", response_model=ProjectOut, status_code=201)
def create_project(body: ProjectCreate, db: Session = Depends(get_db)):
    key = body.key.upper()
    if not KEY_RE.match(key):
        raise HTTPException(400, "Key must be uppercase letters/numbers, start with a letter")
    if db.query(Project).filter(Project.key == key).first():
        raise HTTPException(400, "Project key already exists")
    project = Project(
        key=key,
        name=body.name,
        description=body.description,
        style_color=body.style_color,
        lead=body.lead,
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


@router.patch("/{project_id}", response_model=ProjectOut)
def update_project(project_id: int, body: ProjectUpdate, db: Session = Depends(get_db)):
    project = db.query(Project).get(project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(project, k, v)
    db.commit()
    db.refresh(project)
    return project


@router.delete("/{project_id}", status_code=204)
def delete_project(project_id: int, db: Session = Depends(get_db)):
    project = db.query(Project).get(project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    count = db.query(Task).filter(Task.project_id == project_id).count()
    if count > 0:
        raise HTTPException(400, f"Cannot delete project with {count} issues. Move or delete them first.")
    db.delete(project)
    db.commit()


@router.get("/{project_id}/stats")
def project_stats(project_id: int, db: Session = Depends(get_db)):
    project = db.query(Project).get(project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    q = db.query(Task).filter(Task.project_id == project_id)
    total = q.count()
    done = q.filter(Task.status == TaskStatus.done).count()
    points = db.query(func.sum(Task.story_points)).filter(Task.project_id == project_id).scalar() or 0
    done_points = db.query(func.sum(Task.story_points)).filter(
        Task.project_id == project_id, Task.status == TaskStatus.done
    ).scalar() or 0
    return {
        "total": total,
        "done": done,
        "open": total - done,
        "story_points": points,
        "done_points": done_points,
    }
