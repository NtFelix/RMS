import { renderHook, act, waitFor } from '@testing-library/react';
import { useTemplates, useTemplateFilters } from '@/hooks/use-templates';
import { TemplateService } from '@/lib/template-service';
import { Template, TemplatePayload } from '@/types/template';
import { toast } from '@/hooks/use-toast';

// Mock dependencies
jest.mock('@/lib/template-service');
jest.mock('@/hooks/use-toast');

const mockTemplateService = TemplateService as jest.Mocked<typeof TemplateService>;
const mockToast = toast as jest.MockedFunction<typeof toast>;

describe('useTemplates Hook', () => {
  const mockTemplates: Template[] = [
    {
      id: '1',
      titel: 'Template 1',
      inhalt: { type: 'doc', content: [] },
      user_id: 'user1',
      kategorie: 'Mail',
      kontext_anforderungen: [],
      erstellungsdatum: '2024-01-01T00:00:00Z',
      aktualisiert_am: '2024-01-01T00:00:00Z',
    },
    {
      id: '2',
      titel: 'Template 2',
      inhalt: { type: 'doc', content: [] },
      user_id: 'user1',
      kategorie: 'Brief',
      kontext_anforderungen: [],
      erstellungsdatum: '2024-01-02T00:00:00Z',
      aktualisiert_am: '2024-01-02T00:00:00Z',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockTemplateService.getTemplates.mockResolvedValue(mockTemplates);
  });

  it('loads templates on mount', async () => {
    const { result } = renderHook(() => useTemplates());

    expect(result.current.loading).toBe(true);
    expect(result.current.templates).toEqual([]);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.templates).toEqual(mockTemplates);
    expect(result.current.error).toBeNull();
    expect(mockTemplateService.getTemplates).toHaveBeenCalledTimes(1);
  });

  it('handles loading error', async () => {
    const errorMessage = 'Failed to load templates';
    mockTemplateService.getTemplates.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useTemplates());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe(errorMessage);
    expect(result.current.templates).toEqual([]);
    expect(mockToast).toHaveBeenCalledWith({
      title: 'Fehler',
      description: errorMessage,
      variant: 'destructive',
    });
  });

  it('creates template successfully', async () => {
    const { result } = renderHook(() => useTemplates());

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const newTemplateData: TemplatePayload = {
      titel: 'New Template',
      inhalt: { type: 'doc', content: [] },
      kategorie: 'Mail',
      kontext_anforderungen: [],
    };

    const createdTemplate: Template = {
      id: '3',
      ...newTemplateData,
      user_id: 'user1',
      erstellungsdatum: '2024-01-03T00:00:00Z',
      aktualisiert_am: '2024-01-03T00:00:00Z',
    };

    mockTemplateService.createTemplate.mockResolvedValue(createdTemplate);

    await act(async () => {
      await result.current.createTemplate(newTemplateData);
    });

    expect(mockTemplateService.createTemplate).toHaveBeenCalledWith(newTemplateData);
    expect(result.current.error).toBeNull();
  });

  it('handles create template error', async () => {
    const { result } = renderHook(() => useTemplates());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const newTemplateData: TemplatePayload = {
      titel: 'New Template',
      inhalt: { type: 'doc', content: [] },
      kategorie: 'Mail',
      kontext_anforderungen: [],
    };

    const errorMessage = 'Creation failed';
    mockTemplateService.createTemplate.mockRejectedValue(new Error(errorMessage));

    await act(async () => {
      await expect(result.current.createTemplate(newTemplateData)).rejects.toThrow(errorMessage);
    });

    expect(result.current.error).toBe(errorMessage);
  });

  it('updates template successfully', async () => {
    const { result } = renderHook(() => useTemplates());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const updateData: TemplatePayload = {
      titel: 'Updated Template',
      inhalt: { type: 'doc', content: [] },
      kategorie: 'Brief',
      kontext_anforderungen: [],
    };

    const updatedTemplate: Template = {
      ...mockTemplates[0],
      ...updateData,
      aktualisiert_am: '2024-01-03T00:00:00Z',
    };

    mockTemplateService.updateTemplate.mockResolvedValue(updatedTemplate);

    await act(async () => {
      await result.current.updateTemplate('1', updateData);
    });

    expect(mockTemplateService.updateTemplate).toHaveBeenCalledWith('1', updateData);
    expect(result.current.error).toBeNull();
  });

  it('handles update template error', async () => {
    const { result } = renderHook(() => useTemplates());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const updateData: TemplatePayload = {
      titel: 'Updated Template',
      inhalt: { type: 'doc', content: [] },
      kategorie: 'Brief',
      kontext_anforderungen: [],
    };

    const errorMessage = 'Update failed';
    mockTemplateService.updateTemplate.mockRejectedValue(new Error(errorMessage));

    await act(async () => {
      await expect(result.current.updateTemplate('1', updateData)).rejects.toThrow(errorMessage);
    });

    expect(result.current.error).toBe(errorMessage);
  });

  it('deletes template successfully', async () => {
    const { result } = renderHook(() => useTemplates());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    mockTemplateService.deleteTemplate.mockResolvedValue();

    await act(async () => {
      await result.current.deleteTemplate('1');
    });

    expect(mockTemplateService.deleteTemplate).toHaveBeenCalledWith('1');
    expect(result.current.error).toBeNull();
  });

  it('handles delete template error', async () => {
    const { result } = renderHook(() => useTemplates());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const errorMessage = 'Delete failed';
    mockTemplateService.deleteTemplate.mockRejectedValue(new Error(errorMessage));

    await act(async () => {
      await expect(result.current.deleteTemplate('1')).rejects.toThrow(errorMessage);
    });

    expect(result.current.error).toBe(errorMessage);
  });

  it('gets single template successfully', async () => {
    const { result } = renderHook(() => useTemplates());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const template = mockTemplates[0];
    mockTemplateService.getTemplate.mockResolvedValue(template);

    let retrievedTemplate: Template;
    await act(async () => {
      retrievedTemplate = await result.current.getTemplate('1');
    });

    expect(mockTemplateService.getTemplate).toHaveBeenCalledWith('1');
    expect(retrievedTemplate!).toEqual(template);
    expect(result.current.error).toBeNull();
  });

  it('handles get template error', async () => {
    const { result } = renderHook(() => useTemplates());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const errorMessage = 'Template not found';
    mockTemplateService.getTemplate.mockRejectedValue(new Error(errorMessage));

    await act(async () => {
      await expect(result.current.getTemplate('999')).rejects.toThrow(errorMessage);
    });

    expect(result.current.error).toBe(errorMessage);
    expect(mockToast).toHaveBeenCalledWith({
      title: 'Fehler',
      description: errorMessage,
      variant: 'destructive',
    });
  });

  it('refreshes templates', async () => {
    const { result } = renderHook(() => useTemplates());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Clear the initial call
    mockTemplateService.getTemplates.mockClear();

    await act(async () => {
      await result.current.refreshTemplates();
    });

    expect(mockTemplateService.getTemplates).toHaveBeenCalledTimes(1);
  });
});

