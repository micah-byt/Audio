"""
epidemic_api.py — Epidemic Sound Partner API proxy + Mock fallback
Set ES_API_KEY environment variable to enable real API mode.
Without it, runs in Demo Mode using local bgm_library files.
"""
import os
from typing import List

ES_API_BASE = "https://partner-content-api.epidemicsound.com"
ES_API_KEY = os.environ.get("ES_API_KEY", "")

# ── Mock BGM Library (maps to local bgm_library/*.wav) ───────────────────────
MOCK_BGM = [
    {
        "id": "mock_tense_001",
        "title": "Rising Tension",
        "artist": {"name": "Epidemic Sound Demo"},
        "bpm": 128, "duration": 120,
        "moods": ["suspense", "dark"],
        "genres": ["cinematic", "thriller"],
        "preview_url": "/bgm/tense.wav",
        "tags": ["suspense", "tension", "dramatic", "orchestral", "thriller",
                 "action", "battle", "fight", "chase", "두근", "공포", "긴장"]
    },
    {
        "id": "mock_sad_001",
        "title": "Melancholic Rain",
        "artist": {"name": "Epidemic Sound Demo"},
        "bpm": 65, "duration": 120,
        "moods": ["sad", "emotional"],
        "genres": ["emotional", "piano"],
        "preview_url": "/bgm/sad.wav",
        "tags": ["sad", "emotional", "melancholic", "piano", "grief",
                 "longing", "tears", "sorrow", "슬프", "이별", "눈물"]
    },
    {
        "id": "mock_calm_001",
        "title": "Peaceful Morning",
        "artist": {"name": "Epidemic Sound Demo"},
        "bpm": 75, "duration": 120,
        "moods": ["calm", "peaceful"],
        "genres": ["ambient"],
        "preview_url": "/bgm/calm.wav",
        "tags": ["calm", "peaceful", "ambient", "daily", "quiet", "serene",
                 "relaxing", "일상", "평화", "여유", "산책"]
    },
    {
        "id": "mock_happy_001",
        "title": "Bright Horizons",
        "artist": {"name": "Epidemic Sound Demo"},
        "bpm": 115, "duration": 120,
        "moods": ["happy", "uplifting"],
        "genres": ["pop", "acoustic"],
        "preview_url": "/bgm/happy.wav",
        "tags": ["happy", "uplifting", "hopeful", "inspiring", "bright",
                 "joyful", "cheerful", "positive", "희망", "기쁨", "설렘"]
    },
    {
        "id": "mock_romantic_001",
        "title": "Gentle Love",
        "artist": {"name": "Epidemic Sound Demo"},
        "bpm": 80, "duration": 120,
        "moods": ["romantic", "gentle"],
        "genres": ["romantic", "piano"],
        "preview_url": "/bgm/calm.wav",
        "tags": ["romantic", "love", "gentle", "piano", "strings",
                 "사랑", "연인", "설레", "달콤", "포옹"]
    },
    {
        "id": "mock_horror_001",
        "title": "Dark Shadows",
        "artist": {"name": "Epidemic Sound Demo"},
        "bpm": 60, "duration": 120,
        "moods": ["horror", "dark"],
        "genres": ["horror", "ambient"],
        "preview_url": "/bgm/tense.wav",
        "tags": ["horror", "dark", "creepy", "eerie", "ambient",
                 "공포", "귀신", "저주", "어둠", "오싹", "소름"]
    },
    {
        "id": "mock_action_001",
        "title": "Battle Cry",
        "artist": {"name": "Epidemic Sound Demo"},
        "bpm": 160, "duration": 120,
        "moods": ["action", "epic"],
        "genres": ["action", "cinematic"],
        "preview_url": "/bgm/tense.wav",
        "tags": ["action", "battle", "epic", "cinematic", "drums",
                 "전투", "싸움", "격투", "폭발", "전쟁"]
    },
    {
        "id": "mock_fantasy_001",
        "title": "Ethereal Dreams",
        "artist": {"name": "Epidemic Sound Demo"},
        "bpm": 85, "duration": 120,
        "moods": ["mysterious", "magical"],
        "genres": ["fantasy", "orchestral"],
        "preview_url": "/bgm/calm.wav",
        "tags": ["mysterious", "fantasy", "magical", "ethereal",
                 "신비", "마법", "환상", "이상한"]
    },
]

# ── Mock SFX Library (maps to local bgm_library SFX files) ───────────────────
MOCK_SFX = [
    {
        "id": "mock_sfx_boom",
        "title": "Explosion Impact",
        "category": "Impact", "duration": 3.0,
        "preview_url": "/bgm/boom.wav",
        "tags": ["boom", "explosion", "impact", "fight", "crash",
                 "폭발", "쾅", "충돌", "사고"]
    },
    {
        "id": "mock_sfx_clap",
        "title": "Crowd Applause",
        "category": "Human", "duration": 1.5,
        "preview_url": "/bgm/clap.wav",
        "tags": ["clap", "applause", "cheer", "crowd",
                 "박수", "환호", "손뼉"]
    },
    {
        "id": "mock_sfx_laugh",
        "title": "Laughter",
        "category": "Human", "duration": 2.0,
        "preview_url": "/bgm/laugh.wav",
        "tags": ["laugh", "laughter", "funny", "chuckle",
                 "웃음", "하하", "재밌"]
    },
]


def _score(tags: list, query: str) -> int:
    words = query.lower().split()
    return sum(1 for w in words if any(w in t.lower() for t in tags))


def search_mock_bgm(query: str, limit: int = 5) -> List[dict]:
    scored = sorted(MOCK_BGM, key=lambda t: -_score(t["tags"], query))
    return scored[:limit]


def search_mock_sfx(query: str, limit: int = 3) -> List[dict]:
    scored = sorted(MOCK_SFX, key=lambda t: -_score(t["tags"], query))
    return scored[:limit]


async def search_real_bgm(query: str, limit: int) -> List[dict]:
    import httpx
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(
            f"{ES_API_BASE}/v2/search/tracks",
            headers={"Authorization": f"Bearer {ES_API_KEY}"},
            params={"query": query, "limit": limit}
        )
        resp.raise_for_status()
        data = resp.json()
        return data.get("tracks", [])


async def search_real_sfx(query: str, limit: int) -> List[dict]:
    import httpx
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(
            f"{ES_API_BASE}/v2/search/sound-effects",
            headers={"Authorization": f"Bearer {ES_API_KEY}"},
            params={"query": query, "limit": limit}
        )
        resp.raise_for_status()
        data = resp.json()
        return data.get("sound_effects", [])


def is_real_mode() -> bool:
    return bool(ES_API_KEY)
