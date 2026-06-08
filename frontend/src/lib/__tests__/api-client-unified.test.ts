import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "../api-client-unified";

const mockFetch = vi.fn();

global.fetch = mockFetch as typeof global.fetch;

describe("api-client-unified portability and JD helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });
  });

  it("restores backups using an encoded backup id", async () => {
    await apiClient.portability.restoreBackup("synchire_backup_20260608 120000.json");

    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:8000/api/portability/backups/synchire_backup_20260608%20120000.json/restore",
      expect.objectContaining({
        method: "POST",
      })
    );
  });

  it("deletes backups using an encoded backup id", async () => {
    await apiClient.portability.deleteBackup("synchire_backup_20260608 120000.json");

    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:8000/api/portability/backups/synchire_backup_20260608%20120000.json",
      expect.objectContaining({
        method: "DELETE",
      })
    );
  });

  it("imports job descriptions from URLs", async () => {
    await apiClient.jd.import("https://example.com/jobs/123");

    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:8000/api/jds/import",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ url: "https://example.com/jobs/123" }),
      })
    );
  });
});
