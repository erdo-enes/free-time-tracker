from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Task, TaskStatus, Project, IssueHistory, User
from schemas import TaskCreate, TaskUpdate, TaskOut
from security import get_current_user

router = APIRouter(dependencies=[Depends(get_current_user)])

# Fields worth recording in the changelog
TRACKED_FIELDS = {"title", "description", "status", "priority", "issue_type",
                  "category_id", "parent_task_id", "project_id", "sprint_id",
                  "story_points", "start_date", "due_date", "assignee", "labels"}


def _val(v):
    if v is None:
        return None
    if hasattr(v, "value"):  # SQLAlchemy/Python enums
        return str(v.value)
    if isinstance(v, (list, dict)):
        import json
        return json.dumps(v)
    return str(v)


@router.get("", response_model=list[TaskOut])
def list_tasks(status: str | None = None, project_id: int | None = None, sprint_id: int | None = None, db: Session = Depends(get_db)):
    q = db.query(Task)
    if status:
        q = q.filter(Task.status == TaskStatus(status))
    if project_id:
        q = q.filter(Task.project_id == project_id)
    if sprint_id is not None:
        if sprint_id == 0:
            q = q.filter(Task.sprint_id.is_(None))
        else:
            q = q.filter(Task.sprint_id == sprint_id)
    return q.order_by(Task.order, Task.id).all()


@router.post("", response_model=TaskOut, status_code=201)
def create_task(body: TaskCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    data = body.model_dump()
    project_id = data.get("project_id")
    project = None
    if project_id:
        project = db.query(Project).get(project_id)
        if not project:
            raise HTTPException(400, "Project not found")
    max_order = db.query(Task).filter(Task.status == data.get("status", TaskStatus.backlog)).count()
    data["order"] = max_order
    task = Task(**data)
    if project:
        task.issue_number = project.next_issue_number(db)
    db.add(task)
    db.commit()
    db.refresh(task)
    db.add(IssueHistory(task_id=task.id, field="created", old_value=None, new_value=task.key, actor=current_user.username))
    db.commit()
    return task


@router.patch("/{task_id}", response_model=TaskOut)
def update_task(task_id: int, body: TaskUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    task = db.query(Task).get(task_id)
    if not task:
        raise HTTPException(404, "Not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        if k in TRACKED_FIELDS:
            old = _val(getattr(task, k))
            new = _val(v)
            if old != new:
                db.add(IssueHistory(task_id=task.id, field=k, old_value=old, new_value=new, actor=current_user.username))
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
def move_task(task_id: int, new_status: str, new_order: int = 0, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    task = db.query(Task).get(task_id)
    if not task:
        raise HTTPException(404, "Not found")
    old_status = task.status.value if task.status else None
    if old_status != new_status:
        db.add(IssueHistory(task_id=task.id, field="status", old_value=old_status, new_value=new_status, actor=current_user.username))
    task.status = TaskStatus(new_status)
    task.order = new_order
    db.commit()
    db.refresh(task)
    return task
