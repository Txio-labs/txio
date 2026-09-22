import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MainnetExecutionWarningModal } from './MainnetExecutionWarningModal';

describe('MainnetExecutionWarningModal', () => {
  it('does not render when isOpen is false', () => {
    const { container } = render(
      <MainnetExecutionWarningModal isOpen={false} onClose={vi.fn()} onConfirm={vi.fn()} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders execution-specific copy when isOpen is true', () => {
    render(
      <MainnetExecutionWarningModal isOpen={true} onClose={vi.fn()} onConfirm={vi.fn()} />
    );

    // Verify it does not render "switch" language
    expect(screen.queryByText(/Switch Network/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Target/i)).not.toBeInTheDocument();
    
    // Verify execution-specific copy
    expect(screen.getByText('Mainnet Execution Warning')).toBeInTheDocument();
    expect(screen.getByText(/You are about to execute a transaction on mainnet/i)).toBeInTheDocument();
    
    // Verify the primary button reads "Confirm & Execute"
    const confirmButton = screen.getByRole('button', { name: /Confirm & Execute/i });
    expect(confirmButton).toBeInTheDocument();
  });

  it('calls onClose when Cancel is clicked', () => {
    const handleClose = vi.fn();
    render(
      <MainnetExecutionWarningModal isOpen={true} onClose={handleClose} onConfirm={vi.fn()} />
    );

    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelButton);
    expect(handleClose).toHaveBeenCalledOnce();
  });

  it('calls onConfirm when Confirm & Execute is clicked', () => {
    const handleConfirm = vi.fn();
    render(
      <MainnetExecutionWarningModal isOpen={true} onClose={vi.fn()} onConfirm={handleConfirm} />
    );

    const confirmButton = screen.getByRole('button', { name: /Confirm & Execute/i });
    fireEvent.click(confirmButton);
    expect(handleConfirm).toHaveBeenCalledOnce();
  });
});
