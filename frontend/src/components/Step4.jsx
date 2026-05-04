import { Play, Pause, Download, FileMusic, FileAudio, Sliders, Wand2 } from 'lucide-react'
import { ScriptViewer } from './Step3'

export default function Step4({
  waveformRef, isPlaying, isMixing, previewUrl,
  baseVolume, duckVolume, setBaseVolume, setDuckVolume,
  addedTracks, segments,
  isMusicDragging, isSfxDragging, setIsMusicDragging, setIsSfxDragging,
  manualMusicRef, manualSfxRef,
  onPlayPause, onRender, onDownload, onSeek, onBack,
  onAddTrack
}) {
  return (
    <div className="editor-grid">
      {/* Left: Script */}
      <div className="panel">
        <div className="panel-title">📄 스크립트 (클릭하여 이동)</div>
        <ScriptViewer segments={segments} addedTracks={addedTracks} clickable onSeek={onSeek} />
      </div>

      {/* Right: Mixing */}
      <div className="panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
          <span className="panel-title" style={{ margin: 0, border: 'none', padding: 0 }}>🎛 사운드 믹싱 & 연출</span>
          <button onClick={onBack}>← 이전</button>
        </div>

        <div className="waveform-container" ref={waveformRef} />

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

        {/* Manual add drop zones */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
          <div
            className={`drop-zone bgm-zone${isMusicDragging ? ' dragging' : ''}`}
            style={{ padding: '1rem' }}
            onClick={() => manualMusicRef.current.click()}
            onDragOver={e => { e.preventDefault(); setIsMusicDragging(true) }}
            onDragLeave={e => { e.preventDefault(); setIsMusicDragging(false) }}
            onDrop={e => { e.preventDefault(); setIsMusicDragging(false); const f = e.dataTransfer.files[0]; if (f) onAddTrack(f, 'bgm') }}
          >
            <FileMusic size={20} color="var(--bgm)" style={{ marginBottom: '0.3rem' }} />
            <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>수동 BGM 추가</div>
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
            <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>수동 SFX 추가</div>
            <input type="file" ref={manualSfxRef} onChange={e => onAddTrack(e.target.files[0], 'sfx')} accept="audio/*" className="file-input-hidden" />
          </div>
        </div>

        {/* Ducking */}
        <div className="ducking-panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontSize: '0.9rem', fontWeight: 700 }}>
            <Sliders size={16} color="var(--primary)" /> 볼륨 더킹 설정 (BGM)
          </div>
          <div className="ducking-row">
            <div className="ducking-label">
              <span>기본 볼륨 (말이 없을 때)</span>
              <span className="ducking-value">{baseVolume}%</span>
            </div>
            <input type="range" min="0" max="100" value={baseVolume} onChange={e => setBaseVolume(e.target.value)} />
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
                    <div key={i} className={`track-item${t.name.includes('✨') ? ' auto-placed' : ''}`}>
                      <span className="track-item-name">{t.name.includes('✨') ? '✨ ' : '🎵 '}{t.name.replace('✨ ', '')}</span>
                      <span className="track-item-time">{Number(t.time).toFixed(2)}s</span>
                    </div>
                  ))}
              </div>
              <div className="track-section">
                <div className="track-section-label sfx">🔊 효과음 (SFX)</div>
                {addedTracks.filter(t => t.type === 'sfx').length === 0
                  ? <div className="track-item-empty">추가된 SFX 없음</div>
                  : addedTracks.filter(t => t.type === 'sfx').map((t, i) => (
                    <div key={i} className={`track-item${t.name.includes('✨') ? ' auto-placed' : ''}`}>
                      <span className="track-item-name">{t.name.includes('✨') ? '⚡ ' : '🔊 '}{t.name.replace('✨ ', '')}</span>
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
