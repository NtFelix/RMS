// app/documentation/page.test.tsx
import { render, screen } from '@testing-library/react';
import DocumentationPage from './page';

describe('DocumentationPage', () => {
  it('renders the heading', () => {
    render(<DocumentationPage />);
    const heading = screen.getByRole('heading', { name: /documentation/i });
    expect(heading).toBeInTheDocument();
  });
});
