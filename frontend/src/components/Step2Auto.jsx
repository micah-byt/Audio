import { useState, useEffect, useCallback, useRef } from 'react'
import { Wand2, Music, Volume2, Check, RefreshCw, ChevronDown, ChevronUp, Key, Trash2, Zap } from 'lucide-react'
import { searchSounds, searchBGM, fetchAudioBuffer, setApiKey, hasApiKey } from '../lib/freesound'
import { searchESBGM, searchESSFX, fetchESAudioBuffer } from '../lib/epidemic'

// ── API Key Setup (Freesound) ─────────────────────────────────────────────────
function ApiKeyInput({ onSaved, onSwitchToES }) {
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
      <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.6rem' }}>
          또는 Epidemic Sound 음원 라이브러리를 사용해보세요
        </p>
        <button
          onClick={onSwitchToES}
          style={{ background: 'linear-gradient(135deg, rgba(124,92,252,0.2), rgba(94,234,212,0.1))', border: '1px solid rgba(124,92,252,0.4)', borderRadius: 'var(--radius-sm)', padding: '0.5rem 1rem', color: 'var(--primary-light)', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
        >
          <Zap size={14} /> ⚡ Epidemic Sound로 전환 (로컬 백엔드 필요)
        </button>
      </div>
    </div>
  )
}

// ── Sound Candidate Card (Freesound & ES compatible) ─────────────────────────
function SoundCard({ sound, selected, onSelect, playing, onPlay, showMeta = false }) {
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
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {sound.duration && <span>{sound.duration}초</span>}
          {showMeta && sound.artist && <span>· {sound.artist}</span>}
          {showMeta && sound.bpm && <span>· {sound.bpm} BPM</span>}
          {showMeta && sound.moods?.length > 0 && (
            <span style={{ background: 'rgba(124,92,252,0.15)', color: 'var(--primary-light)', padding: '0 0.3rem', borderRadius: 3, fontSize: '0.7rem' }}>
              {sound.moods[0]}
            </span>
          )}
        </div>
      </div>
      {selected && <Check size={14} color="var(--primary-light)" />}
    </div>
  )
}

