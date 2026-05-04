import { useState, useRef, useEffect, useCallback } from 'react'
import WaveSurfer from 'wavesurfer.js'
import './App.css'
import Header from './components/Header'
import StepIndicator from './components/StepIndicator'
import UploadZone from './components/UploadZone'
import Step2Auto from './components/Step2Auto'
import Step3 from './components/Step3'
import Step4 from './components/Step4'
import { recommendSounds } from './lib/audioAI'

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

function App() {
  // ── Worker & model state ──────────────────────────────
  const workerRef = useRef(null)
  const [modelStatus, setModelStatus] = useState('idle') // idle | downloading | ready
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [downloadFile, setDownloadFile] = useState('')

  // ── Audio / STT state ─────────────────────────────────
  const [audioFile, setAudioFile] = useState(null)
  const [audioUrl, setAudioUrl] = useState(null)
  const [scriptText, setScriptText] = useState('')
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [estimatedTime, setEstimatedTime] = useState(0)
  const timerRef = useRef(null)

  // ── App state ─────────────────────────────────────────
  const [segments, setSegments] = useState([])
  const [currentStep, setCurrentStep] = useState(1)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMixing, setIsMixing] = useState(false)
  const [resourceFiles, setResourceFiles] = useState({ bgm: [], sfx: [] })
  const [isMainDragging, setIsMainDragging] = useState(false)
  const [isMusicDragging, setIsMusicDragging] = useState(false)
  const [isSfxDragging, setIsSfxDragging] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [baseVolume, setBaseVolume] = useState(40)
  const [duckVolume, setDuckVolume] = useState(10)
  const [addedTracks, setAddedTracks] = useState([])
  const [recommendation, setRecommendation] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)

  const waveformRef = useRef(null)
  const wavesurfer = useRef(null)
  const fileInputRef = useRef(null)
  const manualMusicRef = useRef(null)
  const manualSfxRef = useRef(null)

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

    worker.onmessage = (e) => {
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

        case 'result':
          clearInterval(timerRef.current)
          setSegments(msg.segments)
          setRecommendation(recommendSounds(msg.segments))
          setIsTranscribing(false)
          setCurrentStep(2) // → Step2Auto
          break

        case 'error':
          clearInterval(timerRef.current)
          setIsTranscribing(false)
          alert('STT 오류: ' + msg.message)
          setAudioFile(null)
          break
      }
    }

    workerRef.current = worker

    // Pre-load model in background
    worker.postMessage({ type: 'load' })

    return () => worker.terminate()
  }, [])

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
      wavesurfer.current.on('play', () => setIsPlaying(true))
      wavesurfer.current.on('pause', () => setIsPlaying(false))
      wavesurfer.current.on('finish', () => setIsPlaying(false))
    }
    return () => {
      if (wavesurfer.current && currentStep !== 4) {
        wavesurfer.current.destroy()
        wavesurfer.current = null
      }
    }
  }, [audioUrl, currentStep])

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

    // Estimate time from audio duration
    const audio = new Audio(objectUrl)
    audio.onloadedmetadata = () => {
      setEstimatedTime(Math.max(10, Math.floor(audio.duration * 0.5)))
    }

    setIsTranscribing(true)
    timerRef.current = setInterval(() => setElapsedTime(p => p + 1), 1000)

    // Decode audio to Float32Array for Transformers.js
    try {
      const arrayBuffer = await file.arrayBuffer()
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
      const decoded = await audioCtx.decodeAudioData(arrayBuffer)

      // Resample to 16kHz mono (required by Whisper)
      const targetSampleRate = 16000
      const offlineCtx = new OfflineAudioContext(1, Math.ceil(decoded.duration * targetSampleRate), targetSampleRate)
      const src = offlineCtx.createBufferSource()
      src.buffer = decoded
      src.connect(offlineCtx.destination)
      src.start()
      const resampled = await offlineCtx.startRendering()
      const float32 = resampled.getChannelData(0)

      workerRef.current.postMessage({ type: 'transcribe', audio: float32 }, [float32.buffer])
    } catch (err) {
      clearInterval(timerRef.current)
      setIsTranscribing(false)
      alert('오디오 처리 오류: ' + err.message)
      setAudioFile(null)
    }
  }, [])

  // ── Tracks ready from Step2Auto ──────────────────────
  const handleTracksReady = useCallback((tracks) => {
    setAddedTracks(tracks)
    setCurrentStep(4)
  }, [])

  // ── Manual track add ──────────────────────────────────
  const handleAddTrack = useCallback(async (file, type) => {
    if (!file) return
    const buffer = await file.arrayBuffer()
    const time = wavesurfer.current?.getCurrentTime() ?? 0
    setAddedTracks(p => [...p, { name: file.name, url: URL.createObjectURL(file), time, buffer, type }])
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
      let maxDur = mainBuf.duration

      const decoded = await Promise.all(addedTracks.map(async t => {
        const d = await ctx.decodeAudioData(t.buffer.slice(0))
        if (t.time + d.duration > maxDur) maxDur = t.time + d.duration
        return { ...t, d }
      }))

      const baseV = baseVolume / 100, duckV = duckVolume / 100, fadeTime = 0.3
      const off = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(
        2, Math.ceil(ctx.sampleRate * maxDur), ctx.sampleRate
      )

      const main = off.createBufferSource()
      main.buffer = mainBuf; main.connect(off.destination); main.start(0)

      decoded.forEach(t => {
        const src = off.createBufferSource(); src.buffer = t.d
        if (t.type === 'bgm') {
          const g = off.createGain(); g.gain.setValueAtTime(baseV, 0)
          segments.forEach(s => {
            g.gain.setTargetAtTime(duckV, Math.max(0, s.start - fadeTime), fadeTime)
            g.gain.setTargetAtTime(baseV, s.end, fadeTime)
          })
          src.connect(g); g.connect(off.destination)
        } else {
          const g = off.createGain(); g.gain.value = 1
          src.connect(g); g.connect(off.destination)
        }
        src.start(t.time)
      })

      const rendered = await off.startRendering()
      const blob = new Blob([new DataView(audioBufferToWav(rendered))], { type: 'audio/wav' })
      setPreviewUrl(window.URL.createObjectURL(blob))
    } catch (err) {
      console.error(err); alert('믹싱 중 오류가 발생했습니다.')
    } finally {
      setIsMixing(false)
    }
  }, [audioFile, addedTracks, segments, baseVolume, duckVolume])

  const handleDownloadMix = useCallback(() => {
    if (!previewUrl) return
    const a = document.createElement('a')
    a.href = previewUrl; a.download = 'mixed_vocalstudio.wav'
    document.body.appendChild(a); a.click()
    setTimeout(() => document.body.removeChild(a), 100)
  }, [previewUrl])

  // ── Render ────────────────────────────────────────────
  const showUpload = !audioFile || isTranscribing
  const showModelDownload = modelStatus === 'downloading'

  return (
    <div className="app-container">
      <Header />

      {audioFile && !isTranscribing && <StepIndicator currentStep={currentStep} />}

      {(showUpload || showModelDownload) && (
        <UploadZone
          isTranscribing={isTranscribing}
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
          modelStatus={modelStatus}
          downloadProgress={downloadProgress}
          downloadFile={downloadFile}
        />
      )}

      {currentStep === 2 && audioFile && !isTranscribing && (
        <Step2Auto
          segments={segments}
          onTracksReady={handleTracksReady}
          onBack={() => { setAudioFile(null); setCurrentStep(1) }}
        />
      )}

      {currentStep === 4 && (
        <Step4
          waveformRef={waveformRef}
          isPlaying={isPlaying}
          isMixing={isMixing}
          previewUrl={previewUrl}
          baseVolume={baseVolume}
          duckVolume={duckVolume}
          setBaseVolume={setBaseVolume}
          setDuckVolume={setDuckVolume}
          addedTracks={addedTracks}
          segments={segments}
          isMusicDragging={isMusicDragging}
          isSfxDragging={isSfxDragging}
          setIsMusicDragging={setIsMusicDragging}
          setIsSfxDragging={setIsSfxDragging}
          manualMusicRef={manualMusicRef}
          manualSfxRef={manualSfxRef}
          onPlayPause={() => wavesurfer.current?.playPause()}
          onRender={generateMixPreview}
          onDownload={handleDownloadMix}
          onSeek={t => {
            if (wavesurfer.current) {
              wavesurfer.current.seekTo(t / wavesurfer.current.getDuration())
              wavesurfer.current.play()
            }
          }}
          onBack={() => setCurrentStep(3)}
          onAddTrack={handleAddTrack}
        />
      )}
    </div>
  )
}

export default App
