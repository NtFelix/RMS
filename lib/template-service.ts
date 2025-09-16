import { Template, TemplatePayload } from '@/types/template';

export class TemplateService {
  private static baseUrl = '/api/templates';

  /**
   * Fetch all templates for the current user
   */
  static async getTemplates(): Promise<Template[]> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        // Handle specific error codes
        switch (errorData.code) {
          case 'UNAUTHORIZED':
            throw new Error('Sitzung abgelaufen. Bitte melden Sie sich erneut an.');
          case 'ACCESS_DENIED':
            throw new Error('Keine Berechtigung zum Zugriff auf die Vorlagen.');
          case 'DATABASE_ERROR':
            throw new Error('Datenbankfehler beim Laden der Vorlagen. Bitte versuchen Sie es später erneut.');
          default:
            throw new Error(errorData.error || 'Unbekannter Fehler beim Laden der Vorlagen');
        }
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching templates:', error);
      
      // Handle network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Netzwerkfehler. Bitte überprüfen Sie Ihre Internetverbindung.');
      }
      
      throw error;
    }
  }

  /**
   * Fetch a single template by ID
   */
  static async getTemplate(id: string): Promise<Template> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        // Handle specific error codes
        switch (errorData.code) {
          case 'UNAUTHORIZED':
            throw new Error('Sitzung abgelaufen. Bitte melden Sie sich erneut an.');
          case 'NOT_FOUND':
            throw new Error('Vorlage nicht gefunden oder keine Berechtigung.');
          case 'ACCESS_DENIED':
            throw new Error('Keine Berechtigung zum Zugriff auf diese Vorlage.');
          case 'DATABASE_ERROR':
            throw new Error('Datenbankfehler beim Laden der Vorlage. Bitte versuchen Sie es später erneut.');
          case 'INVALID_ID':
            throw new Error('Ungültige Vorlagen-ID.');
          default:
            throw new Error(errorData.error || 'Unbekannter Fehler beim Laden der Vorlage');
        }
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching template:', error);
      
      // Handle network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Netzwerkfehler. Bitte überprüfen Sie Ihre Internetverbindung.');
      }
      
      throw error;
    }
  }

  /**
   * Create a new template
   */
  static async createTemplate(templateData: TemplatePayload): Promise<Template> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(templateData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        // Handle specific error codes
        switch (errorData.code) {
          case 'UNAUTHORIZED':
            throw new Error('Sitzung abgelaufen. Bitte melden Sie sich erneut an.');
          case 'VALIDATION_ERROR':
            const validationMessage = errorData.details?.length > 0 
              ? `Validierungsfehler: ${errorData.details.join(', ')}`
              : 'Ungültige Eingabedaten.';
            throw new Error(validationMessage);
          case 'DUPLICATE_TITLE':
            throw new Error('Eine Vorlage mit diesem Namen existiert bereits.');
          case 'CONSTRAINT_VIOLATION':
            throw new Error('Die Eingabedaten entsprechen nicht den Anforderungen.');
          case 'DATABASE_ERROR':
            throw new Error('Datenbankfehler beim Erstellen der Vorlage. Bitte versuchen Sie es später erneut.');
          case 'INVALID_JSON':
            throw new Error('Ungültige Daten. Bitte versuchen Sie es erneut.');
          default:
            throw new Error(errorData.error || 'Unbekannter Fehler beim Erstellen der Vorlage');
        }
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating template:', error);
      
      // Handle network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Netzwerkfehler. Bitte überprüfen Sie Ihre Internetverbindung.');
      }
      
      throw error;
    }
  }

  /**
   * Update an existing template
   */
  static async updateTemplate(id: string, templateData: TemplatePayload): Promise<Template> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(templateData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        // Handle specific error codes
        switch (errorData.code) {
          case 'UNAUTHORIZED':
            throw new Error('Sitzung abgelaufen. Bitte melden Sie sich erneut an.');
          case 'NOT_FOUND':
            throw new Error('Vorlage nicht gefunden oder keine Berechtigung.');
          case 'VALIDATION_ERROR':
            const validationMessage = errorData.details?.length > 0 
              ? `Validierungsfehler: ${errorData.details.join(', ')}`
              : 'Ungültige Eingabedaten.';
            throw new Error(validationMessage);
          case 'DUPLICATE_TITLE':
            throw new Error('Eine Vorlage mit diesem Namen existiert bereits.');
          case 'CONSTRAINT_VIOLATION':
            throw new Error('Die Eingabedaten entsprechen nicht den Anforderungen.');
          case 'DATABASE_ERROR':
            throw new Error('Datenbankfehler beim Aktualisieren der Vorlage. Bitte versuchen Sie es später erneut.');
          case 'INVALID_ID':
            throw new Error('Ungültige Vorlagen-ID.');
          case 'INVALID_JSON':
            throw new Error('Ungültige Daten. Bitte versuchen Sie es erneut.');
          default:
            throw new Error(errorData.error || 'Unbekannter Fehler beim Aktualisieren der Vorlage');
        }
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating template:', error);
      
      // Handle network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Netzwerkfehler. Bitte überprüfen Sie Ihre Internetverbindung.');
      }
      
      throw error;
    }
  }

  /**
   * Delete a template
   */
  static async deleteTemplate(id: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        // Handle specific error codes
        switch (errorData.code) {
          case 'UNAUTHORIZED':
            throw new Error('Sitzung abgelaufen. Bitte melden Sie sich erneut an.');
          case 'NOT_FOUND':
            throw new Error('Vorlage nicht gefunden oder keine Berechtigung.');
          case 'FOREIGN_KEY_CONSTRAINT':
            throw new Error('Die Vorlage kann nicht gelöscht werden, da sie noch verwendet wird.');
          case 'DATABASE_ERROR':
            throw new Error('Datenbankfehler beim Löschen der Vorlage. Bitte versuchen Sie es später erneut.');
          case 'INVALID_ID':
            throw new Error('Ungültige Vorlagen-ID.');
          default:
            throw new Error(errorData.error || 'Unbekannter Fehler beim Löschen der Vorlage');
        }
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      
      // Handle network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Netzwerkfehler. Bitte überprüfen Sie Ihre Internetverbindung.');
      }
      
      throw error;
    }
  }
}

