import { useState, useCallback, useRef } from 'react'
import { Play, Pause, Download, FileMusic, FileAudio, Sliders, Wand2, Search, Zap, X } from 'lucide-react'
import { ScriptViewer } from './Step3'
import { searchESBGM, searchESSFX, fetchESAudioBuffer } from '../lib/epidemic'

// ── Epidemic Sound 검색 패널 ──────────────────────────────────────────────────
function EpidemicSearchPanel({ segments, wavesurferRef, onAddTrack }) {
  const [query, setQuery] = useState('')
  const [esType, setEsType] = useState('bgm') // 'bgm' | 'sfx'
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [isMock, setIsMock] = useState(false)
  const [playingUrl, setPlayingUrl] = useState(null)
  const [addingId, setAddingId] = useState(null)
  const playerRef = useRef(new Audio())

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return
    setLoading(true)
    setResults([])
    try {
      const fn = esType === 'bgm' ? searchESBGM : searchESSFX
      const { tracks, isMock: mock } = await fn(query.trim(), 6)
      setResults(tracks)
      setIsMock(mock)
    } catch (e) {
      console.error('ES search error:', e)
      alert('Epidemic Sound 검색 실패. 로컬 백엔드(localhost:8000)가 실행 중인지 확인해주세요.')
    } finally {
      setLoading(false)
    }
  }, [query, esType])

  const handlePlay = useCallback((url) => {
    const p = playerRef.current
    if (playingUrl === url) { p.pause(); setPlayingUrl(null) }
    else {
      p.pause()
      p.src = url
      p.onended = () => setPlayingUrl(null)
      p.onerror = () => { setPlayingUrl(null); console.error('미리듣기 로드 실패:', url) }
      setPlayingUrl(url)
      p.play().catch(err => { setPlayingUrl(null); console.error('미리듣기 재생 실패:', err) })
    }
  }, [playingUrl])

  const handleAdd = useCallback(async (track) => {
    setAddingId(track.id)
    try {
      const buf = await fetchESAudioBuffer(track.previewUrl)
      const currentTime = wavesurferRef?.current?.getCurrentTime?.() ?? 0
      onAddTrack({ name: `⚡ ${track.name}`, url: track.previewUrl, time: currentTime, buffer: buf, type: esType })
    } catch (e) {
      console.error('ES add track error:', e)
    } finally {
      setAddingId(null)
    }
  }, [esType, onAddTrack, wavesurferRef])

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid rgba(124,92,252,0.25)', borderRadius: 'var(--radius-md)', padding: '1rem', marginBottom: '1rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem', fontWeight: 700, fontSize: '0.88rem' }}>
        <Zap size={15} color="#5eead4" />
        <span style={{ background: 'linear-gradient(90deg, #7c5cfc, #5eead4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Epidemic Sound 검색
        </span>
        {isMock && results.length > 0 && (
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', background: 'var(--bg-elevated)', padding: '0.1rem 0.4rem', borderRadius: 3, fontWeight: 400, marginLeft: 'auto' }}>
            데모
          </span>
        )}
      </div>

      {/* Search Controls */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', overflow: 'hidden', flexShrink: 0 }}>
          {['bgm', 'sfx'].map(t => (
            <button key={t} onClick={() => setEsType(t)} style={{ padding: '0.45rem 0.7rem', background: esType === t ? 'var(--primary)' : 'transparent', border: 'none', color: esType === t ? 'white' : 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', textTransform: 'uppercase' }}>
              {t}
            </button>
          ))}
        </div>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          placeholder={esType === 'bgm' ? '예: suspense dark cinematic' : '예: rain footsteps door'}
          style={{ flex: 1, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '0.45rem 0.75rem', color: 'var(--text-primary)', fontSize: '0.83rem', outline: 'none' }}
        />
        <button onClick={handleSearch} disabled={loading || !query.trim()} style={{ padding: '0.45rem 0.85rem', background: 'var(--primary)', border: 'none', borderRadius: 'var(--radius-sm)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.82rem', fontWeight: 600 }}>
          <Search size={13} /> {loading ? '...' : '검색'}
        </button>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', maxHeight: 220, overflowY: 'auto' }}>
          {results.map(track => (
            <div key={track.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.45rem 0.6rem', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
              <button
                onClick={() => handlePlay(track.previewUrl)}
                style={{ width: 24, height: 24, borderRadius: '50%', padding: 0, flexShrink: 0, background: playingUrl === track.previewUrl ? 'var(--primary)' : 'var(--bg-card)', border: '1px solid var(--border-strong)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem' }}
              >
                {playingUrl === track.previewUrl ? '⏸' : '▶'}
              </button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.name}</div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'flex', gap: '0.4rem' }}>
                  {track.artist && <span>{track.artist}</span>}
                  {track.bpm && <span>· {track.bpm} BPM</span>}
                  {track.duration && <span>· {track.duration}초</span>}
                  {track.moods?.[0] && <span style={{ color: 'var(--primary-light)' }}>· {track.moods[0]}</span>}
                </div>
              </div>
              <button
                onClick={() => handleAdd(track)}
                disabled={addingId === track.id}
                style={{ padding: '0.25rem 0.55rem', background: 'rgba(124,92,252,0.15)', border: '1px solid rgba(124,92,252,0.3)', borderRadius: 'var(--radius-sm)', color: 'var(--primary-light)', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}
              >
                {addingId === track.id ? '...' : '＋ 추가'}
              </button>
            </div>
          ))}
        </div>
      )}

      {!loading && results.length === 0 && query && (
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center', padding: '0.5rem' }}>
          검색 결과가 없습니다. 영어 키워드를 사용해보세요.
        </div>
      )}
    </div>
  )
}

