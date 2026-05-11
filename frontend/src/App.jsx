import { useState, useRef, useEffect, useCallback, Component } from 'react'
import WaveSurfer from 'wavesurfer.js'
import './App.css'
import Header from './components/Header'
import StepIndicator from './components/StepIndicator'
import UploadZone from './components/UploadZone'
import Step2Auto from './components/Step2Auto'

import Step4 from './components/Step4'
import { analyzeNovelLLM } from './lib/audioAI'

function audioBufferToWav(buffer) {
  let numOfChan = buffer.numberOfChannels,
    length = buffer.length * numOfChan * 2 + 44,
    arr = new ArrayBuffer(length),
    view = new DataView(arr),
    channels = [], i, sample, offset = 0, pos = 0
  const u16 = d => { view.setUint16(pos, d, true); pos += 2 }
  const u32 = d => { view.setUint32(pos, d, true); pos += 4 }
  u32(0x46464952); u32(length - 8); u32(0x45564157)
  u32(0x20746d66); u32(16); u16(1); u16(numOfChan)
  u32(buffer.sampleRate); u32(buffer.sampleRate * 2 * numOfChan)
  u16(numOfChan * 2); u16(16); u32(0x61746164); u32(length - pos - 4)
  for (i = 0; i < buffer.numberOfChannels; i++) channels.push(buffer.getChannelData(i))
  while (pos < length) {
    for (i = 0; i < numOfChan; i++) {
      sample = Math.max(-1, Math.min(1, channels[i][offset]))
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0
      view.setInt16(pos, sample, true); pos += 2
    }
    offset++
  }
  return arr
}

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(error) { return { error } }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: '2rem', color: '#ff6b6b', fontFamily: 'monospace', background: '#0d0d1a', minHeight: '100vh' }}>
          <h2>렌더링 오류 발생</h2>
          <pre style={{ fontSize: '0.8rem', color: '#aaa', whiteSpace: 'pre-wrap' }}>{this.state.error.message}</pre>
          <button onClick={() => this.setState({ error: null })} style={{ marginTop: '1rem', padding: '0.5rem 1rem', cursor: 'pointer' }}>
            다시 시도
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

async function clearModelCache() {
  try { const keys = await caches.keys(); await Promise.all(keys.map(k => caches.delete(k))) } catch (_) {}
  try {
    const dbs = await indexedDB.databases?.() ?? []
    await Promise.all(dbs.map(db => new Promise(res => { const r = indexedDB.deleteDatabase(db.name); r.onsuccess = r.onerror = res })))
  } catch (_) {}
}

