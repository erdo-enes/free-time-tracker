import httpx
from config import settings


async def get_auth_token() -> str | None:
    """Get PSN OAuth token using the monitoring account's NPSSO token."""
    if not settings.psn_npsso_token:
        return None
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://auth.api.sonyentertainmentnetwork.com/2.0/oauth/token",
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            data={
                "grant_type": "sso_cookie",
                "npsso_token": settings.psn_npsso_token,
                "scope": "psn:mobile.v2.core psn:clientapp",
            },
            timeout=10,
        )
        if resp.status_code != 200:
            return None
        return resp.json().get("access_token")


async def get_watched_account_status(account_id: str, username: str) -> dict | None:
    """Check a watched PSN account's current game using the monitoring account's token."""
    token = await get_auth_token()
    if not token:
        return None
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"https://m.np.playstation.com/api/graphql/v1/op",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
            params={"operationName": "PsnGetPresence", "variables": f'{{"accountId":"{account_id}"}}'},
            timeout=10,
        )
        if resp.status_code != 200:
            return None
        data = resp.json()
    presence = (
        data.get("data", {})
        .get("profile", {})
        .get("presence", {})
    )
    if not presence:
        return None
    availability = presence.get("availability", "offline")
    if availability == "online":
        game = presence.get("gameTitleInfoList", [{}])[0] if presence.get("gameTitleInfoList") else {}
        if game:
            return {
                "game_name": game.get("titleName", "Unknown PSN Game"),
                "game_id": game.get("npTitleId"),
                "platform": "psn",
                "username": username,
            }
    return None


async def resolve_psn_account_id(username: str) -> str | None:
    """Resolve a PSN online ID to an account ID."""
    token = await get_auth_token()
    if not token:
        return None
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://m.np.playstation.com/api/graphql/v1/op",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
            json={
                "operationName": "PsnGetAccountId",
                "variables": {"onlineId": username},
                "query": "query PsnGetAccountId($onlineId: ID!) { profile(onlineId: $onlineId) { accountId } }",
            },
            timeout=10,
        )
        if resp.status_code != 200:
            return None
        data = resp.json()
    return data.get("data", {}).get("profile", {}).get("accountId")
