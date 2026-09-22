import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { NewTemplateModal } from './NewTemplateModal';

describe('NewTemplateModal', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <NewTemplateModal isOpen={false} onClose={vi.fn()} onCreate={vi.fn()} />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('disables Create Template until a name is entered', async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn();

    render(
      <NewTemplateModal isOpen onClose={vi.fn()} onCreate={onCreate} />
    );

    const createButton = screen.getByRole('button', {
      name: 'Create Template'
    });
    expect(createButton).toBeDisabled();

    await user.type(
      screen.getByPlaceholderText('e.g. Batch Coin Transfer'),
      'Batch Transfer'
    );

    expect(createButton).toBeEnabled();
    expect(onCreate).not.toHaveBeenCalled();
  });

  it('creates a template with the chosen name, type, and description', async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn();

    render(
      <NewTemplateModal isOpen onClose={vi.fn()} onCreate={onCreate} />
    );

    await user.type(
      screen.getByPlaceholderText('e.g. Batch Coin Transfer'),
      'Batch Transfer'
    );
    await user.click(screen.getByRole('button', { name: 'MoveCall' }));
    await user.type(
      screen.getByPlaceholderText('What does this template do?'),
      'Sends coins to many recipients'
    );
    await user.click(
      screen.getByRole('button', { name: 'Create Template' })
    );

    expect(onCreate).toHaveBeenCalledWith({
      title: 'Batch Transfer',
      type: 'MoveCall',
      description: 'Sends coins to many recipients'
    });
  });

  it('resets its fields after Cancel', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <NewTemplateModal isOpen onClose={onClose} onCreate={vi.fn()} />
    );

    await user.type(
      screen.getByPlaceholderText('e.g. Batch Coin Transfer'),
      'Draft name'
    );
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onClose).toHaveBeenCalledOnce();
  });
});