describe('useTemplateFilters Hook', () => {
  const mockTemplates: Template[] = [
    {
      id: '1',
      titel: 'Mail Template',
      inhalt: { type: 'doc', content: [] },
      user_id: 'user1',
      kategorie: 'Mail',
      kontext_anforderungen: [],
      erstellungsdatum: '2024-01-01T00:00:00Z',
      aktualisiert_am: '2024-01-01T00:00:00Z',
    },
    {
      id: '2',
      titel: 'Brief Template',
      inhalt: { type: 'doc', content: [] },
      user_id: 'user1',
      kategorie: 'Brief',
      kontext_anforderungen: [],
      erstellungsdatum: '2024-01-02T00:00:00Z',
      aktualisiert_am: '2024-01-02T00:00:00Z',
    },
    {
      id: '3',
      titel: 'Another Mail',
      inhalt: { type: 'doc', content: [] },
      user_id: 'user1',
      kategorie: 'Mail',
      kontext_anforderungen: [],
      erstellungsdatum: '2024-01-03T00:00:00Z',
      aktualisiert_am: '2024-01-03T00:00:00Z',
    },
  ];

  it('initializes with default values', () => {
    const { result } = renderHook(() => useTemplateFilters(mockTemplates));

    expect(result.current.searchQuery).toBe('');
    expect(result.current.selectedCategory).toBe('all');
    expect(result.current.filteredTemplates).toEqual(mockTemplates);
  });

  it('filters templates by search query', () => {
    const { result } = renderHook(() => useTemplateFilters(mockTemplates));

    act(() => {
      result.current.setSearchQuery('Mail');
    });

    expect(result.current.searchQuery).toBe('Mail');
    expect(result.current.filteredTemplates).toHaveLength(2);
    expect(result.current.filteredTemplates[0].titel).toBe('Mail Template');
    expect(result.current.filteredTemplates[1].titel).toBe('Another Mail');
  });

  it('filters templates by category', () => {
    const { result } = renderHook(() => useTemplateFilters(mockTemplates));

    act(() => {
      result.current.setSelectedCategory('Brief');
    });

    expect(result.current.selectedCategory).toBe('Brief');
    expect(result.current.filteredTemplates).toHaveLength(1);
    expect(result.current.filteredTemplates[0].kategorie).toBe('Brief');
  });

  it('combines search and category filters', () => {
    const { result } = renderHook(() => useTemplateFilters(mockTemplates));

    act(() => {
      result.current.setSearchQuery('Template');
      result.current.setSelectedCategory('Mail');
    });

    expect(result.current.filteredTemplates).toHaveLength(1);
    expect(result.current.filteredTemplates[0].titel).toBe('Mail Template');
  });

  it('handles case-insensitive search', () => {
    const { result } = renderHook(() => useTemplateFilters(mockTemplates));

    act(() => {
      result.current.setSearchQuery('mail');
    });

    expect(result.current.filteredTemplates).toHaveLength(2);
  });

  it('groups templates by category', () => {
    const { result } = renderHook(() => useTemplateFilters(mockTemplates));

    expect(result.current.groupedTemplates).toEqual({
      Mail: [mockTemplates[0], mockTemplates[2]],
      Brief: [mockTemplates[1]],
    });
  });

  it('groups filtered templates correctly', () => {
    const { result } = renderHook(() => useTemplateFilters(mockTemplates));

    act(() => {
      result.current.setSearchQuery('Template');
    });

    expect(result.current.groupedTemplates).toEqual({
      Mail: [mockTemplates[0]],
      Brief: [mockTemplates[1]],
    });
  });

  it('returns empty groups when no templates match', () => {
    const { result } = renderHook(() => useTemplateFilters(mockTemplates));

    act(() => {
      result.current.setSearchQuery('NonExistent');
    });

    expect(result.current.filteredTemplates).toHaveLength(0);
    expect(result.current.groupedTemplates).toEqual({});
  });

  it('handles "all" category selection', () => {
    const { result } = renderHook(() => useTemplateFilters(mockTemplates));

    act(() => {
      result.current.setSelectedCategory('Mail');
    });

    expect(result.current.filteredTemplates).toHaveLength(2);

    act(() => {
      result.current.setSelectedCategory('all');
    });

    expect(result.current.filteredTemplates).toEqual(mockTemplates);
  });

  it('updates when templates array changes', () => {
    const { result, rerender } = renderHook(
      ({ templates }) => useTemplateFilters(templates),
      { initialProps: { templates: mockTemplates } }
    );

    expect(result.current.filteredTemplates).toHaveLength(3);

    const newTemplates = mockTemplates.slice(0, 1);
    rerender({ templates: newTemplates });

    expect(result.current.filteredTemplates).toHaveLength(1);
  });

  it('maintains filters when templates change', () => {
    const { result, rerender } = renderHook(
      ({ templates }) => useTemplateFilters(templates),
      { initialProps: { templates: mockTemplates } }
    );

    act(() => {
      result.current.setSearchQuery('Mail');
      result.current.setSelectedCategory('Mail');
    });

    expect(result.current.filteredTemplates).toHaveLength(2);

    const newTemplates = [...mockTemplates, {
      id: '4',
      titel: 'New Mail Template',
      inhalt: { type: 'doc', content: [] },
      user_id: 'user1',
      kategorie: 'Mail',
      kontext_anforderungen: [],
      erstellungsdatum: '2024-01-04T00:00:00Z',
      aktualisiert_am: '2024-01-04T00:00:00Z',
    }];

    rerender({ templates: newTemplates });

    expect(result.current.searchQuery).toBe('Mail');
    expect(result.current.selectedCategory).toBe('Mail');
    expect(result.current.filteredTemplates).toHaveLength(3);
  });
});