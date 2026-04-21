// @jest-environment jsdom
import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  useImportVideoForm,
  importFormReducer,
  initialImportFormState,
} from '../useImportVideoForm';

describe('importFormReducer', () => {
  it('SET_IMPORT_MODE resets videoFile, title, author', () => {
    const state = {
      ...initialImportFormState,
      videoFile: new File([''], 'video.mp4'),
      title: 'My Video',
      author: 'Jane',
    };
    const next = importFormReducer(state, { type: 'SET_IMPORT_MODE', mode: 'local' });
    expect(next.importMode).toBe('local');
    expect(next.videoFile).toBeNull();
    expect(next.title).toBe('');
    expect(next.author).toBe('');
  });

  it('SET_TRANSCRIPT_MODE paste clears transcriptFile', () => {
    const state = {
      ...initialImportFormState,
      transcriptFile: new File([''], 'sub.srt'),
      pastedTranscript: '',
    };
    const next = importFormReducer(state, { type: 'SET_TRANSCRIPT_MODE', mode: 'paste' });
    expect(next.transcriptMode).toBe('paste');
    expect(next.transcriptFile).toBeNull();
  });

  it('SET_TRANSCRIPT_MODE upload clears pastedTranscript', () => {
    const state = {
      ...initialImportFormState,
      transcriptMode: 'paste' as const,
      pastedTranscript: 'some text here that is long enough',
    };
    const next = importFormReducer(state, { type: 'SET_TRANSCRIPT_MODE', mode: 'upload' });
    expect(next.transcriptMode).toBe('upload');
    expect(next.pastedTranscript).toBe('');
  });

  it('SUBMIT_START sets isSubmitting true and clears submitError', () => {
    const state = { ...initialImportFormState, submitError: 'old error' };
    const next = importFormReducer(state, { type: 'SUBMIT_START' });
    expect(next.isSubmitting).toBe(true);
    expect(next.submitError).toBeNull();
  });

  it('SUBMIT_ERROR sets isSubmitting false and records message', () => {
    const state = { ...initialImportFormState, isSubmitting: true };
    const next = importFormReducer(state, { type: 'SUBMIT_ERROR', message: 'Network error' });
    expect(next.isSubmitting).toBe(false);
    expect(next.submitError).toBe('Network error');
  });

  it('SUBMIT_SUCCESS resets to initialImportFormState', () => {
    const state = {
      ...initialImportFormState,
      title: 'Something',
      isSubmitting: true,
    };
    const next = importFormReducer(state, { type: 'SUBMIT_SUCCESS' });
    expect(next).toEqual(initialImportFormState);
  });

  it('RESET returns initialImportFormState exactly', () => {
    const state = {
      ...initialImportFormState,
      title: 'dirty',
      tags: 'french',
      isSubmitting: true,
      submitError: 'oops',
    };
    const next = importFormReducer(state, { type: 'RESET' });
    expect(next).toEqual(initialImportFormState);
  });
});

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
