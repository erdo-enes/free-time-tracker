from services import steam, psn, xbox, switch2
from models import AccountPlatform


SERVICE_MAP = {
    AccountPlatform.steam: steam,
    AccountPlatform.psn: psn,
    AccountPlatform.xbox: xbox,
    AccountPlatform.switch2: switch2,
}


async def get_watched_status(platform: AccountPlatform, account_id: str, username: str) -> dict | None:
    svc = SERVICE_MAP.get(platform)
    if not svc:
        return None
    return await svc.get_watched_account_status(account_id, username)


async def resolve_account_id(platform: AccountPlatform, username: str) -> str | None:
    svc = SERVICE_MAP.get(platform)
    if not svc:
        return None
    return await svc.resolve_account_id(username) if hasattr(svc, "resolve_account_id") else username
