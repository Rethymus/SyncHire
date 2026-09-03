# Design Ethics — 求职进度 / Rejection Recovery

> Scope: the 求职进度 (`frontend/src/app/progress/`) page, its components
> (`frontend/src/components/progress/`), the rejection-recovery card
> (`frontend/src/components/rejection-recovery-card.tsx`), the pure
> aggregation model (`frontend/src/lib/progress-model.ts`), and the
> `rejectionRecovery` slice in `frontend/src/lib/store.ts`.

## 1. What this is — and is not

SyncHire Lite's progress features are **evidence-informed UI design
choices**, built on public, peer-reviewed research about job search
behaviour. They are **not** a clinical intervention, not therapy, and not a
mental-health product.

- The product MUST NOT claim to improve mental health, treat distress, or
  replace professional support.
- Research findings below describe what worked in **facilitated
  interventions** (workshops, counsellor-led programs). A UI feature that
  borrows their structure inherits none of their guarantees; we borrow
  structure and tone only.
- No feature frames itself as psychological care. The 暂停休息 choice in the
  recovery card links to rest, not to any clinical resource claim; if the
  product ever adds wellbeing resources, they must be real, local, and
  reviewed — never decorative.

## 2. Evidence table

All citations verified against Crossref (publisher metadata); DOIs resolve.

| # | Source (full citation) | Key finding we rely on | Shipped UI decision |
|---|---|---|---|
| 1 | Liu, S., Huang, J. L., & Wang, M. (2014). *Effectiveness of job search interventions: A meta-analytic review.* Psychological Bulletin, 140(4), 1009–1041. https://doi.org/10.1037/a0035923 | Job-search interventions improve employment odds mainly through **skill building and self-efficacy** — i.e. process, not outcome feedback. | The hero metric and weekly chart count **controllable process actions** (新增申请 / 标记投递 / 推进面试). Outcomes are never the headline number. |
| 2 | Wanberg, C. R., Zhu, J., & van Hooft, E. A. J. (2010). *The job search grind: Perceived progress, self-reactions, and self-regulation of search effort.* Academy of Management Journal, 53(4), 788–807. https://doi.org/10.5465/amj.2010.52814599 | **Perceived progress** sustains self-regulated search effort; blocked progress feeds negative emotion and withdrawal. | Weekly framing (ISO-week buckets, "本周行动"), plus a visible but neutral status distribution so progress is perceivable without ranking the user against a norm. No "days since last action" counters. |
| 3 | Vinokur, A. D., & Schul, Y. (1997). *Mastery and inoculation against setbacks as active ingredients in the JOBS intervention for the unemployed.* Journal of Consulting and Clinical Psychology, 65(5), 867–877. https://doi.org/10.1037/0022-006X.65.5.867 | "Inoculation against setbacks" — anticipating setbacks and pre-planning responses — was an **active ingredient** of the JOBS intervention. | The `RejectionRecoveryCard` micro-flow: three reflection prompts (哪些是可控的？哪些不可控？下一步最小的一个行动是什么？) followed by one small, chosen next step. |
| 4 | Caplan, R. D., Vinokur, A. D., Price, R. H., & Van Ryn, M. (1989). *Job seeking, reemployment, and mental health: A randomized field experiment in coping with job loss.* Journal of Applied Psychology, 74(5), 759–769. https://doi.org/10.1037/0021-9010.74.5.759 | The original **randomized field experiment** behind the JOBS program: the intervention improved reemployment and buffered mental-health effects of job loss. | Cited as the evidentiary basis of the recovery flow's structure (#3). The UI deliberately imitates the flow, and the doc records that the clinical effects came from the full facilitated program, not from a card. |
| 5a | Vansteenkiste, M., Lens, W., De Witte, S., De Witte, H., & Deci, E. L. (2004). *The "why" and "why not" of job search behaviour: Their relation to searching, unemployment experience, and well-being.* European Journal of Social Psychology, 34(3), 345–363. https://doi.org/10.1002/ejsp.202 | **Autonomous** job-search motivation (own goals) predicted more searching and better well-being than controlled motivation (pressure, shame). | Autonomy-supportive copy everywhere: choices are *offered* ("可以从这里挑一个（也可以都不挑）"), never commanded. 暂停休息 is a first-class, valid choice. |
| 5b | Vansteenkiste, M., Lens, W., De Witte, H., & Feather, N. T. (2005). *Understanding unemployed people's job search behaviour, unemployment experience and well-being: A comparison of expectancy-value theory and self-determination theory.* British Journal of Social Psychology, 44(2), 269–287. https://doi.org/10.1348/014466604X17641 | Replicated/extended the self-determination account: pressure-based reasons correlate with worse experience; self-endorsed reasons with persistence. | Same as 5a; reinforced the "no deadline pressure, no guilt" copy rule (no 倒计时， no "还剩 N 天"). |
| 5c | Ryan, R. M., & Deci, E. L. (2000). *Self-determination theory and the facilitation of intrinsic motivation, social development, and well-being.* American Psychologist, 55(1), 68–78. https://doi.org/10.1037/0003-066X.55.1.68 | Foundational SDT statement: autonomy support fosters internalization and sustained behaviour; controlling environments undermine it. | The copy rules in §3 are derived from autonomy support: informational tone, choice architecture, no evaluative language about the person. |

