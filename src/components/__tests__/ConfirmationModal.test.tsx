import { render, screen, fireEvent } from "@testing-library/react";
import ConfirmationModal from "../ConfirmationModal";

describe("ConfirmationModal", () => {
  it("does not render when isOpen is false", () => {
    const { container } = render(
      <ConfirmationModal
        isOpen={false}
        word="serendipity"
        onCancel={jest.fn()}
        onConfirm={jest.fn()}
        isConfirming={false}
      />
    );
    expect(
      container.querySelector('[data-testid="confirmation-modal"]')
    ).not.toBeInTheDocument();
  });

  it("renders when isOpen is true", () => {
    render(
      <ConfirmationModal
        isOpen={true}
        word="serendipity"
        onCancel={jest.fn()}
        onConfirm={jest.fn()}
        isConfirming={false}
      />
    );
    expect(screen.getByTestId("confirmation-modal")).toBeInTheDocument();
  });

  it("displays the word in the confirmation message", () => {
    render(
      <ConfirmationModal
        isOpen={true}
        word="serendipity"
        onCancel={jest.fn()}
        onConfirm={jest.fn()}
        isConfirming={false}
      />
    );
    expect(
      screen.getByText(/serendipity.*already has a saved definition/)
    ).toBeInTheDocument();
  });

  it("calls onCancel when cancel button is clicked", () => {
    const onCancel = jest.fn();
    render(
      <ConfirmationModal
        isOpen={true}
        word="serendipity"
        onCancel={onCancel}
        onConfirm={jest.fn()}
        isConfirming={false}
      />
    );
    fireEvent.click(screen.getByTestId("confirmation-cancel"));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("calls onConfirm when confirm button is clicked", () => {
    const onConfirm = jest.fn();
    render(
      <ConfirmationModal
        isOpen={true}
        word="serendipity"
        onCancel={jest.fn()}
        onConfirm={onConfirm}
        isConfirming={false}
      />
    );
    fireEvent.click(screen.getByTestId("confirmation-confirm"));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("calls onCancel when backdrop is clicked", () => {
    const onCancel = jest.fn();
    render(
      <ConfirmationModal
        isOpen={true}
        word="serendipity"
        onCancel={onCancel}
        onConfirm={jest.fn()}
        isConfirming={false}
      />
    );
    fireEvent.click(screen.getByTestId("confirmation-modal"));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("disables confirm button when isConfirming is true", () => {
    render(
      <ConfirmationModal
        isOpen={true}
        word="serendipity"
        onCancel={jest.fn()}
        onConfirm={jest.fn()}
        isConfirming={true}
      />
    );
    const confirmBtn = screen.getByTestId("confirmation-confirm");
    expect(confirmBtn).toBeDisabled();
    expect(confirmBtn).toHaveTextContent("Generating...");
  });

  it('shows "Generate New" when not confirming', () => {
    render(
      <ConfirmationModal
        isOpen={true}
        word="serendipity"
        onCancel={jest.fn()}
        onConfirm={jest.fn()}
        isConfirming={false}
      />
    );
    expect(screen.getByTestId("confirmation-confirm")).toHaveTextContent(
      "Generate New"
    );
  });

  it("prevents event bubbling when inner content is clicked", () => {
    const onCancel = jest.fn();
    const { container } = render(
      <ConfirmationModal
        isOpen={true}
        word="serendipity"
        onCancel={onCancel}
        onConfirm={jest.fn()}
        isConfirming={false}
      />
    );
    const innerDiv = container.querySelector(".bg-surface-container-lowest");
    if (innerDiv) {
      fireEvent.click(innerDiv);
    }
    expect(onCancel).not.toHaveBeenCalled();
  });
});
