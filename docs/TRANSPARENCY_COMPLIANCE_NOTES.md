# Transparency & Compliance Notes (SyncHire Lite)

Design-anchor mapping from product features to the legal provisions that
motivated them. **Scope caveat:** this is an internal design record, not legal
advice. Only the citations listed below are used; do not extend this table
without verifying new provisions against the listed sources.

Regulations referenced (no other legal citations are used in this document):

- **EU AI Act** — Regulation (EU) 2024/1689.
  Sources: [AI Act Explorer, artificialintelligenceact.eu](https://artificialintelligenceact.eu/)
  (machine-generated from the Official Journal text); European Commission AI Act
  policy page ([digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai](https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai)).
- **China PIPL** — Personal Information Protection Law, Art. 24 (automated
  decision-making). Source: Stanford DigiChina translation
  ([digichina.stanford.edu](https://digichina.stanford.edu/)).

## Feature → design anchor → source mapping

| # | Feature / design decision | Design anchor | Why it applies (summary) | Source |
|---|---------------------------|---------------|--------------------------|--------|
| 1 | Product positioning: job-**seeker**-side personal tool, used in a personal, non-professional capacity | EU AI Act Art. 3(4) — "deployer" definition, with carve-out for persons using an AI system in a personal non-professional activity | A private job seeker optimizing their own resume is generally outside the "deployer" obligations the AI Act attaches to professional use | AI Act Explorer (artificialintelligenceact.eu) |
| 2 | "AI 优化" badge (`frontend/src/components/ai-assisted-badge.tsx`) on every AI-optimized resume output, with the standing hint "由 AI 生成/优化，内容请人工复核" | EU AI Act Art. 50(1), Art. 50(5) | Inform persons interacting with AI systems that they are doing so; disclosure must be clear and distinguishable at first interaction — the badge renders inline wherever AI output is shown | AI Act Explorer (artificialintelligenceact.eu) |
| 3 | Badge markup is plain, machine-readable DOM (labeled span + tooltip text) rather than visual-only styling | EU AI Act Art. 50(2) — machine-readable marking of synthetic content | Design direction: marking of AI-generated output should be detectable programmatically, not only visually | AI Act Explorer (artificialintelligenceact.eu) |
| 4 | AI optimized text is always shown in an apply/reject review flow before it replaces user content (resume editor optimization panel) | EU AI Act Art. 26(2) — human oversight competence | Keep a competent human in the loop and in control of whether AI output takes effect | AI Act Explorer (artificialintelligenceact.eu) |
| 5 | Optimize requests send only the user's resume text plus the targeted job description; matching input selection (JD context) is explicit user input | EU AI Act Art. 26(4) — input data relevance to the intended purpose | Inputs to AI features should be relevant to the task the user asked for | AI Act Explorer (artificialintelligenceact.eu) |
| 6 | Transparency page (`/transparency`) discloses storage location, when data leaves the machine, the AI feature inventory, and user rights; nav entry visible from first session | EU AI Act Art. 50(1), Art. 50(5) | Disclose AI interaction clearly and at first interaction; the page is reachable from the main navigation | AI Act Explorer (artificialintelligenceact.eu) |
| 7 | If AI-generated text is ever published by users to public-interest channels (e.g. public profiles or postings), the product surfaces the AI-assisted marking at export/copy time so users can carry the disclosure with the content | EU AI Act Art. 50(4) — disclosure of artificially generated text | Anchors the principle that AI-generated text destined for audiences should remain disclosed; the specific statutory duty attaches to defined publication contexts, noted here as design guidance only | AI Act Explorer (artificialintelligenceact.eu) |
| 8 | Boundary guardrail: if SyncHire ever evaluates candidates or monitors workers (employer side), the affected-person information duties would need to be implemented | EU AI Act Art. 26(7) — worker information duty; Art. 26(11) — informing affected persons subject to high-risk AI decisions | Documented as a forward-looking obligation trigger, not a current one — see positioning note below | AI Act Explorer (artificialintelligenceact.eu) |
| 9 | Match score ships with a human-readable breakdown (skills/experience/education/missing keywords) and the transparency page commits to explanations on request | PIPL Art. 24 — transparency of automated decision-making and fairness of outcomes; right to an explanation | Users can see how the score was derived and may demand an explanation of the outcome | Stanford DigiChina PIPL translation (digichina.stanford.edu) |
| 10 | AI features are strictly opt-in (user must trigger them), can be skipped entirely, and the LLM provider is user-configured/removable in Settings | PIPL Art. 24 — option to refuse or opt out of personalized decision-making via automated means | A functional opt-out path: users who decline automated processing simply do not use the AI features and lose no core functionality | Stanford DigiChina PIPL translation (digichina.stanford.edu) |
| 11 | No decision is ever executed solely by automation: AI output is advisory, form auto-submit is prohibited (see form-assistant promise on `/transparency`) | PIPL Art. 24 — right to refuse decisions made solely by automated means that have a material effect on the individual | Guarantees a human acts on every consequential step (submitting applications, accepting rewrites) | Stanford DigiChina PIPL translation (digichina.stanford.edu) |
| 12 | In-app help/docs explain what each AI feature does and its limits (transparency page AI feature inventory) | EU AI Act Art. 4 — AI literacy | Providers/deployers should ensure a sufficient level of AI literacy of staff and, for consumer-facing products, users should understand what the AI does | AI Act Explorer (artificialintelligenceact.eu); EC digital-strategy page |

## High-risk classification boundary (strategic positioning note)

Annex III of the AI Act lists high-risk use cases, including:

- **Annex III 4(a)** — AI systems for recruitment or selection of persons, in
  particular targeted job advertisements, filtering and evaluating applications
  or candidates.
- **Annex III 4(b)** — AI systems making decisions affecting terms of
  work-related relationships, promoting or terminating work-related contractual
  relationships, monitoring and evaluating performance and behavior.

SyncHire Lite is a **job-seeker-side personal tool**. The Art. 3(4) personal
non-professional carve-out is the current basis for staying outside the
high-risk regime. **Building employer-side candidate evaluation or worker
monitoring would trigger Annex III 4(a)/(b) high-risk obligations.** This is
recorded as a strategic product boundary, not a current obligation: do not ship
employer-side candidate-scoring features in this product line without a
dedicated compliance workstream.

## Single-source items to re-verify

- **AI Omnibus delay:** the European Commission policy page
  ([digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai](https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai))
  states that the AI Omnibus (in force 27 July 2026) delays Annex III
  high-risk obligations to **2 December 2027**. This is currently
  **single-sourced (the official EC page)** — re-verify against the Official
  Journal before starting any work with a compliance-dated deadline.

## Companion artifacts

- User-facing disclosure page: `frontend/src/app/transparency/page.tsx`
- AI-assisted marking component: `frontend/src/components/ai-assisted-badge.tsx`
- Backend AI-output marker: `ai_assisted: true` in
  `POST /api/resumes/{id}/optimize` (`api/app/api/resumes_lite.py`),
  contract-tested in `api/tests/test_lite_contract_drift.py`
- PII scrubbing layer: `api/app/services/pii_scrub.py` — deterministic,
  stdlib-only masking of identifiers (mobile / email / international phone /
  checksum-validated CN ID) applied to every outbound LLM payload in
  `api/app/services/ai_service_lite.py`, with a mask/restore round-trip so
  locally persisted content keeps raw values. Toggle `PII_SCRUB_ENABLED`
  (default on). Data-minimization engineering control backing the privacy
  claims on `/transparency`; patterns inspired by Microsoft Presidio (not a
  dependency). No specific statutory provision is mapped to it here — it
  implements the product's own local-first privacy promise.
