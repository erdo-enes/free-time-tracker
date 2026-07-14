from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Category
from schemas import CategoryCreate, CategoryOut
from security import get_current_user

router = APIRouter(dependencies=[Depends(get_current_user)])


@router.get("", response_model=list[CategoryOut])
def list_categories(db: Session = Depends(get_db)):
    return db.query(Category).all()


@router.post("", response_model=CategoryOut, status_code=201)
def create_category(body: CategoryCreate, db: Session = Depends(get_db)):
    if db.query(Category).filter(Category.name == body.name).first():
        raise HTTPException(400, "Category already exists")
    cat = Category(**body.model_dump())
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat


@router.delete("/{cat_id}", status_code=204)
def delete_category(cat_id: int, db: Session = Depends(get_db)):
    cat = db.query(Category).get(cat_id)
    if not cat:
        raise HTTPException(404, "Not found")
    db.delete(cat)
    db.commit()
