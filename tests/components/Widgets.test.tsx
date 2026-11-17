import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AirNow } from "@/components/AirNow";
import { CommunityAdvisory } from "@/components/CommunityAdvisory";
import { ForecastChart, summarizeForecast } from "@/components/ForecastChart";
import { ImpactCalculator } from "@/components/ImpactCalculator";
import { PlanView } from "@/components/PlanView";
import { SAMPLE_PROFILE } from "@/lib/client/profileForm";
import type { FactSheet } from "@/lib/types";
import { expectAccessible, facts, insights, mockFetch, planResponse } from "./helpers";

afterEach(() => vi.unstubAllGlobals());

describe("AirNow", () => {
  it("explains the numbers and labels tomorrow's windows", () => {
    const tomorrow = { ...facts.worstWindow!, start: "2026-11-18T20:00", end: "2026-11-18T22:00" };
    render(<AirNow facts={{ ...facts, worstWindow: tomorrow, usAqi: null }} />);
    expect(screen.getByText("tomorrow")).toBeInTheDocument();
    expect(screen.getByText("16.7×")).toBeInTheDocument();
    expect(screen.getByText("PM2.5", { selector: "dd" })).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("handles missing forecast windows", () => {
    render(
      <AirNow facts={{ ...facts, bestWindow: null, worstWindow: null, ventilationWindow: null }} />,
    );
    expect(screen.getAllByText("Not enough forecast data yet.")).toHaveLength(3);
  });
});

describe("ForecastChart", () => {
  it("summarises the forecast as text", () => {
    expect(summarizeForecast(insights.forecast)).toBe(
      "Hourly AQI forecast for the next 3 hours. Lowest 217 (Poor) at 14:00; highest 400 (Very Poor) at 08:00.",
    );
    expect(summarizeForecast([])).toBe("No forecast available.");
  });

  it("renders an empty state", () => {
    render(<ForecastChart points={[]} />);
    expect(screen.getByText("No forecast available for this location.")).toBeInTheDocument();
  });

  it("offers an accessible data table", async () => {
    const { container } = render(<ForecastChart points={insights.forecast} />);
    expect(screen.getAllByRole("row")).toHaveLength(4);
    await expectAccessible(container);
  });
});

describe("PlanView", () => {
  it("marks the plan language for screen readers and omits empty sections", () => {
    const plan = { ...planResponse.plan, memberNotes: [], topActions: [] };
    const { container } = render(<PlanView plan={plan} source="rules" language="hi" />);
    expect(container.firstElementChild).toHaveAttribute("lang", "hi");
    expect(screen.queryByRole("heading", { name: "For each person" })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Biggest wins this week" }),
    ).not.toBeInTheDocument();
  });
});

describe("ImpactCalculator", () => {
  it("computes savings for a commute switch and warns about active-travel exposure", async () => {
    render(<ImpactCalculator facts={facts} />);
    expect(
      screen.getByText(/Switching from petrol car to metro saves 18 kg CO2/),
    ).toBeInTheDocument();
    expect(screen.getByText("936 kg")).toBeInTheDocument();

    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: "I could switch to" }),
      "cycle",
    );
    expect(screen.getByText(/raises your own dose/)).toBeInTheDocument();

    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: "I could switch to" }),
      "car_petrol",
    );
    expect(screen.getByText(/would not reduce emissions/)).toBeInTheDocument();
  });

  it("clamps odd input and starts from a car for people who do not commute", async () => {
    const noCommute: FactSheet = {
      ...facts,
      commute: { mode: "none", distanceKm: 0, daysPerWeek: 0 },
      commuteSwaps: [],
    };
    render(<ImpactCalculator facts={noCommute} />);
    expect(screen.getByRole("combobox", { name: "Now I travel by" })).toHaveValue("car_petrol");
    const days = screen.getByRole("spinbutton", { name: "Days per week" });
    await userEvent.clear(days);
    await userEvent.type(days, "99");
    const distance = screen.getByRole("spinbutton", { name: "One-way distance (km)" });
    await userEvent.clear(distance);
    expect(screen.getByText("0 kg")).toBeInTheDocument();
  });

  it("totals household pledges", async () => {
    const { container } = render(<ImpactCalculator facts={facts} />);
    expect(screen.getByText("No pledges yet.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("checkbox", { name: /inverter battery/ }));
    expect(screen.getByText(/keep about 728 g of PM2.5 and 572 kg of CO2/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("checkbox", { name: /mosquito coils/ }));
    await userEvent.click(screen.getByRole("checkbox", { name: /inverter battery/ }));
    expect(screen.getByText(/keep about 146 g of PM2.5 out/)).toBeInTheDocument();
    await expectAccessible(container);
  });
});

describe("CommunityAdvisory", () => {
  it("generates, copies and shares an advisory", async () => {
    const fetchMock = mockFetch({
      "/api/advisory": () => Response.json({ message: "AQI 400 — stay in.", source: "ai" }),
    });
    const writeText = vi.fn(async () => undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    const { container } = render(<CommunityAdvisory profile={SAMPLE_PROFILE} />);

    await userEvent.click(screen.getByRole("radio", { name: "School" }));
    await userEvent.click(screen.getByRole("radio", { name: /हिन्दी/ }));
    await userEvent.click(screen.getByRole("button", { name: "Write advisory" }));
    expect(await screen.findByText("AQI 400 — stay in.")).toHaveAttribute("lang", "hi");
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toMatchObject({
      audience: "school",
      language: "hi",
    });

    await userEvent.click(screen.getByRole("button", { name: "Copy text" }));
    expect(writeText).toHaveBeenCalledWith("AQI 400 — stay in.");
    expect(screen.getByText("Copied to clipboard.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Share on WhatsApp/ })).toHaveAttribute(
      "href",
      `https://wa.me/?text=${encodeURIComponent("AQI 400 — stay in.")}`,
    );
    await expectAccessible(container);
  });

  it("reports copy and network failures", async () => {
    mockFetch({ "/api/advisory": () => Response.json({ message: "Hi", source: "rules" }) });
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn(async () => Promise.reject(new Error("denied"))) },
    });
    render(<CommunityAdvisory profile={SAMPLE_PROFILE} />);
    await userEvent.click(screen.getByRole("button", { name: "Write advisory" }));
    await userEvent.click(await screen.findByRole("button", { name: "Copy text" }));
    expect(screen.getByText(/Copy failed/)).toBeInTheDocument();

    mockFetch({ "/api/advisory": () => Response.json({ error: "Slow down" }, { status: 429 }) });
    await userEvent.click(screen.getByRole("button", { name: "Write advisory" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Slow down");
  });
});

describe("small UI pieces", () => {
  it("renders the decorative logo hidden from assistive tech", async () => {
    const { Logo } = await import("@/components/ui/Logo");
    const { container } = render(<Logo size={24} />);
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("shows the AQI value next to the category when given", async () => {
    const { AqiBadge } = await import("@/components/ui/AqiBadge");
    render(<AqiBadge category="severe" value={450} />);
    expect(screen.getByText("Severe")).toHaveTextContent("Severe· AQI 450");
  });
});
