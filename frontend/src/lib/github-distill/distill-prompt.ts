/**
 * Builds the model prompt for static-reverse-engineering a GitHub repo into
 * resume-ready project evidence.
 *
 * The prompt encodes the four-layer questioning flow from the methodology:
 *   1. 用途与定位 (purpose & positioning)
 *   2. 技术栈与架构风格 (tech stack & architecture)
 *   3. 核心模块与数据流 (core modules & data flow)
 *   4. 创新点与设计取舍 (innovation & tradeoffs)
 * and asks for a single JSON object the parser can validate. The model is told
 * the inputs are static-only hypotheses and must not fabricate metrics.
 *
 * Pure: deterministic string building, fully unit-testable.
 */

import type { DistilledProject } from "./types";

export interface DistillPromptInput {
  /** The compact RepoMap produced by {@link buildRepoMap}. */
  repoMap: string;
  /** Optional target role / JD title to tune bullet relevance. */
  focusRole?: string;
}

export const DISTILL_JSON_SCHEMA_HINT = `{
  "name": "string（项目名，默认用仓库名）",
  "tagline": "string（一句话说明它解决什么问题 / 给谁用）",
  "category": "string（Web 应用 / CLI / SDK / 库 / 平台 / 工具 之一）",
  "techStack": ["string", "...（语言、框架、关键三方库）"],
  "bullets": ["string", "...（3-5 条成就导向的项目要点，可验证、可量化、不杜撰）"],
  "skills": ["string", "...（可迁移到简历技能栏的技术能力）"],
  "summary": "string（1-2 句项目概述，可用于个人简介）",
  "innovations": ["string", "...（架构/实现上的亮点与设计取舍；没有则空数组）"]
}`;

/** The output language is driven by `language`. */
export type DistillLanguage = "zh" | "en";

export function buildDistillPrompt(input: DistillPromptInput, language: DistillLanguage = "zh"): string {
  const roleClause = input.focusRole?.trim()
    ? language === "zh"
      ? `目标岗位：${input.focusRole.trim()}。要点请围绕该岗位的相关性与价值来组织，但仍须忠于仓库事实。`
      : `Target role: ${input.focusRole.trim()}. Tune bullets to relevance for this role, but stay truthful to the repo.`
    : "";

  const zh = `你是一名资深软件架构师，正在做「静态逆向工程」：只依据下方仓库的结构化信号（目录、依赖清单、入口、部署/CI、提交、Issue/PR、README 节选）推断一个 GitHub 项目的用途、技术栈、架构与创新点。你不会、也不能运行该项目。

请按四层由粗到细地分析，但只输出最终结论（不要输出分析过程）：
1. 用途与定位：它解决什么问题？给谁用？属于哪类软件？
2. 技术栈与架构：主要语言/框架、关键三方库的作用、可推断的架构风格。
3. 核心模块与数据流：从目录与入口能看出的主要模块与调用/数据流。
4. 创新点与设计取舍：实现或架构上值得一提的亮点及其代价。

约束（严格遵守）：
- 不得杜撰任何在信号中找不到依据的事实，尤其不要编造用户量、性能数字、企业背书等量化指标；如需量化，请用「约」「据仓库可见」等措辞或留空。
- 把模型输出当作「假设」——只基于给定信号推断，不要假装你运行过或见过未提供的代码。
- bullets 必须是成就导向、可放进简历的中文短句，3-5 条，每条聚焦一个可验证的事实或设计决策。
- 只输出一个 JSON 对象，不要输出 Markdown 代码块、不要输出注释、不要输出 JSON 以外的文字。

输出 JSON 结构（字段名必须完全一致）：
${DISTILL_JSON_SCHEMA_HINT}`;

  const en = `You are a senior software architect performing STATIC REVERSE ENGINEERING: infer a GitHub project's purpose, tech stack, architecture and innovations using ONLY the structured signals below (directory tree, dependency manifests, entry points, deploy/CI config, commits, issues/PRs, README excerpt). You will not and cannot run the project.

Reason through four layers (coarse → fine), but output ONLY final conclusions (no reasoning prose):
1. Purpose & positioning: what problem, for whom, what software category.
2. Tech stack & architecture: primary language/framework, role of key libraries, inferable architecture style.
3. Core modules & data flow: main modules and call/data flow visible from the tree and entry points.
4. Innovation & tradeoffs: notable implementation/architecture choices and their costs.

Hard constraints:
- Do NOT fabricate facts unsupported by the signals — especially metrics (users, performance, enterprise adoption). Use hedged wording ("appears", "as visible in the repo") or leave blank.
- Treat every inference as a hypothesis based strictly on the given signals; never claim to have run the code or seen files not provided.
- bullets must be achievement-oriented, resume-ready English lines (3-5), each focused on one verifiable fact or design decision.
- Output exactly ONE JSON object — no Markdown fences, no comments, no prose outside JSON.

Output JSON shape (field names must match exactly):
${DISTILL_JSON_SCHEMA_HINT}`;

  const header = language === "zh" ? zh : en;
  return `${header}

${roleClause}

仓库结构化信号（RepoMap）：
<<<REPO_MAP_START
${input.repoMap}
REPO_MAP_END>>>`;
}
