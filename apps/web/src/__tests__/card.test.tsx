/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react';
import { Card, CardHeader, CardContent, CardFooter, CardTitle, CardDescription } from '@/components/ui/card';

describe('Card', () => {
  it('renders card element', () => {
    render(<Card>Card Content</Card>);
    expect(screen.getByText('Card Content')).toBeInTheDocument();
  });

  it('renders CardHeader with title and description', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Test Title</CardTitle>
          <CardDescription>Test Description</CardDescription>
        </CardHeader>
      </Card>
    );
    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test Description')).toBeInTheDocument();
  });

  it('renders CardContent', () => {
    render(
      <Card>
        <CardContent>Main content here</CardContent>
      </Card>
    );
    expect(screen.getByText('Main content here')).toBeInTheDocument();
  });

  it('renders CardFooter', () => {
    render(
      <Card>
        <CardFooter>Footer content</CardFooter>
      </Card>
    );
    expect(screen.getByText('Footer content')).toBeInTheDocument();
  });

  it('renders full card composition', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Report Title</CardTitle>
          <CardDescription>Report description text</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Report content</p>
        </CardContent>
        <CardFooter>
          <button>Action</button>
        </CardFooter>
      </Card>
    );

    expect(screen.getByText('Report Title')).toBeInTheDocument();
    expect(screen.getByText('Report description text')).toBeInTheDocument();
    expect(screen.getByText('Report content')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument();
  });
});