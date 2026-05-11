export default function Header({ onHome }) {
  return (
    <header className="header">
      <div
        className="header-brand"
        onClick={onHome}
        style={{ cursor: 'pointer' }}
        title="홈으로 이동"
      >
        <h1>AUTO <span style={{ color: 'var(--primary-light)' }}>BGM/SFX</span></h1>
        <p>AI Sound Foley &amp; Audio Ducking — Open Source</p>
      </div>
      <div className="header-badge">
        <span>✦</span> Whisper AI Powered
      </div>
    </header>
  )
}
