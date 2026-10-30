import { TemplateService, OptimisticTemplateService } from './template-service';

// Mock global fetch
global.fetch = jest.fn();

describe('template-service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('TemplateService', () => {
    it('should fetch templates', async () => {
      const mockTemplates = [{ id: '1', titel: 'Test' }];
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockTemplates)
      });

      const result = await TemplateService.getTemplates();
      expect(result).toEqual(mockTemplates);
      expect(global.fetch).toHaveBeenCalledWith('/api/templates', expect.objectContaining({ method: 'GET' }));
    });

    it('should throw error on fetch failure', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: jest.fn().mockResolvedValue({ error: 'Server error' })
      });

      await expect(TemplateService.getTemplates()).rejects.toThrow('Server error');
    });

    it('should create template', async () => {
      const mockTemplate = { id: '1', titel: 'Test' };
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockTemplate)
      });

      const payload = { titel: 'Test', inhalt: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Content' }] }] }, kategorie: 'sonstiges' as any, kontext_anforderungen: [] };
      const result = await TemplateService.createTemplate(payload);
      expect(result).toEqual(mockTemplate);
      expect(global.fetch).toHaveBeenCalledWith('/api/templates', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(payload)
      }));
    });

    it('should update template', async () => {
      const mockTemplate = { id: '1', titel: 'Test Updated' };
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockTemplate)
      });

      const payload = { titel: 'Test Updated', inhalt: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Content' }] }] }, kategorie: 'sonstiges' as any, kontext_anforderungen: [] };
      const result = await TemplateService.updateTemplate('1', payload);
      expect(result).toEqual(mockTemplate);
      expect(global.fetch).toHaveBeenCalledWith('/api/templates/1', expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify(payload)
      }));
    });

    it('should delete template', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true
      });

      await TemplateService.deleteTemplate('1');
      expect(global.fetch).toHaveBeenCalledWith('/api/templates/1', expect.objectContaining({
        method: 'DELETE'
      }));
    });
  });

  describe('OptimisticTemplateService', () => {
    let service: OptimisticTemplateService;
    let onSuccess: jest.Mock;
    let onError: jest.Mock;

    beforeEach(() => {
      onSuccess = jest.fn();
      onError = jest.fn();
      service = new OptimisticTemplateService({ onSuccess, onError });
    });

    it('should subscribe and notify', () => {
      const listener = jest.fn();
      const unsubscribe = service.subscribe(listener);

      service.setTemplates([{ id: '1' } as any]);
      expect(listener).toHaveBeenCalled();

      unsubscribe();
      service.setTemplates([]);
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('should optimistically create template', async () => {
      const mockCreated = { id: 'server-id', titel: 'Test' };
      let resolveFetch: any;
      const fetchPromise = new Promise((resolve) => {
        resolveFetch = () => resolve({
          ok: true,
          json: jest.fn().mockResolvedValue(mockCreated)
        });
      });
      (global.fetch as jest.Mock).mockReturnValue(fetchPromise);

      const payload = { titel: 'Test', inhalt: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Content' }] }] }, kategorie: 'sonstiges' as any, kontext_anforderungen: [] };
      const createPromise = service.createTemplate(payload);

      // Verify optimistic state before fetch resolves
      const templatesDuringRequest = service.getTemplates();
      expect(templatesDuringRequest).toHaveLength(1);
      expect(templatesDuringRequest[0].id).toMatch(/^temp-/);

      // Resolve fetch and wait for completion
      resolveFetch();
      await createPromise;

      // Verify final state
      const templatesAfterRequest = service.getTemplates();
      expect(templatesAfterRequest).toHaveLength(1);
      expect(templatesAfterRequest[0].id).toBe('server-id');
      expect(onSuccess).toHaveBeenCalled();
    });

    it('should rollback on create failure', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const payload = { titel: 'Test', inhalt: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Content' }] }] }, kategorie: 'sonstiges' as any, kontext_anforderungen: [] };
      await expect(service.createTemplate(payload)).rejects.toThrow('Network error');

      const templates = service.getTemplates();
      expect(templates).toHaveLength(0);
      expect(onError).toHaveBeenCalled();
    });
  });
});
