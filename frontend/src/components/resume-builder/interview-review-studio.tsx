"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import {
  Brain,
  Wand2,
  Loader2,
  X,
  Check,
  AlertCircle,
  Info,
  Settings as SettingsIcon,
  Mic,
  MicOff,
  FileText,
  ClipboardPaste,
  Upload,
  MessageCircleQuestion,
  Target,
  ListTodo,
  Sparkles,
  Copy,
  ShieldAlert,
} from "lucide-react";
import Link from "next/link";
import { loadAIRuntimeSettings } from "@/lib/ai-runtime-settings";
import { resolveActiveTextProvider } from "@/lib/github-distill/llm-resolver";
import { buildNormalizePrompt } from "@/lib/interview-review/normalize-prompt";
import { buildReviewPrompt } from "@/lib/interview-review/review-prompt";
import { parseNormalizedInterview, parseReviewReport } from "@/lib/interview-review/parse-review";
import { completeTextDirectly, directConsentId } from "@/lib/direct-text-provider";
import { canUseDirectByokInThisRuntime, isGithubPagesDeployment } from "@/lib/deployment-mode";
import {
  isLiveDictationSupported,
  startLiveDictation,
  getSttPrivacyNote,
  getAudioUploadGuidance,
  ACCEPTED_AUDIO_TYPES,
  MAX_AUDIO_BYTES,
  formatBytes,
  type LiveDictationHandle,
} from "@/lib/interview-review/speech-to-text";
import type {
  InterviewInputSource,
  InterviewReviewReport,
  NormalizedInterview,
  NormalizedTurn,
  ReviewActionItem,
} from "@/lib/interview-review/types";

interface InterviewReviewStudioProps {
  open: boolean;
  onClose: () => void;
  /** Optional pre-filled context (company/role) from the calling page. */
  targetRole?: string;
  targetCompany?: string;
}

type Stage = "idle" | "normalizing" | "normalized" | "reviewing" | "reviewed" | "error";

const SOURCE_META: Record<
  InterviewInputSource,
  { label: string; icon: typeof FileText; hint: string }
> = {
  recall: {
    label: "回忆记录",
    icon: Brain,
    hint: "凭记忆把面试内容写下来，语序乱也没关系，AI 会整理。",
  },
  transcript: {
    label: "会议转写",
    icon: ClipboardPaste,
    hint: "把腾讯会议 / 飞书妙记 / Otter 等 AI 会议纪要粘贴进来，复盘最准。",
  },
  audio: {
    label: "语音转写",
    icon: Mic,
    hint: "边说边听写，或上传音频后把转写文字粘贴进来。",
  },
};

const INTERVIEW_SYSTEM_PROMPT =
  "你是一名严谨的面试复盘助手，只依据用户给定的面试内容做整理与评估，绝不杜撰问题、答案或量化指标，并严格按要求输出单个 JSON 对象。";
const DIRECT_CONSENT_STORAGE_KEY = "synchire-pages-direct-provider-consent";

