import { describe, it, expect } from "bun:test";
import { checkForUpdate } from "./update-checker";

describe("#auto-update-checker", () => {
  describe("#when checking for updates", () => {
    it("#then returns updateAvailable=true when latest version is newer", async () => {
      const mockFetch = async () => {
        return {
          ok: true,
          json: async () => ({ version: "0.2.0" }),
        } as Response;
      };

      const result = await checkForUpdate("0.1.0", mockFetch);

      expect(result.updateAvailable).toBe(true);
      expect(result.latest).toBe("0.2.0");
      expect(result.current).toBe("0.1.0");
    });

    it("#then returns updateAvailable=false when versions are the same", async () => {
      const mockFetch = async () => {
        return {
          ok: true,
          json: async () => ({ version: "0.1.0" }),
        } as Response;
      };

      const result = await checkForUpdate("0.1.0", mockFetch);

      expect(result.updateAvailable).toBe(false);
      expect(result.latest).toBe("0.1.0");
      expect(result.current).toBe("0.1.0");
    });

    it("#then returns updateAvailable=false when current version is newer", async () => {
      const mockFetch = async () => {
        return {
          ok: true,
          json: async () => ({ version: "0.1.0" }),
        } as Response;
      };

      const result = await checkForUpdate("0.2.0", mockFetch);

      expect(result.updateAvailable).toBe(false);
      expect(result.latest).toBe("0.1.0");
      expect(result.current).toBe("0.2.0");
    });

    it("#then handles fetch errors gracefully", async () => {
      const mockFetch = async () => {
        throw new Error("Network error");
      };

      const result = await checkForUpdate("0.1.0", mockFetch);

      expect(result.updateAvailable).toBe(false);
      expect(result.latest).toBe("0.1.0");
      expect(result.current).toBe("0.1.0");
    });

    it("#then handles failed HTTP responses", async () => {
      const mockFetch = async () => {
        return {
          ok: false,
          status: 404,
        } as Response;
      };

      const result = await checkForUpdate("0.1.0", mockFetch);

      expect(result.updateAvailable).toBe(false);
      expect(result.latest).toBe("0.1.0");
      expect(result.current).toBe("0.1.0");
    });

    it("#then compares semantic versions correctly", async () => {
      const mockFetch = async () => {
        return {
          ok: true,
          json: async () => ({ version: "1.0.0" }),
        } as Response;
      };

      const result = await checkForUpdate("0.9.9", mockFetch);

      expect(result.updateAvailable).toBe(true);
    });

    it("#then handles missing version in response", async () => {
      const mockFetch = async () => {
        return {
          ok: true,
          json: async () => ({}),
        } as Response;
      };

      const result = await checkForUpdate("0.1.0", mockFetch);

      expect(result.updateAvailable).toBe(false);
      expect(result.latest).toBe("0.1.0");
    });
  });
});
