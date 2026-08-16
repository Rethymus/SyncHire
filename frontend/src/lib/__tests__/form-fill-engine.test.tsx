/**
 * Form Fill Engine tests
 *
 * Includes the critical integration case: filling React controlled
 * inputs/selects/checkboxes must trigger their onChange handlers (the
 * native-prototype-setter technique), which is what makes the engine
 * work on real ATS application forms.
 */

import { describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import React, { useState } from "react";

import {
  applyFillPlan,
  detectFormFields,
  planFromProfile,
  fillField,
} from "../form-fill-engine";

afterEach(() => cleanup());

describe("detectFormFields", () => {
  it("detects labeled fields and maps them to profile keys", () => {
    const root = document.createElement("div");
    root.innerHTML = `
      <form>
        <label for="full-name">Full Name 姓名</label>
        <input id="full-name" name="applicant_name" type="text" />
        <label for="mail">Email Address</label>
        <input id="mail" name="email" type="email" />
        <input type="hidden" name="csrf" value="x" />
        <input type="submit" value="Go" />
        <select id="edu" name="education">
          <option value="">请选择</option>
          <option value="bachelor">本科 Bachelor</option>
        </select>
      </form>
    `;
    document.body.appendChild(root);

    const fields = detectFormFields(root);
    // hidden + submit are excluded
    expect(fields).toHaveLength(3);

    expect(fields[0].controlType).toBe("text");
    expect(fields[0].profileKey).toBe("fullName");
    expect(fields[1].controlType).toBe("text");
    expect(fields[1].profileKey).toBe("email");
    expect(fields[2].controlType).toBe("select");
    expect(fields[2].profileKey).toBe("education");
    expect(fields[2].options).toEqual(["", "bachelor"]);

    root.remove();
  });

  it("flags custom combobox widgets for manual action", () => {
    const root = document.createElement("div");
    root.innerHTML = `
      <input role="combobox" aria-label="University 学校" name="school" />
    `;
    document.body.appendChild(root);

    const fields = detectFormFields(root);
    expect(fields[0].controlType).toBe("custom");
    expect(fields[0].needsManualAction).toBe(true);

    root.remove();
  });

  it("detects checkbox groups and textareas with bilingual labels", () => {
    const root = document.createElement("div");
    root.innerHTML = `
      <label><input type="checkbox" name="agree" /> 同意条款</label>
      <textarea name="self_intro" aria-label="自我介绍 Self Introduction"></textarea>
    `;
    document.body.appendChild(root);

    const fields = detectFormFields(root);
    expect(fields[0].controlType).toBe("checkbox");
    expect(fields[1].controlType).toBe("textarea");
    expect(fields[1].profileKey).toBe("personalSummary");

    root.remove();
  });
});

describe("fillField", () => {
  const mount = (html: string) => {
    const root = document.createElement("div");
    root.innerHTML = html;
    document.body.appendChild(root);
    return root;
  };

  it("fills a native select by option text, not just value", () => {
    const root = mount(`
      <select aria-label="学历 Education">
        <option value="">choose</option>
        <option value="1">本科 Bachelor</option>
        <option value="2">硕士 Master</option>
      </select>
    `);
    const [field] = detectFormFields(root);
    const outcome = fillField(root, field.index, "硕士 Master");
    expect(outcome.status).toBe("filled");
    expect((root.querySelector("select") as HTMLSelectElement).value).toBe("2");
    root.remove();
  });

  it("marks select needs-review when no option matches", () => {
    const root = mount(`
      <select aria-label="Education">
        <option value="a">A</option>
        <option value="b">B</option>
      </select>
    `);
    const [field] = detectFormFields(root);
    const outcome = fillField(root, field.index, "博士 PhD");
    expect(outcome.status).toBe("needs-review");
    expect(outcome.reason).toBe("no-matching-option");
    root.remove();
  });

  it("checks the matching radio in a group", () => {
    const root = mount(`
      <input type="radio" name="avail" value="immediately" aria-label="Availability" />
      <input type="radio" name="avail" value="later" />
    `);
    const fields = detectFormFields(root);
    const outcome = fillField(root, fields[0].index, "later");
    expect(outcome.status).toBe("filled");
    const radios = Array.from(root.querySelectorAll("input")) as HTMLInputElement[];
    expect(radios[1].checked).toBe(true);
    expect(radios[0].checked).toBe(false);
    root.remove();
  });

  it("multi-select selects without clearing other options", () => {
    const root = mount(`
      <select multiple aria-label="Skills 技能">
        <option value="py" selected>Python</option>
        <option value="go">Go</option>
      </select>
    `);
    const [field] = detectFormFields(root);
    const outcome = fillField(root, field.index, "go");
    expect(outcome.status).toBe("filled");
    const selected = Array.from(
      (root.querySelector("select") as HTMLSelectElement).selectedOptions,
    ).map((o) => o.value);
    expect(selected).toEqual(["py", "go"]);
    root.remove();
  });
});

describe("built IIFE bundle smoke test", () => {
  it("loads the esbuild artifact and detects fields (guards build config)", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const bundlePath = path.join(
      __dirname,
      "../../../../electron/job-browser/fill-engine.iife.js",
    );
    if (!fs.existsSync(bundlePath)) {
      throw new Error(
        "fill-engine.iife.js missing — run `npm run build:fill-engine` first",
      );
    }

    const container = document.createElement("div");
    container.innerHTML = '<input aria-label="Email 邮箱" />';
    document.body.appendChild(container);

    // Classic <script src> semantics: top-level var lands on the
    // global. Emulate by capturing the declared binding's value.
    const load = new Function(
      `${fs.readFileSync(bundlePath, "utf8")}; return SynchireFillEngine;`,
    );
    const engine = load();

    expect(engine).toBeTruthy();
    const fields = engine.detectFormFields(container);
    expect(fields[0].profileKey).toBe("email");
  });
});

