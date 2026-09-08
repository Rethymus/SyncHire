/**
 * Mapper unit tests (docs/STORE_API_SYNC_DESIGN.md §6 Phase 0).
 *
 * The mappers are the only place schema knowledge lives, so the round trips
 * below are the contract: a store entity pushed to the API and pulled back
 * must be indistinguishable (modulo the documented losses — resume
 * skills/experience have no backend column yet).
 */

import { describe, expect, it } from "vitest";
import type {
  LiteApplication,
  LiteJd,
  LiteResume,
} from "@/lib/api-client";
import type { JobApplication, JobDescription, Resume } from "@/lib/store";
import {
  apiApplicationToStore,
  apiJdToStore,
  apiResumeToStore,
  storeApplicationToApi,
  storeJdToApi,
  storeResumeToApi,
} from "../mappers";

const resume: Resume = {
  id: "resume-1",
  name: "张三的简历",
  content: "# 张三\n\n前端工程师，五年经验。",
  uploadedAt: new Date("2026-01-15T08:30:00.000Z"),
  fileUrl: "https://example.com/resume.pdf",
};

const jd: JobDescription = {
  id: "jd-1",
  title: "高级前端工程师",
  company: "Northstar Labs",
  description: "负责核心产品的前端架构与性能优化。",
  requirements: ["五年以上前端经验", "熟悉 React 生态"],
  skills: ["React", "TypeScript", "Next.js"],
  createdAt: new Date("2026-02-01T10:00:00.000Z"),
};

const application: JobApplication = {
  id: "app-1",
  companyName: "Northstar Labs",
  position: "高级前端工程师",
  status: "submitted",
  jobId: "jd-1",
  resumeId: "resume-1",
  matchScore: 87,
  createdAt: new Date("2026-02-02T09:00:00.000Z"),
  updatedAt: new Date("2026-02-03T11:30:00.000Z"),
  appliedAt: new Date("2026-02-03T11:30:00.000Z"),
};

const liteJd: LiteJd = {
  id: "jd-1",
  company: "Northstar Labs",
  title: "高级前端工程师",
  description: "负责核心产品的前端架构与性能优化。",
  platform: "manual",
  remote: "onsite",
  language: "auto",
  parsed_json: {
    local: {
      requirements: ["五年以上前端经验", "熟悉 React 生态"],
      skills: ["React", "TypeScript", "Next.js"],
    },
  },
  created_at: "2026-02-01T10:00:00.000Z",
  updated_at: "2026-02-01T10:00:00.000Z",
};

const liteApplication: LiteApplication = {
  id: "app-1",
  resume_id: "resume-1",
  jd_id: "jd-1",
  status: "submitted",
  platform: "manual",
  match_score: 87,
  applied_date: "2026-02-03T11:30:00.000Z",
  created_at: "2026-02-02T09:00:00.000Z",
  updated_at: "2026-02-03T11:30:00.000Z",
};

describe("resume mappers", () => {
  it("round-trips a resume through the API shape", () => {
    const api = storeResumeToApi(resume);

    expect(api).toEqual({
      id: "resume-1",
      title: "张三的简历",
      content: resume.content,
      file_name: "https://example.com/resume.pdf",
      created_at: "2026-01-15T08:30:00.000Z",
      updated_at: "2026-01-15T08:30:00.000Z",
    });

    const restored = apiResumeToStore(api as LiteResume);
    expect(restored).toEqual({
      id: resume.id,
      name: resume.name,
      content: resume.content,
      uploadedAt: resume.uploadedAt,
      fileUrl: resume.fileUrl,
    });
  });

  it("maps a null file_name to an undefined fileUrl on pull", () => {
    const restored = apiResumeToStore({
      id: "resume-2",
      title: "无附件简历",
      content: "plain text",
      file_name: null,
      created_at: "2026-01-16T00:00:00.000Z",
      updated_at: "2026-01-16T00:00:00.000Z",
    });

    expect(restored.fileUrl).toBeUndefined();
    expect(restored.name).toBe("无附件简历");
  });

  it("documents the lossy skills/experience round trip (no backend column)", () => {
    const withExtras: Resume = {
      ...resume,
      skills: ["React"],
      experience: ["Northstar Labs 2021-2026"],
    };

    const api = storeResumeToApi(withExtras);

    expect(api).not.toHaveProperty("skills");
    expect(api).not.toHaveProperty("experience");
  });
});

describe("jd mappers", () => {
  it("round-trips a JD losslessly via parsed_json.local", () => {
    const api = storeJdToApi(jd);

    expect(api.parsed_json).toEqual({
      local: { requirements: jd.requirements, skills: jd.skills },
    });

    const restored = apiJdToStore(api as LiteJd);
    expect(restored).toEqual(jd);
  });

  it("round-trips an API-born JD with its core fields", () => {
    const restored = apiJdToStore(liteJd);

    expect(restored).toEqual({
      id: "jd-1",
      title: "高级前端工程师",
      company: "Northstar Labs",
      description: liteJd.description,
      requirements: ["五年以上前端经验", "熟悉 React 生态"],
      skills: ["React", "TypeScript", "Next.js"],
      createdAt: new Date("2026-02-01T10:00:00.000Z"),
    });

    const pushed = storeJdToApi(restored);
    expect(pushed.title).toBe(liteJd.title);
    expect(pushed.company).toBe(liteJd.company);
    expect(pushed.parsed_json).toEqual(liteJd.parsed_json);
  });

  it("tolerates backend JDs without parsed_json.local (empty arrays)", () => {
    for (const parsedJson of [null, undefined, {}, { local: null }, { local: { requirements: "not-an-array" } }]) {
      const restored = apiJdToStore({ ...liteJd, parsed_json: parsedJson });
      expect(restored.requirements).toEqual([]);
      expect(restored.skills).toEqual([]);
    }
  });
});

