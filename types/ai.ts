export interface DocumentationContextItem {
  id: string;
  titel: string;
  kategorie?: string | null;
  seiteninhalt?: string;
}

export interface CategoryItem {
  name: string;
  articleCount?: number;
}

export interface AIDocumentationContext {
  articles: DocumentationContextItem[];
  categories?: CategoryItem[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isRetry?: boolean;
  validationWarning?: string;
}
