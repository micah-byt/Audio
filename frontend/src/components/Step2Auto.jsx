import { useState, useEffect, useCallback } from 'react'
import { Wand2, Music, Volume2, Check, RefreshCw, ChevronDown, ChevronUp, Key, Trash2 } from 'lucide-react'
import { searchSounds, searchBGM, fetchAudioBuffer, setApiKey, hasApiKey } from '../lib/freesound'
import { analyzeNovel } from '../lib/audioAI'

// ── API Key Setup ─────────────────────────────────────────────────────────────
function ApiKeyInput({ onSaved }) {
  const [val, setVal] = useState('')
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid rgba(124,92,252,0.3)', borderRadius: 'var(--radius-md)', padding: '1.5rem', marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', fontWeight: 700, fontFamily: 'Outfit' }}>
        <Key size={16} color="var(--primary)" /> Freesound API Key 설정
      </div>
      <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
        <a href="https://freesound.org/apiv2/apply/" target="_blank" rel="noreferrer" style={{ color: 'var(--primary-light)' }}>freesound.org/apiv2/apply</a>에서 무료로 발급받으세요.
      </p>
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <input
          type="text"
          placeholder="API Key 붙여넣기..."
          value={val}
          onChange={e => setVal(e.target.value)}
          style={{ flex: 1, background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-sm)', padding: '0.6rem 1rem', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none', fontFamily: 'monospace' }}
        />
        <button className="primary" onClick={() => { setApiKey(val); onSaved() }} disabled={!val.trim()}>
          저장
        </button>
      </div>
    </div>
  )
}

// ── Sound Candidate Card ──────────────────────────────────────────────────────
function SoundCard({ sound, selected, onSelect, playing, onPlay }) {
  return (
    <div onClick={onSelect} style={{
      padding: '0.65rem 0.9rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
      background: selected ? 'rgba(124,92,252,0.15)' : 'var(--bg-elevated)',
      border: `1px solid ${selected ? 'rgba(124,92,252,0.5)' : 'var(--border)'}`,
      display: 'flex', alignItems: 'center', gap: '0.75rem', transition: 'all 0.15s',
    }}>
      <button
        onClick={e => { e.stopPropagation(); onPlay(sound.previewUrl) }}
        style={{ width: 28, height: 28, borderRadius: '50%', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: playing ? 'var(--primary)' : 'var(--bg-card)', border: '1px solid var(--border-strong)' }}
      >
        {playing ? '⏸' : '▶'}
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.83rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sound.name}</div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{sound.duration}초</div>
      </div>
      {selected && <Check size={14} color="var(--primary-light)" />}
    </div>
  )
}

