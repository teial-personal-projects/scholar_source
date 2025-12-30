/**
 * Tests for StatusMessage component
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import StatusMessage from './StatusMessage';

describe('StatusMessage', () => {
  it('renders error message with red styling', () => {
    render(<StatusMessage type="error" message="Something went wrong" />);

    const message = screen.getByText('Something went wrong');
    expect(message).toBeInTheDocument();
    expect(message.closest('div')).toHaveClass('bg-red-50');
  });

  it('renders success message with green styling', () => {
    render(<StatusMessage type="success" message="Operation completed" />);

    const message = screen.getByText('Operation completed');
    expect(message).toBeInTheDocument();
    expect(message.closest('div')).toHaveClass('bg-green-50');
  });

  it('renders info message with blue styling', () => {
    render(<StatusMessage type="info" message="Please wait" />);

    const message = screen.getByText('Please wait');
    expect(message).toBeInTheDocument();
    expect(message.closest('div')).toHaveClass('bg-blue-50');
  });

  it('renders warning message with yellow styling', () => {
    render(<StatusMessage type="warning" message="Be careful" />);

    const message = screen.getByText('Be careful');
    expect(message).toBeInTheDocument();
    expect(message.closest('div')).toHaveClass('bg-yellow-50');
  });

  it('does not render when message is empty', () => {
    const { container } = render(<StatusMessage type="error" message="" />);

    expect(container.firstChild).toBeNull();
  });

  it('does not render when message is null', () => {
    const { container } = render(<StatusMessage type="error" message={null} />);

    expect(container.firstChild).toBeNull();
  });

  it('applies correct icon for error type', () => {
    render(<StatusMessage type="error" message="Error" />);

    // Check for error icon (usually an X or alert icon)
    const icon = screen.getByRole('img', { hidden: true }) || screen.getByText(/error/i).closest('div').querySelector('svg');
    expect(icon).toBeInTheDocument();
  });
});
