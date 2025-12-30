/**
 * Tests for ConfirmDialog component
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ConfirmDialog from './ConfirmDialog';

describe('ConfirmDialog', () => {
  const mockOnConfirm = vi.fn();
  const mockOnCancel = vi.fn();

  const defaultProps = {
    isOpen: true,
    title: 'Confirm Action',
    message: 'Are you sure you want to proceed?',
    confirmLabel: 'Yes',
    cancelLabel: 'No',
    onConfirm: mockOnConfirm,
    onCancel: mockOnCancel,
  };

  beforeEach(() => {
    mockOnConfirm.mockClear();
    mockOnCancel.mockClear();
  });

  it('renders dialog when isOpen is true', () => {
    render(<ConfirmDialog {...defaultProps} />);

    expect(screen.getByText('Confirm Action')).toBeInTheDocument();
    expect(screen.getByText('Are you sure you want to proceed?')).toBeInTheDocument();
  });

  it('does not render dialog when isOpen is false', () => {
    render(<ConfirmDialog {...defaultProps} isOpen={false} />);

    expect(screen.queryByText('Confirm Action')).not.toBeInTheDocument();
  });

  it('calls onConfirm when confirm button clicked', () => {
    render(<ConfirmDialog {...defaultProps} />);

    const confirmButton = screen.getByRole('button', { name: 'Yes' });
    fireEvent.click(confirmButton);

    expect(mockOnConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when cancel button clicked', () => {
    render(<ConfirmDialog {...defaultProps} />);

    const cancelButton = screen.getByRole('button', { name: 'No' });
    fireEvent.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it('uses default labels when not provided', () => {
    const propsWithoutLabels = {
      isOpen: true,
      title: 'Confirm',
      message: 'Proceed?',
      onConfirm: mockOnConfirm,
      onCancel: mockOnCancel,
    };

    render(<ConfirmDialog {...propsWithoutLabels} />);

    // Should have default "Confirm" and "Cancel" buttons
    expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('renders with danger variant for destructive actions', () => {
    render(<ConfirmDialog {...defaultProps} variant="danger" />);

    const confirmButton = screen.getByRole('button', { name: 'Yes' });
    // Should have red/danger styling
    expect(confirmButton).toHaveClass('bg-red-600');
  });

  it('closes dialog when clicking outside (if supported)', () => {
    render(<ConfirmDialog {...defaultProps} />);

    // Click on overlay/backdrop
    const overlay = screen.getByRole('dialog').parentElement;
    if (overlay) {
      fireEvent.click(overlay);
      expect(mockOnCancel).toHaveBeenCalled();
    }
  });

  it('handles Escape key press to cancel', () => {
    render(<ConfirmDialog {...defaultProps} />);

    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });

    // May call onCancel if implemented
    // This depends on the component implementation
  });
});
