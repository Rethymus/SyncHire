import { describe, expect, it } from "vitest";
import type { LiteApplication } from "@/lib/api-client";
import {
  buildProgressSummary,
  CLOSED_OUT_STATUSES,
  deriveApplicationActivities,
  getIsoWeekStart,
  getLocalDateKey,
  parseProgressTimestamp,
  storeApplicationToProgress,
} from "./progress-model";

/**
 * Fixed clock: Wednesday 2026-08-26, 15:00 local time.
 * Current ISO week: Monday 2026-08-24 … Sunday 2026-08-30.
 */
const NOW = new Date(2026, 7, 26, 15, 0, 0);

function makeApp(overrides: Partial<LiteApplication> = {}): LiteApplication {
  return {
    id: "app-1",
    resume_id: "resume-1",
    jd_id: "jd-1",
    status: "saved",
    created_at: "2026-08-26T10:00:00",
    updated_at: "2026-08-26T10:00:00",
    ...overrides,
  };
}

describe("getIsoWeekStart / getLocalDateKey — ISO week bucketing", () => {
  it("maps a Wednesday to its Monday", () => {
    expect(getLocalDateKey(getIsoWeekStart(new Date(2026, 7, 26)))).toBe("2026-08-24");
  });

  it("maps Saturday and Sunday of the same weekend to the same Monday", () => {
    expect(getLocalDateKey(getIsoWeekStart(new Date(2026, 7, 22)))).toBe("2026-08-17");
    expect(getLocalDateKey(getIsoWeekStart(new Date(2026, 7, 23)))).toBe("2026-08-17");
  });

  it("maps Monday itself to itself", () => {
    expect(getLocalDateKey(getIsoWeekStart(new Date(2026, 7, 24)))).toBe("2026-08-24");
  });

  it("rolls the year boundary into the correct ISO week", () => {
    // 2027-01-01 is a Friday → week starts Monday 2026-12-28.
    expect(getLocalDateKey(getIsoWeekStart(new Date(2027, 0, 1)))).toBe("2026-12-28");
  });
});

describe("parseProgressTimestamp — unknown stays unknown", () => {
  it("accepts valid ISO strings", () => {
    expect(parseProgressTimestamp("2026-08-26T10:00:00")).toEqual(
      new Date(2026, 7, 26, 10, 0, 0)
    );
  });

  it("returns null for null, undefined, empty, and invalid values", () => {
    expect(parseProgressTimestamp(null)).toBeNull();
    expect(parseProgressTimestamp(undefined)).toBeNull();
    expect(parseProgressTimestamp("")).toBeNull();
    expect(parseProgressTimestamp("   ")).toBeNull();
    expect(parseProgressTimestamp("not-a-date")).toBeNull();
  });
});

describe("deriveApplicationActivities — field-by-field rules", () => {
  it("uses applied_date first for the applied activity", () => {
    const activities = deriveApplicationActivities(
      makeApp({
        status: "applied",
        applied_date: "2026-08-27T09:00:00",
        submitted_manually_at: "2026-08-25T09:00:00",
        updated_at: "2026-08-20T09:00:00",
      })
    );
    expect(activities.applied).toEqual(new Date(2026, 7, 27, 9, 0, 0));
  });

  it("falls back to submitted_manually_at when applied_date is missing", () => {
    const activities = deriveApplicationActivities(
      makeApp({
        status: "submitted",
        applied_date: null,
        submitted_manually_at: "2026-08-25T09:00:00",
      })
    );
    expect(activities.applied).toEqual(new Date(2026, 7, 25, 9, 0, 0));
  });

  it("approximates applied from updated_at only when the status proves it was sent out", () => {
    const applied = deriveApplicationActivities(
      makeApp({ status: "applied", applied_date: null, updated_at: "2026-08-20T08:00:00" })
    );
    expect(applied.applied).toEqual(new Date(2026, 7, 20, 8, 0, 0));

    const saved = deriveApplicationActivities(
      makeApp({ status: "saved", applied_date: null, updated_at: "2026-08-20T08:00:00" })
    );
    expect(saved.applied).toBeNull();
  });

  it("returns interview activity only for applications currently in an interview stage", () => {
    const interviewing = deriveApplicationActivities(
      makeApp({ status: "technical", last_updated: "2026-08-25T10:00:00" })
    );
    expect(interviewing.interview).toEqual(new Date(2026, 7, 25, 10, 0, 0));

    const offered = deriveApplicationActivities(
      makeApp({ status: "offer", last_updated: "2026-08-25T10:00:00" })
    );
    expect(offered.interview).toBeNull();
  });
});

