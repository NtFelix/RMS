import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import DocumentationSidebar from '../documentation-sidebar';
import { useAIAssistantStore } from '../../../../hooks/use-ai-assistant-store';

// Mock the AI assistant store
jest.mock('../../../../hooks/use-ai-assistant-store');
const mockUseAIAssistantStore = useAIAssistantStore as jest.MockedFunction<typeof useAIAssistantStore>;

// Mock Next.js Link component
jest.mock('next/link', () => {
  return ({ children, href, ...props }: any) => {
    return <a href={typeof href === 'string' ? href : href.pathname} {...props}>{children}</a>;
  };
});

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

const mockPages = [
  {
    id: '1',
    title: 'Getting Started',
    category: 'Basics',
    filesAndMedia: [],
  },
  {
    id: '2',
    title: 'Advanced Features',
    category: 'Advanced',
    filesAndMedia: [],
  },
];

describe('DocumentationSidebar', () => {
  const mockSwitchToSearch = jest.fn();
  const mockSwitchToAI = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAIAssistantStore.mockReturnValue({
      currentMode: 'search',
      switchToSearch: mockSwitchToSearch,
      switchToAI: mockSwitchToAI,
      isOpen: false,
      messages: [],
      isLoading: false,
      error: null,
      sessionId: null,
      openAI: jest.fn(),
      closeAI: jest.fn(),
      addMessage: jest.fn(),
      setLoading: jest.fn(),
      setError: jest.fn(),
      clearMessages: jest.fn(),
      setSessionId: jest.fn(),
    });
  });

  it('renders atom icon button', () => {
    render(<DocumentationSidebar pages={mockPages} activePageId="1" />);
    
    const atomButton = screen.getByTitle('Switch to AI assistant');
    expect(atomButton).toBeInTheDocument();
  });

  it('shows search mode placeholder by default', () => {
    render(<DocumentationSidebar pages={mockPages} activePageId="1" />);
    
    const searchInput = screen.getByPlaceholderText('Search documentation...');
    expect(searchInput).toBeInTheDocument();
  });

  it('shows AI mode placeholder when in AI mode', () => {
    mockUseAIAssistantStore.mockReturnValue({
      currentMode: 'ai',
      switchToSearch: mockSwitchToSearch,
      switchToAI: mockSwitchToAI,
      isOpen: false,
      messages: [],
      isLoading: false,
      error: null,
      sessionId: null,
      openAI: jest.fn(),
      closeAI: jest.fn(),
      addMessage: jest.fn(),
      setLoading: jest.fn(),
      setError: jest.fn(),
      clearMessages: jest.fn(),
      setSessionId: jest.fn(),
    });

    render(<DocumentationSidebar pages={mockPages} activePageId="1" />);
    
    const searchInput = screen.getByPlaceholderText('Ask AI about documentation...');
    expect(searchInput).toBeInTheDocument();
  });

  it('calls switchToAI when atom button is clicked in search mode', () => {
    render(<DocumentationSidebar pages={mockPages} activePageId="1" />);
    
    const atomButton = screen.getByTitle('Switch to AI assistant');
    fireEvent.click(atomButton);
    
    expect(mockSwitchToAI).toHaveBeenCalledTimes(1);
  });

  it('calls switchToSearch when atom button is clicked in AI mode', () => {
    mockUseAIAssistantStore.mockReturnValue({
      currentMode: 'ai',
      switchToSearch: mockSwitchToSearch,
      switchToAI: mockSwitchToAI,
      isOpen: false,
      messages: [],
      isLoading: false,
      error: null,
      sessionId: null,
      openAI: jest.fn(),
      closeAI: jest.fn(),
      addMessage: jest.fn(),
      setLoading: jest.fn(),
      setError: jest.fn(),
      clearMessages: jest.fn(),
      setSessionId: jest.fn(),
    });

    render(<DocumentationSidebar pages={mockPages} activePageId="1" />);
    
    const atomButton = screen.getByTitle('Switch to documentation search');
    fireEvent.click(atomButton);
    
    expect(mockSwitchToSearch).toHaveBeenCalledTimes(1);
  });

  it('shows AI mode indicator when in AI mode', () => {
    mockUseAIAssistantStore.mockReturnValue({
      currentMode: 'ai',
      switchToSearch: mockSwitchToSearch,
      switchToAI: mockSwitchToAI,
      isOpen: false,
      messages: [],
      isLoading: false,
      error: null,
      sessionId: null,
      openAI: jest.fn(),
      closeAI: jest.fn(),
      addMessage: jest.fn(),
      setLoading: jest.fn(),
      setError: jest.fn(),
      clearMessages: jest.fn(),
      setSessionId: jest.fn(),
    });

    render(<DocumentationSidebar pages={mockPages} activePageId="1" />);
    
    expect(screen.getByText('AI Assistant Mode')).toBeInTheDocument();
    expect(screen.getByText('Ask questions about the documentation content below')).toBeInTheDocument();
  });

  it('does not show AI mode indicator when in search mode', () => {
    render(<DocumentationSidebar pages={mockPages} activePageId="1" />);
    
    expect(screen.queryByText('AI Assistant Mode')).not.toBeInTheDocument();
  });
});