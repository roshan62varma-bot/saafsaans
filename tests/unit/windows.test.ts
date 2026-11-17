import { describe, expect, it } from "vitest";
import {
  addHours,
  findWindow,
  hourLabel,
  localHour,
  planWindows,
  upcoming,
} from "@/lib/engine/windows";
import { NOW, makeHourly, reading } from "../fixtures";

describe("time helpers", () => {
  it("reads the local hour", () => {
    expect(localHour("2026-11-17T08:00")).toBe(8);
  });

  it("adds hours across midnight without using the host time zone", () => {
    expect(addHours("2026-11-17T23:00", 2)).toBe("2026-11-18T01:00");
  });

  it("formats an hour label", () => {
    expect(hourLabel("2026-11-17T13:00")).toBe("13:00");
  });
});

describe("upcoming", () => {
  it("keeps the current hour through the look-ahead and drops missing PM2.5", () => {
    const hourly = makeHourly((h) => (h === 10 ? null : 100));
    const result = upcoming(hourly, NOW, 4);
    expect(result.map((r) => r.time)).toEqual([
      "2026-11-17T08:00",
      "2026-11-17T09:00",
      "2026-11-17T11:00",
      "2026-11-17T12:00",
    ]);
  });
});

describe("planWindows on a winter day", () => {
  const windows = planWindows(makeHourly(), NOW);

  it("finds the cleanest 2-hour outdoor window in the afternoon (earliest on ties)", () => {
    expect(windows.best).toMatchObject({
      start: "2026-11-17T13:00",
      end: "2026-11-17T15:00",
      avgPm25: 93,
    });
    expect(windows.best?.aqi.category).toBe("poor");
  });

  it("finds the dirtiest waking window in the evening", () => {
    expect(windows.worst).toMatchObject({ start: "2026-11-17T20:00", avgPm25: 260 });
  });

  it("finds the best hour to ventilate", () => {
    expect(windows.ventilation).toMatchObject({ start: "2026-11-17T13:00", avgPm25: 90 });
  });

  it("reports the forecast peak", () => {
    expect(windows.peakPm25).toBe(270);
  });
});

describe("findWindow edge cases", () => {
  const opts = { length: 2, hours: { start: 0, end: 24 }, pick: "best" as const };

  it("returns null when there are too few readings", () => {
    expect(findWindow([], opts)).toBeNull();
  });

  it("does not bridge gaps in the data", () => {
    const readings = [
      reading("2026-11-17T08:00", 10),
      reading("2026-11-17T10:00", 10),
    ] as Parameters<typeof findWindow>[0];
    expect(findWindow(readings, opts)).toBeNull();
  });

  it("ignores hours outside the allowed range", () => {
    const readings = [
      reading("2026-11-17T02:00", 5),
      reading("2026-11-17T03:00", 5),
    ] as Parameters<typeof findWindow>[0];
    expect(findWindow(readings, { ...opts, hours: { start: 6, end: 22 } })).toBeNull();
  });
});
