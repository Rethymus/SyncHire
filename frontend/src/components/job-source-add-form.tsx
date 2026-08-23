"use client";

/**
 * Job Source Add Form - reference implementation of the RHF + zod convention.
 *
 * See docs/frontend-forms.md. Three parts: locale-aware zod schema,
 * zodResolver-wired useForm, register-based inputs with role="alert"
 * error text. Validation copy lives in LITE_COPY.formValidation so
 * every RHF+zod form shares the same bilingual messages.
 */

import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { LITE_COPY, useLiteCopy } from "@/lib/lite-i18n";
import { Plus } from "lucide-react";

const ADD_FORM_COPY = {
  "en-US": {
    urlPlaceholder:
      "Recruiting page URL, e.g. https://job-boards.greenhouse.io/stripe",
    namePlaceholder: "Company name (optional)",
    add: "Add",
  },
  "zh-CN": {
    urlPlaceholder: "招聘页链接，如 https://job-boards.greenhouse.io/stripe",
    namePlaceholder: "公司名（可选）",
    add: "添加",
  },
} as const;

/** Values handed to the parent after validation passes. */
export interface JobSourceAddValues {
  url: string;
  name: string;
}

interface JobSourceAddFormProps {
  /** True while the page-level add/seed request is in flight. */
  busy: boolean;
  /** Called once per valid submit; the form resets after this resolves. */
  onAdd: (values: JobSourceAddValues) => Promise<void>;
}

export function JobSourceAddForm({ busy, onAdd }: JobSourceAddFormProps) {
  const { locale } = useLiteCopy();
  const copy = ADD_FORM_COPY[locale];
  const messages = LITE_COPY[locale].formValidation;

  const schema = useMemo(
    () =>
      z.object({
        url: z.string().min(1, messages.required).url(messages.invalidUrl),
        name: z.string().optional(),
      }),
    [messages]
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<z.input<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { url: "", name: "" },
  });

  const urlError = errors.url?.message;

  return (
    <form
      className="flex flex-wrap gap-3 items-start"
      onSubmit={handleSubmit(async (values) => {
        try {
          await onAdd({ url: values.url, name: values.name ?? "" });
        } catch {
          // Parent owns error display; keep entered values so the user can retry.
          return;
        }
        reset({ url: "", name: "" });
      })}
      noValidate
    >
      <div className="flex-1 min-w-[260px]">
        <input
          id="job-source-url"
          type="url"
          placeholder={copy.urlPlaceholder}
          aria-label={copy.urlPlaceholder}
          aria-invalid={urlError ? true : undefined}
          aria-describedby={urlError ? "job-source-url-error" : undefined}
          className="w-full rounded-md border border-input px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          {...register("url")}
        />
        {urlError && (
          <p
            id="job-source-url-error"
            role="alert"
            className="mt-1 text-xs text-red-600"
          >
            {urlError}
          </p>
        )}
      </div>
      <div className="w-44 min-w-[11rem]">
        <input
          id="job-source-name"
          type="text"
          placeholder={copy.namePlaceholder}
          aria-label={copy.namePlaceholder}
          className="w-full rounded-md border border-input px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          {...register("name")}
        />
      </div>
      <button
        type="submit"
        disabled={busy}
        className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        <Plus className="h-4 w-4" aria-hidden />
        {copy.add}
      </button>
    </form>
  );
}
