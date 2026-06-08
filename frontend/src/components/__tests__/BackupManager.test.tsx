import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BackupManager } from "../backup-manager";

const apiMocks = vi.hoisted(() => ({
  listBackups: vi.fn(),
  restoreBackup: vi.fn(),
  deleteBackup: vi.fn(),
  createBackup: vi.fn(),
}));

vi.mock("@/lib/api-client-unified", () => ({
  apiClient: {
    portability: {
      createBackup: apiMocks.createBackup,
      listBackups: apiMocks.listBackups,
      restoreBackup: apiMocks.restoreBackup,
      deleteBackup: apiMocks.deleteBackup,
    },
  },
}));

describe("BackupManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    apiMocks.listBackups.mockResolvedValue({
      backups: [
        {
          filename: "synchire_backup_20260608_120000.json",
          created_at: "2026-06-08T12:00:00.000Z",
          size: 2048,
        },
      ],
    });
    apiMocks.restoreBackup.mockResolvedValue({ success: true });
    apiMocks.deleteBackup.mockResolvedValue({ success: true });
    apiMocks.createBackup.mockResolvedValue({ filename: "synchire_backup_20260608_130000.json" });
  });

  it("renders backups returned by the portability API", async () => {
    render(<BackupManager />);

    expect(await screen.findByText(/2.0 KB/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Restore" })).toBeEnabled();
  });

  it("restores a selected backup", async () => {
    const user = userEvent.setup();
    render(<BackupManager />);

    await user.click(await screen.findByRole("button", { name: "Restore" }));

    expect(apiMocks.restoreBackup).toHaveBeenCalledWith("synchire_backup_20260608_120000.json");
    expect(await screen.findByText("Backup restored successfully")).toBeInTheDocument();
  });

  it("deletes a selected backup and reloads the list", async () => {
    const user = userEvent.setup();
    render(<BackupManager />);

    await user.click(
      await screen.findByRole("button", {
        name: "Delete backup synchire_backup_20260608_120000.json",
      })
    );

    expect(apiMocks.deleteBackup).toHaveBeenCalledWith("synchire_backup_20260608_120000.json");
    await waitFor(() => {
      expect(apiMocks.listBackups).toHaveBeenCalledTimes(2);
    });
  });
});
