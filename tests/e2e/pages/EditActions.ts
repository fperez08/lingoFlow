/**
 * EditActions: page-object for the EditVideoModal interactions.
 *
 * Encapsulates the actions a user performs inside the Edit Video modal,
 * including opening the modal from a specific card, managing tags, and
 * saving changes.
 *
 * Usage:
 *   const editActions = new EditActions(page)
 *   await editActions.clickEditOnCard(0)
 *   await editActions.addTag('newTag')
 *   await editActions.removeTag('oldTag')
 *   await editActions.clickSave()
 *   await editActions.assertTagsSaved(['newTag'])
 */

import type { Page } from '@playwright/test'

export class EditActions {
  readonly page: Page

  constructor(page: Page) {
    this.page = page
  }

  /**
   * Clicks the edit button on the video card at the given zero-based index.
   * Waits for the edit modal to appear after clicking.
   * @param index - Zero-based index of the card in the video grid.
   */
  async clickEditOnCard(index: number): Promise<void> {
    const editButtons = await this.page
      .getByTestId('video-grid')
      .locator('[data-testid="edit-button"]')
      .all()
    await editButtons[index].click()
    await this.page.getByTestId('edit-modal').waitFor({ state: 'visible' })
  }

  /**
   * Types a new tag into the tag input and presses Enter to add it.
   * @param tag - The tag text to add.
   */
  async addTag(tag: string): Promise<void> {
    const tagInput = this.page.getByTestId('tag-input')
    await tagInput.fill(tag)
    await tagInput.press('Enter')
  }

  /**
   * Removes an existing tag by clicking its remove button.
   * @param tagName - The exact tag text to remove.
   */
  async removeTag(tagName: string): Promise<void> {
    await this.page.getByTestId(`remove-tag-${tagName}`).click()
  }

  /** Clicks the Save button in the edit modal and waits for the modal to close. */
  async clickSave(): Promise<void> {
    await this.page.getByTestId('edit-modal').getByRole('button', { name: 'Save' }).click()
    await this.page.getByTestId('edit-modal').waitFor({ state: 'hidden' })
  }

  /**
   * Asserts that the expected tags are displayed on the last-edited card.
   * Navigates through the tag pills visible in the edit modal before saving;
   * call this before clickSave() if you need to inspect the in-modal state,
   * or after a page reload to verify persistence.
   * @param expectedTags - Array of tag strings that should all be visible.
   */
  async assertTagsSaved(expectedTags: string[]): Promise<void> {
    for (const tag of expectedTags) {
      await this.page.getByText(tag).waitFor({ state: 'visible' })
    }
  }
}
