import { Wand2, ArrowRight } from 'lucide-react'

function ScriptViewer({ segments, addedTracks, onSeek, clickable, currentTime }) {
  return (
    <div className="script-viewer">
      {segments.length > 0 ? segments.map((seg, idx) => {
        const matched = addedTracks.filter(t => t.time >= seg.start - 0.1 && t.time <= seg.end + 0.1)
        const isActive = currentTime != null && currentTime >= seg.start && currentTime <= seg.end
        return (
          <div key={idx}
            className={`segment${matched.length > 0 ? ' has-sound' : ''}${isActive ? ' active' : ''}`}
            onClick={() => clickable && onSeek(seg.start)}
            style={{ cursor: clickable ? 'pointer' : 'default', ...(isActive ? { borderLeft: '3px solid var(--primary)', background: 'rgba(124,92,252,0.08)' } : {}) }}>
            <div className="segment-time">
              {new Date(seg.start * 1000).toISOString().substring(14, 19)} ~ {new Date(seg.end * 1000).toISOString().substring(14, 19)}
            </div>
            <div className="segment-text">{seg.text}</div>
            {matched.length > 0 && (
              <div className="segment-tracks">
                {matched.map((t, ti) => (
                  <span key={ti} className={`track-badge ${t.type}`}>
                    {t.type === 'bgm' ? '🎵' : '🔊'} {t.name.replace('✨ ', '')} 배치됨
                  </span>
                ))}
              </div>
            )}
          </div>
        )
      }) : <p className="empty-hint">스크립트 데이터가 없습니다.</p>}
    </div>
  )
}

export default function Step3({ segments, addedTracks, resourceFiles, isAnalyzing, onAnalyze, onBack, onNext }) {
  return (
    <div className="panel" style={{ maxWidth: 820, margin: '0 auto' }}>
      <div className="panel-title">📄 스크립트 텍스트</div>
      <ScriptViewer segments={segments} addedTracks={addedTracks} clickable={false} />

      <div className="scoring-panel">
        <h3><Wand2 size={20} color="var(--primary)" /> AI 자동 배치 실행</h3>
        <p className="scoring-desc">
          업로드된 재료 — BGM {resourceFiles.bgm.length}개, SFX {resourceFiles.sfx.length}개
        </p>
        <button
          className="primary-lg"
          onClick={onAnalyze}
          disabled={isAnalyzing || (resourceFiles.bgm.length === 0 && resourceFiles.sfx.length === 0)}
        >
          <Wand2 size={18} />
          {isAnalyzing ? 'AI 문맥 분석 및 자동 배치 중...' : '✨ AI 자동 스코어링 실행하기'}
        </button>
        <div className="action-bar" style={{ marginTop: '1.5rem' }}>
          <button onClick={onBack}>← 이전 (재료 추가)</button>
          <button className="primary" onClick={onNext}>
            수동으로 믹싱 단계로 이동 <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}

export { ScriptViewer }
