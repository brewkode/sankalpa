import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import VoiceButton from "../../components/VoiceButton";

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
    const button = screen.getByRole("button");

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
    fireEvent.click(screen.getByRole("button"));

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
    fireEvent.click(screen.getByRole("button"));

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
    fireEvent.click(screen.getByRole("button"));

    act(() => {
      mockInstance.onresult({ results: [[{ transcript: "I did yoga" }]] });
    });

    await waitFor(() => {
      expect(screen.getByText("Could not save. Try again.")).toBeInTheDocument();
    });
  });

  it('shows "Microphone access denied." on a not-allowed speech error', () => {
    render(<VoiceButton />);
    fireEvent.click(screen.getByRole("button"));

    act(() => {
      mockInstance.onerror({ error: "not-allowed" });
    });

    expect(screen.getByText("Microphone access denied.")).toBeInTheDocument();
  });

  it("shows a generic error for other speech recognition failures", () => {
    render(<VoiceButton />);
    fireEvent.click(screen.getByRole("button"));

    act(() => {
      mockInstance.onerror({ error: "network" });
    });

    expect(
      screen.getByText("Voice recognition failed. Try again.")
    ).toBeInTheDocument();
  });
});
