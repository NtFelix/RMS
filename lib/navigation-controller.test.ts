/**
 * Tests of the navigation controller: it loads through the file loader without any user id
 * (the API route takes the user from the session), so there is nothing that can be unset.
 */

import { useNavigationController } from './navigation-controller'

const mockLoadFiles = jest.fn()

jest.mock('@/lib/file-loader', () => ({
  loadFiles: (...args: unknown[]) => mockLoadFiles(...args),
}))

const PATH = 'org_org-1/shared/house-1'

describe('navigation controller', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(console, 'log').mockImplementation(() => {})
    useNavigationController.getState().reset()
    mockLoadFiles.mockResolvedValue({ files: [], folders: [], breadcrumbs: [], totalSize: 0 })
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('loads a path without an owner user id: path and abort signal are all the loader gets', async () => {
    const result = await useNavigationController.getState().navigate(PATH)

    expect(result.success).toBe(true)
    expect(mockLoadFiles).toHaveBeenCalledTimes(1)
    expect(mockLoadFiles).toHaveBeenCalledWith(PATH, expect.any(AbortSignal))
    expect(useNavigationController.getState().currentPath).toBe(PATH)
  })

  it('still navigates after the controller was reset', async () => {
    useNavigationController.getState().reset()

    const result = await useNavigationController.getState().navigate(PATH, { force: true })

    expect(result.success).toBe(true)
    expect(useNavigationController.getState().lastError).toBeNull()
  })
})
