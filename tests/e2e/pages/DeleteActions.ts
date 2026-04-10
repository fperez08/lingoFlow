/**
 * DeleteActions: page-object for the DeleteVideoModal interactions.
 *
 * Encapsulates the actions a user performs when deleting a video,
 * including triggering the delete flow from a specific card and
 * confirming the deletion.
 *
 * Usage:
 *   const deleteActions = new DeleteActions(page)
 *   await deleteActions.clickDeleteOnCard(0)
 *   await deleteActions.confirmDelete()
 *   await deleteActions.assertCardRemoved('video-id-123')
 */

import type { Page } from '@playwright/test'

export class DeleteActions {
  readonly page: Page

  constructor(page: Page) {
    this.page = page
  }

  /**
   * Clicks the delete button on the video card at the given zero-based index.
   * Waits for the delete confirmation modal to appear.
   * @param index - Zero-based index of the card in the video grid.
   */
  async clickDeleteOnCard(index: number): Promise<void> {
    const deleteButtons = await this.page
      .getByTestId('video-grid')
      .locator('[data-testid="delete-button"]')
      .all()
    await deleteButtons[index].click()
    await this.page.getByTestId('delete-modal').waitFor({ state: 'visible' })
  }

  /** Clicks the confirm-delete button and waits for the modal to close. */
  async confirmDelete(): Promise<void> {
    await this.page.getByTestId('confirm-delete-button').click()
    await this.page.getByTestId('delete-modal').waitFor({ state: 'hidden' })
  }

  /**
   * Asserts that the video card with the given ID is no longer in the DOM.
   * @param videoId - The video ID used in the `video-card-{id}` testid.
   */
  async assertCardRemoved(videoId: string): Promise<void> {
    await this.page.getByTestId(`video-card-${videoId}`).waitFor({ state: 'hidden' })
  }
}