// ── Event Row ─────────────────────────────────────────────────────────────────
function EventRow({ item, sounds, loading, selectedId, onSelect, playingUrl, onPlay, onRemove, isES }) {
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
          {loading && <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', padding: '0.5rem 0' }}>{isES ? 'Epidemic Sound에서 검색 중...' : 'Freesound에서 검색 중...'}</div>}
          {sounds.map(s => (
            <SoundCard key={s.id} sound={s} selected={selectedId === s.id}
              onSelect={() => onSelect(s)}
              playing={playingUrl === s.previewUrl}
              onPlay={onPlay}
              showMeta={isES} />
          ))}
          {!loading && sounds.length === 0 && (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>검색 결과 없음</div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Source Mode Toggle ────────────────────────────────────────────────────────
function SourceToggle({ mode, onChange }) {
  const btn = (value, label, icon) => (
    <button
      onClick={() => onChange(value)}
      style={{
        flex: 1, padding: '0.55rem 0.75rem', borderRadius: 'var(--radius-sm)',
        background: mode === value
          ? (value === 'epidemic' ? 'linear-gradient(135deg, #7c5cfc, #5eead4)' : 'var(--primary)')
          : 'transparent',
        border: 'none', cursor: 'pointer', transition: 'all 0.2s',
        color: mode === value ? 'white' : 'var(--text-muted)',
        fontWeight: mode === value ? 700 : 400, fontSize: '0.82rem',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
      }}
    >
      {icon} {label}
    </button>
  )
  return (
    <div style={{ display: 'flex', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: '0.2rem', marginBottom: '1.25rem', border: '1px solid var(--border)' }}>
      {btn('freesound', 'Freesound (무료)', '🎵')}
      {btn('epidemic', 'Epidemic Sound', '⚡')}
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function Step2Auto({ segments, initialAnalysis, onTracksReady, onBack }) {
  const [sourceMode, setSourceMode] = useState('freesound') // 'freesound' | 'epidemic'
  const [isMockMode, setIsMockMode] = useState(false)
  const [apiReady, setApiReady] = useState(hasApiKey())
  const [analysis, setAnalysis] = useState(initialAnalysis)
  const [soundResults, setSoundResults] = useState({})
  const [loadingKeys, setLoadingKeys] = useState(new Set())
  const [selected, setSelected] = useState({})
  const [bgmSounds, setBgmSounds] = useState([])
  const [bgmLoading, setBgmLoading] = useState(false)
  const [selectedBgm, setSelectedBgm] = useState(null)
  const [playingUrl, setPlayingUrl] = useState(null)
  const audioRef = useRef(null)
  const [isBuilding, setIsBuilding] = useState(false)

  useEffect(() => { 
    if (initialAnalysis && initialAnalysis.events) {
      setAnalysis({
        ...initialAnalysis,
        events: initialAnalysis.events.map((e, i) => ({ ...e, _id: e._id || i.toString() }))
      })
    } else {
      setAnalysis(initialAnalysis)
    }
  }, [initialAnalysis])

  // Re-fetch everything when source mode or analysis changes
  useEffect(() => {
    if (!analysis) return
    const canSearch = sourceMode === 'epidemic' || apiReady
    if (!canSearch) return

    // Clear previous results
    setSoundResults({})
    setSelected({})
    setBgmSounds([])
    setSelectedBgm(null)

    const doFetchSounds = async (key, query) => {
      setLoadingKeys(p => new Set([...p, key]))
      try {
        let results = []
        if (sourceMode === 'epidemic') {
          const { tracks, isMock } = await searchESSFX(query, 3)
          setIsMockMode(isMock)
          results = tracks
        } else {
          results = await searchSounds(query, { pageSize: 3, filter: 'duration:[0.5 TO 15]' })
        }
        setSoundResults(p => ({ ...p, [key]: results }))
        if (results.length > 0) setSelected(p => ({ ...p, [key]: results[0] }))
      } catch (e) {
        console.error('Search error:', e)
      } finally {
        setLoadingKeys(p => { const n = new Set(p); n.delete(key); return n })
      }
    }

    const doFetchBgm = async (query) => {
      setBgmLoading(true)
      try {
        let results = []
        if (sourceMode === 'epidemic') {
          const { tracks, isMock } = await searchESBGM(query, 5)
          setIsMockMode(isMock)
          results = tracks
        } else {
          results = await searchBGM(query, 4)
        }
        setBgmSounds(results)
        if (results.length > 0) setSelectedBgm(results[0])
      } catch (e) {
        console.error('BGM search error:', e)
      } finally {
        setBgmLoading(false)
      }
    }

    analysis.events.forEach((item) => doFetchSounds(item._id, item.event.query))
    doFetchBgm(analysis.mood.query)
  }, [apiReady, analysis, sourceMode])

  const handlePlay = useCallback((url) => {
    if (!url) return
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ''
    }
    if (playingUrl === url) {
      setPlayingUrl(null)
      return
    }
    const audio = new Audio(url)
    audioRef.current = audio
    audio.onended = () => setPlayingUrl(null)
    audio.onerror = () => {
      console.error('Audio load error:', audio.error?.code, audio.error?.message, '\nURL:', url)
      setPlayingUrl(null)
    }
    audio.play()
      .then(() => setPlayingUrl(url))
      .catch(err => {
        console.error('Play failed:', err.name, err.message, '\nURL:', url)
        setPlayingUrl(null)
      })
  }, [playingUrl])

  const handleRemoveEvent = useCallback((id) => {
    setAnalysis(p => ({ ...p, events: p.events.filter((e) => e._id !== id) }))
  }, [])

  const handleBuild = useCallback(async () => {
    setIsBuilding(true)
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = '' }
    const tracks = []
    const getBuffer = sourceMode === 'epidemic' ? fetchESAudioBuffer : fetchAudioBuffer

    if (selectedBgm?.previewUrl) {
      try {
        const buf = await getBuffer(selectedBgm.previewUrl)
        tracks.push({ name: `✨ ${selectedBgm.name}`, url: selectedBgm.previewUrl, time: 0, buffer: buf, type: 'bgm' })
      } catch (e) { console.error('BGM fetch error:', e) }
    }

    for (const [key, sound] of Object.entries(selected)) {
      if (!sound?.previewUrl) continue
      const item = analysis.events.find(e => e._id === key)
      if (!item) continue
      try {
        const buf = await getBuffer(sound.previewUrl)
        const trackType = item.event?.isAmbience ? 'amb' : 'sfx'
        tracks.push({ name: `✨ ${sound.name}`, url: sound.previewUrl, time: item.start, buffer: buf, type: trackType })
      } catch (e) { console.error('SFX fetch error:', e) }
    }

    setIsBuilding(false)
    onTracksReady(tracks)
  }, [selected, selectedBgm, analysis, onTracksReady, sourceMode])

  // Freesound key gate (only in freesound mode)
  if (sourceMode === 'freesound' && !apiReady) {
    return (
      <div className="panel" style={{ maxWidth: 820, margin: '0 auto' }}>
        <div className="panel-title"><Key size={18} color="var(--primary)" /> API 연동 설정</div>
        <SourceToggle mode={sourceMode} onChange={setSourceMode} />
        <ApiKeyInput onSaved={() => setApiReady(true)} onSwitchToES={() => setSourceMode('epidemic')} />
        <div className="action-bar"><button onClick={onBack}>← 뒤로</button></div>
      </div>
    )
  }

  if (!analysis) return <div className="panel" style={{ maxWidth: 820, margin: '0 auto', textAlign: 'center', color: 'var(--text-muted)' }}>분석 중...</div>

  const totalSelected = Object.keys(selected).length + (selectedBgm ? 1 : 0)

  return (
    <div className="panel" style={{ maxWidth: 860, margin: '0 auto' }}>
      <div className="panel-title"><Wand2 size={18} color="var(--primary)" /> AI 장면 분석 결과</div>

      {/* Source Mode Toggle */}
      <SourceToggle mode={sourceMode} onChange={setSourceMode} />

      {/* ES Mock Mode Notice */}
      {sourceMode === 'epidemic' && isMockMode && (
        <div style={{ background: 'rgba(94,234,212,0.06)', border: '1px solid rgba(94,234,212,0.2)', borderRadius: 'var(--radius-sm)', padding: '0.65rem 1rem', marginBottom: '1.25rem', fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Zap size={13} color="#5eead4" />
          <span><strong style={{ color: '#5eead4' }}>데모 모드:</strong> 로컬 샘플 음원으로 작동 중입니다. 파트너십 API 키 설정 후 50,000곡+ 라이브러리를 사용할 수 있습니다.</span>
        </div>
      )}

      {/* ES Real Mode Badge */}
      {sourceMode === 'epidemic' && !isMockMode && (
        <div style={{ background: 'rgba(124,92,252,0.08)', border: '1px solid rgba(124,92,252,0.3)', borderRadius: 'var(--radius-sm)', padding: '0.65rem 1rem', marginBottom: '1.25rem', fontSize: '0.8rem', color: 'var(--primary-light)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Zap size={13} /> <strong>Epidemic Sound 라이브 연결됨</strong> — 50,000곡+ 라이선스 음원 사용 중
        </div>
      )}

      {/* BGM Section */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontWeight: 700, fontFamily: 'Outfit', fontSize: '0.95rem' }}>
          <Music size={16} color="var(--bgm)" />
          배경음악 (BGM) — 감지된 무드: <span style={{ color: 'var(--primary-light)', marginLeft: '0.25rem' }}>{analysis.mood.label}</span>
        </div>
        {bgmLoading && <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{sourceMode === 'epidemic' ? 'Epidemic Sound에서 BGM 검색 중...' : 'Freesound에서 BGM 검색 중...'}</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {bgmSounds.map(s => (
            <SoundCard key={s.id} sound={s} selected={selectedBgm?.id === s.id}
              onSelect={() => setSelectedBgm(s)}
              playing={playingUrl === s.previewUrl}
              onPlay={handlePlay}
              showMeta={sourceMode === 'epidemic'} />
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
          {analysis.events.map((item) => (
            <EventRow
              key={item._id}
              item={item}
              sounds={soundResults[item._id] || []}
              loading={loadingKeys.has(item._id)}
              selectedId={selected[item._id]?.id}
              onSelect={s => setSelected(p => ({ ...p, [item._id]: s }))}
              playingUrl={playingUrl}
              onPlay={handlePlay}
              onRemove={() => handleRemoveEvent(item._id)}
              isES={sourceMode === 'epidemic'}
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
