/**
 * Unit tests for ImportActions page-object.
 * Mocks the Playwright Page API and verifies method→selector mappings.
 */

import { ImportActions } from '../ImportActions'

jest.mock('@playwright/test', () => ({
  expect: jest.fn(() => ({
    toBeVisible: jest.fn().mockResolvedValue(undefined),
    toBeHidden: jest.fn().mockResolvedValue(undefined),
    toContainText: jest.fn().mockResolvedValue(undefined),
  })),
}))

function makeLocator(overrides: Partial<Record<string, jest.Mock>> = {}) {
  const locator: Record<string, jest.Mock> = {
    fill: jest.fn().mockResolvedValue(undefined),
    click: jest.fn().mockResolvedValue(undefined),
    setInputFiles: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  }
  return locator
}

function makePage() {
  const locator = makeLocator()
  const page = {
    getByTestId: jest.fn().mockReturnValue(locator),
    getByRole: jest.fn().mockReturnValue(locator),
  }
  return { page, locator }
}

describe('ImportActions', () => {
  it('clickImportButton() opens the import modal', async () => {
    const hiddenLocator = makeLocator()
    const visibleLocator = makeLocator()
    const buttonLocator = makeLocator()

    let callCount = 0
    const page = {
      getByTestId: jest.fn().mockImplementation(() => {
        callCount++
        // first call → hidden check; second call → visible check
        return callCount === 1 ? hiddenLocator : visibleLocator
      }),
      getByRole: jest.fn().mockReturnValue(buttonLocator),
    }

    const importActions = new ImportActions(page as any)
    await importActions.clickImportButton()

    expect(page.getByTestId).toHaveBeenCalledWith('import-modal')
    expect(buttonLocator.click).toHaveBeenCalled()
  })

  it('fillYoutubeUrl() fills the youtube-url-input', async () => {
    const { page, locator } = makePage()
    const importActions = new ImportActions(page as any)
    await importActions.fillYoutubeUrl('https://www.youtube.com/watch?v=abc')
    expect(page.getByTestId).toHaveBeenCalledWith('youtube-url-input')
    expect(locator.fill).toHaveBeenCalledWith('https://www.youtube.com/watch?v=abc')
  })

  it('fillTranscriptFile() calls setInputFiles on transcript-input', async () => {
    const { page, locator } = makePage()
    const importActions = new ImportActions(page as any)
    await importActions.fillTranscriptFile('/path/to/transcript.srt')
    expect(page.getByTestId).toHaveBeenCalledWith('transcript-input')
    expect(locator.setInputFiles).toHaveBeenCalledWith('/path/to/transcript.srt')
  })

  it('fillTags() fills the tags-input', async () => {
    const { page, locator } = makePage()
    const importActions = new ImportActions(page as any)
    await importActions.fillTags('spanish, beginner')
    expect(page.getByTestId).toHaveBeenCalledWith('tags-input')
    expect(locator.fill).toHaveBeenCalledWith('spanish, beginner')
  })

  it('clickSubmitImport() clicks the submit-import-button', async () => {
    const { page, locator } = makePage()
    const importActions = new ImportActions(page as any)
    await importActions.clickSubmitImport()
    expect(page.getByTestId).toHaveBeenCalledWith('submit-import-button')
    expect(locator.click).toHaveBeenCalled()
  })

  it('assertValidationError() waits for import-error to be visible', async () => {
    const { page } = makePage()
    const importActions = new ImportActions(page as any)
    await importActions.assertValidationError()
    expect(page.getByTestId).toHaveBeenCalledWith('import-error')
  })

  it('assertValidationError() filters by message text when provided', async () => {
    const { page } = makePage()
    const importActions = new ImportActions(page as any)
    await importActions.assertValidationError('YouTube URL is required')
    expect(page.getByTestId).toHaveBeenCalledWith('import-error')
  })
})
