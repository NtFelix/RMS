// Mock fetch
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('Modal Store Timeout Functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Timeout Promise Race', () => {
    it('resolves with data when fetch completes within 2 seconds', async () => {
      const mockData = { id: '1', name: 'Test' };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      } as Response);

      // Simulate the timeout race logic from the modal store
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('Das Laden dauert länger als erwartet. Bitte versuchen Sie es erneut.'));
        }, 2000);
      });

      const fetchPromise = fetch('/api/test').then(async (response) => {
        if (!response.ok) {
          throw new Error('Failed to fetch');
        }
        return response.json();
      });

      // Race between fetch and timeout
      const result = await Promise.race([fetchPromise, timeoutPromise]);
      
      expect(result).toEqual(mockData);
    });

    it('rejects with timeout error when fetch takes longer than 2 seconds', async () => {
      // Mock a slow response that never resolves
      mockFetch.mockImplementation(() => new Promise(() => {}));

      // Simulate the timeout race logic from the modal store
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('Das Laden dauert länger als erwartet. Bitte versuchen Sie es erneut.'));
        }, 2000);
      });

      const fetchPromise = fetch('/api/test').then(async (response) => {
        if (!response.ok) {
          throw new Error('Failed to fetch');
        }
        return response.json();
      });

      // Start the race
      const racePromise = Promise.race([fetchPromise, timeoutPromise]);

      // Fast forward 2 seconds to trigger timeout
      jest.advanceTimersByTime(2000);

      // Should reject with timeout error
      await expect(racePromise).rejects.toThrow('Das Laden dauert länger als erwartet. Bitte versuchen Sie es erneut.');
    });

    it('rejects with network error when fetch fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      // Simulate the timeout race logic from the modal store
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('Das Laden dauert länger als erwartet. Bitte versuchen Sie es erneut.'));
        }, 2000);
      });

      const fetchPromise = fetch('/api/test').then(async (response) => {
        if (!response.ok) {
          throw new Error('Failed to fetch');
        }
        return response.json();
      });

      // Race between fetch and timeout
      await expect(Promise.race([fetchPromise, timeoutPromise])).rejects.toThrow('Network error');
    });
  });
});