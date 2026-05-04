/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react';
import { Badge } from '@/components/ui/badge';

describe('Badge', () => {
  it('renders with default variant', () => {
    render(<Badge>Default Badge</Badge>);
    expect(screen.getByText('Default Badge')).toBeInTheDocument();
  });

  it('renders with different variants', () => {
    const variants = ['default', 'secondary', 'destructive', 'outline', 'success'] as const;

    variants.forEach((variant) => {
      const { rerender } = render(<Badge variant={variant}>{variant}</Badge>);
      expect(screen.getByText(variant)).toBeInTheDocument();
      rerender(<Badge variant={variant}>{variant}</Badge>);
    });
  });

  it('renders as child elements', () => {
    render(
      <Badge>
        <span data-testid="child">Child Element</span>
      </Badge>
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });
});