describe("React controlled component integration", () => {
  const ControlledForm = () => {
    const [name, setName] = React.useState("");
    const [degree, setDegree] = React.useState("");
    const [consent, setConsent] = React.useState(false);
    return (
      <form aria-label="application">
        <label>
          Full Name
          <input
            aria-label="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label>
          Education
          <select
            aria-label="Education 学历"
            value={degree}
            onChange={(e) => setDegree(e.target.value)}
          >
            <option value="">select</option>
            <option value="bachelor">本科 Bachelor</option>
            <option value="master">硕士 Master</option>
          </select>
        </label>
        <label>
          <input
            type="checkbox"
            aria-label="Work Authorization 工作许可"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />
          Authorized
        </label>
        <output aria-label="mirror">{`${name}|${degree}|${consent}`}</output>
      </form>
    );
  };

  it("native setter + events trigger React onChange for text, select, checkbox", async () => {
    render(<ControlledForm />);
    const mirror = screen.getByLabelText("mirror");
    const form = mirror.closest("form") as HTMLFormElement;

    const fields = detectFormFields(form);
    expect(fields.map((f) => f.profileKey)).toEqual([
      "fullName",
      "education",
      "workAuthorization",
    ]);

    const outcomes = applyFillPlan(form, [
      { index: 0, value: "张三" },
      { index: 1, value: "硕士 Master" },
      { index: 2, value: "true" },
    ]);

    expect(outcomes.every((o) => o.status === "filled")).toBe(true);
    await screen.findByText("张三|master|true");
    expect(mirror.textContent).toBe("张三|master|true");
  });

  it("planFromProfile only fills empty detected profile fields", () => {
    const root = document.createElement("div");
    root.innerHTML = `
      <input aria-label="Email" name="email" value="already@set.dev" />
      <input aria-label="Phone 手机号" name="phone" />
    `;
    document.body.appendChild(root);

    const plan = planFromProfile(root, {
      email: "new@example.com",
      phone: "13800138000",
    } as any);

    expect(plan).toEqual([{ index: 1, value: "13800138000" }]);
    root.remove();
  });
});
