import { pipeline, env } from '@huggingface/transformers'

env.allowLocalModels = false
env.useBrowserCache = true

let transcriber = null
let loadPromise = null  // 동시 로딩 방지 — 여러 호출이 같은 Promise를 기다림

function withTimeout(ms, promise) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), ms)),
  ])
}

async function clearIDBCache() {
  try {
    const dbs = await indexedDB.databases?.() ?? []
    await Promise.all(dbs.map(db => new Promise(res => {
      const r = indexedDB.deleteDatabase(db.name); r.onsuccess = r.onerror = res
    })))
  } catch (_) {}
}

function buildPipeline(onProgress) {
  return pipeline('automatic-speech-recognition', 'onnx-community/whisper-tiny', {
    dtype: { encoder_model: 'fp32', decoder_model_merged: 'q4' },
    progress_callback: (info) => {
      if (info.status === 'initiate') onProgress({ type: 'initiate', file: info.file })
      if (info.status === 'downloading') onProgress({ type: 'download', file: info.file, loaded: info.loaded, total: info.total })
      if (info.status === 'done') onProgress({ type: 'file_done', file: info.file })
    },
  })
}

async function ensureModel(onProgress) {
  if (transcriber) return

  if (!loadPromise) {
    loadPromise = (async () => {
      try {
        // 1차 시도: 캐시 사용, 60초 타임아웃
        transcriber = await withTimeout(60_000, buildPipeline(onProgress))
      } catch {
        // 실패(타임아웃 포함) → 캐시 삭제 후 재다운로드
        onProgress({ type: 'initiate', file: '캐시 초기화 후 재다운로드 중...' })
        await clearIDBCache()
        env.useBrowserCache = false
        transcriber = await withTimeout(180_000, buildPipeline(onProgress))
        env.useBrowserCache = true
      }
    })().catch(err => {
      loadPromise = null  // 실패 시 다음 호출에서 재시도 가능하도록
      throw err
    })
  }

  await loadPromise
}

self.onmessage = async (e) => {
  const { type, audio, language } = e.data
  const notify = (progress) => self.postMessage({ type: 'progress', ...progress })

  if (type === 'load') {
    try {
      await ensureModel(notify)
      self.postMessage({ type: 'ready' })
    } catch (err) {
      self.postMessage({ type: 'error', message: `모델 로딩 실패: ${err.message}` })
    }
    return
  }

  if (type === 'transcribe') {
    try {
      await ensureModel(notify)
      self.postMessage({ type: 'ready' })
      self.postMessage({ type: 'transcribing' })

      const result = await withTimeout(3 * 60_000, transcriber(audio, {
        language: language || 'korean',
        task: 'transcribe',
        return_timestamps: true,
        chunk_length_s: 30,
        stride_length_s: 5,
      }))

      const segments = (result.chunks || []).map((chunk, idx) => ({
        id: idx,
        start: chunk.timestamp[0] ?? 0,
        end: chunk.timestamp[1] ?? (chunk.timestamp[0] + 3),
        text: chunk.text.trim(),
      })).filter(s => s.text.length > 0)

      self.postMessage({ type: 'result', text: result.text, segments })
    } catch (err) {
      self.postMessage({
        type: 'error',
        message: err.message === 'TIMEOUT' ? '처리 시간 초과. 취소 후 다시 시도해주세요.' : err.message,
      })
    }
  }
}
