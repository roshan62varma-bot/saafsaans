import { renderHook, act } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, getJson, isAbort, messageOf, postJson, postRaw } from "@/lib/client/api";
import {
  SAMPLE_PROFILE,
  fieldId,
  fromFormState,
  newMember,
  toFormState,
} from "@/lib/client/profileForm";
import {
  PROFILE_KEY,
  clearProfile,
  readProfile,
  saveProfile,
  useProfile,
} from "@/lib/client/profileStore";
import { profileSchema } from "@/lib/schemas";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("profile form model", () => {
  it("starts with one person and sensible defaults", () => {
    const form = toFormState(null, "id-1");
    expect(form.members).toEqual([newMember("id-1", 0)]);
    expect(form.place).toBeNull();
    expect(newMember("x", 2).label).toBe("");
  });

  it("round-trips a saved profile", () => {
    const result = fromFormState(toFormState(SAMPLE_PROFILE, "unused"));
    expect(result).toEqual({ ok: true, profile: SAMPLE_PROFILE });
  });

  it("zeroes the commute when the person does not commute", () => {
    const form = {
      ...toFormState(SAMPLE_PROFILE, "x"),
      commuteMode: "none" as const,
      distanceKm: "",
    };
    const result = fromFormState(form);
    expect(result.ok && result.profile.commute).toEqual({
      mode: "none",
      distanceKm: 0,
      daysPerWeek: 0,
    });
  });

  it("maps every problem to its field with a friendly message", () => {
    const form = {
      ...toFormState(null, "id-1"),
      members: [{ ...newMember("id-1", 0), label: " " }],
      distanceKm: "",
      daysPerWeek: "8",
      bedroomAreaM2: "2",
    };
    const result = fromFormState(form);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toEqual({
      "place-search": "Choose your city or use your current location",
      "members-0-label": "Name: Required",
      "commute-distanceKm": "Enter a one-way distance between 0 and 100 km",
      "commute-daysPerWeek": "Enter a whole number of days from 0 to 7",
      bedroomAreaM2: "Enter a bedroom area between 4 and 60 m²",
    });
  });

  it("reports an empty household", () => {
    const result = fromFormState({ ...toFormState(SAMPLE_PROFILE, "x"), members: [] });
    expect(!result.ok && result.errors["add-member"]).toBe("Add at least one person");
  });

  it.each([
    [["place", "name"], "place-search"],
    [["members"], "add-member"],
    [["members", 1], "members-1-label"],
    [["members", 1, "ageGroup"], "members-1-ageGroup"],
    [["commute"], "commute-mode"],
    [["sealing"], "sealing"],
    [[], "form"],
  ] as const)("fieldId(%j) → %s", (path, id) => {
    expect(fieldId(path)).toBe(id);
  });
});

describe("profile store", () => {
  it("saves, reads (memoised) and clears", () => {
    expect(readProfile()).toBeNull();
    saveProfile(SAMPLE_PROFILE);
    const first = readProfile();
    expect(first).toEqual(SAMPLE_PROFILE);
    expect(readProfile()).toBe(first);
    clearProfile();
    expect(readProfile()).toBeNull();
  });

  it("ignores tampered or corrupt data", () => {
    localStorage.setItem(PROFILE_KEY, JSON.stringify({ ...SAMPLE_PROFILE, budget: "infinite" }));
    expect(readProfile()).toBeNull();
    localStorage.setItem(PROFILE_KEY, "{oops");
    expect(readProfile()).toBeNull();
  });

  it("keeps working when storage is blocked", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => saveProfile(SAMPLE_PROFILE)).not.toThrow();
    expect(() => clearProfile()).not.toThrow();
    expect(readProfile()).toBeNull();
  });

  it("notifies subscribers through the hook", () => {
    const { result, unmount } = renderHook(() => useProfile());
    expect(result.current).toBeNull();
    act(() => saveProfile(SAMPLE_PROFILE));
    expect(result.current?.place.name).toBe("New Delhi");
    act(() => clearProfile());
    expect(result.current).toBeNull();
    unmount();
  });
});

describe("client api", () => {
  it("posts JSON and parses the response", async () => {
    const fetchMock = vi.fn(async () => Response.json({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(postJson("/api/x", { a: 1 })).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/x",
      expect.objectContaining({ method: "POST", body: '{"a":1}' }),
    );
  });

  it("surfaces the server's safe error message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ error: "Too fast" }, { status: 429 })),
    );
    const error = await postRaw("/api/x", {}).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(messageOf(error)).toBe("Too fast");
  });

  it("uses a generic message for non-JSON errors and network failures", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("<html>", { status: 500 })),
    );
    await expect(getJson("/api/x")).rejects.toMatchObject({
      status: 500,
      message: expect.stringMatching(/try again/),
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ nope: 1 }, { status: 400 })),
    );
    await expect(getJson("/api/x")).rejects.toMatchObject({ status: 400 });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Promise.reject(new TypeError("offline"))),
    );
    await expect(postJson("/api/x", {})).rejects.toMatchObject({ status: 0 });
    await expect(getJson("/api/x")).rejects.toMatchObject({ status: 0 });
    expect(messageOf(new Error("x"))).toMatch(/try again/);
  });

  it("re-throws aborts untouched", async () => {
    const abort = new DOMException("Aborted", "AbortError");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Promise.reject(abort)),
    );
    await expect(postRaw("/api/x", {})).rejects.toBe(abort);
    await expect(getJson("/api/x")).rejects.toBe(abort);
    expect(isAbort(abort)).toBe(true);
    expect(isAbort(new Error("x"))).toBe(false);
  });

  it("gets JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ places: [] })),
    );
    await expect(getJson("/api/geocode?q=x")).resolves.toEqual({ places: [] });
  });
});

describe("schemas", () => {
  it("accepts Devanagari names and rejects markup", () => {
    const base = SAMPLE_PROFILE.members[0]!;
    const ok = profileSchema.safeParse({
      ...SAMPLE_PROFILE,
      members: [{ ...base, label: "दादी माँ" }],
    });
    expect(ok.success).toBe(true);
    const bad = profileSchema.safeParse({
      ...SAMPLE_PROFILE,
      members: [{ ...base, label: "<b>x</b>" }],
    });
    expect(bad.success).toBe(false);
  });
});
