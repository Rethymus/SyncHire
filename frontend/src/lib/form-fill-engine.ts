/**
 * Form Fill Engine - DOM form detection and injection filling
 *
 * The execution layer beneath browser-fill-assistant.ts: it detects
 * real form fields in a page, maps them to profile keys, and fills
 * values in a way that React/Vue controlled components observe
 * (native prototype setters + dispatched events, the technique proven
 * by autofill extensions). Custom widgets (non-native dropdowns) are
 * flagged for human action instead of being force-filled, and this
 * engine never submits forms — review-and-submit stays with the user.
 *
 * Designed to run inside a plain DOM: the web app's test suite, an
 * Electron <webview> via executeJavaScript, or a browser extension
 * content script.
 */

import {
  FIELD_MAP,
  inferProfileKey,
  type BrowserFormField,
  type ProfileFieldKey,
} from "./browser-fill-assistant";

export type ControlType =
  | "text"
  | "textarea"
  | "select"
  | "select-multiple"
  | "checkbox"
  | "radio"
  | "file"
  | "custom"
  | "unknown";

export interface DetectedFormField {
  /** Index into the page-wide detection result; use as fill target. */
  index: number;
  controlType: ControlType;
  /** Best-effort accessible label for display and matching. */
  label: string;
  name: string;
  profileKey: ProfileFieldKey | null;
  value: string | null;
  options?: string[];
  /** True for non-native widgets the engine will not auto-fill. */
  needsManualAction: boolean;
  /** Live element reference; omitted when serialized across contexts. */
  element: HTMLElement | null;
}

export type FieldFillStatus = "filled" | "skipped" | "needs-review";

export interface FillOutcomeItem {
  index: number;
  label: string;
  profileKey: ProfileFieldKey | null;
  status: FieldFillStatus;
  reason?: string;
}

const TEXT_INPUT_TYPES = new Set([
  "text",
  "email",
  "tel",
  "url",
  "number",
  "search",
  "password",
]);

const FILLABLE_SELECTOR = "input, select, textarea";

function normalize(text: string | null | undefined): string {
  return (text ?? "").trim().toLowerCase().replace(/[\s:_-]+/g, " ");
}

/** True when an input is a custom widget (combobox/autocomplete). */
function isCustomCombobox(el: HTMLInputElement): boolean {
  const role = el.getAttribute("role");
  return (
    (role === "combobox" || role === "listbox" || el.getAttribute("aria-haspopup") === "listbox") &&
    el.getAttribute("aria-readonly") !== "true"
  );
}

function controlTypeOf(el: Element): ControlType {
  if (el instanceof HTMLTextAreaElement) return "textarea";
  if (el instanceof HTMLSelectElement) {
    return el.multiple ? "select-multiple" : "select";
  }
  if (el instanceof HTMLInputElement) {
    if (isCustomCombobox(el)) return "custom";
    if (el.type === "checkbox") return "checkbox";
    if (el.type === "radio") return "radio";
    if (el.type === "file") return "file";
    if (TEXT_INPUT_TYPES.has(el.type)) return "text";
  }
  return "unknown";
}

/** Resolve the most human-meaningful label for a form control. */
function labelFor(el: HTMLElement, root: ParentNode): string {
  const labelledBy = el.getAttribute("aria-labelledby");
  if (labelledBy) {
    const refs = labelledBy
      .split(/\s+/)
      .map((id) => root.querySelector(`#${CSS.escape(id)}`))
      .filter((node): node is Element => node !== null)
      .map((node) => (node.textContent ?? "").trim())
      .join(" ");
    if (refs) return refs.slice(0, 120);
  }

  // Per accessible-name computation, aria-label outranks label elements
  const aria = el.getAttribute("aria-label");
  if (aria) return aria.slice(0, 120);

  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    if (el.labels && el.labels.length > 0) {
      return (el.labels[0].textContent ?? "").trim().slice(0, 120);
    }
  }

  if (el.id) {
    const label = root.querySelector(`label[for="${CSS.escape(el.id)}"]`);
    if (label) return (label.textContent ?? "").trim().slice(0, 120);
  }

  const placeholder = el.getAttribute("placeholder");
  if (placeholder) return placeholder.slice(0, 120);

  return el.getAttribute("name") ?? "";
}

