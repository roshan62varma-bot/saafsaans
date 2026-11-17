import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProfileForm } from "@/components/ProfileForm";
import { SAMPLE_PROFILE } from "@/lib/client/profileForm";
import { expectAccessible, mockFetch } from "./helpers";

afterEach(() => vi.unstubAllGlobals());

const PUNE = {
  name: "Pune",
  latitude: 18.52,
  longitude: 73.86,
  country: "India",
  region: "Maharashtra",
};

describe("ProfileForm", () => {
  it("is accessible", async () => {
    const { container } = render(<ProfileForm initial={null} onSave={vi.fn()} />);
    await expectAccessible(container);
  });

  it("loads the sample family in one click", async () => {
    const onSave = vi.fn();
    render(<ProfileForm initial={null} onSave={onSave} />);
    await userEvent.click(screen.getByRole("button", { name: "Try a sample Delhi family" }));
    expect(onSave).toHaveBeenCalledWith(SAMPLE_PROFILE);
  });

  it("shows a focused error summary linking to each invalid field", async () => {
    const onSave = vi.fn();
    const { container } = render(<ProfileForm initial={null} onSave={onSave} />);
    await userEvent.clear(screen.getByRole("textbox", { name: "Name or nickname" }));
    await userEvent.click(screen.getByRole("button", { name: "Build my family's plan" }));

    const summary = await screen.findByRole("alert");
    await waitFor(() => expect(summary).toHaveFocus());
    expect(summary).toHaveTextContent("Please fix 2 problems");
    expect(onSave).not.toHaveBeenCalled();

    const name = screen.getByRole("textbox", { name: "Name or nickname" });
    expect(name).toHaveAttribute("aria-invalid", "true");
    expect(name).toHaveAccessibleDescription("Error: Name: Required");

    await userEvent.click(within(summary).getByRole("link", { name: "Name: Required" }));
    expect(name).toHaveFocus();
    await expectAccessible(container);
  });

  it("builds a full household profile", async () => {
    mockFetch({ "/api/geocode": () => Response.json({ places: [PUNE] }) });
    const onSave = vi.fn();
    render(<ProfileForm initial={null} onSave={onSave} />);

    await userEvent.type(screen.getByRole("searchbox", { name: "City or town" }), "Pune{Enter}");
    await userEvent.click(await screen.findByRole("radio", { name: "Pune, Maharashtra, India" }));
    expect(screen.getByText("Selected:")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "+ Add a person" }));
    const names = screen.getAllByRole("textbox", { name: "Name or nickname" });
    await userEvent.type(names[1]!, "Riya");
    await userEvent.selectOptions(
      screen.getAllByRole("combobox", { name: "Age group" })[1]!,
      "child",
    );
    await userEvent.click(screen.getAllByRole("checkbox", { name: "Asthma" })[1]!);
    await userEvent.click(screen.getAllByRole("checkbox", { name: "Asthma" })[1]!);
    await userEvent.click(screen.getAllByRole("checkbox", { name: "Asthma" })[1]!);

    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: /Main way you travel/ }),
      "bus",
    );
    await userEvent.clear(screen.getByRole("spinbutton", { name: "One-way distance (km)" }));
    await userEvent.type(screen.getByRole("spinbutton", { name: "One-way distance (km)" }), "7");
    await userEvent.clear(screen.getByRole("spinbutton", { name: "Days per week" }));
    await userEvent.type(screen.getByRole("spinbutton", { name: "Days per week" }), "6");
    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: "Main cooking fuel" }),
      "biomass",
    );
    await userEvent.clear(screen.getByRole("spinbutton", { name: /Main bedroom size/ }));
    await userEvent.type(screen.getByRole("spinbutton", { name: /Main bedroom size/ }), "15");
    await userEvent.click(screen.getByRole("checkbox", { name: "We already own an air purifier" }));
    await userEvent.click(screen.getByRole("radio", { name: /Draughty/ }));
    await userEvent.click(screen.getByRole("radio", { name: /Above ₹10,000/ }));
    await userEvent.click(screen.getByRole("radio", { name: /हिन्दी/ }));

    await userEvent.click(screen.getByRole("button", { name: "Build my family's plan" }));
    expect(onSave).toHaveBeenCalledTimes(1);
    const saved = onSave.mock.calls[0]![0];
    expect(saved).toMatchObject({
      place: PUNE,
      commute: { mode: "bus", distanceKm: 7, daysPerWeek: 6 },
      cookingFuel: "biomass",
      hasPurifier: true,
      bedroomAreaM2: 15,
      sealing: "leaky",
      budget: "high",
      language: "hi",
    });
    expect(saved.members[1]).toMatchObject({
      label: "Riya",
      ageGroup: "child",
      conditions: ["asthma"],
    });
  });

  it("hides commute details when not commuting and allows removing people", async () => {
    render(<ProfileForm initial={SAMPLE_PROFILE} onSave={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Edit your household");
    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: /Main way you travel/ }),
      "none",
    );
    expect(screen.queryByRole("spinbutton", { name: "Days per week" })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Remove person 2/ }));
    expect(screen.getAllByRole("textbox", { name: "Name or nickname" })).toHaveLength(2);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "+ Add a person" })).toHaveFocus(),
    );
  });

  it("supports cancelling an edit", async () => {
    const onCancel = vi.fn();
    render(<ProfileForm initial={SAMPLE_PROFILE} onSave={vi.fn()} onCancel={onCancel} />);
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalled();
  });
});