describe("buildProgressSummary — weekly aggregation", () => {
  const applications: LiteApplication[] = [
    // Created + applied THIS week.
    makeApp({
      id: "app-a",
      status: "applied",
      created_at: "2026-08-26T10:00:00",
      applied_date: "2026-08-27T09:00:00",
      updated_at: "2026-08-27T09:00:00",
    }),
    // Created LAST week (Sunday), now in an interview stage updated this week.
    makeApp({
      id: "app-b",
      status: "interview",
      created_at: "2026-08-23T10:00:00",
      applied_date: null,
      updated_at: "2026-08-20T08:00:00",
      last_updated: "2026-08-25T10:00:00",
    }),
    // Applied ~7 weeks ago, since rejected → outside the 6-week window.
    makeApp({
      id: "app-c",
      status: "rejected",
      created_at: "2026-07-05T09:00:00",
      applied_date: "2026-07-06T09:00:00",
      updated_at: "2026-07-10T09:00:00",
    }),
    // Saved only — no applied activity known.
    makeApp({
      id: "app-d",
      status: "saved",
      created_at: "2026-08-28T09:00:00",
      updated_at: "2026-08-28T09:00:00",
    }),
  ];

  const summary = buildProgressSummary(applications, NOW);

  it("produces a 6-week zero-filled window ending at the current week", () => {
    expect(summary.weeks).toHaveLength(6);
    expect(summary.weeks[0].weekKey).toBe("2026-07-20");
    expect(summary.weeks[5].weekKey).toBe("2026-08-24");
    expect(summary.weeks[5].isCurrentWeek).toBe(true);
    expect(summary.weeks.every((week) => !week.isCurrentWeek || week === summary.weeks[5])).toBe(
      true
    );
  });

  it("counts current-week controllable actions across all three activity types", () => {
    // created: app-a + app-d; applied: app-a; interview: app-b.
    expect(summary.currentWeek).toEqual({
      weekKey: "2026-08-24",
      counts: { created: 2, applied: 1, interview: 1 },
      actionCount: 4,
    });
  });

  it("keeps out-of-window activity in totals but not in the weekly buckets", () => {
    expect(summary.totals).toEqual({
      created: 4,
      applied: 3,
      interview: 1,
      applications: 4,
    });

    const bucketSum = summary.weeks.reduce(
      (acc, week) => ({
        created: acc.created + week.counts.created,
        applied: acc.applied + week.counts.applied,
        interview: acc.interview + week.counts.interview,
      }),
      { created: 0, applied: 0, interview: 0 }
    );
    // app-c's created/applied (July) fall outside the window.
    expect(bucketSum).toEqual({ created: 3, applied: 2, interview: 1 });
  });

  it("buckets last-week activity into the correct ISO week", () => {
    const lastWeek = summary.weeks.find((week) => week.weekKey === "2026-08-17");
    expect(lastWeek).toBeDefined();
    // app-b: created on Sunday 08-23, applied approximated to updated_at 08-20.
    expect(lastWeek?.counts).toEqual({ created: 1, applied: 1, interview: 0 });
  });

  it("distributes statuses over the real ApplicationStatus enum in enum order", () => {
    expect(summary.statusDistribution.map((entry) => entry.status)).toEqual([
      "saved",
      "targeted",
      "materials_ready",
      "submitted",
      "applied",
      "screening",
      "interview",
      "technical",
      "offer",
      "hired",
      "rejected",
      "withdrawn",
    ]);
    expect(summary.statusDistribution.find((e) => e.status === "saved")?.count).toBe(1);
    expect(summary.statusDistribution.find((e) => e.status === "rejected")?.count).toBe(1);
    expect(summary.statusDistribution.find((e) => e.status === "offer")?.count).toBe(0);
  });

  it("computes response/interview rates as raw counts over the applied base", () => {
    // Applied base: app-a (applied), app-b (interview), app-c (rejected). app-d (saved) excluded.
    expect(summary.responseRate).toEqual({ numerator: 2, denominator: 3 });
    expect(summary.interviewRate).toEqual({ numerator: 1, denominator: 3 });
  });

  it("honors the weeksToShow parameter", () => {
    const twoWeeks = buildProgressSummary(applications, NOW, 2);
    expect(twoWeeks.weeks.map((week) => week.weekKey)).toEqual([
      "2026-08-17",
      "2026-08-24",
    ]);
  });

  it("is deterministic for identical inputs", () => {
    expect(buildProgressSummary(applications, NOW)).toEqual(summary);
  });
});

