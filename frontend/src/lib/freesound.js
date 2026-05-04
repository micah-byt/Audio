/**
 * freesound.js — Freesound.org API v2 client
 * Docs: https://freesound.org/docs/api/
 */

const BASE = 'https://freesound.org/apiv2'

function getKey() {
  return localStorage.getItem('freesound_api_key') || ''
}

export function setApiKey(key) {
  localStorage.setItem('freesound_api_key', key.trim())
}

export function hasApiKey() {
  return !!getKey()
}

/**
 * Search sounds by text query
 * @param {string} query - search term (in English for best results)
 * @param {object} opts
 * @param {number} opts.pageSize - results per page (default 5)
 * @param {string} opts.filter - Freesound filter string e.g. "duration:[0 TO 10]"
 * @returns {Promise<Array>} array of sound objects
 */
export async function searchSounds(query, { pageSize = 5, filter = '' } = {}) {
  const key = getKey()
  if (!key) throw new Error('NO_API_KEY')

  const params = new URLSearchParams({
    query,
    token: key,
    page_size: pageSize,
    fields: 'id,name,duration,previews,tags,description',
    sort: 'score',
    ...(filter ? { filter } : {}),
  })

  const res = await fetch(`${BASE}/search/text/?${params}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `Freesound API error ${res.status}`)
  }
  const data = await res.json()
  return (data.results || []).map(s => ({
    id: s.id,
    name: s.name,
    duration: Math.round(s.duration * 10) / 10,
    previewUrl: s.previews?.['preview-hq-mp3'] || s.previews?.['preview-lq-mp3'],
    tags: s.tags || [],
  }))
}

/**
 * Search BGM / ambient music by mood keyword
 */
export async function searchBGM(moodQuery, pageSize = 5) {
  return searchSounds(moodQuery, {
    pageSize,
    filter: 'duration:[30 TO 300] type:wav OR type:mp3',
  })
}

/**
 * Fetch audio as ArrayBuffer for mixing
 */
export async function fetchAudioBuffer(previewUrl) {
  const res = await fetch(previewUrl)
  if (!res.ok) throw new Error('Failed to fetch audio preview')
  return res.arrayBuffer()
}
