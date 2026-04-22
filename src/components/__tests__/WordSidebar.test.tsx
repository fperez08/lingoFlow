import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import WordSidebar from "../WordSidebar";
import { VocabInfo } from "@/lib/vocabulary";
import { useUpdateWordDefinition } from "@/hooks/useVocabulary";

// Mock the useUpdateWordDefinition hook
jest.mock("@/hooks/useVocabulary", () => ({
  useUpdateWordDefinition: jest.fn(() => ({
    mutateAsync: jest.fn().mockResolvedValue({
      word: "serendipity",
      definition: "Test definition from AI",
      status: "learning",
    }),
  })),
}));

const mockVocabEntry: VocabInfo = {
  level: "B2",
  definition:
    "The occurrence and development of events by chance in a happy or beneficial way",
  source: "Cinema",
  status: "learning",
};

// Mock fetch
global.fetch = jest.fn();

describe("WordSidebar", () => {
  beforeEach(() => {
    (global.fetch as jest.Mock).mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders the selected word", () => {
    render(
      <WordSidebar
        word="serendipity"
        contextSentence="It was pure serendipity that we met"
        vocabEntry={mockVocabEntry}
        onClose={jest.fn()}
      />
    );
    expect(screen.getByTestId("sidebar-word")).toHaveTextContent("serendipity");
  });

  it("renders the context sentence", () => {
    render(
      <WordSidebar
        word="serendipity"
        contextSentence="It was pure serendipity that we met"
        vocabEntry={mockVocabEntry}
        onClose={jest.fn()}
      />
    );
    expect(screen.getByTestId("sidebar-context")).toHaveTextContent(
      "It was pure serendipity that we met"
    );
  });

  it("calls onClose when close button is clicked", () => {
    const onClose = jest.fn();
    render(
      <WordSidebar
        word="serendipity"
        contextSentence="context"
        vocabEntry={undefined}
        onClose={onClose}
      />
    );
    fireEvent.click(screen.getByTestId("word-sidebar-close"));
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose when Escape key is pressed", () => {
    const onClose = jest.fn();
    render(
      <WordSidebar
        word="serendipity"
        contextSentence="context"
        vocabEntry={undefined}
        onClose={onClose}
      />
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("renders vocab definition when entry is provided", () => {
    render(
      <WordSidebar
        word="serendipity"
        contextSentence="context"
        vocabEntry={mockVocabEntry}
        onClose={jest.fn()}
      />
    );
    // The definition appears in vocab details and also in generated-definition auto-loaded area
    const definitions = screen.getAllByText(mockVocabEntry.definition!);
    expect(definitions.length).toBeGreaterThan(0);
  });

  it("does not render definition when no vocab entry", () => {
    render(
      <WordSidebar
        word="hello"
        contextSentence="context"
        vocabEntry={undefined}
        onClose={jest.fn()}
      />
    );
    expect(screen.queryByText(/The occurrence/)).not.toBeInTheDocument();
  });

  it("does not render toggle button when onStatusChange is not provided", () => {
    render(
      <WordSidebar
        word="serendipity"
        contextSentence="context"
        vocabEntry={mockVocabEntry}
        onClose={jest.fn()}
      />
    );
    expect(screen.queryByTestId("status-toggle")).not.toBeInTheDocument();
  });

  it('renders "Mark as known" when status is not mastered', () => {
    render(
      <WordSidebar
        word="serendipity"
        contextSentence="context"
        vocabEntry={mockVocabEntry}
        onClose={jest.fn()}
        onStatusChange={jest.fn()}
      />
    );
    expect(screen.getByTestId("status-toggle")).toHaveTextContent(
      "Mark as known"
    );
  });

  it('renders "Mark as unknown" when status is mastered', () => {
    render(
      <WordSidebar
        word="serendipity"
        contextSentence="context"
        vocabEntry={{ ...mockVocabEntry, status: "mastered" }}
        onClose={jest.fn()}
        onStatusChange={jest.fn()}
      />
    );
    expect(screen.getByTestId("status-toggle")).toHaveTextContent(
      "Mark as unknown"
    );
  });

  it("calls onStatusChange with mastered when clicking Mark as known", () => {
    const onStatusChange = jest.fn();
    render(
      <WordSidebar
        word="serendipity"
        contextSentence="context"
        vocabEntry={mockVocabEntry}
        onClose={jest.fn()}
        onStatusChange={onStatusChange}
      />
    );
    fireEvent.click(screen.getByTestId("status-toggle"));
    expect(onStatusChange).toHaveBeenCalledWith("serendipity", "mastered");
  });

  it("calls onStatusChange with new when clicking Mark as unknown", () => {
    const onStatusChange = jest.fn();
    render(
      <WordSidebar
        word="serendipity"
        contextSentence="context"
        vocabEntry={{ ...mockVocabEntry, status: "mastered" }}
        onClose={jest.fn()}
        onStatusChange={onStatusChange}
      />
    );
    fireEvent.click(screen.getByTestId("status-toggle"));
    expect(onStatusChange).toHaveBeenCalledWith("serendipity", "new");
  });

  it("disables toggle and shows Saving when isUpdating is true", () => {
    render(
      <WordSidebar
        word="serendipity"
        contextSentence="context"
        vocabEntry={mockVocabEntry}
        onClose={jest.fn()}
        onStatusChange={jest.fn()}
        isUpdating={true}
      />
    );
    const btn = screen.getByTestId("status-toggle");
    expect(btn).toBeDisabled();
    expect(btn).toHaveTextContent("Saving…");
  });

  it("renders Generate Definition button", () => {
    render(
      <WordSidebar
        word="serendipity"
        contextSentence="It was pure serendipity that we met"
        vocabEntry={mockVocabEntry}
        onClose={jest.fn()}
      />
    );
    expect(screen.getByTestId("generate-definition-btn")).toBeInTheDocument();
    expect(screen.getByTestId("generate-definition-btn")).toHaveTextContent(
      "Generate Definition"
    );
  });

  it("shows loading state when generating definition", async () => {
    (global.fetch as jest.Mock).mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => {
            resolve({
              ok: true,
              json: async () => ({
                definition: "A test definition",
                partOfSpeech: "noun",
              }),
            });
          }, 100)
        )
    );

    render(
      <WordSidebar
        word="serendipity"
        contextSentence="It was pure serendipity that we met"
        vocabEntry={undefined}
        onClose={jest.fn()}
      />
    );

    fireEvent.click(screen.getByTestId("generate-definition-btn"));
    expect(screen.getByTestId("generate-definition-btn")).toHaveTextContent(
      "Generating..."
    );

    await waitFor(() => {
      expect(screen.getByTestId("generate-definition-btn")).toHaveTextContent(
        "Generate Definition"
      );
    });
  });

  it("displays generated definition after successful API call", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        definition: "Test definition from AI",
        partOfSpeech: "noun",
        example: "Test example",
      }),
    });

    render(
      <WordSidebar
        word="serendipity"
        contextSentence="It was pure serendipity that we met"
        vocabEntry={undefined}
        onClose={jest.fn()}
      />
    );

    fireEvent.click(screen.getByTestId("generate-definition-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("generated-definition")).toBeInTheDocument();
      expect(screen.getByText("Test definition from AI")).toBeInTheDocument();
      expect(screen.getByText(/Part of speech/)).toHaveTextContent("noun");
      expect(screen.getByText(/Example/)).toHaveTextContent("Test example");
    });
  });

  it("displays error message when API call fails", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "AI service unavailable" }),
    });

    render(
      <WordSidebar
        word="serendipity"
        contextSentence="It was pure serendipity that we met"
        vocabEntry={undefined}
        onClose={jest.fn()}
      />
    );

    fireEvent.click(screen.getByTestId("generate-definition-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("definition-error")).toBeInTheDocument();
      expect(screen.getByTestId("definition-error")).toHaveTextContent(
        "AI service unavailable"
      );
    });
  });

  it("allows regenerating definition by clicking button multiple times", async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          definition: "First definition",
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          definition: "Second definition",
        }),
      });

    render(
      <WordSidebar
        word="serendipity"
        contextSentence="It was pure serendipity that we met"
        vocabEntry={undefined}
        onClose={jest.fn()}
      />
    );

    fireEvent.click(screen.getByTestId("generate-definition-btn"));

    await waitFor(() => {
      expect(screen.getByText("First definition")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("generate-definition-btn"));

    await waitFor(() => {
      expect(screen.getByText("Second definition")).toBeInTheDocument();
      expect(screen.queryByText("First definition")).not.toBeInTheDocument();
    });
  });

  it("sends transcript context to API when provided", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        definition: "Test definition",
        partOfSpeech: "noun",
      }),
    });

    render(
      <WordSidebar
        word="serendipity"
        contextSentence="It was pure serendipity that we met"
        transcriptContext={[
          "We had given up hope.",
          "It was pure serendipity that we met",
          "Fate brought us together.",
        ]}
        vocabEntry={undefined}
        onClose={jest.fn()}
      />
    );

    fireEvent.click(screen.getByTestId("generate-definition-btn"));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/dictionary/define",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: expect.stringContaining("transcriptContext"),
        })
      );
    });
  });

  it("shows Save Definition button after generating definition", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        definition: "Test definition from AI",
        partOfSpeech: "noun",
      }),
    });

    render(
      <WordSidebar
        word="serendipity"
        contextSentence="It was pure serendipity that we met"
        vocabEntry={mockVocabEntry}
        onClose={jest.fn()}
      />
    );

    fireEvent.click(screen.getByTestId("generate-definition-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("save-definition-btn")).toBeInTheDocument();
      expect(screen.getByTestId("save-definition-btn")).toHaveTextContent(
        "Save Definition"
      );
    });
  });

  it("calls mutation when Save Definition button is clicked", async () => {
    const mockMutateAsync = jest.fn().mockResolvedValue({
      word: "serendipity",
      definition: "Test definition from AI",
      status: "learning",
    });
    jest.mocked(useUpdateWordDefinition).mockReturnValue({
      mutateAsync: mockMutateAsync,
    });
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        definition: "Test definition from AI",
      }),
    });

    render(
      <WordSidebar
        word="serendipity"
        contextSentence="It was pure serendipity that we met"
        vocabEntry={mockVocabEntry}
        onClose={jest.fn()}
      />
    );

    fireEvent.click(screen.getByTestId("generate-definition-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("confirmation-modal")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("confirmation-confirm"));

    await waitFor(() => {
      expect(screen.getByTestId("save-definition-btn")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("save-definition-btn"));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        word: "serendipity",
        definition: "Test definition from AI",
      });
    });
  });

  it("auto-loads definition from vocabEntry", () => {
    render(
      <WordSidebar
        word="serendipity"
        contextSentence="It was pure serendipity that we met"
        vocabEntry={mockVocabEntry}
        onClose={jest.fn()}
      />
    );

    expect(screen.getByTestId("generated-definition")).toBeInTheDocument();
    expect(screen.getByTestId("save-definition-btn")).toBeInTheDocument();
  });

  it("shows overwrite confirmation modal when clicking Generate with existing definition", async () => {
    render(
      <WordSidebar
        word="serendipity"
        contextSentence="It was pure serendipity that we met"
        vocabEntry={mockVocabEntry}
        onClose={jest.fn()}
      />
    );

    expect(screen.queryByTestId("confirmation-modal")).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("generate-definition-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("confirmation-modal")).toBeInTheDocument();
    });
  });

  it("does not show confirmation modal when clicking Generate with no existing definition", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        definition: "First AI definition",
      }),
    });

    render(
      <WordSidebar
        word="hello"
        contextSentence="Hello there"
        vocabEntry={undefined}
        onClose={jest.fn()}
      />
    );

    fireEvent.click(screen.getByTestId("generate-definition-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("generated-definition")).toBeInTheDocument();
    });

    expect(screen.queryByTestId("confirmation-modal")).not.toBeInTheDocument();
  });

  it("closes confirmation modal when cancel button is clicked", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        definition: "Should not be used",
      }),
    });

    render(
      <WordSidebar
        word="serendipity"
        contextSentence="It was pure serendipity that we met"
        vocabEntry={mockVocabEntry}
        onClose={jest.fn()}
      />
    );

    fireEvent.click(screen.getByTestId("generate-definition-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("confirmation-modal")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("confirmation-cancel"));

    await waitFor(() => {
      expect(
        screen.queryByTestId("confirmation-modal")
      ).not.toBeInTheDocument();
    });

    // Verify generation did not start
    expect(
      (global.fetch as jest.Mock).mock.calls.filter(
        (call: unknown[]) => (call as string[])[0] === "/api/dictionary/define"
      )
    ).toHaveLength(0);
  });

  it("generates new definition when confirming overwrite", async () => {
    (global.fetch as jest.Mock).mockReset();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        definition: "New AI definition replacing old one",
        partOfSpeech: "noun",
      }),
    });

    render(
      <WordSidebar
        word="serendipity"
        contextSentence="It was pure serendipity that we met"
        vocabEntry={mockVocabEntry}
        onClose={jest.fn()}
      />
    );

    fireEvent.click(screen.getByTestId("generate-definition-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("confirmation-modal")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("confirmation-confirm"));

    await waitFor(() => {
      expect(
        screen.queryByTestId("confirmation-modal")
      ).not.toBeInTheDocument();
    });

    await waitFor(() => {
      expect(
        screen.getByText("New AI definition replacing old one")
      ).toBeInTheDocument();
    });
  });
});