describe("buildProgressSummary — empty and malformed input", () => {
  it("returns a zero-filled summary with unknown (null) rates for no applications", () => {
    const summary = buildProgressSummary([], NOW);

    expect(summary.weeks).toHaveLength(6);
    expect(summary.weeks.every((week) => week.total === 0)).toBe(true);
    expect(summary.currentWeek.actionCount).toBe(0);
    expect(summary.totals).toEqual({ created: 0, applied: 0, interview: 0, applications: 0 });
    expect(summary.statusDistribution.every((entry) => entry.count === 0)).toBe(true);
    expect(summary.responseRate).toBeNull();
    expect(summary.interviewRate).toBeNull();
  });

  it("tolerates missing and invalid timestamps without crashing", () => {
    const malformed: LiteApplication[] = [
      // created_at missing despite being schema-required.
      makeApp({ id: "x1", created_at: undefined as unknown as string }),
      // Invalid date strings everywhere.
      makeApp({
        id: "x2",
        status: "applied",
        created_at: "not-a-date",
        applied_date: "also-not-a-date",
        updated_at: "1970-01-01T00:00:00",
      }),
      // Null optional fields on a valid created_at.
      makeApp({
        id: "x3",
        status: "withdrawn",
        applied_date: null,
        submitted_manually_at: null,
        last_updated: null,
        created_at: "2026-08-25T09:00:00",
      }),
    ];

    const summary = buildProgressSummary(malformed, NOW);

    expect(summary.totals.applications).toBe(3);
    // x1: nothing; x2: applied approximated to 1970 (outside window);
    // x3: created only.
    expect(summary.totals.created).toBe(1);
    expect(summary.totals.applied).toBe(1);
    expect(summary.currentWeek.actionCount).toBe(1);
    expect(summary.weeks[5].counts.created).toBe(1);
    // Only x2 ('applied') counts toward the applied base — 'withdrawn' can
    // happen at any stage, so it is not proof of having applied.
    expect(summary.responseRate).toEqual({ numerator: 0, denominator: 1 });
    expect(summary.interviewRate).toEqual({ numerator: 0, denominator: 1 });
  });
});

describe("CLOSED_OUT_STATUSES — real enum values for the recovery flow", () => {
  it("contains exactly the terminal closed-out statuses", () => {
    expect(CLOSED_OUT_STATUSES).toEqual(["rejected", "withdrawn"]);
  });
});

