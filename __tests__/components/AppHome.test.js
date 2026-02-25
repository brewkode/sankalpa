import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import AppHome from "../../components/AppHome";

jest.mock("next-auth/react", () => ({ signOut: jest.fn() }));
jest.mock("next/navigation", () => ({ useRouter: () => ({ refresh: jest.fn() }) }));

// Stub VoiceButton as a spy so we can assert on the props it receives
const MockVoiceButton = jest.fn(() => <div data-testid="voice-button" />);
jest.mock("../../components/VoiceButton", () => (props) => MockVoiceButton(props));

const { signOut } = require("next-auth/react");

describe("AppHome", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    MockVoiceButton.mockClear();
  });

  it("displays the user's name in the welcome message", () => {
    render(<AppHome user={{ name: "Alice", email: "alice@example.com" }} />);
    expect(screen.getByText(/Welcome, Alice/)).toBeInTheDocument();
  });

  it("falls back to the user's email when name is absent", () => {
    render(<AppHome user={{ email: "bob@example.com" }} />);
    expect(screen.getByText(/Welcome, bob@example\.com/)).toBeInTheDocument();
  });

  it('falls back to "there" when user has neither name nor email', () => {
    render(<AppHome user={{}} />);
    expect(screen.getByText(/Welcome, there/)).toBeInTheDocument();
  });

  it("renders a sign-out button", () => {
    render(<AppHome user={{ name: "Alice" }} />);
    expect(screen.getByRole("button", { name: /sign out/i })).toBeInTheDocument();
  });

  it('calls signOut with callbackUrl "/" when sign-out is clicked', () => {
    render(<AppHome user={{ name: "Alice" }} />);
    fireEvent.click(screen.getByRole("button", { name: /sign out/i }));
    expect(signOut).toHaveBeenCalledWith({ callbackUrl: "/" });
  });

  it("renders the VoiceButton", () => {
    render(<AppHome user={{ name: "Alice" }} />);
    expect(screen.getByTestId("voice-button")).toBeInTheDocument();
  });

  it("passes onSuccess as a function to VoiceButton", () => {
    render(<AppHome user={{ name: "Alice" }} />);
    const props = MockVoiceButton.mock.calls[0][0];
    expect(typeof props.onSuccess).toBe("function");
  });

  // ── Habit summary ──────────────────────────────────────────────────────────

  it('shows "No habits logged yet." when summary is empty', () => {
    render(<AppHome user={{ name: "Alice" }} summary={[]} />);
    expect(screen.getByText("No habits logged yet.")).toBeInTheDocument();
  });

  it("renders a habit row for each summary entry", () => {
    const summary = [
      { habit_name: "yoga", habit_name_display: "Yoga", count: 5, avg_units: 30, unit_display: "min", current_streak: 3 },
      { habit_name: "water", habit_name_display: "Water", count: 7, avg_units: null, unit_display: null, current_streak: 1 },
    ];
    render(<AppHome user={{ name: "Alice" }} summary={summary} />);
    expect(screen.getByText("Yoga")).toBeInTheDocument();
    expect(screen.getByText("Water")).toBeInTheDocument();
  });

  it("shows streak emoji for habits with streak ≥ 2", () => {
    const summary = [
      { habit_name: "yoga", habit_name_display: "Yoga", count: 5, avg_units: null, unit_display: null, current_streak: 3 },
    ];
    render(<AppHome user={{ name: "Alice" }} summary={summary} />);
    expect(screen.getByText(/🔥 3 days/)).toBeInTheDocument();
  });

  // ── Nudge (Feature 3 — nudges array) ───────────────────────────────────────

  it("renders nothing in the nudge area when nudges is empty", () => {
    render(<AppHome user={{ name: "Alice" }} nudges={[]} />);
    expect(screen.queryByText(/Log today to keep it going/i)).not.toBeInTheDocument();
  });

  it("renders a single nudge with correct text", () => {
    const nudges = [{ habit_name: "yoga", habit_name_display: "Yoga", streak: 7 }];
    render(<AppHome user={{ name: "Alice" }} nudges={nudges} />);
    expect(screen.getByText(/Yoga — 7 days\. Log today to keep it going\./)).toBeInTheDocument();
  });

  it("renders multiple nudges", () => {
    const nudges = [
      { habit_name: "yoga",      habit_name_display: "Yoga",      streak: 7 },
      { habit_name: "meditation", habit_name_display: "Meditation", streak: 3 },
    ];
    render(<AppHome user={{ name: "Alice" }} nudges={nudges} />);
    expect(screen.getByText(/Yoga — 7 days\. Log today to keep it going\./)).toBeInTheDocument();
    expect(screen.getByText(/Meditation — 3 days\. Log today to keep it going\./)).toBeInTheDocument();
  });
});
