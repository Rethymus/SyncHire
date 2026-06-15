/**
 * Browser-native speech-to-text for the interview-review "audio" input mode.
 *
 * Two strategies, both **client-only** (no audio leaves the browser for the
 * transcription step; only the resulting text is sent to the model via the
 * /api/interview-review route, the same as recall/transcript):
 *
 *   1. **Live dictation** — `SpeechRecognition` (W3C Web Speech API). Zero
 *      dependencies, zero upload, on-device-ish (Chrome uses Google's service;
 *      the user is told this in `getSttPrivacyNote`). This is the "plugin"
 *      path the spec calls for: the browser IS the speech plugin.
 *   2. **Pre-recorded audio file** — Web Speech API cannot transcribe an
 *      arbitrary uploaded file, so for an uploaded file we guide the user to
 *      paste the transcript (from Tencent Meeting / 飞书妙记 / Otter / Whisper
 *      etc.) OR we let them play the file out loud while live-dictation
 *      captures it. `getAudioUploadGuidance()` returns the copy.
 *
 * Everything here is SSR-safe (guards `typeof window`) and capability-detecting.
 * The types below are minimal because the Web Speech API is not in TS's DOM lib.
 */

/** True when live dictation is available in the current browser. */
export function isLiveDictationSupported(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as unknown as {
    SpeechRecognition?: unknown;
    webkitSpeechRecognition?: unknown;
  };
  return Boolean(w.SpeechRecognition || w.webkitSpeechRecognition);
}

export type SttPrivacyNote =
  | "on-device-safe"
  | "uses-cloud-service"
  | "unsupported";

/**
 * Which privacy posture the live-dictation path implies. We surface this so the
 * user can make an informed choice before dictating sensitive interview audio.
 */
export function getSttPrivacyNote(): SttPrivacyNote {
  if (!isLiveDictationSupported()) return "unsupported";
  if (typeof navigator !== "undefined" && /firefox/i.test(navigator.userAgent)) {
    // Firefox lacks the API; if we got here it's likely a polyfill — assume cloud.
    return "uses-cloud-service";
  }
  // Chrome/Edge route recognition through a cloud service by default.
  return "uses-cloud-service";
}

export interface LiveDictationOptions {
  /** BCP-47 tag, e.g. "zh-CN", "en-US". Defaults to navigator.language. */
  lang?: string;
  /** Called with each finalized chunk of recognized text. */
  onChunk: (text: string) => void;
  /** Called when the engine stops (manual or end-of-speech). */
  onEnd?: () => void;
  /** Called on any recognition error with a human-readable message. */
  onError?: (message: string) => void;
}

export interface LiveDictationHandle {
  start: () => void;
  stop: () => void;
}

/**
 * Start a continuous live-dictation session. Returns a handle to stop it.
 * Throws if the API is unavailable — callers must guard with
 * {@link isLiveDictationSupported} first. The session auto-restarts on
 * end-of-speech to keep capturing across pauses (mirrors the standard
 * "keep alive" pattern for long dictation).
 */
export function startLiveDictation(opts: LiveDictationOptions): LiveDictationHandle {
  const w = window as unknown as {
    SpeechRecognition?: { new (): SpeechRecognitionLike };
    webkitSpeechRecognition?: { new (): SpeechRecognitionLike };
  };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  if (!Ctor) {
    throw new Error("当前浏览器不支持语音识别（Web Speech API）。");
  }

  const recognition = new Ctor();
  recognition.lang = opts.lang ?? (typeof navigator !== "undefined" ? navigator.language : "zh-CN");
  recognition.continuous = true;
  recognition.interimResults = false;

  let running = false;

  recognition.onresult = (event: SpeechRecognitionEventLike) => {
    let chunk = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      if (result.isFinal) {
        chunk += result[0].transcript;
      }
    }
    if (chunk.trim()) opts.onChunk(chunk.trim());
  };

  recognition.onerror = (event: SpeechRecognitionErrorLike) => {
    const map: Record<string, string> = {
      "no-speech": "未检测到语音，请重试。",
      "audio-capture": "无法访问麦克风，请检查权限。",
      "not-allowed": "麦克风权限被拒绝，请在浏览器设置中允许。",
      network: "网络异常，语音识别失败。",
      aborted: "语音识别已中止。",
    };
    opts.onError?.(map[event.error] ?? `语音识别出错：${event.error}`);
  };

  recognition.onend = () => {
    // Auto-restart while the user still wants to dictate, so long pauses
    // (which fire onend) don't silently end the session.
    if (running) {
      try {
        recognition.start();
      } catch {
        // start() throws if already starting; ignore the race.
      }
    } else {
      opts.onEnd?.();
    }
  };

  return {
    start: () => {
      running = true;
      try {
        recognition.start();
      } catch {
        // already started — ignore
      }
    },
    stop: () => {
      running = false;
      try {
        recognition.stop();
      } catch {
        // ignore
      }
    },
  };
}

/**
 * Guidance copy for the "upload an audio file" path. Web Speech API can't read
 * an arbitrary file, so we offer two honest options and never pretend to
 * transcribe locally.
 */
export function getAudioUploadGuidance(): {
  heading: string;
  body: string;
  options: string[];
} {
  return {
    heading: "音频转写说明",
    body:
      "浏览器原生语音识别无法直接读取你上传的音频文件。请二选一来获得最准确的转写文本，再交给 AI 整理复盘：",
    options: [
      "把音频放进腾讯会议 / 飞书妙记 / Otter.ai / OpenAI Whisper 等工具转写，然后把文字粘贴到「转写文本」框（推荐，准确率最高）。",
      "或者点击「边播放边听写」：让音频外放，浏览器会实时把声音转成文字（适合短音频，长音频建议用上一条）。",
    ],
  };
}

/** Accepted audio MIME types for the upload affordance. */
export const ACCEPTED_AUDIO_TYPES =
  "audio/*,.mp3,.wav,.m4a,.webm,.ogg,.flac,.aac";
export const MAX_AUDIO_BYTES = 50 * 1024 * 1024; // 50 MB upload guard

/** Format bytes as a human-readable size for the upload hint. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ---- Minimal Web Speech API type shims (not in TS's DOM lib) ----

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: (event: SpeechRecognitionEventLike) => void;
  onerror: (event: SpeechRecognitionErrorLike) => void;
  onend: () => void;
  start(): void;
  stop(): void;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    0: { transcript: string };
  }>;
}

interface SpeechRecognitionErrorLike {
  error: string;
}
