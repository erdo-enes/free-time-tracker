import httpx
from config import settings
from models import AccountPlatform


STEAM_API = "https://api.steampowered.com"


async def get_watched_account_status(account_id: str, username: str) -> dict | None:
    """Check a single watched Steam account's current game via monitoring account's API key."""
    if not settings.steam_api_key:
        return None
    url = f"{STEAM_API}/ISteamUser/GetPlayerSummaries/v0002/"
    params = {"key": settings.steam_api_key, "steamids": account_id}
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, params=params, timeout=10)
        resp.raise_for_status()
        data = resp.json()
    players = data.get("response", {}).get("players", [])
    if not players:
        return None
    p = players[0]
    if p.get("gameid") and p.get("gameextrainfo"):
        return {
            "game_name": p["gameextrainfo"],
            "game_id": p["gameid"],
            "platform": "steam",
            "username": username,
            "persona_name": p.get("personaname", username),
        }
    return None


async def resolve_steam_id(username_or_id: str) -> str | None:
    """Resolve a vanity URL name to a SteamID64."""
    if username_or_id.isdigit():
        return username_or_id
    if not settings.steam_api_key:
        return None
    url = f"{STEAM_API}/ISteamUser/ResolveVanityURL/v0001/"
    params = {"key": settings.steam_api_key, "vanityurl": username_or_id}
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, params=params, timeout=10)
        resp.raise_for_status()
        data = resp.json()
    if data.get("response", {}).get("success") == 1:
        return data["response"]["steamid"]
    return None
