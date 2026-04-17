/**
 * Unit tests for DeleteActions page-object.
 * Mocks the Playwright Page API and verifies method→selector mappings.
 */

import { DeleteActions } from '../DeleteActions'
import type { Page } from '@playwright/test'

jest.mock('@playwright/test', () => ({
  expect: jest.fn(() => ({
    toBeVisible: jest.fn().mockResolvedValue(undefined),
    toBeHidden: jest.fn().mockResolvedValue(undefined),
  })),
}))

function makeLocator(overrides: Partial<Record<string, jest.Mock>> = {}) {
  const locator: Record<string, jest.Mock> = {
    click: jest.fn().mockResolvedValue(undefined),
    nth: jest.fn(),
    locator: jest.fn(),
    ...overrides,
  }
  locator.locator.mockReturnValue(locator)
  locator.nth.mockReturnValue(locator)
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

describe('DeleteActions', () => {
  it('clickDeleteOnCard() clicks the delete button at given index and waits for modal', async () => {
    const btnListLocator = makeLocator()

    const gridLocator = makeLocator()
    gridLocator.locator.mockReturnValue(btnListLocator)

    const page = {
      getByTestId: jest.fn().mockImplementation((id: string) => {
        if (id === 'video-grid') return gridLocator
        return makeLocator()
      }),
      getByRole: jest.fn().mockReturnValue(makeLocator()),
    }

    const deleteActions = new DeleteActions(page as unknown as Page)
    await deleteActions.clickDeleteOnCard(0)

    expect(page.getByTestId).toHaveBeenCalledWith('video-grid')
    expect(gridLocator.locator).toHaveBeenCalledWith('[data-testid="delete-button"]')
    expect(btnListLocator.nth).toHaveBeenCalledWith(0)
    expect(btnListLocator.click).toHaveBeenCalled()
  })

  it('confirmDelete() clicks confirm-delete-button and waits for modal to close', async () => {
    const confirmLocator = makeLocator()

    const page = {
      getByTestId: jest.fn().mockImplementation((id: string) => {
        if (id === 'confirm-delete-button') return confirmLocator
        return makeLocator()
      }),
      getByRole: jest.fn().mockReturnValue(makeLocator()),
    }

    const deleteActions = new DeleteActions(page as unknown as Page)
    await deleteActions.confirmDelete()

    expect(page.getByTestId).toHaveBeenCalledWith('confirm-delete-button')
    expect(confirmLocator.click).toHaveBeenCalled()
  })

  it('assertCardRemoved() waits for the video card to be hidden', async () => {
    const cardLocator = makeLocator()
    const page = {
      getByTestId: jest.fn().mockReturnValue(cardLocator),
      getByRole: jest.fn().mockReturnValue(makeLocator()),
    }

    const deleteActions = new DeleteActions(page as unknown as Page)
    await deleteActions.assertCardRemoved('abc-123')

    expect(page.getByTestId).toHaveBeenCalledWith('video-card-abc-123')
  })
})
