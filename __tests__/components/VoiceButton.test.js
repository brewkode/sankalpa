import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import VoiceButton from "../../components/VoiceButton";

// Mock HabitConfirmCard to isolate VoiceButton's state machine logic
jest.mock("../../components/HabitConfirmCard", () =>
  function MockHabitConfirmCard({ habits, onConfirm, onDiscard }) {
    return (
      <div data-testid="habit-confirm-card">
        <span data-testid="card-habits">{habits.map((h) => h.habit_name).join(",")}</span>
        <button onClick={onConfirm}>Yes, log it</button>
        <button onClick={onDiscard}>Discard</button>
      </div>
    );
  }
);

// window.SpeechRecognition is set to jest.fn() by jest.setup.js,
// which runs before this module is imported. VoiceButton captures that
// reference at module load time, so configuring the mock here affects
// the SpeechRecognition constructor that VoiceButton actually calls.

let mockInstance;

beforeEach(() => {
  // Fresh recognition instance for every test
  mockInstance = {
    continuous: false,
    interimResults: false,
    lang: "",
    start: jest.fn(),
    onstart: null,
    onresult: null,
    onerror: null,
    onend: null,
  };
  window.SpeechRecognition.mockImplementation(() => mockInstance);
  global.fetch = jest.fn();
});

describe("VoiceButton", () => {
  it('renders the "Tell me" button in idle state', () => {
    render(<VoiceButton />);
    expect(screen.getByRole("button", { name: /Tell me/i })).toBeInTheDocument();
  });

  it("button is disabled while recording", () => {
    render(<VoiceButton />);
    const button = screen.getByRole("button", { name: /Tell me/i });

    fireEvent.click(button);

    // startRecording calls setStatus("recording") synchronously before start()
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent("Listening…");
  });

  it('shows "✨ Logged." after a successful habit log', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, logs: [] }),
    });

    render(<VoiceButton />);
    fireEvent.click(screen.getByRole("button", { name: /Tell me/i }));

    act(() => {
      mockInstance.onresult({
        results: [[{ transcript: "I did yoga for 30 minutes" }]],
      });
    });

    await waitFor(() => {
      expect(screen.getByText("✨ Logged.")).toBeInTheDocument();
    });
  });

  it("shows the API error message when the request fails", async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Could not parse habits from input" }),
    });

    render(<VoiceButton />);
    fireEvent.click(screen.getByRole("button", { name: /Tell me/i }));

    act(() => {
      mockInstance.onresult({ results: [[{ transcript: "xyzzy" }]] });
    });

    await waitFor(() => {
      expect(
        screen.getByText("Could not parse habits from input")
      ).toBeInTheDocument();
    });
  });

  it('shows "Could not save. Try again." on a network failure', async () => {
    global.fetch.mockRejectedValue(new Error("Network error"));

    render(<VoiceButton />);
    fireEvent.click(screen.getByRole("button", { name: /Tell me/i }));

    act(() => {
      mockInstance.onresult({ results: [[{ transcript: "I did yoga" }]] });
    });

    await waitFor(() => {
      expect(screen.getByText("Could not save. Try again.")).toBeInTheDocument();
    });
  });

  it('shows "Microphone access denied." on a not-allowed speech error', () => {
    render(<VoiceButton />);
    fireEvent.click(screen.getByRole("button", { name: /Tell me/i }));

    act(() => {
      mockInstance.onerror({ error: "not-allowed" });
    });

    expect(screen.getByText("Microphone access denied.")).toBeInTheDocument();
  });

  it("shows a generic error for other speech recognition failures", () => {
    render(<VoiceButton />);
    fireEvent.click(screen.getByRole("button", { name: /Tell me/i }));

    act(() => {
      mockInstance.onerror({ error: "network" });
    });

    expect(
      screen.getByText("Voice recognition failed. Try again.")
    ).toBeInTheDocument();
  });

  // ── Confidence confirmation flow ───────────────────────────────────────────

  it("shows HabitConfirmCard when the API returns requiresConfirmation", async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        requiresConfirmation: true,
        habits: [{ habit_name: "yoga", quantity: null, unit: null, confidence: 0.45 }],
      }),
    });

    render(<VoiceButton />);
    fireEvent.click(screen.getByRole("button", { name: /Tell me/i }));

    act(() => {
      mockInstance.onresult({ results: [[{ transcript: "yoga" }]] });
    });

    await waitFor(() => {
      expect(screen.getByTestId("habit-confirm-card")).toBeInTheDocument();
    });
    expect(screen.getByTestId("card-habits")).toHaveTextContent("yoga");
  });

  it("the Tell me button is disabled while in confirming state", async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        requiresConfirmation: true,
        habits: [{ habit_name: "yoga", quantity: null, unit: null, confidence: 0.45 }],
      }),
    });

    render(<VoiceButton />);
    fireEvent.click(screen.getByRole("button", { name: /Tell me/i }));

    act(() => {
      mockInstance.onresult({ results: [[{ transcript: "yoga" }]] });
    });

    await waitFor(() => screen.getByTestId("habit-confirm-card"));

    expect(screen.getByRole("button", { name: /Tell me/i })).toBeDisabled();
  });

  it("posts confirmed: true with pendingHabits when user clicks Yes, log it", async () => {
    const habits = [{ habit_name: "yoga", quantity: null, unit: null, confidence: 0.45 }];
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ requiresConfirmation: true, habits }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, logs: [] }),
      });

    render(<VoiceButton />);
    fireEvent.click(screen.getByRole("button", { name: /Tell me/i }));

    act(() => {
      mockInstance.onresult({ results: [[{ transcript: "yoga" }]] });
    });

    await waitFor(() => screen.getByTestId("habit-confirm-card"));

    fireEvent.click(screen.getByRole("button", { name: /Yes, log it/i }));

    await waitFor(() => {
      expect(screen.getByText("✨ Logged.")).toBeInTheDocument();
    });

    expect(global.fetch).toHaveBeenCalledTimes(2);
    const secondBody = JSON.parse(global.fetch.mock.calls[1][1].body);
    expect(secondBody.confirmed).toBe(true);
    expect(secondBody.habits).toEqual(habits);
    expect(secondBody.voiceInput).toBe("yoga");
  });

  it("resets to idle and removes the card when user clicks Discard", async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        requiresConfirmation: true,
        habits: [{ habit_name: "yoga", quantity: null, unit: null, confidence: 0.45 }],
      }),
    });

    render(<VoiceButton />);
    fireEvent.click(screen.getByRole("button", { name: /Tell me/i }));

    act(() => {
      mockInstance.onresult({ results: [[{ transcript: "yoga" }]] });
    });

    await waitFor(() => screen.getByTestId("habit-confirm-card"));

    fireEvent.click(screen.getByRole("button", { name: /Discard/i }));

    await waitFor(() => {
      expect(screen.queryByTestId("habit-confirm-card")).not.toBeInTheDocument();
    });
    // Voice button re-enabled and ready
    expect(screen.getByRole("button", { name: /Tell me/i })).not.toBeDisabled();
  });
});
