/**
 * Unit tests for DeleteActions page-object.
 * Mocks the Playwright Page API and verifies method→selector mappings.
 */

import { DeleteActions } from '../DeleteActions'

function makeLocator(overrides: Partial<Record<string, jest.Mock>> = {}) {
  const locator: Record<string, jest.Mock> = {
    waitFor: jest.fn().mockResolvedValue(undefined),
    click: jest.fn().mockResolvedValue(undefined),
    all: jest.fn().mockResolvedValue([]),
    locator: jest.fn(),
    ...overrides,
  }
  locator.locator.mockReturnValue(locator)
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
    const deleteBtn0 = makeLocator()
    const deleteBtn1 = makeLocator()
    const btnListLocator = makeLocator()
    btnListLocator.all.mockResolvedValue([deleteBtn0, deleteBtn1])

    const gridLocator = makeLocator()
    gridLocator.locator.mockReturnValue(btnListLocator)

    const modalLocator = makeLocator()

    const page = {
      getByTestId: jest.fn().mockImplementation((id: string) => {
        if (id === 'video-grid') return gridLocator
        if (id === 'delete-modal') return modalLocator
        return makeLocator()
      }),
      getByRole: jest.fn().mockReturnValue(makeLocator()),
    }

    const deleteActions = new DeleteActions(page as any)
    await deleteActions.clickDeleteOnCard(0)

    expect(page.getByTestId).toHaveBeenCalledWith('video-grid')
    expect(gridLocator.locator).toHaveBeenCalledWith('[data-testid="delete-button"]')
    expect(deleteBtn0.click).toHaveBeenCalled()
    expect(modalLocator.waitFor).toHaveBeenCalledWith({ state: 'visible' })
  })

  it('confirmDelete() clicks confirm-delete-button and waits for modal to close', async () => {
    const confirmLocator = makeLocator()
    const modalLocator = makeLocator()

    const page = {
      getByTestId: jest.fn().mockImplementation((id: string) => {
        if (id === 'confirm-delete-button') return confirmLocator
        if (id === 'delete-modal') return modalLocator
        return makeLocator()
      }),
      getByRole: jest.fn().mockReturnValue(makeLocator()),
    }

    const deleteActions = new DeleteActions(page as any)
    await deleteActions.confirmDelete()

    expect(page.getByTestId).toHaveBeenCalledWith('confirm-delete-button')
    expect(confirmLocator.click).toHaveBeenCalled()
    expect(modalLocator.waitFor).toHaveBeenCalledWith({ state: 'hidden' })
  })

  it('assertCardRemoved() waits for the video card to be hidden', async () => {
    const cardLocator = makeLocator()
    const page = {
      getByTestId: jest.fn().mockReturnValue(cardLocator),
      getByRole: jest.fn().mockReturnValue(makeLocator()),
    }

    const deleteActions = new DeleteActions(page as any)
    await deleteActions.assertCardRemoved('abc-123')

    expect(page.getByTestId).toHaveBeenCalledWith('video-card-abc-123')
    expect(cardLocator.waitFor).toHaveBeenCalledWith({ state: 'hidden' })
  })
})
