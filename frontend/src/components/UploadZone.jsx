import { UploadCloud, ChevronDown, ChevronUp, Settings } from 'lucide-react'
import { useState } from 'react'

export default function UploadZone({
  isTranscribing, isAnalyzing, elapsedTime, estimatedTime,
  isDragging, onDrag, onDragLeave, onDrop, onClick, fileInputRef, onChange, onScriptChange, scriptText, apiKey, onApiKeyChange,
  modelStatus, // 'idle' | 'downloading' | 'ready'
  downloadProgress, // 0–100
  downloadFile,
  onCancelTranscription,
  autoRecovering,
}) {
  // ✅ Hooks must be at the top — before any early returns
  const [showAdvanced, setShowAdvanced] = useState(false)
  const hasKey = !!(apiKey && apiKey.trim())

  // ── Auto recovering state ────────────────────────────
  if (autoRecovering) {
    return (
      <div className="loading-zone">
        <div className="sound-wave">
          {[...Array(8)].map((_, i) => <span key={i} />)}
        </div>
        <div className="loading-title">캐시 초기화 후 재시작 중...</div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          잠시 후 자동으로 업로드 화면으로 돌아갑니다.
        </p>
      </div>
    )
  }

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
    const isSlow = elapsedTime > 120
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
        {isSlow && (
          <p style={{ color: '#f59e0b', fontSize: '0.8rem', marginTop: '0.25rem' }}>
            오디오가 길수록 시간이 오래 걸립니다. 계속 기다리거나 취소 후 짧은 파일로 시도해보세요.
          </p>
        )}
        {onCancelTranscription && (
          <button
            onClick={onCancelTranscription}
            style={{ marginTop: '1rem', padding: '0.4rem 1.2rem', background: 'transparent', border: '1px solid rgba(255,100,100,0.5)', borderRadius: 'var(--radius-sm)', color: '#ff8080', cursor: 'pointer', fontSize: '0.82rem' }}
          >
            취소
          </button>
        )}
      </div>
    )
  }

  // ── AI LLM Analyzing state ───────────────────────────
  if (isAnalyzing) {
    return (
      <div className="loading-zone">
        <div className="sound-wave">
          {[...Array(8)].map((_, i) => <span key={i} />)}
        </div>
        <div className="loading-title">LLM이 대본 문맥을 분석하여 완벽한 사운드를 매칭 중입니다...</div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '15px' }}>
          대본의 장소, 시간, 상황을 100% 이해하여 최적의 효과음을 찾습니다 🤖
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

      {/* Script Input + Advanced Settings — grouped, centered */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          marginTop: '28px', width: '100%', maxWidth: '600px', marginLeft: 'auto', marginRight: 'auto',
          borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(124,92,252,0.4)',
        }}
      >
        {/* 헤더 */}
        <div style={{ background: 'rgba(124,92,252,0.18)', padding: '0.65rem 1.1rem', display: 'flex', alignItems: 'center', gap: '0.6rem', borderBottom: '1px solid rgba(124,92,252,0.25)' }}>
          <span style={{ fontSize: '0.92rem', color: '#e2d9ff', fontWeight: 700, letterSpacing: '0.01em' }}>📝 원본 대본</span>
          <span style={{ fontSize: '0.72rem', color: '#a89fd8', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', padding: '0.15rem 0.55rem', borderRadius: 20, fontWeight: 500 }}>선택사항</span>
          <span style={{ fontSize: '0.72rem', color: '#5eead4', background: 'rgba(94,234,212,0.15)', border: '1px solid rgba(94,234,212,0.3)', padding: '0.15rem 0.55rem', borderRadius: 20, fontWeight: 600, marginLeft: 'auto' }}>✦ 강제 정렬 기능</span>
        </div>
        {/* 텍스트에어리어 */}
        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.85rem 1.1rem' }}>
        <textarea
          placeholder="녹음된 오디오의 원본 대본을 여기에 붙여넣으세요. STT 오타를 방지하고 문맥(장소/상황)을 100% 정확하게 파악하여 사운드를 매칭합니다."
          value={scriptText || ''}
          onChange={e => onScriptChange?.(e.target.value)}
          style={{ width: '100%', height: '80px', padding: '10px', borderRadius: '8px', border: '1px solid rgba(124,92,252,0.3)', backgroundColor: 'rgba(0,0,0,0.2)', color: '#e2d9ff', resize: 'vertical', boxSizing: 'border-box', fontSize: '0.85rem', lineHeight: 1.5 }}
        />
        </div>

        {/* Advanced Settings Toggle */}
        <div style={{ borderTop: '1px solid rgba(124,92,252,0.2)', padding: '0.6rem 1.1rem 0.75rem' }}>
        <button
          onClick={e => { e.stopPropagation(); setShowAdvanced(p => !p) }}
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.78rem', padding: '0.25rem 0' }}
        >
          <Settings size={13} />
          고급 설정 (Gemini API Key)
          {hasKey && !showAdvanced && (
            <span style={{ background: 'rgba(94,234,212,0.15)', color: '#5eead4', fontSize: '0.68rem', padding: '0.05rem 0.4rem', borderRadius: 4, fontWeight: 600 }}>
              연결됨
            </span>
          )}
          {showAdvanced ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>

        {showAdvanced && (
          <div style={{ marginTop: '8px', padding: '0.85rem', background: 'rgba(255,255,255,0.03)', border: '1px solid #3a3a5c', borderRadius: '8px' }}>
            <label style={{ fontSize: '0.82rem', color: 'var(--primary-light)', marginBottom: '6px', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
              <span>🔑 무료 Gemini API Key (문맥 매칭용)</span>
              <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" style={{ color: 'var(--primary-light)', textDecoration: 'underline', fontSize: '0.75rem' }}>키 발급받기</a>
            </label>
            <input
              type="password"
              placeholder="AIzaSy..."
              value={apiKey || ''}
              onChange={e => onApiKeyChange?.(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #3a3a5c', backgroundColor: 'var(--bg-dark)', color: 'var(--text-light)', fontSize: '0.85rem', boxSizing: 'border-box' }}
            />
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '6px', marginBottom: 0 }}>
              브라우저 내부에만 저장 · 외부 서버 전송 없음 · 없으면 키워드 매칭으로 동작
            </p>
          </div>
        )}
        </div>
      </div>

      {modelStatus === 'ready' && (
        <p style={{ fontSize: '0.78rem', color: 'var(--success)', marginTop: '0.75rem' }}>
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