// ── Main Step4 Component ──────────────────────────────────────────────────────
function formatTime(secs) {
  const m = Math.floor(secs / 60).toString().padStart(2, '0')
  const s = Math.floor(secs % 60).toString().padStart(2, '0')
  const ms = Math.floor((secs % 1) * 10)
  return `${m}:${s}.${ms}`
}

export default function Step4({
  waveformRef, isPlaying, isMixing, previewUrl,
  currentTime,
  baseVolume, duckVolume, setBaseVolume, setDuckVolume,
  frontSilence, backSilence, setFrontSilence, setBackSilence,
  addedTracks, segments,
  isMusicDragging, isSfxDragging, isAmbDragging,
  setIsMusicDragging, setIsSfxDragging, setIsAmbDragging,
  manualMusicRef, manualSfxRef, manualAmbRef,
  onPlayPause, onRender, onDownload, onSeek, onBack,
  onAddTrack,
  wavesurferRef,
}) {
  const [showESPanel, setShowESPanel] = useState(true)

  // Adapter: epidemic panel gives {name,url,time,buffer,type}, onAddTrack expects (file, type)
  const handleESTrackAdd = useCallback((trackObj) => {
    // Build a minimal File-like structure manually added to addedTracks
    // We bypass the file-based flow and add directly via the object form
    onAddTrack(trackObj, trackObj.type, true /* direct object mode */)
  }, [onAddTrack])

  return (
    <div className="editor-grid">
      {/* Left: Script */}
      <div className="panel">
        <div className="panel-title">📄 스크립트 (클릭하여 이동)</div>
        <ScriptViewer segments={segments} addedTracks={addedTracks} clickable onSeek={onSeek} currentTime={currentTime} />
      </div>

      {/* Right: Mixing */}
      <div className="panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
          <span className="panel-title" style={{ margin: 0, border: 'none', padding: 0 }}>🎛 사운드 믹싱 &amp; 연출</span>
          <button onClick={onBack}>← 이전</button>
        </div>

        <div style={{ position: 'relative' }}>
          <div className="waveform-container" ref={waveformRef} />
          <div style={{
            position: 'absolute', bottom: 6, right: 10,
            fontFamily: 'monospace', fontSize: '0.82rem', fontWeight: 700,
            color: isPlaying ? '#9d82ff' : 'var(--text-muted)',
            background: 'rgba(10,10,26,0.75)', padding: '2px 8px', borderRadius: 4,
            pointerEvents: 'none',
          }}>
            {formatTime(currentTime ?? 0)}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', margin: '1rem 0', flexWrap: 'wrap' }}>
          <button className="primary" onClick={onPlayPause}>
            {isPlaying ? <Pause size={16} /> : <Play size={16} />} 타임라인 재생
          </button>
          <button onClick={onRender} disabled={isMixing}>
            <Wand2 size={16} /> {isMixing ? '렌더링 중...' : '🎧 오디오 렌더링'}
          </button>
        </div>

        {previewUrl && (
          <div className="preview-card">
            <h3>결과물 미리듣기</h3>
            <div className="preview-row">
              <audio src={previewUrl} controls />
              <button className="primary" onClick={onDownload}>
                <Download size={16} /> 다운로드
              </button>
            </div>
          </div>
        )}

        {/* Epidemic Sound Search Panel */}
        <div style={{ marginBottom: '0.75rem' }}>
          <button
            onClick={() => setShowESPanel(p => !p)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.55rem 0.75rem', background: showESPanel ? 'rgba(124,92,252,0.08)' : 'var(--bg-elevated)', border: '1px solid rgba(124,92,252,0.2)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: 'var(--text-primary)', fontSize: '0.82rem', fontWeight: 600, marginBottom: showESPanel ? '0.5rem' : 0 }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Zap size={13} color="#5eead4" /> Epidemic Sound 음원 검색
            </span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{showESPanel ? '▲ 닫기' : '▼ 열기'}</span>
          </button>
          {showESPanel && (
            <EpidemicSearchPanel
              segments={segments}
              wavesurferRef={wavesurferRef}
              onAddTrack={handleESTrackAdd}
            />
          )}
        </div>

        {/* Manual add drop zones */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
          <div
            className={`drop-zone bgm-zone${isMusicDragging ? ' dragging' : ''}`}
            style={{ padding: '1rem' }}
            onClick={() => manualMusicRef.current.click()}
            onDragOver={e => { e.preventDefault(); setIsMusicDragging(true) }}
            onDragLeave={e => { e.preventDefault(); setIsMusicDragging(false) }}
            onDrop={e => { e.preventDefault(); setIsMusicDragging(false); const f = e.dataTransfer.files[0]; if (f) onAddTrack(f, 'bgm') }}
          >
            <FileMusic size={20} color="var(--bgm)" style={{ marginBottom: '0.3rem' }} />
            <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>BGM 추가</div>
            <input type="file" ref={manualMusicRef} onChange={e => onAddTrack(e.target.files[0], 'bgm')} accept="audio/*" className="file-input-hidden" />
          </div>
          <div
            className={`drop-zone sfx-zone${isSfxDragging ? ' dragging' : ''}`}
            style={{ padding: '1rem' }}
            onClick={() => manualSfxRef.current.click()}
            onDragOver={e => { e.preventDefault(); setIsSfxDragging(true) }}
            onDragLeave={e => { e.preventDefault(); setIsSfxDragging(false) }}
            onDrop={e => { e.preventDefault(); setIsSfxDragging(false); const f = e.dataTransfer.files[0]; if (f) onAddTrack(f, 'sfx') }}
          >
            <FileAudio size={20} color="var(--sfx)" style={{ marginBottom: '0.3rem' }} />
            <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>SFX 추가</div>
            <input type="file" ref={manualSfxRef} onChange={e => onAddTrack(e.target.files[0], 'sfx')} accept="audio/*" className="file-input-hidden" />
          </div>
          <div
            className={`drop-zone${isAmbDragging ? ' dragging' : ''}`}
            style={{ padding: '1rem', borderColor: 'rgba(94,234,212,0.35)', background: isAmbDragging ? 'rgba(94,234,212,0.08)' : undefined }}
            onClick={() => manualAmbRef.current.click()}
            onDragOver={e => { e.preventDefault(); setIsAmbDragging(true) }}
            onDragLeave={e => { e.preventDefault(); setIsAmbDragging(false) }}
            onDrop={e => { e.preventDefault(); setIsAmbDragging(false); const f = e.dataTransfer.files[0]; if (f) onAddTrack(f, 'amb') }}
          >
            <FileAudio size={20} color="#5eead4" style={{ marginBottom: '0.3rem' }} />
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#5eead4' }}>엠비언스 추가</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>페이드 인/아웃 자동</div>
            <input type="file" ref={manualAmbRef} onChange={e => onAddTrack(e.target.files[0], 'amb')} accept="audio/*" className="file-input-hidden" />
          </div>
        </div>

        {/* Ducking */}
        <div className="ducking-panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontSize: '0.9rem', fontWeight: 700 }}>
            <Sliders size={16} color="var(--primary)" /> BGM 볼륨 &amp; 여백 설정
          </div>

          {/* 앞뒤 여백 */}
          <div style={{ marginBottom: '0.75rem', padding: '0.65rem 0.85rem', background: 'rgba(124,92,252,0.06)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(124,92,252,0.15)' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.6rem' }}>
              원본에 이미 음악이 깔린 구간 — BGM 제외
            </div>
            <div className="ducking-row">
              <div className="ducking-label">
                <span>앞 여백 (원본 음악 끝)</span>
                <span className="ducking-value">{frontSilence}초</span>
              </div>
              <input type="range" min="0" max="120" value={frontSilence} onChange={e => setFrontSilence(Number(e.target.value))} />
            </div>
            <div className="ducking-row">
              <div className="ducking-label">
                <span>뒤 여백 (원본 음악 시작)</span>
                <span className="ducking-value">{backSilence}초</span>
              </div>
              <input type="range" min="0" max="120" value={backSilence} onChange={e => setBackSilence(Number(e.target.value))} />
            </div>
          </div>

          <div className="ducking-row">
            <div className="ducking-label">
              <span>BGM 볼륨 <span style={{ fontSize: '0.7rem', color: '#5eead4', fontWeight: 400 }}>▶ 재생 중 실시간 반영</span></span>
              <span className="ducking-value">{baseVolume}%</span>
            </div>
            <input type="range" min="0" max="100" value={baseVolume} onChange={e => setBaseVolume(Number(e.target.value))} />
          </div>
          <div className="ducking-row">
            <div className="ducking-label">
              <span>더킹 볼륨 (말이 나올 때)</span>
              <span className="ducking-value sfx-val">{duckVolume}%</span>
            </div>
            <input type="range" min="0" max="100" value={duckVolume} onChange={e => setDuckVolume(e.target.value)} />
          </div>
        </div>

        {/* Track list */}
        <div className="track-list">
          <div className="track-list-title">타임라인 트랙 목록</div>
          {addedTracks.length === 0 ? (
            <p className="track-item-empty">오디오 트랙이 추가되면 이곳에 표시됩니다.</p>
          ) : (
            <>
              <div className="track-section">
                <div className="track-section-label bgm">🎵 배경음악 (BGM) — 더킹 적용</div>
                {addedTracks.filter(t => t.type === 'bgm').length === 0
                  ? <div className="track-item-empty">추가된 BGM 없음</div>
                  : addedTracks.filter(t => t.type === 'bgm').map((t, i) => (
                    <div key={i} className={`track-item${t.name.includes('✨') || t.name.includes('⚡') ? ' auto-placed' : ''}`}>
                      <span className="track-item-name">{t.name.includes('✨') ? '✨ ' : t.name.includes('⚡') ? '⚡ ' : '🎵 '}{t.name.replace(/^[✨⚡] /, '')}</span>
                      <span className="track-item-time">{Number(t.time).toFixed(2)}s</span>
                    </div>
                  ))}
              </div>
              <div className="track-section">
                <div className="track-section-label sfx">🔊 효과음 (SFX)</div>
                {addedTracks.filter(t => t.type === 'sfx').length === 0
                  ? <div className="track-item-empty">추가된 SFX 없음</div>
                  : addedTracks.filter(t => t.type === 'sfx').map((t, i) => (
                    <div key={i} className={`track-item${t.name.includes('✨') || t.name.includes('⚡') ? ' auto-placed' : ''}`}>
                      <span className="track-item-name">{t.name.includes('✨') ? '⚡ ' : t.name.includes('⚡') ? '⚡ ' : '🔊 '}{t.name.replace(/^[✨⚡] /, '')}</span>
                      <span className="track-item-time">{Number(t.time).toFixed(2)}s</span>
                    </div>
                  ))}
              </div>
              <div className="track-section">
                <div className="track-section-label" style={{ color: '#5eead4', borderColor: 'rgba(94,234,212,0.3)' }}>🌿 엠비언스 (AMB) — 페이드 인 3s / 아웃 10s</div>
                {addedTracks.filter(t => t.type === 'amb').length === 0
                  ? <div className="track-item-empty">추가된 엠비언스 없음</div>
                  : addedTracks.filter(t => t.type === 'amb').map((t, i) => (
                    <div key={i} className={`track-item${t.name.includes('✨') || t.name.includes('⚡') ? ' auto-placed' : ''}`}>
                      <span className="track-item-name" style={{ color: '#5eead4' }}>🌿 {t.name.replace(/^[✨⚡] /, '')}</span>
                      <span className="track-item-time">{Number(t.time).toFixed(2)}s</span>
                    </div>
                  ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
