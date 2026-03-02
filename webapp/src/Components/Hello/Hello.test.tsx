import { render, screen } from "@testing-library/react";
import { Hello } from "./Hello";

it("renders welcome message", () => {
  render(<Hello />);
  expect(screen.getByText("Hello World!")).toBeInTheDocument();
});