describe("storeApplicationToProgress — lite-store adapter", () => {
  const WEDNESDAY = "2026-08-26T10:00:00.000Z";

  function makeStoreApp(overrides: Record<string, unknown> = {}) {
    return {
      id: "store-app-1",
      companyName: "北极星实验室",
      position: "应届前端工程师",
      status: "applied" as const,
      jobId: "jd-1",
      resumeId: "resume-1",
      createdAt: new Date(WEDNESDAY),
      updatedAt: new Date(WEDNESDAY),
      appliedAt: null,
      ...overrides,
    };
  }

  it("passes canonical statuses straight through (the store is canonical now)", () => {
    for (const status of [
      "saved",
      "targeted",
      "materials_ready",
      "submitted",
      "applied",
      "screening",
      "interview",
      "technical",
      "offer",
      "hired",
      "rejected",
      "withdrawn",
    ] as const) {
      expect(storeApplicationToProgress(makeStoreApp({ status })).status).toBe(status);
    }
  });

  it("normalizes unknown status values to 'saved' instead of dropping the record", () => {
    expect(
      storeApplicationToProgress(makeStoreApp({ status: "mystery" as never })).status
    ).toBe("saved");
  });

  it("passes timestamps through as ISO strings", () => {
    const adapted = storeApplicationToProgress(makeStoreApp());
    expect(adapted.created_at).toBe(WEDNESDAY);
    expect(adapted.updated_at).toBe(WEDNESDAY);
    expect(adapted.last_updated).toBe(WEDNESDAY);
  });

  it("prefers the store's stamped appliedAt over the updatedAt approximation", () => {
    const THURSDAY = "2026-08-27T09:00:00.000Z";
    const adapted = storeApplicationToProgress(
      makeStoreApp({ appliedAt: new Date(THURSDAY) })
    );
    expect(adapted.applied_date).toBe(THURSDAY);
  });

  it("falls back to null applied_date when appliedAt was never stamped", () => {
    const adapted = storeApplicationToProgress(makeStoreApp());
    expect(adapted.applied_date).toBeNull();
  });

  it("counts '标记投递' from the stamped appliedAt, not updatedAt", () => {
    // Created Monday of NOW's week, applied Wednesday of the same week, but
    // last touched (updatedAt) two weeks earlier: the created AND applied
    // actions must land in NOW's week, not updatedAt's.
    const summary = buildProgressSummary(
      [
        storeApplicationToProgress(
          makeStoreApp({
            createdAt: new Date("2026-08-24T09:00:00"), // Monday, NOW's week
            updatedAt: new Date("2026-08-10T09:00:00"), // two weeks earlier
            appliedAt: new Date("2026-08-26T09:00:00"), // Wednesday, NOW's week
          })
        ),
      ],
      NOW
    );
    expect(summary.currentWeek.counts.created).toBe(1);
    expect(summary.currentWeek.counts.applied).toBe(1);
    expect(summary.weeks[3].counts.applied).toBe(0); // updatedAt's week untouched
  });

  it("counts '标记投递' via the updatedAt approximation when appliedAt is null", () => {
    // Status 'applied' + only updated_at → the documented approximation dates
    // the applied action from updated_at, inside the current week.
    const summary = buildProgressSummary(
      [storeApplicationToProgress(makeStoreApp())],
      NOW
    );
    expect(summary.currentWeek.counts.applied).toBe(1);
    expect(summary.currentWeek.counts.created).toBe(1);
    expect(summary.totals.applications).toBe(1);
  });

  it("dates interview-stage activity from updated_at", () => {
    const summary = buildProgressSummary(
      [storeApplicationToProgress(makeStoreApp({ status: "interview" }))],
      NOW
    );
    expect(summary.currentWeek.counts.interview).toBe(1);
    expect(summary.interviewRate).toEqual({ numerator: 1, denominator: 1 });
  });

  it("treats invalid store dates as unknown (no activity, no crash)", () => {
    const summary = buildProgressSummary(
      [
        storeApplicationToProgress(
          makeStoreApp({ createdAt: new Date("not-a-date"), updatedAt: new Date("not-a-date") })
        ),
      ],
      NOW
    );
    expect(summary.currentWeek.actionCount).toBe(0);
    expect(summary.totals.created).toBe(0);
    // The application still shows up in the distribution.
    expect(summary.statusDistribution.find((s) => s.status === "applied")?.count).toBe(1);
  });
});
