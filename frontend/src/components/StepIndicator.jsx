export default function StepIndicator({ currentStep }) {
  const steps = [
    { n: 1, label: 'STT 추출' },
    { n: 2, label: 'AI 장면 분석' },
    { n: 4, label: '믹싱 & 연출' },
  ]
  return (
    <div className="step-indicator">
      {steps.map((s, i) => {
        const state = currentStep > s.n ? 'done' : currentStep === s.n ? 'active' : 'pending'
        return (
          <div key={s.n} style={{ display: 'flex', alignItems: 'center' }}>
            <div className={`step-item ${state}`}>
              <div className="step-icon">
                {state === 'done' ? '✓' : s.n}
              </div>
              <span className="step-label">{s.label}</span>
            </div>
            {i < steps.length - 1 && <div className="step-connector" />}
          </div>
        )
      })}
    </div>
  )
}
