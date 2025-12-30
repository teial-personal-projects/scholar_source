/**
 * Tests for Hero component
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Hero from './Hero';

describe('Hero', () => {
  it('renders hero section with title', () => {
    render(<Hero />);

    expect(screen.getByText(/ScholarSource/i)).toBeInTheDocument();
  });

  it('renders description text', () => {
    render(<Hero />);

    // Check for description/subtitle
    const description = screen.getByText(/discover/i) || screen.getByText(/educational/i);
    expect(description).toBeInTheDocument();
  });

  it('applies correct styling classes', () => {
    const { container } = render(<Hero />);

    // Hero section should have appropriate Tailwind classes
    const heroSection = container.firstChild;
    expect(heroSection).toHaveClass('bg-gradient-to-r');
  });

  it('is responsive', () => {
    const { container } = render(<Hero />);

    // Should have responsive text sizes
    const title = screen.getByRole('heading', { level: 1 });
    expect(title).toHaveClass('text-4xl', 'md:text-5xl');
  });
});
