import { UploadCloud } from 'lucide-react'

export default function UploadZone({
  isTranscribing, elapsedTime, estimatedTime,
  isDragging, onDrag, onDragLeave, onDrop, onClick, fileInputRef, onChange, onScriptChange, scriptText,
  modelStatus, // 'idle' | 'downloading' | 'ready'
  downloadProgress, // 0–100
  downloadFile,
}) {
  // ── Model downloading state ──────────────────────────
  if (modelStatus === 'downloading') {
    return (
      <div className="loading-zone">
        <div className="sound-wave">
          {[...Array(8)].map((_, i) => <span key={i} />)}
        </div>
        <div className="loading-title">AI 모델 다운로드 중...</div>
        <div className="progress-bar-wrap">
          <div className="progress-meta">
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', maxWidth: '340px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {downloadFile || '준비 중...'}
            </span>
            <span>{Math.round(downloadProgress)}%</span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${downloadProgress}%` }} />
          </div>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
          첫 실행 시 1회만 다운로드됩니다 (~150MB). 이후 캐시되어 즉시 실행됩니다.
        </p>
      </div>
    )
  }

  // ── STT transcribing state ───────────────────────────
  if (isTranscribing) {
    const pct = estimatedTime > 0 ? Math.min(95, (elapsedTime / estimatedTime) * 100) : 10
    return (
      <div className="loading-zone">
        <div className="sound-wave">
          {[...Array(8)].map((_, i) => <span key={i} />)}
        </div>
        <div className="loading-title">AI가 음성을 텍스트로 변환하고 있습니다...</div>
        {estimatedTime > 0 && (
          <div className="progress-bar-wrap">
            <div className="progress-meta">
              <span>경과: {elapsedTime}초</span>
              <span>예상 남은 시간: {Math.max(0, estimatedTime - elapsedTime)}초</span>
            </div>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          브라우저에서 직접 처리 중 — 서버 불필요 🎉
        </p>
      </div>
    )
  }

  // ── Default upload state ─────────────────────────────
  return (
    <div
      className={`upload-zone${isDragging ? ' dragging' : ''}`}
      onClick={onClick}
      onDragOver={e => { e.preventDefault(); onDrag?.() }}
      onDragLeave={e => { e.preventDefault(); onDragLeave?.() }}
      onDrop={e => { e.preventDefault(); onDrop?.(e.dataTransfer.files[0]) }}
    >
      <div className="upload-icon-wrap">
        <UploadCloud size={36} color="var(--primary-light)" />
      </div>
      <h2>오디오 파일을 여기로 끌어다 놓으세요</h2>
      <p>또는 클릭하여 파일을 선택하세요</p>
      
      <div className="script-input-container" onClick={e => e.stopPropagation()} style={{ marginTop: '20px', width: '100%', maxWidth: '600px', textAlign: 'left' }}>
        <label style={{ fontSize: '0.85rem', color: 'var(--primary-light)', marginBottom: '5px', display: 'block', fontWeight: 'bold' }}>
          📝 원본 대본 (선택사항 - 강제 정렬 기능)
        </label>
        <textarea 
          placeholder="녹음된 오디오의 원본 대본을 여기에 붙여넣으세요. STT 오타를 방지하고 문맥(장소/상황)을 100% 정확하게 파악하여 사운드를 매칭합니다."
          value={scriptText || ''}
          onChange={e => onScriptChange?.(e.target.value)}
          style={{ width: '100%', height: '80px', padding: '10px', borderRadius: '8px', border: '1px solid #3a3a5c', backgroundColor: 'var(--bg-dark)', color: 'var(--text-light)', resize: 'vertical' }}
        />
      </div>

      {modelStatus === 'ready' && (
        <p style={{ fontSize: '0.78rem', color: 'var(--success)', marginTop: '0.5rem' }}>
          ✅ AI 모델 준비 완료
        </p>
      )}
      <div className="upload-formats">
        {['MP3', 'WAV', 'M4A', 'OGG', 'FLAC'].map(f => (
          <span key={f} className="format-badge">{f}</span>
        ))}
      </div>
      <input
        type="file"
        ref={fileInputRef}
        onChange={e => onChange?.(e.target.files[0])}
        accept="audio/*"
        className="file-input-hidden"
      />
    </div>
  )
}
