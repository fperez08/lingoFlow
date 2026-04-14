/**
 * PlayerPage: page-object for the lingoFlow player route (/player/[id]).
 *
 * Encapsulates all interactions with the player screen, including
 * navigation, transcript panel, vocabulary tab, and tab switching.
 */

import { expect, type Page, type Locator } from '@playwright/test'

export class PlayerPage {
  readonly page: Page
  readonly playerClient: Locator
  readonly transcriptPanel: Locator
  readonly transcriptTab: Locator
  readonly vocabTab: Locator

  constructor(page: Page) {
    this.page = page
    this.playerClient = page.getByTestId('player-client')
    this.transcriptPanel = page.getByTestId('tab-transcript')
    this.transcriptTab = page.getByTestId('tab-transcript')
    this.vocabTab = page.getByTestId('tab-vocabulary')
  }

  /** Navigates to the player page for the given video id and waits for the player client to attach. */
  async navigateTo(id: string): Promise<void> {
    await this.page.goto(`/player/${id}`)
    await expect(this.playerClient).toBeAttached({ timeout: 30_000 })
  }

  /** Asserts the player client container is attached and visible. */
  async assertLoaded(): Promise<void> {
    await expect(this.playerClient).toBeAttached({ timeout: 30_000 })
    await expect(this.playerClient).toBeVisible({ timeout: 30_000 })
  }

  /** Clicks the Vocabulary tab. */
  async switchToVocabTab(): Promise<void> {
    await this.vocabTab.click()
  }

  /** Clicks the Transcript tab. */
  async switchToTranscriptTab(): Promise<void> {
    await this.transcriptTab.click()
  }
}
