// @jest-environment jsdom
import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { useImportVideoForm } from '../useImportVideoForm';

describe('useImportVideoForm (local only)', () => {
  function TestComponent() {
    const form = useImportVideoForm({ onSuccess: jest.fn(), onClose: jest.fn() });
    return (
      <div>
        <span data-testid="title">{form.title}</span>
        <span data-testid="author">{form.author}</span>
        <span data-testid="tags">{form.tags}</span>
        <button onClick={() => form.setTitle('My Video')}>Set Title</button>
        <button onClick={() => form.setAuthor('Jane Doe')}>Set Author</button>
        <button onClick={() => form.setTags('french,beginner')}>Set Tags</button>
      </div>
    );
  }

  it('initializes with empty fields', () => {
    render(<TestComponent />);
    expect(screen.getByTestId('title').textContent).toBe('');
    expect(screen.getByTestId('author').textContent).toBe('');
    expect(screen.getByTestId('tags').textContent).toBe('');
  });

  it('updates title, author, tags', () => {
    render(<TestComponent />);
    fireEvent.click(screen.getByText('Set Title'));
    fireEvent.click(screen.getByText('Set Author'));
    fireEvent.click(screen.getByText('Set Tags'));
    expect(screen.getByTestId('title').textContent).toBe('My Video');
    expect(screen.getByTestId('author').textContent).toBe('Jane Doe');
    expect(screen.getByTestId('tags').textContent).toBe('french,beginner');
  });
});