/**
 * Hook for template operations with optimistic updates
 */
export interface UseTemplatesOptions {
  onSuccess?: (message: string) => void;
  onError?: (error: string) => void;
}

export class OptimisticTemplateService {
  private templates: Template[] = [];
  private listeners: Set<() => void> = new Set();
  private options: UseTemplatesOptions;

  constructor(options: UseTemplatesOptions = {}) {
    this.options = options;
  }

  /**
   * Subscribe to template changes
   */
  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of changes
   */
  private notify() {
    this.listeners.forEach(listener => listener());
  }

  /**
   * Get current templates
   */
  getTemplates(): Template[] {
    return this.templates;
  }

  /**
   * Set templates (used for initial load)
   */
  setTemplates(templates: Template[]) {
    this.templates = templates;
    this.notify();
  }

  /**
   * Create template with optimistic update
   */
  async createTemplate(templateData: TemplatePayload): Promise<void> {
    // Create optimistic template
    const optimisticTemplate: Template = {
      id: `temp-${Date.now()}`,
      titel: templateData.titel,
      inhalt: templateData.inhalt,
      kategorie: templateData.kategorie,
      kontext_anforderungen: templateData.kontext_anforderungen,
      user_id: 'current-user',
      erstellungsdatum: new Date().toISOString(),
      aktualisiert_am: new Date().toISOString(),
    };

    // Add optimistic template
    this.templates = [optimisticTemplate, ...this.templates];
    this.notify();

    try {
      // Create actual template
      const createdTemplate = await TemplateService.createTemplate(templateData);
      
      // Replace optimistic template with real one
      this.templates = this.templates.map(t => 
        t.id === optimisticTemplate.id ? createdTemplate : t
      );
      this.notify();
      
      this.options.onSuccess?.('Template erfolgreich erstellt');
    } catch (error) {
      // Remove optimistic template on error
      this.templates = this.templates.filter(t => t.id !== optimisticTemplate.id);
      this.notify();
      
      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
      this.options.onError?.(errorMessage);
      throw error;
    }
  }

  /**
   * Update template with optimistic update
   */
  async updateTemplate(id: string, templateData: TemplatePayload): Promise<void> {
    // Store original template for rollback
    const originalTemplate = this.templates.find(t => t.id === id);
    if (!originalTemplate) {
      throw new Error('Template nicht gefunden');
    }

    // Apply optimistic update
    const optimisticTemplate: Template = {
      ...originalTemplate,
      titel: templateData.titel,
      inhalt: templateData.inhalt,
      kategorie: templateData.kategorie,
      kontext_anforderungen: templateData.kontext_anforderungen,
      aktualisiert_am: new Date().toISOString(),
    };

    this.templates = this.templates.map(t => 
      t.id === id ? optimisticTemplate : t
    );
    this.notify();

    try {
      // Update actual template
      const updatedTemplate = await TemplateService.updateTemplate(id, templateData);
      
      // Replace optimistic template with real one
      this.templates = this.templates.map(t => 
        t.id === id ? updatedTemplate : t
      );
      this.notify();
      
      this.options.onSuccess?.('Template erfolgreich aktualisiert');
    } catch (error) {
      // Rollback optimistic update
      this.templates = this.templates.map(t => 
        t.id === id ? originalTemplate : t
      );
      this.notify();
      
      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
      this.options.onError?.(errorMessage);
      throw error;
    }
  }

  /**
   * Delete template with optimistic update
   */
  async deleteTemplate(id: string): Promise<void> {
    // Store original template for rollback
    const originalTemplate = this.templates.find(t => t.id === id);
    if (!originalTemplate) {
      throw new Error('Template nicht gefunden');
    }

    // Remove template optimistically
    this.templates = this.templates.filter(t => t.id !== id);
    this.notify();

    try {
      // Delete actual template
      await TemplateService.deleteTemplate(id);
      
      this.options.onSuccess?.('Template erfolgreich gelöscht');
    } catch (error) {
      // Restore template on error
      this.templates = [...this.templates, originalTemplate].sort(
        (a, b) => new Date(b.aktualisiert_am).getTime() - new Date(a.aktualisiert_am).getTime()
      );
      this.notify();
      
      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
      this.options.onError?.(errorMessage);
      throw error;
    }
  }
}