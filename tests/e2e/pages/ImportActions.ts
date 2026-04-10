/**
 * ImportActions: page-object for the ImportVideoModal interactions.
 *
 * Encapsulates the actions a user performs inside the Import Video modal,
 * including opening the modal, filling form fields, and asserting on
 * validation errors.
 *
 * Usage:
 *   const importActions = new ImportActions(page)
 *   await importActions.clickImportButton()
 *   await importActions.fillYoutubeUrl('https://www.youtube.com/watch?v=abc')
 *   await importActions.fillTags('spanish, beginner')
 *   await importActions.clickSubmitImport()
 */

import type { Page } from '@playwright/test'

export class ImportActions {
  readonly page: Page

  constructor(page: Page) {
    this.page = page
  }

  /** Clicks the "Import Video" button on the dashboard to open the modal. */
  async clickImportButton(): Promise<void> {
    await this.page.getByTestId('import-modal').waitFor({ state: 'hidden' }).catch(() => {})
    await this.page.getByRole('button', { name: 'Import Video' }).click()
    await this.page.getByTestId('import-modal').waitFor({ state: 'visible' })
  }

  /** Fills the YouTube URL field in the import modal. */
  async fillYoutubeUrl(url: string): Promise<void> {
    await this.page.getByTestId('youtube-url-input').fill(url)
  }

  /**
   * Sets the transcript file input using the provided file path.
   * @param filePath - Absolute or project-relative path to the transcript file.
   */
  async fillTranscriptFile(filePath: string): Promise<void> {
    await this.page.getByTestId('transcript-input').setInputFiles(filePath)
  }

  /** Fills the tags field in the import modal (comma-separated string). */
  async fillTags(tags: string): Promise<void> {
    await this.page.getByTestId('tags-input').fill(tags)
  }

  /** Clicks the submit button to trigger the import. */
  async clickSubmitImport(): Promise<void> {
    await this.page.getByTestId('submit-import-button').click()
  }

  /**
   * Asserts that an import validation error is visible and optionally
   * contains the given message text.
   * @param message - Optional substring to match within the error message.
   */
  async assertValidationError(message?: string): Promise<void> {
    const errorLocator = this.page.getByTestId('import-error')
    await errorLocator.waitFor({ state: 'visible' })
    if (message !== undefined) {
      await errorLocator.filter({ hasText: message }).waitFor({ state: 'visible' })
    }
  }
}
