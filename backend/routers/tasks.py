from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Task, TaskStatus
from schemas import TaskCreate, TaskUpdate, TaskOut

router = APIRouter()


@router.get("", response_model=list[TaskOut])
def list_tasks(status: str | None = None, db: Session = Depends(get_db)):
    q = db.query(Task)
    if status:
        q = q.filter(Task.status == TaskStatus(status))
    return q.order_by(Task.order, Task.id).all()


@router.post("", response_model=TaskOut, status_code=201)
def create_task(body: TaskCreate, db: Session = Depends(get_db)):
    data = body.model_dump()
    max_order = db.query(Task).filter(Task.status == data.get("status", TaskStatus.backlog)).count()
    data["order"] = max_order
    task = Task(**data)
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@router.patch("/{task_id}", response_model=TaskOut)
def update_task(task_id: int, body: TaskUpdate, db: Session = Depends(get_db)):
    task = db.query(Task).get(task_id)
    if not task:
        raise HTTPException(404, "Not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(task, k, v)
    db.commit()
    db.refresh(task)
    return task


@router.delete("/{task_id}", status_code=204)
def delete_task(task_id: int, db: Session = Depends(get_db)):
    task = db.query(Task).get(task_id)
    if not task:
        raise HTTPException(404, "Not found")
    db.delete(task)
    db.commit()


@router.post("/{task_id}/move", response_model=TaskOut)
def move_task(task_id: int, new_status: str, new_order: int = 0, db: Session = Depends(get_db)):
    task = db.query(Task).get(task_id)
    if not task:
        raise HTTPException(404, "Not found")
    task.status = TaskStatus(new_status)
    task.order = new_order
    db.commit()
    db.refresh(task)
    return task
