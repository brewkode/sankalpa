import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import HabitConfirmCard from "../../components/HabitConfirmCard";

const singleHabit        = [{ habit_name: "yoga",  quantity: null, unit: null }];
const habitWithQuantity  = [{ habit_name: "yoga",  quantity: 30,   unit: "minutes" }];
const habitQuantityOnly  = [{ habit_name: "yoga",  quantity: 30,   unit: null }];
const multiHabits        = [
  { habit_name: "yoga",  quantity: 30, unit: "minutes" },
  { habit_name: "water", quantity: 3,  unit: "glasses" },
];

describe("HabitConfirmCard", () => {
  it("renders the confirmation prompt message", () => {
    render(<HabitConfirmCard habits={singleHabit} onConfirm={jest.fn()} onDiscard={jest.fn()} />);
    expect(
      screen.getByText("Not sure about this one — want to log it?")
    ).toBeInTheDocument();
  });

  it("renders the habit name for a simple habit (no quantity)", () => {
    render(<HabitConfirmCard habits={singleHabit} onConfirm={jest.fn()} onDiscard={jest.fn()} />);
    expect(screen.getByText("yoga")).toBeInTheDocument();
  });

  it("renders quantity and unit when both are present", () => {
    render(<HabitConfirmCard habits={habitWithQuantity} onConfirm={jest.fn()} onDiscard={jest.fn()} />);
    expect(screen.getByText("yoga (30 minutes)")).toBeInTheDocument();
  });

  it("renders quantity without unit when unit is null", () => {
    render(<HabitConfirmCard habits={habitQuantityOnly} onConfirm={jest.fn()} onDiscard={jest.fn()} />);
    expect(screen.getByText("yoga (30)")).toBeInTheDocument();
  });

  it("renders multiple habits joined by a comma", () => {
    render(<HabitConfirmCard habits={multiHabits} onConfirm={jest.fn()} onDiscard={jest.fn()} />);
    expect(screen.getByText("yoga (30 minutes), water (3 glasses)")).toBeInTheDocument();
  });

  it("renders a 'Yes, log it' button", () => {
    render(<HabitConfirmCard habits={singleHabit} onConfirm={jest.fn()} onDiscard={jest.fn()} />);
    expect(screen.getByRole("button", { name: /Yes, log it/i })).toBeInTheDocument();
  });

  it("renders a 'Discard' button", () => {
    render(<HabitConfirmCard habits={singleHabit} onConfirm={jest.fn()} onDiscard={jest.fn()} />);
    expect(screen.getByRole("button", { name: /Discard/i })).toBeInTheDocument();
  });

  it("calls onConfirm when 'Yes, log it' is clicked", () => {
    const onConfirm = jest.fn();
    render(<HabitConfirmCard habits={singleHabit} onConfirm={onConfirm} onDiscard={jest.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /Yes, log it/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("calls onDiscard when 'Discard' is clicked", () => {
    const onDiscard = jest.fn();
    render(<HabitConfirmCard habits={singleHabit} onConfirm={jest.fn()} onDiscard={onDiscard} />);
    fireEvent.click(screen.getByRole("button", { name: /Discard/i }));
    expect(onDiscard).toHaveBeenCalledTimes(1);
  });

  it("does not render celebration emoji", () => {
    render(<HabitConfirmCard habits={singleHabit} onConfirm={jest.fn()} onDiscard={jest.fn()} />);
    expect(screen.queryByText(/🎉|🎊/)).not.toBeInTheDocument();
  });
});
