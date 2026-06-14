import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ResumePreview } from "../resume-preview";

describe("ResumePreview", () => {
  it("renders sanitized markdown into the A4 page", () => {
    render(
      <ResumePreview
        content={"# 你好\n\n- a\n- b"}
        themeId="modern"
        columns
        icons
        onePage={false}
      />,
    );
    expect(screen.getByText("你好")).toBeTruthy();
    expect(screen.getByText("a")).toBeTruthy();
    expect(screen.getByText("b")).toBeTruthy();
  });

  it("renders a masked icon span when icons are enabled", () => {
    const { container } = render(
      <ResumePreview
        content="icon:email chen@x.com"
        themeId="minimal"
        columns
        icons
        onePage={false}
      />,
    );
    expect(container.querySelector(".ri-mail")).toBeTruthy();
  });

  it("leaves icon syntax inert when the icons plugin is off", () => {
    const { container } = render(
      <ResumePreview
        content="icon:email chen@x.com"
        themeId="minimal"
        columns
        icons={false}
        onePage={false}
      />,
    );
    expect(container.querySelector(".ri-mail")).toBeNull();
  });

  it("calls onFitChange once measured", () => {
    const onFitChange = vi.fn();
    render(
      <ResumePreview
        content="short"
        themeId="minimal"
        columns
        icons
        onePage={false}
        onFitChange={onFitChange}
      />,
    );
    // The effect fires after mount; flush.
    expect(onFitChange).toHaveBeenCalled();
  });
});
