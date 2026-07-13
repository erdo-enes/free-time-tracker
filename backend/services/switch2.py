import httpx
from config import settings


NSO_API = "https://api.lp1.nso.nintendo.net"


async def get_auth_token() -> str | None:
    """Get Nintendo Switch Online session token."""
    if not settings.switch2_nso_token:
        return None
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{NSO_API}/v2/ServiceToken/",
            headers={
                "Authorization": f"Bearer {settings.switch2_nso_token}",
                "Content-Type": "application/json",
            },
            timeout=10,
        )
        if resp.status_code != 200:
            return None
        return resp.json().get("result", {}).get("accessToken")


async def get_watched_account_status(account_id: str, username: str) -> dict | None:
    """Check a watched Switch 2 account's current game via NSO friend presence."""
    token = await get_auth_token()
    if not token:
        return None
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{NSO_API}/v2/Friend/List",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10,
        )
        if resp.status_code != 200:
            return None
        data = resp.json()
    friends = data.get("result", {}).get("friends", [])
    for friend in friends:
        if str(friend.get("nsaId")) == account_id or friend.get("name") == username:
            presence = friend.get("presence", {})
            if presence.get("state") == "ONLINE":
                game = presence.get("game", {})
                if game.get("name"):
                    return {
                        "game_name": game["name"],
                        "game_id": str(game.get("id", "")) or None,
                        "platform": "switch2",
                        "username": username,
                    }
    return None


async def resolve_switch2_account_id(username: str) -> str | None:
    """Resolve a Switch 2 username to an NSA ID. Returns username as fallback."""
    return username
