import { useState, useEffect, useCallback } from 'react';
import { Template, TemplatePayload } from '@/types/template';
import { TemplateService, OptimisticTemplateService, UseTemplatesOptions } from '@/lib/template-service';
import { toast } from '@/hooks/use-toast';

interface UseTemplatesReturn {
  templates: Template[];
  loading: boolean;
  error: string | null;
  createTemplate: (templateData: TemplatePayload) => Promise<void>;
  updateTemplate: (id: string, templateData: TemplatePayload) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  getTemplate: (id: string) => Promise<Template>;
  refreshTemplates: () => Promise<void>;
}

export function useTemplates(): UseTemplatesReturn {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create optimistic service instance
  const [optimisticService] = useState(() => {
    const options: UseTemplatesOptions = {
      onSuccess: (message: string) => {
        toast({
          title: "Erfolg",
          description: message,
        });
      },
      onError: (error: string) => {
        toast({
          title: "Fehler",
          description: error,
          variant: "destructive",
        });
      },
    };
    return new OptimisticTemplateService(options);
  });

  // Subscribe to optimistic service changes
  useEffect(() => {
    const unsubscribe = optimisticService.subscribe(() => {
      setTemplates(optimisticService.getTemplates());
    });
    return () => {
      unsubscribe();
    };
  }, [optimisticService]);

  // Load templates on mount
  const loadTemplates = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const fetchedTemplates = await TemplateService.getTemplates();
      optimisticService.setTemplates(fetchedTemplates);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Fehler beim Laden der Templates';
      setError(errorMessage);
      toast({
        title: "Fehler",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [optimisticService]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  // Create template
  const createTemplate = useCallback(async (templateData: TemplatePayload) => {
    try {
      setError(null);
      await optimisticService.createTemplate(templateData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Fehler beim Erstellen des Templates';
      setError(errorMessage);
      throw err;
    }
  }, [optimisticService]);

  // Update template
  const updateTemplate = useCallback(async (id: string, templateData: TemplatePayload) => {
    try {
      setError(null);
      await optimisticService.updateTemplate(id, templateData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Fehler beim Aktualisieren des Templates';
      setError(errorMessage);
      throw err;
    }
  }, [optimisticService]);

  // Delete template
  const deleteTemplate = useCallback(async (id: string) => {
    try {
      setError(null);
      await optimisticService.deleteTemplate(id);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Fehler beim Löschen des Templates';
      setError(errorMessage);
      throw err;
    }
  }, [optimisticService]);

  // Get single template
  const getTemplate = useCallback(async (id: string): Promise<Template> => {
    try {
      setError(null);
      return await TemplateService.getTemplate(id);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Fehler beim Laden des Templates';
      setError(errorMessage);
      toast({
        title: "Fehler",
        description: errorMessage,
        variant: "destructive",
      });
      throw err;
    }
  }, []);

  // Refresh templates
  const refreshTemplates = useCallback(async () => {
    await loadTemplates();
  }, [loadTemplates]);

  return {
    templates,
    loading,
    error,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    getTemplate,
    refreshTemplates,
  };
}

/**
 * Hook for template filtering and searching
 */
export function useTemplateFilters(templates: Template[]) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = !searchQuery || 
      template.titel.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = !selectedCategory || selectedCategory === 'all' || 
      template.kategorie === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  // Group templates by category
  const groupedTemplates = filteredTemplates.reduce((groups, template) => {
    const category = template.kategorie;
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(template);
    return groups;
  }, {} as Record<string, Template[]>);

  return {
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    filteredTemplates,
    groupedTemplates,
  };
}