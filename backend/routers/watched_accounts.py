from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import WatchedAccount, AccountPlatform
from schemas import WatchedAccountCreate, WatchedAccountOut
from services import resolve_account_id

router = APIRouter()


@router.get("", response_model=list[WatchedAccountOut])
def list_accounts(db: Session = Depends(get_db)):
    return db.query(WatchedAccount).all()


@router.post("", response_model=WatchedAccountOut, status_code=201)
async def create_account(body: WatchedAccountCreate, db: Session = Depends(get_db)):
    existing = (
        db.query(WatchedAccount)
        .filter(WatchedAccount.platform == body.platform, WatchedAccount.username == body.username)
        .first()
    )
    if existing:
        raise HTTPException(400, "Account already watched")
    account_id = await resolve_account_id(body.platform, body.username)
    acc = WatchedAccount(
        platform=body.platform,
        username=body.username,
        display_name=body.display_name or body.username,
        platform_account_id=account_id,
        is_active=True,
    )
    db.add(acc)
    db.commit()
    db.refresh(acc)
    return acc


@router.patch("/{acc_id}", response_model=WatchedAccountOut)
def update_account(acc_id: int, is_active: bool = True, db: Session = Depends(get_db)):
    acc = db.query(WatchedAccount).get(acc_id)
    if not acc:
        raise HTTPException(404, "Not found")
    acc.is_active = is_active
    db.commit()
    db.refresh(acc)
    return acc


@router.delete("/{acc_id}", status_code=204)
def delete_account(acc_id: int, db: Session = Depends(get_db)):
    acc = db.query(WatchedAccount).get(acc_id)
    if not acc:
        raise HTTPException(404, "Not found")
    db.delete(acc)
    db.commit()