// ── Event Row ─────────────────────────────────────────────────────────────────
function EventRow({ item, sounds, loading, selectedId, onSelect, playingUrl, onPlay, onRemove }) {
  const [expanded, setExpanded] = useState(false)
  const ts = new Date(item.start * 1000).toISOString().substring(14, 19)

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden', marginBottom: '0.75rem' }}>
      <div onClick={() => setExpanded(p => !p)} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.9rem 1rem', cursor: 'pointer' }}>
        <span style={{ fontFamily: 'Outfit', fontSize: '0.75rem', color: 'var(--primary-light)', fontWeight: 700, flexShrink: 0, background: 'var(--primary-dim)', padding: '0.15rem 0.5rem', borderRadius: 4 }}>{ts}</span>
        <span style={{ fontSize: '0.85rem', fontWeight: 600, flex: 1, color: 'var(--text-primary)' }}>🔊 {item.event.label}</span>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: '0.5rem' }}>
          "{item.segmentText.slice(0, 40)}..."
        </span>
        {loading ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite', color: 'var(--text-muted)' }} /> :
          selectedId ? <Check size={14} color="var(--success)" /> : null}
        
        <button 
          onClick={(e) => { e.stopPropagation(); onRemove(); }} 
          style={{ background: 'transparent', border: 'none', padding: '0.2rem', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}
          title="이 이벤트 무시/삭제"
        >
          <Trash2 size={16} />
        </button>

        {expanded ? <ChevronUp size={16} color="var(--text-muted)" /> : <ChevronDown size={16} color="var(--text-muted)" />}
      </div>

      {expanded && (
        <div style={{ padding: '0 1rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', borderTop: '1px solid var(--border)' }}>
          {loading && <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', padding: '0.5rem 0' }}>Freesound에서 검색 중...</div>}
          {sounds.map(s => (
            <SoundCard key={s.id} sound={s} selected={selectedId === s.id}
              onSelect={() => onSelect(s)}
              playing={playingUrl === s.previewUrl}
              onPlay={onPlay} />
          ))}
          {!loading && sounds.length === 0 && (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>검색 결과 없음</div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function Step2Auto({ segments, onTracksReady, onBack }) {
  const [apiReady, setApiReady] = useState(hasApiKey())
  const [analysis, setAnalysis] = useState(null) // { events, mood }
  const [soundResults, setSoundResults] = useState({}) // eventKey -> [sounds]
  const [loadingKeys, setLoadingKeys] = useState(new Set())
  const [selected, setSelected] = useState({}) // eventKey -> sound
  const [bgmSounds, setBgmSounds] = useState([])
  const [bgmLoading, setBgmLoading] = useState(false)
  const [selectedBgm, setSelectedBgm] = useState(null)
  const [playingUrl, setPlayingUrl] = useState(null)
  const [playerRef] = useState(() => new Audio())
  const [isBuilding, setIsBuilding] = useState(false)

  // Analyze on mount
  useEffect(() => {
    if (segments.length > 0) setAnalysis(analyzeNovel(segments))
  }, [segments])

  // Auto-search all events when API ready
  useEffect(() => {
    if (!apiReady || !analysis) return
    analysis.events.forEach((item, idx) => {
      const key = `${idx}`
      fetchSounds(key, item.event.query)
    })
    fetchBgm(analysis.mood.query)
  }, [apiReady, analysis])

  const fetchSounds = useCallback(async (key, query) => {
    setLoadingKeys(p => new Set([...p, key]))
    try {
      const results = await searchSounds(query, { pageSize: 3, filter: 'duration:[0.5 TO 15]' })
      setSoundResults(p => ({ ...p, [key]: results }))
      // Auto-select first result
      if (results.length > 0) {
        setSelected(p => ({ ...p, [key]: results[0] }))
      }
    } catch (e) {
      console.error('Freesound search error:', e)
    } finally {
      setLoadingKeys(p => { const n = new Set(p); n.delete(key); return n })
    }
  }, [])

  const fetchBgm = useCallback(async (query) => {
    setBgmLoading(true)
    try {
      const results = await searchBGM(query, 4)
      setBgmSounds(results)
      if (results.length > 0) setSelectedBgm(results[0])
    } catch (e) {
      console.error('BGM search error:', e)
    } finally {
      setBgmLoading(false)
    }
  }, [])

  const handlePlay = useCallback((url) => {
    if (playingUrl === url) {
      playerRef.pause()
      setPlayingUrl(null)
    } else {
      playerRef.pause()
      playerRef.src = url
      playerRef.play()
      setPlayingUrl(url)
      playerRef.onended = () => setPlayingUrl(null)
    }
  }, [playingUrl, playerRef])

  const handleRemoveEvent = useCallback((idx) => {
    setAnalysis(p => ({
      ...p,
      events: p.events.filter((_, i) => i !== idx)
    }))
  }, [])

  const handleBuild = useCallback(async () => {
    setIsBuilding(true)
    playerRef.pause()
    const tracks = []

    // Add BGM
    if (selectedBgm?.previewUrl) {
      try {
        const buf = await fetchAudioBuffer(selectedBgm.previewUrl)
        tracks.push({ name: `✨ ${selectedBgm.name}`, url: selectedBgm.previewUrl, time: 0, buffer: buf, type: 'bgm' })
      } catch (e) { console.error('BGM fetch error:', e) }
    }

    // Add SFX
    for (const [key, sound] of Object.entries(selected)) {
      if (!sound?.previewUrl) continue
      const item = analysis.events[parseInt(key)]
      if (!item) continue
      try {
        const buf = await fetchAudioBuffer(sound.previewUrl)
        tracks.push({ name: `✨ ${sound.name}`, url: sound.previewUrl, time: Math.max(0, item.start - 0.3), buffer: buf, type: 'sfx' })
      } catch (e) { console.error('SFX fetch error:', e) }
    }

    setIsBuilding(false)
    onTracksReady(tracks)
  }, [selected, selectedBgm, analysis, onTracksReady, playerRef])

  if (!apiReady) {
    return (
      <div className="panel" style={{ maxWidth: 820, margin: '0 auto' }}>
        <div className="panel-title"><Key size={18} color="var(--primary)" /> API 연동 설정</div>
        <ApiKeyInput onSaved={() => setApiReady(true)} />
        <div className="action-bar"><button onClick={onBack}>← 뒤로</button></div>
      </div>
    )
  }

  if (!analysis) return <div className="panel" style={{ maxWidth: 820, margin: '0 auto', textAlign: 'center', color: 'var(--text-muted)' }}>분석 중...</div>

  const totalSelected = Object.keys(selected).length + (selectedBgm ? 1 : 0)

  return (
    <div className="panel" style={{ maxWidth: 860, margin: '0 auto' }}>
      <div className="panel-title"><Wand2 size={18} color="var(--primary)" /> AI 장면 분석 결과</div>

      {/* BGM Section */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontWeight: 700, fontFamily: 'Outfit', fontSize: '0.95rem' }}>
          <Music size={16} color="var(--bgm)" />
          배경음악 (BGM) — 감지된 무드: <span style={{ color: 'var(--primary-light)', marginLeft: '0.25rem' }}>{analysis.mood.label}</span>
        </div>
        {bgmLoading && <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Freesound에서 BGM 검색 중...</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {bgmSounds.map(s => (
            <SoundCard key={s.id} sound={s} selected={selectedBgm?.id === s.id}
              onSelect={() => setSelectedBgm(s)}
              playing={playingUrl === s.previewUrl}
              onPlay={handlePlay} />
          ))}
        </div>
      </div>

      {/* SFX Section */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontWeight: 700, fontFamily: 'Outfit', fontSize: '0.95rem' }}>
        <Volume2 size={16} color="var(--sfx)" />
        감지된 효과음 이벤트 ({analysis.events.length}개)
      </div>

      {analysis.events.length === 0 ? (
        <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', padding: '1rem', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem' }}>
          감지된 이벤트가 없습니다. 텍스트에 문 열기, 발소리, 비 등의 묘사가 있어야 합니다.
        </div>
      ) : (
        <div style={{ marginBottom: '1.5rem' }}>
          {analysis.events.map((item, idx) => (
            <EventRow
              key={idx}
              item={item}
              sounds={soundResults[`${idx}`] || []}
              loading={loadingKeys.has(`${idx}`)}
              selectedId={selected[`${idx}`]?.id}
              onSelect={s => setSelected(p => ({ ...p, [`${idx}`]: s }))}
              playingUrl={playingUrl}
              onPlay={handlePlay}
              onRemove={() => handleRemoveEvent(idx)}
            />
          ))}
        </div>
      )}

      <div className="action-bar">
        <button onClick={onBack}>← 뒤로</button>
        <button className="primary-lg" onClick={handleBuild} disabled={isBuilding || totalSelected === 0}>
          <Wand2 size={18} />
          {isBuilding ? `오디오 로딩 중... (${totalSelected}개)` : `✨ ${totalSelected}개 사운드로 믹싱 시작`}
        </button>
      </div>
    </div>
  )
}