describe("application mappers", () => {
  it("round-trips an application, regenerating company/position from the JD", () => {
    const api = storeApplicationToApi(application);

    // companyName/position are local denormalizations — never pushed.
    expect(api).not.toHaveProperty("companyName");
    expect(api).not.toHaveProperty("position");
    expect(api).toMatchObject({
      id: "app-1",
      resume_id: "resume-1",
      jd_id: "jd-1",
      status: "submitted",
      match_score: 87,
      applied_date: "2026-02-03T11:30:00.000Z",
      created_at: "2026-02-02T09:00:00.000Z",
      updated_at: "2026-02-03T11:30:00.000Z",
    });

    const restored = apiApplicationToStore(api as LiteApplication, liteJd);
    expect(restored).toEqual(application);
  });

  it("falls back to empty company/position when no JD is available", () => {
    const restored = apiApplicationToStore(liteApplication);

    expect(restored.companyName).toBe("");
    expect(restored.position).toBe("");
    expect(restored.jobId).toBe("jd-1");
    expect(restored.resumeId).toBe("resume-1");
  });

  it("maps a null match_score and applied_date to absent store fields", () => {
    const restored = apiApplicationToStore(
      { ...liteApplication, match_score: null, applied_date: null },
      liteJd
    );

    expect(restored.matchScore).toBeUndefined();
    expect(restored.appliedAt).toBeNull();
  });
});

describe("status canonicalization", () => {
  it.each([
    ["draft", "saved"],
    ["optimized", "materials_ready"],
    ["pending", "submitted"],
    ["not-a-real-status", "saved"],
  ])("maps legacy/dirty push status %s to canonical %s", (legacy, expected) => {
    const api = storeApplicationToApi({
      ...application,
      status: legacy as unknown as JobApplication["status"],
    });

    expect(api.status).toBe(expected);
  });

  it("passes canonical statuses through untouched on push", () => {
    const api = storeApplicationToApi({ ...application, status: "materials_ready" });

    expect(api.status).toBe("materials_ready");
  });

  it("maps legacy pull statuses back to canonical on hydrate", () => {
    const restored = apiApplicationToStore(
      { ...liteApplication, status: "pending" as unknown as LiteApplication["status"] },
      liteJd
    );

    expect(restored.status).toBe("submitted");
  });

  it("falls back to saved for unknown pull statuses instead of dropping the record", () => {
    const restored = apiApplicationToStore(
      { ...liteApplication, status: "ghosted" as unknown as LiteApplication["status"] },
      liteJd
    );

    expect(restored.status).toBe("saved");
  });
});

describe("date conversion", () => {
  it("converts Date objects to ISO strings on push", () => {
    const resumeApi = storeResumeToApi(resume);
    expect(resumeApi.created_at).toBe(resume.uploadedAt.toISOString());
    expect(typeof resumeApi.created_at).toBe("string");

    const jdApi = storeJdToApi(jd);
    expect(jdApi.created_at).toBe(jd.createdAt.toISOString());
    expect(jdApi.updated_at).toBe(jd.createdAt.toISOString());

    const appApi = storeApplicationToApi(application);
    expect(appApi.created_at).toBe(application.createdAt.toISOString());
    expect(appApi.updated_at).toBe(application.updatedAt.toISOString());
    expect(appApi.applied_date).toBe(application.appliedAt?.toISOString());
  });

  it("converts ISO strings back to Date objects on pull", () => {
    const restoredResume = apiResumeToStore(storeResumeToApi(resume) as LiteResume);
    expect(restoredResume.uploadedAt).toBeInstanceOf(Date);
    expect(restoredResume.uploadedAt.getTime()).toBe(resume.uploadedAt.getTime());

    const restoredJd = apiJdToStore(storeJdToApi(jd) as LiteJd);
    expect(restoredJd.createdAt).toBeInstanceOf(Date);
    expect(restoredJd.createdAt.getTime()).toBe(jd.createdAt.getTime());

    const restoredApp = apiApplicationToStore(
      storeApplicationToApi(application) as LiteApplication,
      liteJd
    );
    expect(restoredApp.createdAt).toBeInstanceOf(Date);
    expect(restoredApp.createdAt.getTime()).toBe(application.createdAt.getTime());
    expect(restoredApp.updatedAt).toBeInstanceOf(Date);
    expect(restoredApp.updatedAt.getTime()).toBe(application.updatedAt.getTime());
    expect(restoredApp.appliedAt).toBeInstanceOf(Date);
    expect(restoredApp.appliedAt?.getTime()).toBe(application.appliedAt?.getTime());
  });

  it("pushes a never-sent application with a null applied_date and restores it as null", () => {
    const unsent = storeApplicationToApi({ ...application, appliedAt: null });

    expect(unsent.applied_date).toBeNull();

    const restored = apiApplicationToStore(unsent as LiteApplication, liteJd);
    expect(restored.appliedAt).toBeNull();
  });
});
