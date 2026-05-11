/**
 * epidemic.js — Epidemic Sound Partner API client
 * All calls route through the local FastAPI backend proxy to protect the API key.
 * Falls back to mock (local sample) data when ES_API_KEY is not set on the backend.
 */

const BACKEND = import.meta.env.VITE_BACKEND_URL || ''

function toAbsoluteUrl(raw) {
  if (!raw) return ''
  return raw.startsWith('http') ? raw : `${BACKEND}${raw}`
}

/** Normalize real ES API track → internal format (also works for mock data) */
function normalizeTrack(t) {
  return {
    id: t.id,
    name: t.title || t.name || 'Unknown Track',
    artist: t.artist?.name || 'Epidemic Sound',
    bpm: t.bpm || null,
    duration: t.duration ? Math.round(t.duration) : null,
    moods: t.moods || [],
    genres: t.genres || [],
    previewUrl: toAbsoluteUrl(t.preview?.mp3 || t.preview_url || t.previewUrl),
  }
}

function normalizeSFX(t) {
  return {
    id: t.id,
    name: t.title || t.name || 'Unknown SFX',
    category: t.category || 'SFX',
    duration: t.duration ? Math.round(t.duration * 10) / 10 : null,
    previewUrl: toAbsoluteUrl(t.preview?.mp3 || t.preview_url || t.previewUrl),
  }
}

/**
 * Search BGM tracks on Epidemic Sound (via backend proxy)
 * @returns {Promise<{ tracks: Array, isMock: boolean }>}
 */
export async function searchESBGM(query, pageSize = 5) {
  const res = await fetch(`${BACKEND}/api/epidemic/search-bgm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, limit: pageSize }),
  })
  if (!res.ok) throw new Error(`ES BGM API error ${res.status}`)
  const data = await res.json()
  return {
    isMock: data.is_mock ?? true,
    tracks: (data.tracks || []).map(normalizeTrack),
  }
}

/**
 * Search Sound Effects on Epidemic Sound (via backend proxy)
 * @returns {Promise<{ tracks: Array, isMock: boolean }>}
 */
export async function searchESSFX(query, pageSize = 3) {
  const res = await fetch(`${BACKEND}/api/epidemic/search-sfx`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, limit: pageSize }),
  })
  if (!res.ok) throw new Error(`ES SFX API error ${res.status}`)
  const data = await res.json()
  return {
    isMock: data.is_mock ?? true,
    tracks: (data.tracks || []).map(normalizeSFX),
  }
}

/**
 * Fetch audio ArrayBuffer from a preview URL for mixing.
 * Handles relative URLs (mock mode, e.g. "/bgm/tense.wav") by prepending BACKEND.
 */
export async function fetchESAudioBuffer(previewUrl) {
  const url = previewUrl.startsWith('http') ? previewUrl : `${BACKEND}${previewUrl}`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch Epidemic Sound audio preview')
  return res.arrayBuffer()
}
