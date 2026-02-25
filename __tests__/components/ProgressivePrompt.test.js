import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import ProgressivePrompt from "../../components/ProgressivePrompt";

describe("ProgressivePrompt", () => {
  describe("rendering", () => {
    it("displays the habit name in the prompt text", () => {
      render(
        <ProgressivePrompt habitName="yoga" unit={null} onSubmit={jest.fn()} onSkip={jest.fn()} />
      );
      expect(screen.getByText(/Anything to add for yoga/i)).toBeInTheDocument();
    });

    it("renders a number input and unit label when unit is set", () => {
      render(
        <ProgressivePrompt habitName="water" unit="glasses" onSubmit={jest.fn()} onSkip={jest.fn()} />
      );
      expect(screen.getByRole("spinbutton")).toBeInTheDocument(); // type="number"
      expect(screen.getByText("glasses")).toBeInTheDocument();
    });

    it("renders a text input when unit is null", () => {
      render(
        <ProgressivePrompt habitName="yoga" unit={null} onSubmit={jest.fn()} onSkip={jest.fn()} />
      );
      expect(screen.getByRole("textbox")).toBeInTheDocument();
      // should NOT have a number spinbutton
      expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
    });

    it("shows placeholder 'e.g. 30 minutes' on the text input", () => {
      render(
        <ProgressivePrompt habitName="yoga" unit={null} onSubmit={jest.fn()} onSkip={jest.fn()} />
      );
      expect(screen.getByPlaceholderText("e.g. 30 minutes")).toBeInTheDocument();
    });

    it("renders both Done and Skip for now buttons", () => {
      render(
        <ProgressivePrompt habitName="yoga" unit={null} onSubmit={jest.fn()} onSkip={jest.fn()} />
      );
      expect(screen.getByRole("button", { name: /Done/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Skip for now/i })).toBeInTheDocument();
    });

    it("does not show celebration emoji (🎉 or 🎊)", () => {
      const { container } = render(
        <ProgressivePrompt habitName="yoga" unit={null} onSubmit={jest.fn()} onSkip={jest.fn()} />
      );
      expect(container.textContent).not.toContain("🎉");
      expect(container.textContent).not.toContain("🎊");
    });
  });

  describe("Done button state", () => {
    it("is disabled when input is empty", () => {
      render(
        <ProgressivePrompt habitName="yoga" unit={null} onSubmit={jest.fn()} onSkip={jest.fn()} />
      );
      expect(screen.getByRole("button", { name: /Done/i })).toBeDisabled();
    });

    it("is enabled once the text input has a value", () => {
      render(
        <ProgressivePrompt habitName="yoga" unit={null} onSubmit={jest.fn()} onSkip={jest.fn()} />
      );
      fireEvent.change(screen.getByRole("textbox"), { target: { value: "30 minutes" } });
      expect(screen.getByRole("button", { name: /Done/i })).not.toBeDisabled();
    });

    it("is enabled once the number input has a value", () => {
      render(
        <ProgressivePrompt habitName="water" unit="glasses" onSubmit={jest.fn()} onSkip={jest.fn()} />
      );
      fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "3" } });
      expect(screen.getByRole("button", { name: /Done/i })).not.toBeDisabled();
    });

    it("remains disabled when text input is only whitespace", () => {
      render(
        <ProgressivePrompt habitName="yoga" unit={null} onSubmit={jest.fn()} onSkip={jest.fn()} />
      );
      fireEvent.change(screen.getByRole("textbox"), { target: { value: "   " } });
      expect(screen.getByRole("button", { name: /Done/i })).toBeDisabled();
    });
  });

  describe("callbacks", () => {
    it("calls onSubmit with trimmed value and unit when Done is clicked (text input)", () => {
      const onSubmit = jest.fn();
      render(
        <ProgressivePrompt habitName="yoga" unit={null} onSubmit={onSubmit} onSkip={jest.fn()} />
      );
      fireEvent.change(screen.getByRole("textbox"), { target: { value: "  30 minutes  " } });
      fireEvent.click(screen.getByRole("button", { name: /Done/i }));
      expect(onSubmit).toHaveBeenCalledWith("30 minutes", null);
    });

    it("calls onSubmit with value and unit when Done is clicked (number input)", () => {
      const onSubmit = jest.fn();
      render(
        <ProgressivePrompt habitName="water" unit="glasses" onSubmit={onSubmit} onSkip={jest.fn()} />
      );
      fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "3" } });
      fireEvent.click(screen.getByRole("button", { name: /Done/i }));
      expect(onSubmit).toHaveBeenCalledWith("3", "glasses");
    });

    it("calls onSkip when Skip for now is clicked", () => {
      const onSkip = jest.fn();
      render(
        <ProgressivePrompt habitName="yoga" unit={null} onSubmit={jest.fn()} onSkip={onSkip} />
      );
      fireEvent.click(screen.getByRole("button", { name: /Skip for now/i }));
      expect(onSkip).toHaveBeenCalledTimes(1);
    });

    it("Skip for now is always enabled (even when input is empty)", () => {
      render(
        <ProgressivePrompt habitName="yoga" unit={null} onSubmit={jest.fn()} onSkip={jest.fn()} />
      );
      expect(screen.getByRole("button", { name: /Skip for now/i })).not.toBeDisabled();
    });

    it("does not call onSubmit when Done is clicked with empty input", () => {
      const onSubmit = jest.fn();
      render(
        <ProgressivePrompt habitName="yoga" unit={null} onSubmit={onSubmit} onSkip={jest.fn()} />
      );
      // Button should be disabled, but also verify handler guards
      const doneBtn = screen.getByRole("button", { name: /Done/i });
      expect(doneBtn).toBeDisabled();
      fireEvent.click(doneBtn);
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });
});
