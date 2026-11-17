import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "@/components/App";
import { Dashboard } from "@/components/Dashboard";
import { SAMPLE_PROFILE } from "@/lib/client/profileForm";
import { saveProfile } from "@/lib/client/profileStore";
import { expectAccessible, insights, mockFetch, planResponse, streamResponse } from "./helpers";

afterEach(() => vi.unstubAllGlobals());

const okRoutes = {
  "/api/insights": () => Response.json(insights),
  "/api/plan": () => Response.json(planResponse),
};

describe("Dashboard", () => {
  it("renders live air, the plan, indoor hacks and impact once data arrives", async () => {
    mockFetch(okRoutes);
    const { container } = render(<Dashboard profile={SAMPLE_PROFILE} onEdit={vi.fn()} />);
    expect(screen.getByText("Loading live air quality…")).toBeInTheDocument();
    expect(screen.getByText("Writing your personalised plan…")).toBeInTheDocument();

    expect(await screen.findByText("AQI (CPCB)")).toBeInTheDocument();
    expect(screen.getByText("11.4 cigarettes")).toBeInTheDocument();
    expect(await screen.findByText(/Personalised by Gemini/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Your day, step by step" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Priya" })).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: /Hourly AQI forecast for the next 3 hours/ }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Purifier size you need/)).toBeInTheDocument();
    await expectAccessible(container);
  });

  it("shows errors with a working retry", async () => {
    let fail = true;
    mockFetch({
      "/api/insights": () =>
        fail
          ? Response.json({ error: "Air service unavailable" }, { status: 502 })
          : Response.json(insights),
      "/api/plan": () => Response.json({ error: "Too many requests" }, { status: 429 }),
    });
    render(<Dashboard profile={SAMPLE_PROFILE} onEdit={vi.fn()} />);
    const airSection = screen.getByRole("region", { name: "Air right now" });
    expect(await within(airSection).findByText("Air service unavailable")).toBeInTheDocument();
    expect(await screen.findByText("Too many requests")).toBeInTheDocument();

    fail = false;
    await userEvent.click(within(airSection).getByRole("button", { name: "Try again" }));
    expect(await within(airSection).findByText("AQI (CPCB)")).toBeInTheDocument();
  });

  it("labels rule-engine plans honestly", async () => {
    mockFetch({
      ...okRoutes,
      "/api/plan": () => Response.json({ ...planResponse, source: "rules" }),
    });
    render(<Dashboard profile={SAMPLE_PROFILE} onEdit={vi.fn()} />);
    expect(
      await screen.findByText("Built by our rule engine from your live air data"),
    ).toBeInTheDocument();
  });
});

describe("App", () => {
  it("goes from setup to dashboard and back to editing", async () => {
    mockFetch(okRoutes);
    render(<App />);
    await userEvent.click(screen.getByRole("button", { name: "Try a sample Delhi family" }));
    expect(
      await screen.findByRole("heading", { level: 1, name: "Your smog-season plan" }),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Edit household" }));
    expect(
      screen.getByRole("heading", { level: 1, name: "Edit your household" }),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(
      await screen.findByRole("heading", { level: 1, name: "Your smog-season plan" }),
    ).toBeInTheDocument();
  });
});

describe("AskAssistant (inside the dashboard)", () => {
  it("streams answers into an accessible log", async () => {
    mockFetch({
      ...okRoutes,
      "/api/chat": () => streamResponse(["Keep Aarav ", "indoors until 13:00."]),
    });
    saveProfile(SAMPLE_PROFILE);
    render(<Dashboard profile={SAMPLE_PROFILE} onEdit={vi.fn()} />);
    const ask = screen.getByRole("region", { name: "Ask the assistant" });
    await userEvent.click(
      within(ask).getByRole("button", { name: "Is it safe for my kids to play outside today?" }),
    );
    const log = within(ask).getByRole("log");
    expect(await within(log).findByText("Keep Aarav indoors until 13:00.")).toBeInTheDocument();
    expect(log).toHaveAttribute("aria-busy", "false");

    await userEvent.type(
      within(ask).getByRole("textbox", { name: "Your question" }),
      "And Dadi?{Enter}",
    );
    await waitFor(() =>
      expect(within(log).getAllByText("Keep Aarav indoors until 13:00.")).toHaveLength(2),
    );
  });

  it("restores the question and shows the error when the assistant fails", async () => {
    mockFetch({
      ...okRoutes,
      "/api/chat": () =>
        Response.json({ error: "The AI assistant is not configured." }, { status: 503 }),
    });
    render(<Dashboard profile={SAMPLE_PROFILE} onEdit={vi.fn()} />);
    const ask = screen.getByRole("region", { name: "Ask the assistant" });
    const input = within(ask).getByRole("textbox", { name: "Your question" });
    expect(within(ask).getByRole("button", { name: "Ask" })).toBeDisabled();
    await userEvent.type(input, "Hello?");
    await userEvent.click(within(ask).getByRole("button", { name: "Ask" }));
    expect(await within(ask).findByRole("alert")).toHaveTextContent(
      "The AI assistant is not configured.",
    );
    expect(input).toHaveValue("Hello?");
  });

  it("treats an empty stream as a failure", async () => {
    mockFetch({ ...okRoutes, "/api/chat": () => streamResponse([]) });
    render(<Dashboard profile={SAMPLE_PROFILE} onEdit={vi.fn()} />);
    const ask = screen.getByRole("region", { name: "Ask the assistant" });
    await userEvent.type(within(ask).getByRole("textbox", { name: "Your question" }), "Hi{Enter}");
    expect(await within(ask).findByRole("alert")).toHaveTextContent(/try again/);
  });
});