## 3. Copy rules (do / don't)

Hard requirement for the progress page and recovery card. Chinese primary;
English glosses for review convenience.

| Don't (forbidden) | Do (shipped) | Why |
|---|---|---|
| 「落后」「你已 X 天未行动」「别再拖延」 | 「本周行动 N 次」「多少算够、什么时候行动，节奏由你决定。」 | Time-since counters create controlled pressure (SDT, 5a/5b/5c) and shame rather than perceived progress (2). |
| Outcome verdicts: 「被淘汰」「又挂了」「成功率很低」 | 「已拒绝」「已撤回」「各条申请现在的位置，只是记录。」 | Statuses are recorded facts about a match, not verdicts about the person; monochrome distribution avoids coloring rejection as failure (1, 2). |
| Percentages / benchmarks: 「转化率仅 5%，低于平均」 | 「面试转化：x/y · 有回应：x/y」＋「这些数字只是记录，不是评分。」 | Raw counts inform without ranking; denominators the user can't control (employer processes) stay out of the frame (2, 5a). |
| Commands: 「你必须每天投 10 份」「快去跟进」 | 「如果想迈一小步，可以从这里挑一个（也可以都不挑）」 | Autonomy support: options with reasons, choice always including "not now" (5a/5c). |
| Empty-state guilt: 「你的进度是空的」 | 「一个具体的开始：去岗位信息流挑一个感兴趣的职位…」 | Concrete first action instead of judgment (1). |
| Fake positivity: 「被拒是好事！」 | 「结果已经发生，它说明的是这一次的匹配情况。」 | Honest, non-evaluative framing; positivity theatre reads as controlling (5a). |
| Clinical claims: 「本功能缓解求职焦虑」 | Scope note in §1 only. | Not therapy; no mental-health claims (§1). |

Additional enforced mechanics:

- The ring fill is **self-referential** (this week vs the busiest week in
  the visible window). There is no fixed quota, so no "behind schedule"
  state can exist.
- Rates stay `暂无数据` until at least one application has actually been
  applied — a fresh user never sees "0%".
- `withdrawn` (user's own choice) gets the same neutral card as `rejected`;
  the copy contains no implication that withdrawing was wrong.

## 4. Data honesty notes (implementation-level)

- The page reads the **lite store** (`useAppStore().applications`) — the same
  source every other lite page reads — through the pure
  `storeApplicationToProgress` adapter. Earlier drafts fetched the envelope
  API instead, which meant applications created anywhere in the UI were
  invisible here (the store is the only write path for application
  creation); the visual walkthrough on 2026-09-04 caught the split.
- The adapter maps the store's legacy 7-value status union into the real
  12-value `ApplicationStatus` space: `draft→saved`, `optimized→
  materials_ready`, `pending→submitted`; the rest map 1:1. Unknown values
  fall back to `saved` rather than dropping the record (a dropped record
  would silently understate the totals).
- `progress-model.ts` reads **only fields that exist on `LiteApplication`**
  (openapi `ApplicationResponse`) or on the adapter output:
  `created_at`, `applied_date`, `submitted_manually_at`, `updated_at`,
  `last_updated`, `status`.
- Unknown stays unknown: missing/invalid timestamps contribute no activity;
  rates are `null` with a zero denominator (never rendered as 0%).
- Two documented approximations (the API exposes no transition timestamps;
  the store has none either):
  - "标记投递" falls back to `updated_at` only when the current status
    proves the application was sent out.
  - "推进面试" is dated by `last_updated`/`updated_at` for applications
    **currently** in an interview stage. Interview activity that has since
    moved on is not dated anywhere on the application object, so it is not
    counted in the weekly chart; it still shows in the status distribution
    and in 面试转化 via status.
- The status distribution uses the real 12-value `ApplicationStatus` enum
  (`saved` … `withdrawn`). There is no "closed" value; `rejected` and
  `withdrawn` are the terminal closed-out statuses and trigger the recovery
  card.

### 4.1 Consistency rule for the analytics page

The same "unknown ≠ zero" rule applies to `/analytics`: its rate cards
render 暂无数据 ("no data yet") while their denominator is zero, never
"0%". The outcome-framed label was also softened to 面试转化 ("interview
conversion") to match the neutral voice of the progress page.

## 5. Honest limits

1. **Population transfer.** The cited studies mostly cover unemployed
   job seekers in facilitated programs (JOBS I/II, US/EU samples, 1989–2010).
   SyncHire serves employed and student job seekers using a tool. Findings
   are directional, not guaranteed to transfer.
2. **Dosage.** JOBS-style effects came from multi-session workshops with
   trained facilitators. A page and a card are orders of magnitude lighter;
   we claim tone and structure alignment, not effect parity.
3. **Measurement.** Our "action" counts are proxies (records the user
   happens to keep), not validated behavioural measures; they can be
   under- or over-counted by data entry.
4. **No outcome promises.** The product never states or implies that using
   these features increases hiring odds, and must not add such claims later
   without new evidence.
5. **Not wellbeing support.** If a user is in distress, the right route is
   people and professional services — not this tool. The product must not
   position itself between the two.
