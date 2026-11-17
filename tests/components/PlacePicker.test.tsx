import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PlacePicker } from "@/components/PlacePicker";
import { mockFetch } from "./helpers";

afterEach(() => {
  vi.unstubAllGlobals();
  Reflect.deleteProperty(navigator, "geolocation");
});

function setGeolocation(impl: Geolocation["getCurrentPosition"] | undefined) {
  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    value: impl ? { getCurrentPosition: impl } : undefined,
  });
}

describe("PlacePicker", () => {
  it("asks for at least two letters", async () => {
    render(<PlacePicker value={null} onChange={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Search" }));
    expect(screen.getByRole("status")).toHaveTextContent("Type at least 2 letters");
  });

  it("announces when nothing is found and when the service fails", async () => {
    mockFetch({ "/api/geocode": () => Response.json({ places: [] }) });
    render(<PlacePicker value={null} onChange={vi.fn()} />);
    await userEvent.type(screen.getByRole("searchbox"), "Zzzz");
    await userEvent.click(screen.getByRole("button", { name: "Search" }));
    expect(await screen.findByText("No places found. Try another spelling.")).toBeInTheDocument();

    mockFetch({ "/api/geocode": () => Response.json({ error: "Service down" }, { status: 502 }) });
    await userEvent.click(screen.getByRole("button", { name: "Search" }));
    expect(await screen.findByText("Service down")).toBeInTheDocument();
  });

  it("shows an associated error message", () => {
    render(<PlacePicker value={null} onChange={vi.fn()} error="Choose your city" />);
    expect(screen.getByRole("searchbox")).toHaveAccessibleDescription(/Error: Choose your city/);
  });

  it("uses rounded geolocation coordinates", async () => {
    const onChange = vi.fn();
    setGeolocation((success) =>
      success({ coords: { latitude: 28.61394, longitude: 77.20902 } } as GeolocationPosition),
    );
    render(<PlacePicker value={null} onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "Use my location" }));
    expect(onChange).toHaveBeenCalledWith({
      name: "My location",
      latitude: 28.61,
      longitude: 77.21,
    });
    expect(screen.getByRole("status")).toHaveTextContent("Using your current location.");
  });

  it("explains when location is denied or unsupported", async () => {
    setGeolocation((_ok, fail) => fail?.({} as GeolocationPositionError));
    const { unmount } = render(<PlacePicker value={null} onChange={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Use my location" }));
    expect(screen.getByRole("status")).toHaveTextContent("couldn't get your location");
    unmount();

    Reflect.deleteProperty(navigator, "geolocation");
    render(<PlacePicker value={null} onChange={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Use my location" }));
    expect(screen.getByRole("status")).toHaveTextContent("not available in this browser");
  });
});
