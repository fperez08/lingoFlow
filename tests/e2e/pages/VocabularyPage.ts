/**
 * VocabularyPage: page-object for the lingoFlow vocabulary route (/vocabulary).
 *
 * Encapsulates all interactions with the vocabulary manager screen,
 * including navigation, heading assertions, search, filter chips,
 * and word cards.
 */

import { expect, type Page, type Locator } from '@playwright/test'

export class VocabularyPage {
  readonly page: Page
  readonly heading: Locator
  readonly vocabCards: Locator
  readonly searchInput: Locator

  constructor(page: Page) {
    this.page = page
    this.heading = page.getByTestId('vocab-page-heading')
    this.vocabCards = page.getByTestId('vocab-card')
    this.searchInput = page.getByTestId('vocab-search-input')
  }

  /** Navigates to the vocabulary page and waits for network idle. */
  async navigateTo(): Promise<void> {
    await this.page.goto('/vocabulary', { waitUntil: 'networkidle' })
  }

  /** Asserts the vocabulary manager heading is visible. */
  async assertLoaded(): Promise<void> {
    await expect(this.heading).toBeVisible()
  }

  /** Returns the count of vocab cards currently rendered. */
  async getCardCount(): Promise<number> {
    return this.vocabCards.count()
  }

  /** Types a query into the search input. */
  async search(query: string): Promise<void> {
    await this.searchInput.fill(query)
  }

  /** Clicks a tab by its data-testid suffix (e.g. 'new', 'learning', 'mastered'). */
  async clickTab(tab: 'new' | 'learning' | 'mastered'): Promise<void> {
    await this.page.getByTestId(`tab-${tab}`).click()
  }
}
