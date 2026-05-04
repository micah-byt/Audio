/**
 * whisper.worker.js
 * Runs Whisper STT inside a Web Worker so the UI never freezes.
 */
import { pipeline, env } from '@huggingface/transformers'

// Use WASM backend, cache models in browser IndexedDB
env.allowLocalModels = false
env.useBrowserCache = true

let transcriber = null

async function loadModel(onProgress) {
  if (transcriber) return

  transcriber = await pipeline('automatic-speech-recognition', 'onnx-community/whisper-tiny', {
    dtype: { encoder_model: 'fp32', decoder_model_merged: 'q4' },
    progress_callback: (info) => {
      if (info.status === 'downloading') {
        onProgress({
          type: 'download',
          file: info.file,
          loaded: info.loaded,
          total: info.total,
        })
      }
      if (info.status === 'initiate') {
        onProgress({ type: 'initiate', file: info.file })
      }
      if (info.status === 'done') {
        onProgress({ type: 'file_done', file: info.file })
      }
    },
  })
}

self.onmessage = async (e) => {
  const { type, audio, language } = e.data

  if (type === 'load') {
    try {
      await loadModel((progress) => self.postMessage({ type: 'progress', ...progress }))
      self.postMessage({ type: 'ready' })
    } catch (err) {
      self.postMessage({ type: 'error', message: err.message })
    }
    return
  }

  if (type === 'transcribe') {
    try {
      if (!transcriber) {
        await loadModel((progress) => self.postMessage({ type: 'progress', ...progress }))
        self.postMessage({ type: 'ready' })
      }

      self.postMessage({ type: 'transcribing' })

      const result = await transcriber(audio, {
        language: language || 'korean',
        task: 'transcribe',
        return_timestamps: true,
        chunk_length_s: 30,
        stride_length_s: 5,
      })

      // Convert chunks to segments format (matching old backend response)
      const segments = (result.chunks || []).map((chunk, idx) => ({
        id: idx,
        start: chunk.timestamp[0] ?? 0,
        end: chunk.timestamp[1] ?? (chunk.timestamp[0] + 3),
        text: chunk.text.trim(),
      })).filter(s => s.text.length > 0)

      self.postMessage({
        type: 'result',
        text: result.text,
        segments,
      })
    } catch (err) {
      self.postMessage({ type: 'error', message: err.message })
    }
  }
}
