import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import AppHome from "../../components/AppHome";

jest.mock("next-auth/react", () => ({ signOut: jest.fn() }));

// Stub VoiceButton to keep AppHome tests isolated from SpeechRecognition
jest.mock("../../components/VoiceButton", () => () => (
  <div data-testid="voice-button" />
));

const { signOut } = require("next-auth/react");

describe("AppHome", () => {
  beforeEach(() => jest.clearAllMocks());

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
});