function InterviewReviewStudioBase({
  open,
  onClose,
  targetRole,
  targetCompany,
}: InterviewReviewStudioProps) {
  const [source, setSource] = useState<InterviewInputSource>("recall");
  const [rawText, setRawText] = useState("");
  const [role, setRole] = useState(targetRole ?? "");
  const [company, setCompany] = useState(targetCompany ?? "");
  const [focusNotes, setFocusNotes] = useState("");
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState("");
  const [normalized, setNormalized] = useState<NormalizedInterview | null>(null);
  const [report, setReport] = useState<InterviewReviewReport | null>(null);
  const [copied, setCopied] = useState(false);
  const [approvedConsent, setApprovedConsent] = useState("");

  // Live dictation state
  const dictRef = useRef<LiveDictationHandle | null>(null);
  const [dictating, setDictating] = useState(false);
  const dictSupported = isLiveDictationSupported();

  const provider = resolveActiveTextProvider(loadAIRuntimeSettings());
  const pagesMode = isGithubPagesDeployment();
  let consentId = "";
  try {
    consentId = provider.baseUrl ? directConsentId(provider) : "";
  } catch {
    consentId = "";
  }
  let providerHost = "未配置供应商";
  try {
    providerHost = provider.baseUrl ? new URL(provider.baseUrl).hostname : providerHost;
  } catch {
    // Invalid Base URL is handled by the direct adapter when the user submits.
  }
  const hasDirectConsent = !pagesMode || approvedConsent === consentId;

  useEffect(() => {
    if (!pagesMode || !consentId) return;
    setApprovedConsent(window.sessionStorage.getItem(DIRECT_CONSENT_STORAGE_KEY) ?? "");
  }, [pagesMode, consentId]);

  const reset = useCallback(() => {
    setStage("idle");
    setError("");
    setNormalized(null);
    setReport(null);
    setCopied(false);
  }, []);

  const handleClose = useCallback(() => {
    if (dictRef.current) {
      dictRef.current.stop();
      dictRef.current = null;
    }
    setDictating(false);
    reset();
    onClose();
  }, [onClose, reset]);

  const callApi = useCallback(
    async (
      bodySource: "normalize" | "review",
      payload: Record<string, unknown>,
    ) => {
      const provider = resolveActiveTextProvider(loadAIRuntimeSettings());
      if (!provider.configured) {
        setStage("error");
        setError(
          "尚未配置文本模型供应商。请先在「设置 → AI 运行时」中启用并填写 baseUrl 与模型。",
        );
        return null;
      }
      if (pagesMode) {
        if (!canUseDirectByokInThisRuntime()) {
          throw new Error("此页面不是安全 HTTPS 上下文，已禁止直接使用 API Key。");
        }
        if (!hasDirectConsent) {
          throw new Error("请先确认直连供应商与数据发送说明。");
        }
        if (bodySource === "normalize") {
          const input = payload.input as {
            source: InterviewInputSource;
            rawText: string;
            targetRole?: string;
            targetCompany?: string;
          };
          const raw = await completeTextDirectly({
            provider,
            systemPrompt: INTERVIEW_SYSTEM_PROMPT,
            userPrompt: buildNormalizePrompt(input),
          });
          const normalized = parseNormalizedInterview(raw);
          normalized.source = input.source;
          return { ok: true, normalized };
        }
        const input = payload.input as {
          source: InterviewInputSource;
          targetRole?: string;
          targetCompany?: string;
          focusNotes?: string;
        };
        const normalized = payload.normalized as NormalizedInterview;
        const raw = await completeTextDirectly({
          provider,
          systemPrompt: INTERVIEW_SYSTEM_PROMPT,
          userPrompt: buildReviewPrompt({
            normalized,
            targetRole: input.targetRole,
            targetCompany: input.targetCompany,
            focusNotes: input.focusNotes,
          }),
        });
        return { ok: true, report: parseReviewReport(raw) };
      }
      const res = await fetch("/api/interview-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          stage: bodySource,
          llm: {
            baseUrl: provider.baseUrl,
            apiKey: provider.apiKey,
            model: provider.model,
          },
        }),
      });
      const data = (await res.json().catch(() => null)) as
        | { ok: boolean; normalized?: NormalizedInterview; report?: InterviewReviewReport; error?: string }
        | null;
      if (!data || !data.ok) {
        throw new Error(data?.error || "处理失败，请重试。");
      }
      return data;
    },
    [hasDirectConsent, pagesMode],
  );

  const handleNormalize = useCallback(async () => {
    setError("");
    setNormalized(null);
    setReport(null);
    if (rawText.trim().length < 8) {
      setStage("error");
      setError("请先输入面试内容（至少 8 个字符）。");
      return;
    }
    setStage("normalizing");
    try {
      const data = await callApi("normalize", {
        input: { source, rawText: rawText.trim(), targetRole: role, targetCompany: company },
      });
      if (!data?.normalized) return;
      setNormalized(data.normalized);
      setStage("normalized");
    } catch (e) {
      setStage("error");
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [rawText, source, role, company, callApi]);

  const handleReview = useCallback(async () => {
    if (!normalized) return;
    setError("");
    setReport(null);
    setStage("reviewing");
    try {
      const data = await callApi("review", {
        input: { source, rawText: rawText.trim(), targetRole: role, targetCompany: company, focusNotes },
        normalized,
      });
      if (!data?.report) return;
      setReport(data.report);
      setStage("reviewed");
    } catch (e) {
      setStage("error");
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [normalized, source, rawText, role, company, focusNotes, callApi]);

  const handleToggleDictation = useCallback(() => {
    if (!dictSupported) return;
    if (dictating) {
      dictRef.current?.stop();
      dictRef.current = null;
      setDictating(false);
      return;
    }
    setError("");
    const note = getSttPrivacyNote();
    if (note === "uses-cloud-service") {
      // Inform but proceed; the user explicitly chose this path.
      setError("");
    }
    try {
      const handle = startLiveDictation({
        onChunk: (chunk) => {
          setRawText((prev) => (prev ? `${prev} ${chunk}` : chunk));
        },
        onError: (msg) => {
          setError(msg);
          setDictating(false);
          dictRef.current = null;
        },
      });
      dictRef.current = handle;
      handle.start();
      setDictating(true);
    } catch (e) {
      setStage("error");
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [dictating, dictSupported]);

  const handleCopyReport = useCallback(() => {
    if (!report || !normalized) return;
    const text = renderReportAsMarkdown(normalized, report, { role, company });
    navigator.clipboard?.writeText(text).then(
      () => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1800);
      },
      () => setError("复制失败，请手动选择文本复制。"),
    );
  }, [report, normalized, role, company]);

  if (!open) return null;

  const audioGuidance = getAudioUploadGuidance();

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="面试复盘"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-gray-900" />
            <h3 className="text-lg font-semibold text-gray-900">面试复盘</h3>
          </div>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600" aria-label="关闭">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Method note */}
          <div className="flex items-start gap-2 rounded-md bg-blue-50 border border-blue-200 text-blue-800 text-xs px-3 py-2">
            <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>
              两步走：先把乱序的面试内容<strong>整理</strong>成按顺序的问答对话，再让 AI 做<strong>复盘评估</strong>（7 维度评分 + STAR 缺口 + 改进清单）。
              一切结论只基于你输入的内容，AI 不会杜撰问题或答案。
            </span>
          </div>

          {/* Provider status */}
          <div className="flex items-center justify-between rounded-lg bg-gray-50 border border-gray-200 px-4 py-2.5">
            <div className="text-xs text-gray-600">
              <span className="font-medium text-gray-800">文本模型</span>
              <span className="mx-2 text-gray-300">·</span>
              <code className="text-gray-700">{provider.model || "未设置"}</code>
              <span className="mx-2 text-gray-300">·</span>
              Key {provider.apiKey ? "已配置" : "未配置"}
            </div>
            <Link
              href="/settings?tab=runtime"
              onClick={handleClose}
              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
            >
              <SettingsIcon className="h-3 w-3" /> 前往配置
            </Link>
          </div>

          {pagesMode ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
              <p>
                直连模式会把本次面试文本与 API Key 发送至 <strong>{providerHost}</strong>，
                使用模型 <code>{provider.model || "未设置"}</code>。SyncHire 不运行代理，也不会保存该 Key。
              </p>
              <p className="mt-2 text-xs text-amber-800">
                Key 仅保留在当前标签页；浏览器扩展、已被篡改的页面或不受信任设备不在此保护范围内。
              </p>
              <button
                type="button"
                disabled={!consentId || !canUseDirectByokInThisRuntime()}
                onClick={() => {
                  window.sessionStorage.setItem(DIRECT_CONSENT_STORAGE_KEY, consentId);
                  setApprovedConsent(consentId);
                }}
                className="mt-3 rounded-md bg-amber-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {hasDirectConsent ? "已确认直连说明" : "我理解并启用本供应商直连"}
              </button>
            </div>
          ) : null}

          {/* Input mode selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">1. 选择输入方式</label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(SOURCE_META) as InterviewInputSource[]).map((key) => {
                const meta = SOURCE_META[key];
                const Icon = meta.icon;
                const active = source === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSource(key)}
                    className={`flex flex-col items-start gap-1 rounded-lg border px-3 py-2.5 text-left transition ${
                      active
                        ? "border-blue-500 bg-blue-50 ring-1 ring-blue-200"
                        : "border-gray-200 hover:border-gray-300 bg-white"
                    }`}
                    aria-pressed={active}
                  >
                    <Icon className={`h-4 w-4 ${active ? "text-blue-600" : "text-gray-500"}`} />
                    <span className={`text-sm font-medium ${active ? "text-blue-700" : "text-gray-800"}`}>
                      {meta.label}
                    </span>
                    <span className="text-[11px] leading-snug text-gray-500">{meta.hint}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Context fields */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="ivr-role" className="block text-sm font-medium text-gray-700 mb-1.5">
                目标岗位（可选）
              </label>
              <input
                id="ivr-role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="如 高级前端工程师"
                className="w-full h-9 px-3 rounded-md border border-gray-200 text-sm focus:border-blue-400 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="ivr-company" className="block text-sm font-medium text-gray-700 mb-1.5">
                目标公司（可选）
              </label>
              <input
                id="ivr-company"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="如 字节跳动"
                className="w-full h-9 px-3 rounded-md border border-gray-200 text-sm focus:border-blue-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Source-specific guidance */}
          {source === "transcript" && (
            <div className="flex items-start gap-2 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-3 py-2">
              <ClipboardPaste className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>
                建议把腾讯会议 / 飞书妙记 / Otter.ai 等<strong>自带的 AI 会议纪要</strong>整段复制进来。
                这种带说话人、已分段的文本质量最高，AI 整理与复盘都更准。
              </span>
            </div>
          )}
          {source === "audio" && (
            <div className="space-y-3">
              <div className="flex items-start gap-2 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-xs px-3 py-2">
                <ShieldAlert className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>
                  {audioGuidance.body}
                  <br />
                  {audioGuidance.options.map((o, i) => (
                    <span key={i} className="block mt-1">
                      {i + 1}. {o}
                    </span>
                  ))}
                  上限 {formatBytes(MAX_AUDIO_BYTES)}。
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleToggleDictation}
                  disabled={!dictSupported}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium ${
                    dictSupported
                      ? dictating
                        ? "bg-red-600 text-white hover:bg-red-700"
                        : "bg-gray-900 text-white hover:bg-gray-800"
                      : "bg-gray-100 text-gray-400 cursor-not-allowed"
                  }`}
                  title={dictSupported ? "" : "当前浏览器不支持语音识别"}
                >
                  {dictating ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  {dictating ? "停止听写" : "开始边说边听写"}
                </button>
                <label className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer">
                  <Upload className="h-4 w-4" />
                  选择音频文件
                  <input
                    type="file"
                    accept={ACCEPTED_AUDIO_TYPES}
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      if (f.size > MAX_AUDIO_BYTES) {
                        setError(`音频过大（${formatBytes(f.size)}），请压缩到 ${formatBytes(MAX_AUDIO_BYTES)} 以内。`);
                        return;
                      }
                      setError(
                        `已选择「${f.name}」。浏览器无法直接转写音频文件，请用腾讯会议/飞书妙记/Otter/Whisper 转成文字后粘贴到下方，或外放该音频并用「开始边说边听写」捕获。`,
                      );
                    }}
                  />
                </label>
                {!dictSupported && (
                  <span className="text-[11px] text-gray-400">
                    当前浏览器不支持实时听写，请用 Chrome / Edge。
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Raw text input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="ivr-raw" className="block text-sm font-medium text-gray-700">
                2. {SOURCE_META[source].label}内容
              </label>
              <span className="text-[11px] text-gray-400">{rawText.length} 字</span>
            </div>
            <textarea
              id="ivr-raw"
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              rows={6}
              placeholder={
                source === "recall"
                  ? "想到什么写什么，乱序、跳跃都可以。例如：面试官问了项目里最难的部分…然后让我设计一个短链系统…我答得不太好…最后问我有什么问题"
                  : source === "transcript"
                    ? "直接粘贴会议纪要全文，最好带说话人和时间戳…"
                    : "把转写后的文字粘贴在这里（或点上方「开始边说边听写」实时输入）…"
              }
              className="w-full px-3 py-2 rounded-md border border-gray-200 text-sm leading-relaxed focus:border-blue-400 focus:outline-none resize-y"
            />
          </div>

          {/* Error */}
          {error && stage === "error" && (
            <div className="flex items-start gap-2 rounded-md bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {error && stage !== "error" && (
            <div className="flex items-start gap-2 rounded-md bg-amber-50 border border-amber-200 text-amber-700 text-xs px-3 py-2">
              <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleNormalize}
              disabled={stage === "normalizing" || stage === "reviewing" || rawText.trim().length < 8}
              className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-blue-300"
            >
              {stage === "normalizing" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
              {normalized ? "重新整理" : "① 整理对话"}
            </button>
            {normalized && (
              <button
                type="button"
                onClick={handleReview}
                disabled={stage === "reviewing"}
                className="inline-flex items-center gap-1.5 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:bg-gray-400"
              >
                {stage === "reviewing" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
                ② 生成复盘报告
              </button>
            )}
            {(normalized || report) && (
              <button
                type="button"
                onClick={reset}
                className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                清空结果
              </button>
            )}
          </div>

          {/* Normalized preview */}
          {normalized && (
            <NormalizedPreview normalized={normalized} />
          )}

          {/* Focus notes (only after normalized) */}
          {normalized && !report && (
            <div>
              <label htmlFor="ivr-focus" className="block text-sm font-medium text-gray-700 mb-1.5">
                特别想听反馈的点（可选）
              </label>
              <input
                id="ivr-focus"
                value={focusNotes}
                onChange={(e) => setFocusNotes(e.target.value)}
                placeholder="如：系统设计那题答得不好，想重点看怎么改"
                className="w-full h-9 px-3 rounded-md border border-gray-200 text-sm focus:border-blue-400 focus:outline-none"
              />
            </div>
          )}

          {/* Review report */}
          {report && (
            <ReportView
              report={report}
              copied={copied}
              onCopy={handleCopyReport}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ---- Sub-views (kept in-file to avoid an extra round-trip) ----

function NormalizedPreview({ normalized }: { normalized: NormalizedInterview }) {
  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden">
      <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 border-b border-gray-100">
        <Check className="h-4 w-4 text-emerald-600" />
        <span className="text-sm font-medium text-gray-800">已整理为 {normalized.turns.length} 轮对话</span>
        <span className="ml-auto text-[11px] text-gray-400">可核对后再生成复盘报告</span>
      </div>
      <ol className="divide-y divide-gray-100 max-h-72 overflow-auto">
        {normalized.turns.map((t) => (
          <TurnRow key={t.order} turn={t} />
        ))}
      </ol>
      {normalized.summary && (
        <div className="px-3 py-2 bg-blue-50/50 text-xs text-gray-600 border-t border-gray-100">
          <span className="font-medium text-gray-700">概述：</span>
          {normalized.summary}
        </div>
      )}
      {normalized.unresolved.length > 0 && (
        <div className="px-3 py-2 bg-amber-50 text-xs text-amber-700 border-t border-amber-100">
          <span className="font-medium">存疑（未纳入评分）：</span>
          {normalized.unresolved.map((u, i) => (
            <span key={i} className="block">· {u}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function TurnRow({ turn }: { turn: NormalizedTurn }) {
  const speakerStyle =
    turn.speaker === "interviewer"
      ? "bg-blue-100 text-blue-700"
      : turn.speaker === "candidate"
        ? "bg-emerald-100 text-emerald-700"
        : "bg-gray-100 text-gray-500";
  const speakerLabel =
    turn.speaker === "interviewer" ? "面试官" : turn.speaker === "candidate" ? "我" : "未明";
  return (
    <li className="px-3 py-2.5">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[11px] font-mono text-gray-400">#{turn.order}</span>
        <span className={`text-[10px] px-1.5 py-0.5 rounded ${speakerStyle}`}>{speakerLabel}</span>
        <span className="text-xs text-gray-600">{turn.topic}</span>
        {turn.note && <span className="text-[10px] text-amber-600">⚠ {turn.note}</span>}
      </div>
      <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{turn.text}</p>
    </li>
  );
}

const DIMENSION_LABEL: Record<string, string> = {
  technical: "技术深度",
  behavioral: "行为表达",
  communication: "沟通表达",
  roleFit: "岗位匹配",
  reverseQuestions: "反向提问",
  nonVerbal: "非语言",
  mindset: "心态",
};

const PRIORITY_STYLE: Record<string, string> = {
  high: "bg-red-100 text-red-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-gray-100 text-gray-600",
};

const PRIORITY_LABEL: Record<string, string> = {
  high: "高",
  medium: "中",
  low: "低",
};

function ReportView({
  report,
  copied,
  onCopy,
}: {
  report: InterviewReviewReport;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="space-y-4">
      {/* Verdict */}
      <div className="rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-semibold text-gray-900">复盘结论</span>
          </div>
          <div className="flex items-center gap-2">
            <ScoreBadge score={report.overallScore} />
            <button
              type="button"
              onClick={onCopy}
              className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
            >
              {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
              {copied ? "已复制" : "复制全文"}
            </button>
          </div>
        </div>
        <p className="text-sm text-gray-700 leading-relaxed">{report.verdict}</p>
        {report.caveats.length > 0 && (
          <div className="mt-2 text-xs text-amber-700">
            {report.caveats.map((c, i) => (
              <span key={i} className="block">· {c}</span>
            ))}
          </div>
        )}
      </div>

      {/* Dimensions */}
      {report.dimensions.length > 0 && (
        <Section icon={Target} title="七维度评分">
          <div className="grid sm:grid-cols-2 gap-2">
            {report.dimensions.map((d) => (
              <div key={d.dimension} className="rounded-md border border-gray-100 p-2.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-800">
                    {DIMENSION_LABEL[d.dimension] ?? d.dimension}
                  </span>
                  <ScoreBadge score={d.score} small />
                </div>
                <p className="text-xs text-gray-600 mb-1">{d.rationale}</p>
                <p className="text-xs text-blue-700">建议：{d.suggestion}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* STAR gaps */}
      {report.starGaps.length > 0 && (
        <Section icon={MessageCircleQuestion} title="STAR 缺口">
          <ul className="space-y-2">
            {report.starGaps.map((g, i) => (
              <li key={i} className="rounded-md bg-gray-50 p-2.5 text-sm">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-gray-800">{g.topic}</span>
                  <span className="text-xs text-red-600">缺 {g.missing.join("/") || "?"}</span>
                </div>
                <p className="text-xs text-gray-600">{g.fix}</p>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Action items */}
      {report.actionItems.length > 0 && (
        <Section icon={ListTodo} title="改进清单">
          <ul className="space-y-1.5">
            {report.actionItems.map((a: ReviewActionItem, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span
                  className={`mt-0.5 text-[10px] px-1.5 py-0.5 rounded ${PRIORITY_STYLE[a.priority] ?? PRIORITY_STYLE.medium}`}
                >
                  {PRIORITY_LABEL[a.priority] ?? a.priority}
                </span>
                <span className="text-gray-700">{a.text}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Highlights */}
      {report.highlights.length > 0 && (
        <Section icon={Sparkles} title="值得复用的好答案">
          <ul className="space-y-1.5">
            {report.highlights.map((h, i) => (
              <li key={i} className="text-sm text-gray-700">
                <span className="font-medium text-gray-800">{h.topic}：</span>
                {h.text}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Follow-up topics */}
      {report.followUpTopics.length > 0 && (
        <Section icon={Brain} title="下一轮前复习主题">
          <div className="flex flex-wrap gap-1.5">
            {report.followUpTopics.map((t, i) => (
              <span key={i} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                {t}
              </span>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Target;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <Icon className="h-4 w-4 text-gray-500" />
        <h4 className="text-sm font-semibold text-gray-900">{title}</h4>
      </div>
      {children}
    </div>
  );
}

function ScoreBadge({ score, small }: { score: number; small?: boolean }) {
  const tone =
    score >= 4 ? "bg-emerald-100 text-emerald-700" : score >= 3 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700";
  return (
    <span
      className={`inline-flex items-center font-mono font-semibold rounded ${tone} ${small ? "text-xs px-1.5 py-0.5" : "text-sm px-2 py-0.5"}`}
    >
      {score}/5
    </span>
  );
}

function renderReportAsMarkdown(
  normalized: NormalizedInterview,
  report: InterviewReviewReport,
  ctx: { role?: string; company?: string },
): string {
  const lines: string[] = [];
  const head = ctx.role || ctx.company ? ` (${[ctx.company, ctx.role].filter(Boolean).join(" · ")})` : "";
  lines.push(`# 面试复盘报告${head}`);
  lines.push("");
  lines.push(`**整体评分：${report.overallScore}/5**`);
  lines.push("");
  lines.push(report.verdict);
  lines.push("");
  if (report.caveats.length) {
    lines.push("> 局限：" + report.caveats.join("；"));
    lines.push("");
  }
  if (report.dimensions.length) {
    lines.push("## 七维度评分");
    for (const d of report.dimensions) {
      lines.push(`- **${DIMENSION_LABEL[d.dimension] ?? d.dimension} ${d.score}/5** — ${d.rationale} → 建议：${d.suggestion}`);
    }
    lines.push("");
  }
  if (report.starGaps.length) {
    lines.push("## STAR 缺口");
    for (const g of report.starGaps) {
      lines.push(`- ${g.topic}（缺 ${g.missing.join("/") || "?"}）：${g.fix}`);
    }
    lines.push("");
  }
  if (report.actionItems.length) {
    lines.push("## 改进清单");
    for (const a of report.actionItems) {
      lines.push(`- [${PRIORITY_LABEL[a.priority] ?? a.priority}] ${a.text}`);
    }
    lines.push("");
  }
  if (report.highlights.length) {
    lines.push("## 值得复用的好答案");
    for (const h of report.highlights) lines.push(`- ${h.topic}：${h.text}`);
    lines.push("");
  }
  if (report.followUpTopics.length) {
    lines.push("## 下一轮前复习主题");
    lines.push(report.followUpTopics.join("、"));
    lines.push("");
  }
  lines.push("---");
  lines.push("## 整理后的对话（供参考）");
  for (const t of normalized.turns) {
    const sp = t.speaker === "interviewer" ? "面试官" : t.speaker === "candidate" ? "我" : "未明";
    lines.push(`${t.order}. [${sp} · ${t.topic}] ${t.text}`);
  }
  return lines.join("\n");
}

export const InterviewReviewStudio = memo(InterviewReviewStudioBase);
