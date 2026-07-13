import httpx
from config import settings


XBL_API = "https://xbl.io/api/v2"


async def get_watched_account_status(account_id: str, username: str) -> dict | None:
    """Check a watched Xbox account's current game using the monitoring account's OpenXBL key."""
    if not settings.xbox_openxbl_key:
        return None
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{XBL_API}/presence/{account_id}",
            headers={"X-Authorization": settings.xbox_openxbl_key},
            timeout=10,
        )
        if resp.status_code != 200:
            return None
        data = resp.json()
    state = data.get("state", "")
    if state.lower() != "online":
        return None
    devices = data.get("devices", [])
    if not devices:
        return None
    titles = devices[0].get("titles", [])
    active = [t for t in titles if t.get("placement") == "Full"]
    if not active:
        active = titles
    if not active:
        return None
    t = active[0]
    return {
        "game_name": t.get("name", "Unknown Xbox Game"),
        "game_id": str(t.get("titleId", "")) or None,
        "platform": "xbox",
        "username": username,
    }


async def resolve_xbox_account_id(username: str) -> str | None:
    """Resolve a Xbox gamertag to an XUID."""
    if not settings.xbox_openxbl_key:
        return None
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{XBL_API}/player/{username}",
            headers={"X-Authorization": settings.xbox_openxbl_key},
            timeout=10,
        )
        if resp.status_code != 200:
            return None
        data = resp.json()
    return data.get("xuid") or data.get("profileUsers", [{}])[0].get("id")
