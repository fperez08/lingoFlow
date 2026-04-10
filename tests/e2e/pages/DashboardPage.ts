/**
 * DashboardPage: page-object for the lingoFlow dashboard route.
 *
 * Encapsulates all interactions with the main dashboard view,
 * including navigation, loading/empty state assertions, and
 * the video-card grid.
 *
 * Usage:
 *   const dashboard = new DashboardPage(page)
 *   await dashboard.loadDashboard()
 *   await dashboard.assertEmpty()
 */

import { expect, type Page, type Locator } from '@playwright/test'

export class DashboardPage {
  readonly page: Page

  constructor(page: Page) {
    this.page = page
  }

  /** Navigates to the dashboard and waits for the network to be idle. */
  async loadDashboard(): Promise<void> {
    await this.page.goto('/dashboard', { waitUntil: 'networkidle' })
  }

  /** Asserts that the loading indicator is visible. */
  async assertLoading(): Promise<void> {
    await expect(this.page.getByTestId('loading-indicator')).toBeVisible()
  }

  /** Asserts that the empty-state placeholder is visible (no videos imported). */
  async assertEmpty(): Promise<void> {
    await expect(this.page.getByTestId('empty-state')).toBeVisible()
  }

  /** Returns the video-card locator list in the dashboard grid. */
  videoCards(): Locator {
    return this.page.getByTestId('video-grid').locator('[data-testid^="video-card-"]')
  }

  /** Asserts the exact number of video cards rendered in the grid. */
  async assertVideoCardCount(count: number): Promise<void> {
    await expect(this.videoCards()).toHaveCount(count)
  }

  /**
   * Returns all video-card locators currently rendered in the grid.
   * Waits for the grid to be present before querying cards.
   */
  async getVideoCards(): Promise<Locator[]> {
    return this.videoCards().all()
  }

  /** Returns the number of video cards currently visible in the grid. */
  async getVideoCardCount(): Promise<number> {
    const cards = await this.getVideoCards()
    return cards.length
  }
}