function App() {
  // ── Worker & model state ──────────────────────────────
  const workerRef = useRef(null)
  const [workerKey, setWorkerKey] = useState(0)
  const [modelStatus, setModelStatus] = useState('idle') // idle | downloading | ready
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [downloadFile, setDownloadFile] = useState('')
  const [autoRecovering, setAutoRecovering] = useState(false)

  // ── Audio / STT state ─────────────────────────────────
  const [audioFile, setAudioFile] = useState(null)
  const [audioUrl, setAudioUrl] = useState(null)
  const [scriptText, setScriptText] = useState('')
  const scriptTextRef = useRef(scriptText)
  const [apiKey, setApiKey] = useState(localStorage.getItem('openai_api_key') || '')
  const apiKeyRef = useRef(apiKey)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [estimatedTime, setEstimatedTime] = useState(0)
  const timerRef = useRef(null)

  useEffect(() => { scriptTextRef.current = scriptText }, [scriptText])
  useEffect(() => { apiKeyRef.current = apiKey }, [apiKey])

  // ── App state ─────────────────────────────────────────
  const [segments, setSegments] = useState([])
  const [currentStep, setCurrentStep] = useState(1)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [isMixing, setIsMixing] = useState(false)
  const [resourceFiles, setResourceFiles] = useState({ bgm: [], sfx: [] })
  const [isMainDragging, setIsMainDragging] = useState(false)
  const [isMusicDragging, setIsMusicDragging] = useState(false)
  const [isSfxDragging, setIsSfxDragging] = useState(false)
  const [isAmbDragging, setIsAmbDragging] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [baseVolume, setBaseVolume] = useState(25)
  const [duckVolume, setDuckVolume] = useState(10)
  const [frontSilence, setFrontSilence] = useState(20)  // 앞 여백 (초)
  const [backSilence, setBackSilence] = useState(30)    // 뒤 여백 (초)
  const [addedTracks, setAddedTracks] = useState([])
  const [recommendation, setRecommendation] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)

  const waveformRef = useRef(null)
  const wavesurfer = useRef(null)
  const fileInputRef = useRef(null)
  const manualMusicRef = useRef(null)
  const manualSfxRef = useRef(null)
  const manualAmbRef = useRef(null)

  // ── Live BGM preview refs ─────────────────────────────
  const liveCtxRef = useRef(null)
  const liveGainRef = useRef(null)
  const liveSourcesRef = useRef([])
  const addedTracksRef = useRef(addedTracks)
  const baseVolumeRef = useRef(baseVolume)

  useEffect(() => { addedTracksRef.current = addedTracks }, [addedTracks])
  useEffect(() => { baseVolumeRef.current = baseVolume }, [baseVolume])

  // ── Live gain update when slider moves ───────────────
  useEffect(() => {
    if (liveGainRef.current) liveGainRef.current.gain.value = baseVolume / 100
  }, [baseVolume])

  // ── Init Web Worker on mount ──────────────────────────
  useEffect(() => {
    const worker = new Worker(
      new URL('./workers/whisper.worker.js', import.meta.url),
      { type: 'module' }
    )

    let totalFiles = 0
    let doneFiles = 0
    let totalBytes = {}
    let loadedBytes = {}

    worker.onmessage = async (e) => {
      const msg = e.data
      switch (msg.type) {
        case 'initiate':
          totalFiles++
          totalBytes[msg.file] = 1
          loadedBytes[msg.file] = 0
          setModelStatus('downloading')
          setDownloadFile(msg.file)
          break

        case 'download': {
          totalBytes[msg.file] = msg.total || 1
          loadedBytes[msg.file] = msg.loaded || 0
          const totalB = Object.values(totalBytes).reduce((a, b) => a + b, 0)
          const loadedB = Object.values(loadedBytes).reduce((a, b) => a + b, 0)
          setDownloadProgress(totalB > 0 ? (loadedB / totalB) * 100 : 0)
          setDownloadFile(msg.file)
          break
        }

        case 'file_done':
          doneFiles++
          setDownloadProgress(totalFiles > 0 ? (doneFiles / totalFiles) * 100 : 100)
          break

        case 'ready':
          setModelStatus('ready')
          setDownloadProgress(100)
          break

        case 'transcribing':
          // worker started actual transcription
          break

        case 'result': {
          clearInterval(timerRef.current)
          setSegments(msg.segments)
          setIsTranscribing(false)
          setIsAnalyzing(true)
          try {
            const rec = await analyzeNovelLLM(msg.segments, scriptTextRef.current, apiKeyRef.current)
            setRecommendation(rec)
          } catch (err) {
            console.error('Analysis error:', err)
            try {
              const fallback = await analyzeNovelLLM(msg.segments, '', '')
              setRecommendation(fallback)
            } catch (fallbackErr) {
              console.error('Fallback analysis error:', fallbackErr)
            }
          } finally {
            setIsAnalyzing(false)
            setCurrentStep(2)
          }
          break
        }

        case 'error':
          clearInterval(timerRef.current)
          setIsTranscribing(false)
          alert('STT 오류: ' + msg.message)
          setAudioFile(null)
          break
      }
    }

    workerRef.current = worker
    // ElevenLabs backend STT 사용 중 — 브라우저 Whisper 모델 로딩 불필요
    // worker.postMessage({ type: 'load' })

    return () => worker.terminate()
  }, [workerKey])

  // ── Live BGM: stop ────────────────────────────────────
  const stopLiveBgm = useCallback(() => {
    liveSourcesRef.current.forEach(s => { try { s.stop() } catch (_) {} })
    liveSourcesRef.current = []
    if (liveCtxRef.current) {
      liveCtxRef.current.close()
      liveCtxRef.current = null
      liveGainRef.current = null
    }
  }, [])

  // ── Live BGM: start (synced to WaveSurfer currentTime) ──
  const startLiveBgm = useCallback(async () => {
    stopLiveBgm()
    const bgmTracks = addedTracksRef.current.filter(t => t.type === 'bgm' && t.buffer)
    if (bgmTracks.length === 0) return

    const wsTime = wavesurfer.current?.getCurrentTime() ?? 0
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const gain = ctx.createGain()
    gain.gain.value = baseVolumeRef.current / 100
    gain.connect(ctx.destination)

    liveCtxRef.current = ctx
    liveGainRef.current = gain
    liveSourcesRef.current = []

    for (const track of bgmTracks) {
      if (liveCtxRef.current !== ctx) return
      try {
        const decoded = await ctx.decodeAudioData(track.buffer.slice(0))
        if (liveCtxRef.current !== ctx) return

        const seekOffset = wsTime - track.time
        if (seekOffset >= decoded.duration) continue

        const src = ctx.createBufferSource()
        src.buffer = decoded
        src.connect(gain)

        if (seekOffset > 0) {
          src.start(0, seekOffset)
        } else {
          src.start(ctx.currentTime + (track.time - wsTime))
        }
        liveSourcesRef.current.push(src)
      } catch (e) {
        console.error('Live BGM decode error:', e)
      }
    }
  }, [stopLiveBgm])

  // ── WaveSurfer ────────────────────────────────────────
  useEffect(() => {
    if (audioUrl && waveformRef.current && currentStep === 4) {
      if (wavesurfer.current) wavesurfer.current.destroy()
      wavesurfer.current = WaveSurfer.create({
        container: waveformRef.current,
        waveColor: '#3a3a5c',
        progressColor: '#7c5cfc',
        cursorColor: '#9d82ff',
        barWidth: 2, barRadius: 3, responsive: true, height: 100, normalize: true,
      })
      wavesurfer.current.load(audioUrl)
      wavesurfer.current.on('play', () => { setIsPlaying(true); startLiveBgm() })
      wavesurfer.current.on('pause', () => { setIsPlaying(false); stopLiveBgm() })
      wavesurfer.current.on('finish', () => { setIsPlaying(false); setCurrentTime(0); stopLiveBgm() })
      wavesurfer.current.on('timeupdate', (t) => setCurrentTime(t))
    }
    return () => {
      if (wavesurfer.current && currentStep !== 4) {
        wavesurfer.current.destroy()
        wavesurfer.current = null
      }
    }
  }, [audioUrl, currentStep, startLiveBgm, stopLiveBgm])

  // ── Process uploaded audio file ───────────────────────
  const processFile = useCallback(async (file) => {
    if (!file) return
    setAudioFile(file)
    const objectUrl = URL.createObjectURL(file)
    setAudioUrl(objectUrl)
    setCurrentStep(1)
    setAddedTracks([])
    setResourceFiles({ bgm: [], sfx: [] })
    setElapsedTime(0)
    setPreviewUrl(null)

    const audio = new Audio(objectUrl)
    audio.onloadedmetadata = () => {
      setEstimatedTime(Math.max(10, Math.floor(audio.duration * 0.5)))
    }

    setIsTranscribing(true)
    timerRef.current = setInterval(() => setElapsedTime(p => p + 1), 1000)

    try {
      const BACKEND = import.meta.env.VITE_BACKEND_URL || ''
      const formData = new FormData()
      formData.append('file', file)
      const resp = await fetch(`${BACKEND}/api/transcribe`, { method: 'POST', body: formData })
      if (!resp.ok) throw new Error(`서버 오류: ${resp.status}`)
      const result = await resp.json()
      if (result.error) throw new Error(result.error)

      clearInterval(timerRef.current)
      setIsTranscribing(false)
      setIsAnalyzing(true)
      try {
        const rec = await analyzeNovelLLM(result.segments, scriptTextRef.current, apiKeyRef.current)
        setRecommendation(rec)
      } catch (err) {
        console.error('Analysis error:', err)
        try {
          const fallback = await analyzeNovelLLM(result.segments, '', '')
          setRecommendation(fallback)
        } catch (fallbackErr) {
          console.error('Fallback analysis error:', fallbackErr)
        }
      } finally {
        setIsAnalyzing(false)
        setSegments(result.segments)
        setCurrentStep(2)
      }
    } catch (err) {
      clearInterval(timerRef.current)
      setIsTranscribing(false)
      alert('STT 오류: ' + err.message)
      setAudioFile(null)
    }
  }, [])

  // ── Tracks ready from Step2Auto ──────────────────────
  const handleTracksReady = useCallback((tracks) => {
    setAddedTracks(tracks)
    setCurrentStep(4)
  }, [])

  // ── Manual track add ──────────────────────────────────
  const handleAddTrack = useCallback(async (fileOrObj, type, isDirect = false) => {
    if (!fileOrObj) return
    // Direct object mode: from Epidemic Sound panel (already has name, url, time, buffer, type)
    if (isDirect && fileOrObj.buffer) {
      setAddedTracks(p => [...p, fileOrObj])
      return
    }
    // Normal file mode
    const buffer = await fileOrObj.arrayBuffer()
    const time = wavesurfer.current?.getCurrentTime() ?? 0
    setAddedTracks(p => [...p, { name: fileOrObj.name, url: URL.createObjectURL(fileOrObj), time, buffer, type }])
  }, [])

  const handleAddResource = useCallback((files, type) => {
    setResourceFiles(p => ({ ...p, [type]: [...p[type], ...Array.from(files)] }))
  }, [])

  // ── Mix & Render ──────────────────────────────────────
  const generateMixPreview = useCallback(async () => {
    if (!audioFile) return
    setIsMixing(true)
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      const mainBuf = await ctx.decodeAudioData(await audioFile.arrayBuffer())

      const decoded = await Promise.all(addedTracks.map(async t => {
        const d = await ctx.decodeAudioData(t.buffer.slice(0))
        return { ...t, d }
      }))

      // ── SFX gap insertion: 음성 트랙을 SFX 삽입 지점에서 잘라 gap 생성 ──
      const sfxList = decoded.filter(t => t.type === 'sfx').sort((a, b) => a.time - b.time)
      const otherList = decoded.filter(t => t.type !== 'sfx')

      // origTime 기준 누적 shift 계산 (strict <: 같은 지점의 SFX는 해당 지점부터 삽입)
      let cum = 0
      const sfxShifted = sfxList.map(sfx => {
        const origTime = Math.min(sfx.time, mainBuf.duration)
        const outTime = origTime + cum
        cum += sfx.d.duration
        return { ...sfx, origTime, outTime }
      })
      const shiftAt = (t) => {
        let s = 0
        for (const sfx of sfxShifted) { if (sfx.origTime < t) s += sfx.d.duration; else break }
        return s
      }

      const voiceOffset = 5  // BGM intro before voice starts (seconds)

      // 전체 출력 길이 계산
      let maxDur = mainBuf.duration + cum + voiceOffset
      for (const t of otherList) {
        const st = t.time + shiftAt(t.time)
        if (st + t.d.duration > maxDur) maxDur = st + t.d.duration
      }

      const baseV = baseVolume / 100, duckV = duckVolume / 100, fadeTime = 0.3
      const off = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(
        2, Math.ceil(ctx.sampleRate * maxDur), ctx.sampleRate
      )

      // ── 음성 트랙을 조각내어 SFX gap 사이사이에 배치 ──
      const scheduleSlice = (srcStart, srcEnd, dstStart) => {
        const rate = mainBuf.sampleRate
        const s0 = Math.round(srcStart * rate)
        const s1 = Math.min(Math.round(srcEnd * rate), mainBuf.length)
        if (s1 <= s0) return
        const buf = off.createBuffer(mainBuf.numberOfChannels, s1 - s0, rate)
        for (let ch = 0; ch < mainBuf.numberOfChannels; ch++)
          buf.getChannelData(ch).set(mainBuf.getChannelData(ch).subarray(s0, s1))
        const src = off.createBufferSource()
        src.buffer = buf; src.connect(off.destination); src.start(dstStart)
      }

      let srcCursor = 0, dstCursor = voiceOffset
      for (const sfx of sfxShifted) {
        scheduleSlice(srcCursor, sfx.origTime, dstCursor)
        dstCursor += sfx.origTime - srcCursor
        // SFX를 gap에 배치
        const sfxSrc = off.createBufferSource(); sfxSrc.buffer = sfx.d
        const g = off.createGain(); g.gain.value = 0.7
        sfxSrc.connect(g); g.connect(off.destination)
        sfxSrc.start(dstCursor)
        dstCursor += sfx.d.duration
        srcCursor = sfx.origTime
      }
      scheduleSlice(srcCursor, mainBuf.duration, dstCursor)

      // ── BGM / AMB 배치 (시프트된 타임라인 기준) ──
      otherList.forEach(t => {
        const src = off.createBufferSource(); src.buffer = t.d
        const tOut = t.time + shiftAt(t.time)

        if (t.type === 'bgm') {
          const g = off.createGain()
          const bgmEnd = tOut + t.d.duration
          const fadeIn = 1.5, fadeOut = 5
          g.gain.setValueAtTime(0, tOut)
          g.gain.linearRampToValueAtTime(baseV, tOut + fadeIn)
          segments.forEach(s => {
            const sOut = s.start + shiftAt(s.start) + voiceOffset
            const eOut = s.end + shiftAt(s.end) + voiceOffset
            if (sOut < tOut + fadeIn) return
            g.gain.setTargetAtTime(duckV, Math.max(tOut, sOut - fadeTime), fadeTime)
            g.gain.setTargetAtTime(baseV, eOut, fadeTime)
          })
          const activeEnd = Math.max(tOut + fadeIn, Math.min(bgmEnd, maxDur - backSilence))
          if (activeEnd > tOut + fadeIn) {
            g.gain.setValueAtTime(baseV, Math.max(tOut + fadeIn, activeEnd - fadeOut))
            g.gain.linearRampToValueAtTime(0, activeEnd)
          }
          src.connect(g); g.connect(off.destination)
        } else if (t.type === 'amb') {
          const ambV = 0.45, dur = t.d.duration
          const fadeInDur = Math.min(3, dur * 0.2)
          const fadeOutDur = Math.min(10, dur * 0.3)
          const g = off.createGain()
          g.gain.setValueAtTime(0, tOut)
          g.gain.linearRampToValueAtTime(ambV, tOut + fadeInDur)
          g.gain.setValueAtTime(ambV, Math.max(tOut + fadeInDur, tOut + dur - fadeOutDur))
          g.gain.linearRampToValueAtTime(0, tOut + dur)
          src.connect(g); g.connect(off.destination)
        }
        src.start(tOut)
      })

      const rendered = await off.startRendering()
      const blob = new Blob([new DataView(audioBufferToWav(rendered))], { type: 'audio/wav' })
      setPreviewUrl(window.URL.createObjectURL(blob))
    } catch (err) {
      console.error(err); alert('믹싱 중 오류가 발생했습니다.')
    } finally {
      setIsMixing(false)
    }
  }, [audioFile, addedTracks, segments, baseVolume, duckVolume, frontSilence, backSilence])

  const handleDownloadMix = useCallback(() => {
    if (!previewUrl) return
    const a = document.createElement('a')
    a.href = previewUrl; a.download = 'mixed_vocalstudio.wav'
    document.body.appendChild(a); a.click()
    setTimeout(() => document.body.removeChild(a), 100)
  }, [previewUrl])

  // ── Auto-recovery: 2분 넘으면 캐시 초기화 후 자동 재시작 ──
  useEffect(() => {
    if (!isTranscribing) return
    const threshold = Math.max(estimatedTime * 2, 120)
    if (elapsedTime !== Math.floor(threshold)) return
    ;(async () => {
      setAutoRecovering(true)
      clearInterval(timerRef.current)
      await clearModelCache()
      setIsTranscribing(false)
      setAudioFile(null)
      setAudioUrl(null)
      setElapsedTime(0)
      setModelStatus('idle')
      setWorkerKey(k => k + 1)
      setAutoRecovering(false)
    })()
  }, [elapsedTime, isTranscribing, estimatedTime])

  // ── Cancel transcription ──────────────────────────────
  const handleCancelTranscription = useCallback(async () => {
    clearInterval(timerRef.current)
    await clearModelCache()
    setIsTranscribing(false)
    setAudioFile(null)
    setAudioUrl(null)
    setElapsedTime(0)
    setModelStatus('idle')
    setWorkerKey(k => k + 1)
  }, [])

  // ── Go Home (reset all state to upload screen) ────────
  const handleGoHome = useCallback(() => {
    clearInterval(timerRef.current)
    stopLiveBgm()
    if (wavesurfer.current) { wavesurfer.current.destroy(); wavesurfer.current = null }
    setAudioFile(null)
    setAudioUrl(null)
    setScriptText('')
    setSegments([])
    setCurrentStep(1)
    setIsPlaying(false)
    setIsTranscribing(false)
    setIsAnalyzing(false)
    setAddedTracks([])
    setRecommendation(null)
    setPreviewUrl(null)
    setElapsedTime(0)
    setModelStatus('idle')
    setResourceFiles({ bgm: [], sfx: [] })
  }, [stopLiveBgm])

  // ── Render ────────────────────────────────────────────
  const showUpload = !audioFile || isTranscribing || isAnalyzing
  const showModelDownload = modelStatus === 'downloading'

  return (
    <div className="app-container">
      <Header onHome={handleGoHome} />

      {audioFile && !isTranscribing && !isAnalyzing && <StepIndicator currentStep={currentStep} />}

      {(showUpload || showModelDownload) && (
        <UploadZone
          isTranscribing={isTranscribing}
          isAnalyzing={isAnalyzing}
          elapsedTime={elapsedTime}
          estimatedTime={estimatedTime}
          isDragging={isMainDragging}
          onDrag={() => setIsMainDragging(true)}
          onDragLeave={() => setIsMainDragging(false)}
          onDrop={f => { if (f?.type.startsWith('audio/')) processFile(f) }}
          onClick={() => fileInputRef.current?.click()}
          fileInputRef={fileInputRef}
          onChange={processFile}
          onScriptChange={setScriptText}
          scriptText={scriptText}
          apiKey={apiKey}
          onApiKeyChange={(k) => { setApiKey(k); localStorage.setItem('openai_api_key', k); }}
          modelStatus={modelStatus}
          downloadProgress={downloadProgress}
          downloadFile={downloadFile}
          onCancelTranscription={handleCancelTranscription}
          autoRecovering={autoRecovering}
        />
      )}

      {currentStep === 2 && audioFile && !isTranscribing && (
        <Step2Auto
          segments={segments}
          initialAnalysis={recommendation}
          onTracksReady={handleTracksReady}
          onBack={() => { setAudioFile(null); setCurrentStep(1) }}
        />
      )}

      {currentStep === 4 && (
        <Step4
          waveformRef={waveformRef}
          isPlaying={isPlaying}
          currentTime={currentTime}
          isMixing={isMixing}
          previewUrl={previewUrl}
          baseVolume={baseVolume}
          duckVolume={duckVolume}
          setBaseVolume={setBaseVolume}
          setDuckVolume={setDuckVolume}
          frontSilence={frontSilence}
          backSilence={backSilence}
          setFrontSilence={setFrontSilence}
          setBackSilence={setBackSilence}
          addedTracks={addedTracks}
          segments={segments}
          isMusicDragging={isMusicDragging}
          isSfxDragging={isSfxDragging}
          isAmbDragging={isAmbDragging}
          setIsMusicDragging={setIsMusicDragging}
          setIsSfxDragging={setIsSfxDragging}
          setIsAmbDragging={setIsAmbDragging}
          manualMusicRef={manualMusicRef}
          manualSfxRef={manualSfxRef}
          manualAmbRef={manualAmbRef}
          onPlayPause={() => wavesurfer.current?.playPause()}
          onRender={generateMixPreview}
          onDownload={handleDownloadMix}
          onSeek={t => {
            if (wavesurfer.current) {
              wavesurfer.current.seekTo(t / wavesurfer.current.getDuration())
              wavesurfer.current.play()
            }
          }}
          onBack={() => setCurrentStep(2)}
          onAddTrack={handleAddTrack}
          wavesurferRef={wavesurfer}
        />
      )}
    </div>
  )
}

export default function AppWithBoundary() {
  return <ErrorBoundary><App /></ErrorBoundary>
}