/**
 * Detect fillable fields in a document or subtree, mapping each to a
 * profile key via browser-fill-assistant's bilingual FIELD_MAP.
 */
export function detectFormFields(root: ParentNode): DetectedFormField[] {
  const fields: DetectedFormField[] = [];
  const elements = Array.from(root.querySelectorAll(FILLABLE_SELECTOR));

  elements.forEach((el) => {
    if (!(el instanceof HTMLElement)) return;

    const inputEl = el as HTMLInputElement;
    if (inputEl.type === "hidden" || inputEl.disabled || inputEl.readOnly) return;
    if (inputEl.type === "button" || inputEl.type === "submit" || inputEl.type === "reset") {
      return;
    }

    const controlType = controlTypeOf(el);
    const label = labelFor(el, root);
    const name = el.getAttribute("name") ?? el.id ?? "";
    const matchTarget: BrowserFormField = {
      id: name || `field-${fields.length}`,
      label,
      inputName: name,
      kind: controlType === "textarea" ? "textarea" : controlType.startsWith("select")
        ? "select"
        : "text",
    };
    const profileKey = inferProfileKey(matchTarget);

    const field: DetectedFormField = {
      index: fields.length,
      controlType,
      label,
      name,
      profileKey,
      value: currentValueOf(el),
      needsManualAction: controlType === "custom" || controlType === "unknown",
      element: el,
    };

    if (el instanceof HTMLSelectElement) {
      field.options = Array.from(el.options).map((option) => option.value);
    }

    fields.push(field);
  });

  return fields;
}

function currentValueOf(el: Element): string | null {
  if (el instanceof HTMLInputElement) {
    return el.type === "checkbox" || el.type === "radio"
      ? (el.checked ? "checked" : "")
      : el.value;
  }
  if (el instanceof HTMLTextAreaElement) return el.value;
  if (el instanceof HTMLSelectElement) return el.value;
  return null;
}

/* ------------------------------------------------------------------ */
/* Filling: native setters + dispatched events so frameworks observe  */
/* ------------------------------------------------------------------ */

function nativeSetter<K extends "value" | "checked">(
  prototype: object,
  key: K,
): ((el: any, value: any) => void) | null {
  const descriptor = Object.getOwnPropertyDescriptor(prototype, key);
  if (!descriptor || !descriptor.set) return null;
  return (el: any, value: any) => descriptor.set!.call(el, value);
}

const inputValueSetter = nativeSetter(HTMLInputElement.prototype, "value");
const textAreaValueSetter = nativeSetter(HTMLTextAreaElement.prototype, "value");
const selectValueSetter = nativeSetter(HTMLSelectElement.prototype, "value");

function dispatch(el: Element, type: string, bubbles = true): void {
  el.dispatchEvent(new Event(type, { bubbles, cancelable: true }));
}

/** Select the option whose value or visible text matches `value`. */
function matchSelectOption(
  el: HTMLSelectElement,
  value: string,
): HTMLOptionElement | null {
  const wanted = normalize(value);
  let byText: HTMLOptionElement | null = null;
  for (const option of Array.from(el.options)) {
    if (option.value === value) return option;
    if (normalize(option.textContent) === wanted) byText = option;
  }
  return byText;
}

/**
 * Fill a single detected field (looked up by index within `root`).
 * Returns the outcome; never throws for unsupported controls.
 */
