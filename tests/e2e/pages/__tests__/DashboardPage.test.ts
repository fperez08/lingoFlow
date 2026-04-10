/**
 * Unit tests for DashboardPage page-object.
 * Mocks the Playwright Page API and verifies that selector calls match
 * the expected data-testid attributes.
 */

import { DashboardPage } from '../DashboardPage'

/** Minimal mock for a Playwright Locator */
function makeLocator(overrides: Partial<Record<string, jest.Mock>> = {}) {
  const locator: Record<string, jest.Mock> = {
    waitFor: jest.fn().mockResolvedValue(undefined),
    all: jest.fn().mockResolvedValue([]),
    locator: jest.fn(),
    ...overrides,
  }
  // chainable locator()
  locator.locator.mockReturnValue(locator)
  return locator
}

/** Builds a minimal Playwright Page mock */
function makePage() {
  const locator = makeLocator()
  const page = {
    goto: jest.fn().mockResolvedValue(undefined),
    getByTestId: jest.fn().mockReturnValue(locator),
    getByRole: jest.fn().mockReturnValue(locator),
  }
  return { page, locator }
}

describe('DashboardPage', () => {
  it('loadDashboard() navigates to /dashboard with networkidle', async () => {
    const { page } = makePage()
    const dashboard = new DashboardPage(page as any)
    await dashboard.loadDashboard()
    expect(page.goto).toHaveBeenCalledWith('/dashboard', { waitUntil: 'networkidle' })
  })

  it('assertLoading() waits for loading-indicator to be visible', async () => {
    const { page, locator } = makePage()
    const dashboard = new DashboardPage(page as any)
    await dashboard.assertLoading()
    expect(page.getByTestId).toHaveBeenCalledWith('loading-indicator')
    expect(locator.waitFor).toHaveBeenCalledWith({ state: 'visible' })
  })

  it('assertEmpty() waits for empty-state to be visible', async () => {
    const { page, locator } = makePage()
    const dashboard = new DashboardPage(page as any)
    await dashboard.assertEmpty()
    expect(page.getByTestId).toHaveBeenCalledWith('empty-state')
    expect(locator.waitFor).toHaveBeenCalledWith({ state: 'visible' })
  })

  it('getVideoCards() queries video-grid and card locators', async () => {
    const cards = [{}, {}, {}]
    const cardLocator = makeLocator()
    cardLocator.all.mockResolvedValue(cards)

    const gridLocator = makeLocator()
    gridLocator.locator.mockReturnValue(cardLocator) // override default chaining

    const page = {
      goto: jest.fn(),
      getByTestId: jest.fn().mockReturnValue(gridLocator),
      getByRole: jest.fn(),
    }
    const dashboard = new DashboardPage(page as any)
    const result = await dashboard.getVideoCards()
    expect(page.getByTestId).toHaveBeenCalledWith('video-grid')
    expect(gridLocator.locator).toHaveBeenCalledWith('[data-testid^="video-card-"]')
    expect(result).toHaveLength(3)
  })

  it('getVideoCardCount() returns the count of video cards', async () => {
    const cardLocator = makeLocator()
    cardLocator.all.mockResolvedValue([{}, {}])

    const gridLocator = makeLocator()
    gridLocator.locator.mockReturnValue(cardLocator)

    const page = {
      goto: jest.fn(),
      getByTestId: jest.fn().mockReturnValue(gridLocator),
      getByRole: jest.fn(),
    }
    const dashboard = new DashboardPage(page as any)
    const count = await dashboard.getVideoCardCount()
    expect(count).toBe(2)
  })
})
