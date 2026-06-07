import { describe, expect, it } from "vitest";
import {
  applyApprovedProfileLearning,
  collectProfileLearningUpdates,
  createBrowserAgentInstruction,
  createBrowserFillPlan,
  createDefaultCandidateRoleCard,
  mergeReviewedFieldReport,
  parseBrowserReviewedFieldReport,
  type BrowserFormField,
} from "../browser-fill-assistant";

describe("browser fill assistant", () => {
  it("creates a reviewed fill plan from local role-card fields", () => {
    const profile = createDefaultCandidateRoleCard();
    const fields: BrowserFormField[] = [
      { id: "name", label: "Full name", inputName: "full_name", kind: "text", required: true },
      { id: "email", label: "Email address", inputName: "email", kind: "email", required: true },
      { id: "why", label: "Why are you a fit for this role?", inputName: "fit", kind: "textarea" },
      { id: "submit", label: "Submit application", inputName: "submit", kind: "text", isSubmitControl: true },
    ];

    const session = createBrowserFillPlan({
      profile,
      fields,
      targetUrl: "https://jobs.example.com/apply",
      company: "Northstar Labs",
      position: "Graduate Frontend Engineer",
    });

    expect(session.suggestions).toHaveLength(3);
    expect(session.suggestions.map((suggestion) => suggestion.fieldId)).not.toContain("submit");
    expect(session.suggestions[0]).toMatchObject({
      fieldId: "name",
      value: profile.fullName,
      source: "fullName",
      requiresUserReview: true,
    });
    expect(session.suggestions[2].value).toContain("Graduate Frontend Engineer");
    expect(session.suggestions[2].value).toContain("Northstar Labs");
  });

  it("generates browser-agent instructions that forbid submission", () => {
    const session = createBrowserFillPlan({
      profile: createDefaultCandidateRoleCard(),
      targetUrl: "https://jobs.example.com/apply",
      company: "Northstar Labs",
      position: "Graduate Frontend Engineer",
    });

    const instruction = createBrowserAgentInstruction(session);

    expect(instruction).toContain("Never click Submit");
    expect(instruction).toContain("Stop after filling fields");
    expect(instruction).toContain("return a JSON field report");
    expect(instruction).toContain("https://jobs.example.com/apply");
  });

  it("collects profile updates only from user-reviewed changes", () => {
    const profile = createDefaultCandidateRoleCard();
    const session = createBrowserFillPlan({
      profile,
      fields: [
        { id: "phone", label: "Phone", inputName: "phone", kind: "tel" },
        { id: "skills", label: "Skills", inputName: "skills", kind: "textarea" },
      ],
      targetUrl: "https://jobs.example.com/apply",
    });

    const updates = collectProfileLearningUpdates(session.suggestions, {
      phone: "+86 139 1111 2222",
      skills: "React, TypeScript, Next.js, Accessibility",
    });

    expect(updates).toHaveLength(1);
    expect(updates[0]).toMatchObject({
      profileKey: "phone",
      previousValue: profile.phone,
      reviewedValue: "+86 139 1111 2222",
    });
  });

  it("applies approved learning without mutating arrays or unapproved fields", () => {
    const profile = createDefaultCandidateRoleCard();
    const nextProfile = applyApprovedProfileLearning(profile, [
      {
        source: "email",
        profileKey: "email",
        previousValue: profile.email,
        reviewedValue: "chenyu.updated@example.com",
        confidence: 0.9,
      },
    ]);

    expect(nextProfile.email).toBe("chenyu.updated@example.com");
    expect(profile.email).toBe("chenyu@example.com");
    expect(nextProfile.skills).toEqual(profile.skills);
    expect(nextProfile.skills).not.toBe(profile.skills);
  });

  it("parses browser-agent reviewed reports and merges them by safe field IDs", () => {
    const session = createBrowserFillPlan({
      profile: createDefaultCandidateRoleCard(),
      targetUrl: "https://jobs.example.com/apply",
    });
    const currentValues = Object.fromEntries(
      session.suggestions.map((suggestion) => [suggestion.fieldId, suggestion.value])
    );
    const parsed = parseBrowserReviewedFieldReport(JSON.stringify({
      fields: [
        {
          fieldId: "phone",
          inputName: "phone",
          fieldLabel: "Phone",
          value: "+86 139 1111 2222",
        },
      ],
    }));
    const merged = mergeReviewedFieldReport(
      session.suggestions,
      currentValues,
      parsed
    );

    expect(merged.phone).toBe("+86 139 1111 2222");
  });

  it("accepts a simple key-value reviewed report for browser agents without JSON output", () => {
    const parsed = parseBrowserReviewedFieldReport("phone=+86 139 1111 2222\nunknown=ignored");

    expect(parsed.phone).toBe("+86 139 1111 2222");
  });
});