export function fillField(
  root: ParentNode,
  fieldIndex: number,
  value: string,
): FillOutcomeItem {
  const fields = detectFormFields(root);
  const field = fields[fieldIndex];
  if (!field || !field.element) {
    return {
      index: fieldIndex,
      label: field?.label ?? "",
      profileKey: field?.profileKey ?? null,
      status: "skipped",
      reason: "field-not-found",
    };
  }

  const outcome: FillOutcomeItem = {
    index: fieldIndex,
    label: field.label,
    profileKey: field.profileKey,
    status: "skipped",
  };

  if (field.needsManualAction) {
    outcome.status = "needs-review";
    outcome.reason = "custom-control";
    return outcome;
  }

  const el = field.element;

  if (el instanceof HTMLSelectElement) {
    const option = matchSelectOption(el, value);
    if (!option) {
      outcome.status = "needs-review";
      outcome.reason = "no-matching-option";
      return outcome;
    }
    if (el.multiple) {
      option.selected = true;
    } else if (selectValueSetter) {
      selectValueSetter(el, option.value);
    } else {
      el.value = option.value;
    }
    dispatch(el, "input");
    dispatch(el, "change");
    outcome.status = "filled";
    return outcome;
  }

  if (el instanceof HTMLTextAreaElement) {
    if (textAreaValueSetter) textAreaValueSetter(el, value);
    else el.value = value;
    dispatch(el, "input");
    dispatch(el, "change");
    outcome.status = "filled";
    return outcome;
  }

  if (el instanceof HTMLInputElement) {
    switch (el.type) {
      case "checkbox": {
        // Native .click() runs real activation behavior (toggles +
        // fires click/input/change) and bypasses React's checked
        // tracker dedup, unlike property assignment
        const desired = value === "true" || value === "yes" || value === "checked";
        if (el.checked !== desired) el.click();
        else {
          dispatch(el, "input");
          dispatch(el, "change");
        }
        outcome.status = "filled";
        return outcome;
      }
      case "radio": {
        const wanted = normalize(value);
        const group = Array.from(
          (el.getRootNode() as ParentNode).querySelectorAll(
            `input[type="radio"][name="${CSS.escape(el.name ?? "")}"]`,
          ),
        ) as HTMLInputElement[];
        const target =
          group.find((r) => r.value === value || normalize(r.value) === wanted) ?? null;
        if (!target) {
          outcome.status = "needs-review";
          outcome.reason = "no-matching-option";
          return outcome;
        }
        if (!target.checked) target.click();
        else {
          dispatch(target, "input");
          dispatch(target, "change");
        }
        outcome.status = "filled";
        return outcome;
      }
      case "file": {
        // Real files can be attached via DataTransfer where supported;
        // otherwise surface for manual action.
        try {
          const dt = new DataTransfer();
          dt.items.add(
            new File([value], value.split("/").pop() || "resume.pdf", {
              type: "application/pdf",
            }),
          );
          el.files = dt.files;
          dispatch(el, "input");
          dispatch(el, "change");
          outcome.status = "filled";
          return outcome;
        } catch {
          outcome.status = "needs-review";
          outcome.reason = "file-requires-manual-selection";
          return outcome;
        }
      }
      default: {
        if (!TEXT_INPUT_TYPES.has(el.type)) {
          outcome.status = "needs-review";
          outcome.reason = "unsupported-input-type";
          return outcome;
        }
        if (inputValueSetter) inputValueSetter(el, value);
        else el.value = value;
        dispatch(el, "input");
        dispatch(el, "change");
        outcome.status = "filled";
        return outcome;
      }
    }
  }

  outcome.status = "needs-review";
  outcome.reason = "unknown-control";
  return outcome;
}

export interface FillPlanEntry {
  /** Target field index from detectFormFields. */
  index: number;
  value: string;
}

/** Apply a batch fill plan; safe to run partially, returns per-field outcomes. */
export function applyFillPlan(
  root: ParentNode,
  plan: FillPlanEntry[],
): FillOutcomeItem[] {
  return plan.map((entry) => fillField(root, entry.index, entry.value));
}

/**
 * Convenience: build a fill plan from a profile keyed map, e.g.
 * { email: "a@b.c", fullName: "张三" } matched against detected fields.
 * Only fields with a detected profileKey and no existing value are
 * included; everything else is left for review.
 */
export function planFromProfile(
  root: ParentNode,
  profile: Partial<Record<ProfileFieldKey, string>>,
): FillPlanEntry[] {
  const fields = detectFormFields(root);
  const plan: FillPlanEntry[] = [];
  for (const field of fields) {
    if (!field.profileKey) continue;
    if (field.value && field.value.trim() !== "" && field.value !== "checked") continue;
    const value = profile[field.profileKey];
    if (value == null || value === "") continue;
    plan.push({ index: field.index, value });
  }
  return plan;
}

export { FIELD_MAP };
