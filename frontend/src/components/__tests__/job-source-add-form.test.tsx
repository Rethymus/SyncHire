import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { JobSourceAddForm } from "../job-source-add-form";
import { LITE_LOCALE_STORAGE_KEY } from "@/lib/lite-i18n";

function renderForm(onAdd: (values: { url: string; name: string }) => Promise<void>, busy = false) {
  return render(<JobSourceAddForm busy={busy} onAdd={onAdd} />);
}

afterEach(() => {
  window.localStorage.clear();
});

describe("JobSourceAddForm", () => {
  it("submits validated values and resets after the request resolves", async () => {
    const onAdd = vi.fn().mockResolvedValue(undefined);
    renderForm(onAdd);

    fireEvent.change(screen.getByLabelText(/Recruiting page URL/i), {
      target: { value: "https://job-boards.greenhouse.io/stripe" },
    });
    fireEvent.change(screen.getByLabelText(/Company name \(optional\)/i), {
      target: { value: "Stripe" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Add/i }));

    await waitFor(() => expect(onAdd).toHaveBeenCalledTimes(1));
    expect(onAdd).toHaveBeenCalledWith({
      url: "https://job-boards.greenhouse.io/stripe",
      name: "Stripe",
    });

    await waitFor(() => {
      expect(screen.getByLabelText(/Recruiting page URL/i)).toHaveValue("");
      expect(screen.getByLabelText(/Company name \(optional\)/i)).toHaveValue("");
    });
  });

  it("submits via Enter key in the URL field", async () => {
    const onAdd = vi.fn().mockResolvedValue(undefined);
    renderForm(onAdd);

    const urlInput = screen.getByLabelText(/Recruiting page URL/i);
    fireEvent.change(urlInput, {
      target: { value: "https://boards.greenhouse.io/figma" },
    });
    fireEvent.submit(urlInput.closest("form") as HTMLFormElement);

    await waitFor(() => expect(onAdd).toHaveBeenCalledTimes(1));
  });

  it("blocks submit and shows the English required message when the URL is empty", async () => {
    const onAdd = vi.fn().mockResolvedValue(undefined);
    renderForm(onAdd);

    fireEvent.click(screen.getByRole("button", { name: /Add/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "This field is required"
    );
    expect(onAdd).not.toHaveBeenCalled();

    const urlInput = screen.getByLabelText(/Recruiting page URL/i);
    expect(urlInput).toHaveAttribute("aria-invalid", "true");
    expect(urlInput.getAttribute("aria-describedby")).toBe("job-source-url-error");
  });

  it("shows the English URL-format message for a malformed URL", async () => {
    const onAdd = vi.fn().mockResolvedValue(undefined);
    renderForm(onAdd);

    fireEvent.change(screen.getByLabelText(/Recruiting page URL/i), {
      target: { value: "not-a-url" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Add/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Enter a valid URL starting with http(s)://"
    );
    expect(onAdd).not.toHaveBeenCalled();
  });

  it("shows bilingual validation messages in the zh-CN locale", async () => {
    window.localStorage.setItem(LITE_LOCALE_STORAGE_KEY, "zh-CN");
    const onAdd = vi.fn().mockResolvedValue(undefined);
    renderForm(onAdd);

    fireEvent.click(screen.getByRole("button", { name: "添加" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("此项为必填");

    fireEvent.change(screen.getByLabelText(/招聘页链接/), {
      target: { value: "not-a-url" },
    });
    fireEvent.click(screen.getByRole("button", { name: "添加" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "请输入以 http(s):// 开头的有效链接"
    );
    expect(onAdd).not.toHaveBeenCalled();
  });

  it("keeps values when the add request fails so the user can retry", async () => {
    const onAdd = vi.fn().mockRejectedValue(new Error("boom"));
    renderForm(onAdd);

    const urlInput = screen.getByLabelText(/Recruiting page URL/i);
    fireEvent.change(urlInput, {
      target: { value: "https://job-boards.greenhouse.io/stripe" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Add/i }));

    await waitFor(() => expect(onAdd).toHaveBeenCalledTimes(1));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.getByLabelText(/Recruiting page URL/i)).toHaveValue(
      "https://job-boards.greenhouse.io/stripe"
    );
  });

  it("disables the submit button while busy", () => {
    renderForm(vi.fn().mockResolvedValue(undefined), true);
    expect(screen.getByRole("button", { name: /Add/i })).toBeDisabled();
  });
});
