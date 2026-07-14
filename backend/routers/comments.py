from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Comment, Task
from schemas import CommentCreate, CommentOut

router = APIRouter()


@router.get("/{task_id}/comments", response_model=list[CommentOut])
def list_comments(task_id: int, db: Session = Depends(get_db)):
    return db.query(Comment).filter(Comment.task_id == task_id).order_by(Comment.created_at).all()


@router.post("/{task_id}/comments", response_model=CommentOut, status_code=201)
def add_comment(task_id: int, body: CommentCreate, db: Session = Depends(get_db)):
    task = db.query(Task).get(task_id)
    if not task:
        raise HTTPException(404, "Task not found")
    comment = Comment(task_id=task_id, body=body.body, author=body.author)
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return comment


@router.delete("/comments/{comment_id}", status_code=204)
def delete_comment(comment_id: int, db: Session = Depends(get_db)):
    comment = db.query(Comment).get(comment_id)
    if not comment:
        raise HTTPException(404, "Comment not found")
    db.delete(comment)
    db.commit()
