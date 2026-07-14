from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models import User
from schemas import UserCreate, LoginRequest, UserOut, Token
from security import hash_password, verify_password, create_access_token, get_current_user

router = APIRouter()


@router.post("/register", response_model=Token, status_code=201)
def register(body: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == body.username).first():
        raise HTTPException(400, "Username already taken")
    if body.email and db.query(User).filter(User.email == body.email).first():
        raise HTTPException(400, "Email already registered")
    user = User(
        username=body.username,
        email=body.email,
        display_name=body.display_name or body.username,
        hashed_password=hash_password(body.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token(subject=user.username)
    return Token(access_token=token, user=UserOut.model_validate(user))


@router.post("/login", response_model=Token)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == body.username).first()
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid username or password")
    if not user.is_active:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Account is disabled")
    token = create_access_token(subject=user.username)
    return Token(access_token=token, user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user
