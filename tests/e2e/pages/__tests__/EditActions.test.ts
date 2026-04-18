/**
 * Unit tests for EditActions page-object.
 * Mocks the Playwright Page API and verifies method→selector mappings.
 */

import { EditActions } from '../EditActions'
import type { Page } from '@playwright/test'

jest.mock('@playwright/test', () => ({
  expect: jest.fn(() => ({
    toBeVisible: jest.fn().mockResolvedValue(undefined),
    toBeHidden: jest.fn().mockResolvedValue(undefined),
  })),
}))

function makeLocator(overrides: Partial<Record<string, jest.Mock>> = {}) {
  const locator: Record<string, jest.Mock> = {
    fill: jest.fn().mockResolvedValue(undefined),
    click: jest.fn().mockResolvedValue(undefined),
    press: jest.fn().mockResolvedValue(undefined),
    nth: jest.fn(),
    locator: jest.fn(),
    getByRole: jest.fn(),
    getByTestId: jest.fn(),
    getByText: jest.fn(),
    ...overrides,
  }
  locator.locator.mockReturnValue(locator)
  locator.nth.mockReturnValue(locator)
  locator.getByRole.mockReturnValue(locator)
  locator.getByTestId.mockReturnValue(locator)
  locator.getByText.mockReturnValue(locator)
  return locator
}

describe('EditActions', () => {
  it('clickEditOnCard() clicks the edit button at given index and waits for modal', async () => {
    const btnListLocator = makeLocator()

    const gridLocator = makeLocator()
    gridLocator.locator.mockReturnValue(btnListLocator)

    const page = {
      getByTestId: jest.fn().mockImplementation((id: string) => {
        if (id === 'video-grid') return gridLocator
        return makeLocator()
      }),
      getByRole: jest.fn().mockReturnValue(makeLocator()),
      getByText: jest.fn().mockReturnValue(makeLocator()),
    }

    const editActions = new EditActions(page as unknown as Page)
    await editActions.clickEditOnCard(1)

    expect(btnListLocator.nth).toHaveBeenCalledWith(1)
    expect(btnListLocator.click).toHaveBeenCalled()
  })

  it('addTag() fills tag-input and presses Enter', async () => {
    const tagInputLocator = makeLocator()
    const page = {
      getByTestId: jest.fn().mockImplementation((id: string) => {
        if (id === 'tag-input') return tagInputLocator
        return makeLocator()
      }),
      getByRole: jest.fn().mockReturnValue(makeLocator()),
      getByText: jest.fn().mockReturnValue(makeLocator()),
    }

    const editActions = new EditActions(page as unknown as Page)
    await editActions.addTag('spanish')
    expect(page.getByTestId).toHaveBeenCalledWith('tag-input')
    expect(tagInputLocator.fill).toHaveBeenCalledWith('spanish')
    expect(tagInputLocator.press).toHaveBeenCalledWith('Enter')
  })

  it('removeTag() clicks the remove-tag-{tagName} button', async () => {
    const removeLocator = makeLocator()
    const page = {
      getByTestId: jest.fn().mockReturnValue(removeLocator),
      getByRole: jest.fn().mockReturnValue(makeLocator()),
      getByText: jest.fn().mockReturnValue(makeLocator()),
    }

    const editActions = new EditActions(page as unknown as Page)
    await editActions.removeTag('spanish')
    expect(page.getByTestId).toHaveBeenCalledWith('remove-tag-spanish')
    expect(removeLocator.click).toHaveBeenCalled()
  })

  it('clickSave() clicks Save button and waits for modal to close', async () => {
    const saveBtn = makeLocator()
    const modalLocator = makeLocator()
    // Override getByRole to return saveBtn (after locator is constructed)
    modalLocator.getByRole.mockReturnValue(saveBtn)

    const page = {
      getByTestId: jest.fn().mockReturnValue(modalLocator),
      getByRole: jest.fn().mockReturnValue(makeLocator()),
      getByText: jest.fn().mockReturnValue(makeLocator()),
    }

    const editActions = new EditActions(page as unknown as Page)
    await editActions.clickSave()
    expect(modalLocator.getByRole).toHaveBeenCalledWith('button', { name: 'Save' })
    expect(saveBtn.click).toHaveBeenCalled()
  })

  it('assertTagsSaved() waits for each tag text to be visible', async () => {
    const tagLocator = makeLocator()
    const page = {
      getByTestId: jest.fn().mockReturnValue(makeLocator()),
      getByRole: jest.fn().mockReturnValue(makeLocator()),
      getByText: jest.fn().mockReturnValue(tagLocator),
    }

    const editActions = new EditActions(page as unknown as Page)
    await editActions.assertTagsSaved(['spanish', 'beginner'])
    expect(page.getByText).toHaveBeenCalledWith('spanish')
    expect(page.getByText).toHaveBeenCalledWith('beginner')
  })
})
