import { FileMusic, FileAudio, Wand2 } from 'lucide-react'
import { ArrowRight } from 'lucide-react'

export default function Step2({ recommendation, resourceFiles, isMusicDragging, isSfxDragging, setIsMusicDragging, setIsSfxDragging, handleAddResource, manualMusicRef, manualSfxRef, onBack, onNext }) {
  return (
    <div className="panel" style={{ maxWidth: 820, margin: '0 auto' }}>
      <div className="panel-title"><FileMusic size={18} color="var(--primary)" /> 사운드 리소스 업로드</div>

      {recommendation && (
        <div className="ai-rec-card">
          <div className="ai-rec-title"><Wand2 size={16} /> AI 사운드 연출 제안</div>
          <div className="ai-rec-row">
            <span className="ai-rec-label">추천 BGM 무드:</span>
            <span className="ai-rec-value">{recommendation.bgm_mood}</span>
          </div>
          <div className="ai-rec-row">
            <span className="ai-rec-label">감지된 효과음 키워드:</span>
            {recommendation.recommended_sfx.length > 0 ? (
              <div className="sfx-tags">
                {recommendation.recommended_sfx.map((s, i) => (
                  <span key={i} className="sfx-tag">🔊 {s}</span>
                ))}
              </div>
            ) : (
              <span className="ai-rec-value">특별히 감지된 키워드 없음 (자유롭게 업로드)</span>
            )}
          </div>
        </div>
      )}

      <p style={{ color: 'var(--text-muted)', marginBottom: '1.25rem', fontSize: '0.9rem' }}>
        AI 추천에 맞는 BGM과 효과음을 업로드하면 AI가 자동으로 배치합니다.
      </p>

      <div className="resource-grid">
        <div
          className={`drop-zone bgm-zone${isMusicDragging ? ' dragging' : ''}`}
          onClick={() => manualMusicRef.current.click()}
          onDragOver={e => { e.preventDefault(); setIsMusicDragging(true) }}
          onDragLeave={e => { e.preventDefault(); setIsMusicDragging(false) }}
          onDrop={e => { e.preventDefault(); setIsMusicDragging(false); handleAddResource(e.dataTransfer.files, 'bgm') }}
        >
          <div className="drop-zone-icon"><FileMusic size={32} color="var(--bgm)" /></div>
          <div className="drop-zone-title">배경음악 (BGM)</div>
          <div className="drop-zone-hint">드래그 앤 드롭 또는 클릭<br />(예: 밝은음악.mp3)</div>
          <input type="file" multiple ref={manualMusicRef} onChange={e => handleAddResource(e.target.files, 'bgm')} accept="audio/*" className="file-input-hidden" />
        </div>

        <div
          className={`drop-zone sfx-zone${isSfxDragging ? ' dragging' : ''}`}
          onClick={() => manualSfxRef.current.click()}
          onDragOver={e => { e.preventDefault(); setIsSfxDragging(true) }}
          onDragLeave={e => { e.preventDefault(); setIsSfxDragging(false) }}
          onDrop={e => { e.preventDefault(); setIsSfxDragging(false); handleAddResource(e.dataTransfer.files, 'sfx') }}
        >
          <div className="drop-zone-icon"><FileAudio size={32} color="var(--sfx)" /></div>
          <div className="drop-zone-title">효과음 (SFX)</div>
          <div className="drop-zone-hint">드래그 앤 드롭 또는 클릭<br />(예: 박수소리.wav)</div>
          <input type="file" multiple ref={manualSfxRef} onChange={e => handleAddResource(e.target.files, 'sfx')} accept="audio/*" className="file-input-hidden" />
        </div>
      </div>

      {(resourceFiles.bgm.length > 0 || resourceFiles.sfx.length > 0) && (
        <div className="resource-list">
          <h4>업로드된 리소스</h4>
          <ul>
            {resourceFiles.bgm.map((f, i) => <li key={'b'+i}>🎵 {f.name}</li>)}
            {resourceFiles.sfx.map((f, i) => <li key={'s'+i}>🔊 {f.name}</li>)}
          </ul>
        </div>
      )}

      <div className="action-bar">
        <button onClick={onBack}>← 뒤로</button>
        <button className="primary-lg" onClick={onNext}>
          다음 단계 (AI 분석 설정) <ArrowRight size={18} />
        </button>
      </div>
    </div>
  )
}
