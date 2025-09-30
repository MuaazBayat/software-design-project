/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react-dom/test-utils';

// Clerk mock
jest.mock('@clerk/nextjs', () => ({
  useUser: () => ({ isLoaded: true, isSignedIn: true, user: { id: 'user_123' } }),
  useAuth: () => ({
    getToken: jest.fn(() => Promise.resolve('mock-token')),
    isLoaded: true,
    isSignedIn: true,
    userId: 'user_123',
  }),
}));

// Router stubs kept simple; closures are fine here
const mockRouter = { push: jest.fn(), back: jest.fn() };
let mockParams: Record<string, string> = {};
jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  useParams: () => mockParams,
}));

// Profile stub
jest.mock('../../lib/context/ProfileContext', () => ({
  useSyncProfile: () => ({
    synced: true,
    profile: { user_id: 'me_1', anonymous_handle: 'Me' },
  }),
}));

// ✅ Toasts stub — define inside factory to avoid TDZ/hoist errors
jest.mock('sonner', () => {
  const toast = { success: jest.fn(), error: jest.fn() };
  return { __esModule: true, Toaster: () => null, toast };
});
const { toast } = jest.requireMock('sonner');

// ✅ Messaging client mock — everything defined inside the factory
jest.mock('../../lib/MessagingApiClient', () => {
  const apiImpl = {
    searchUsers: jest.fn(),
    uploadImage: jest.fn(),
    sendLetter: jest.fn(),
  };

  class ApiError extends Error {
    status: number;
    constructor(status: number, message = '') {
      super(message || `MockApiError ${status}`);
      this.status = status;
    }
  }

  // Return a class whose constructor returns our spyable impl
  class MessagingApiClientMock {
    constructor() {
      return apiImpl as any;
    }
  }

  return {
    __esModule: true,
    default: MessagingApiClientMock,
    ApiError,
    // expose the impl so tests can control it
    __apiImpl: apiImpl,
  };
});

// Pull handles to the impl & ApiError (safe after jest.mock)
const {
  __apiImpl: apiImpl,
  ApiError: MockApiError,
} = jest.requireMock('../../lib/MessagingApiClient');

// ✅ Moderation client mock — same pattern
jest.mock('../../lib/moderationApiClient', () => {
  const moderationApi = {
    checkProfanity: jest
      .fn()
      .mockResolvedValue({ contains_profanity: false, censored_text: '' }),
  };
  return { __esModule: true, moderationApi, __mock: moderationApi };
});
const { __mock: mockModeration } = jest.requireMock('../../lib/moderationApiClient');

// Heavy children/utilities kept light
jest.mock('../../app/compose-letter/components/LeftSidebar', () => ({
  __esModule: true,
  default: (props: any) => {
    const { matches = [], selectedMatch, onChangeRecipient, onApplyTemplate } = props;
    return (
      <aside aria-label="Left Sidebar" data-testid="left-sidebar">
        <div data-testid="selected-name">{selectedMatch?.name ?? ''}</div>
        <ul>
          {matches.map((m: any) => (
            <li key={m.id}>
              <button onClick={() => onChangeRecipient?.(m)}>{m.name}</button>
            </li>
          ))}
        </ul>
        <button onClick={() => onApplyTemplate?.('t1')}>Apply template t1</button>
      </aside>
    );
  },
}));
jest.mock('../../app/compose-letter/components/MainContent', () => ({
  __esModule: true,
  default: (props: any) => {
    const { letterContent, setLetterContent } = props;
    return (
      <main>
        <div className="letter-content">
          <div
            role="textbox"
            aria-label="Letter editor"
            contentEditable
            data-testid="editor"
            onInput={(e: any) => setLetterContent?.(e.currentTarget.textContent)}
            suppressContentEditableWarning
          >
            {letterContent}
          </div>
        </div>
      </main>
    );
  },
}));
jest.mock('../../app/compose-letter/components/RightSidebar', () => ({
  __esModule: true,
  default: (props: any) => {
    const { onSend, onExportPDF, onExportJPG, sendDisabled, selectedMatch } = props;
    return (
      <aside aria-label="Right Sidebar">
        <div data-testid="selected-match">{selectedMatch?.name ?? ''}</div>
        <button onClick={onSend} disabled={!!sendDisabled}>Send now</button>
        <button onClick={onExportJPG}>Export JPG</button>
        <button onClick={onExportPDF}>Export PDF</button>
      </aside>
    );
  },
}));
jest.mock('../../app/compose-letter/components/TemplateSidePanel', () => ({ __esModule: true, default: () => null }));
jest.mock('../../app/compose-letter/components/LetterSendAnimation', () => ({ __esModule: true, default: () => null }));

jest.mock('../../app/compose-letter/lib/jpegGenerator', () => ({
  generateJPEGDataUrl: jest.fn(async () => 'data:image/jpeg;base64,TESTDATA'),
  generateJPEG: jest.fn(async (_el: HTMLElement, _name: string, cb?: (d: string|null)=>void) => cb?.('data:image/jpeg;base64,TESTDATA')),
  captureLetterCloneAsPng: jest.fn(async () => 'data:image/png;base64,PNGDATA'),
}));
jest.mock('../../app/compose-letter/lib/pdfGenerator', () => ({
  PDFGenerator: class { async generate(_: any) { return new Blob(['PDF'], { type: 'application/pdf' }); } },
  downloadPDF: jest.fn(),
}));

// ⬇️ import the SUT after all mocks
import LetterApp from '../../app/compose-letter/[user_id]/page.tsx';

// Helper to seed search responses
const seedSearch = (items: Array<{ id: string; name: string; thread?: string; matchId?: string }>) => {
  apiImpl.searchUsers.mockResolvedValue({
    items: items.map((u) => ({
      user_profile: { user_id: u.id, anonymous_handle: u.name, country_code: 'ZA' },
      latest_message: u.thread ? { conversation_thread_id: u.thread, match_id: u.matchId ?? '' } : undefined,
    })),
  });
};

describe('Compose Letter Page (integration)', () => {
  beforeEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
    mockParams = {};
    mockModeration.checkProfanity.mockResolvedValue({ contains_profanity: false, censored_text: '' });
    apiImpl.searchUsers.mockReset();
    apiImpl.uploadImage.mockReset();
    apiImpl.sendLetter.mockReset();
  });

test('initial render → loads matches and selects the first by default', async () => {
  seedSearch([{ id: 'u_2', name: 'Tiger' }, { id: 'u_3', name: 'Sparrow' }]);
  render(<LetterApp />);

  // Wait for sidebar shell, then for list items to actually populate
  const left = await screen.findByTestId('left-sidebar');
  await within(left).findByRole('button', { name: 'Tiger' });
  await within(left).findByRole('button', { name: 'Sparrow' });

  // Auto-selects first result
  await waitFor(() => {
    expect(screen.getByTestId('selected-name')).toHaveTextContent('Tiger');
    expect(screen.getByTestId('selected-match')).toHaveTextContent('Tiger');
  });
});


  test('URL preselect picks matching user id', async () => {
    mockParams = { user_id: 'u_3' };
    seedSearch([{ id: 'u_2', name: 'Tiger' }, { id: 'u_3', name: 'Sparrow' }]);
    render(<LetterApp />);

    await waitFor(() => {
      expect(screen.getByTestId('selected-name')).toHaveTextContent('Sparrow');
      expect(screen.getByTestId('selected-match')).toHaveTextContent('Sparrow');
    });
  });

// test.skip('send flow succeeds with content present (uploads, posts, navigates)', async () => {
//   seedSearch([{ id: 'u_2', name: 'Tiger' }]);
//   apiImpl.uploadImage.mockResolvedValue({ data: { path: 'letters/me_1/123.jpg' } });
//   apiImpl.sendLetter.mockResolvedValue({ conversation_thread_id: 'thread_123' });

//   render(<LetterApp />);

//   // Selection settled
//   await waitFor(() => expect(screen.getByTestId('selected-name')).toHaveTextContent('Tiger'));

//   // Type a bit (optional; content may already be present)
//   const editor = await screen.findByTestId('editor');
//   await userEvent.type(editor, ' Extra');

//   const sendBtn = await screen.findByRole('button', { name: /send now/i });
//   await userEvent.click(sendBtn);

//   await waitFor(() => {
//     expect(apiImpl.uploadImage).toHaveBeenCalledTimes(1);
//     expect(apiImpl.sendLetter).toHaveBeenCalledTimes(1);
//     expect(mockRouter.push).toHaveBeenCalledWith('/inbox');
//   });

//   const payload = apiImpl.sendLetter.mock.calls[0][0];
//   expect(payload.sender_id).toBe('me_1');
//   expect(payload.recipient_id).toBe('u_2');
//   expect(payload.letter_url).toContain('letters/me_1/');
// });


  test('send failure shows error and does not navigate', async () => {
    seedSearch([{ id: 'u_2', name: 'Tiger' }]);
    apiImpl.uploadImage.mockResolvedValue({ data: { path: 'letters/me_1/123.jpg' } });
    apiImpl.sendLetter.mockRejectedValue(new Error('Server exploded'));

    render(<LetterApp />);

    await waitFor(() => expect(screen.getByTestId('selected-name')).toHaveTextContent('Tiger'));

    await userEvent.type(await screen.findByTestId('editor'), 'Some message');
    await userEvent.click(await screen.findByRole('button', { name: /send now/i }));

    await waitFor(() => {
      expect(mockRouter.push).not.toHaveBeenCalledWith('/inbox');
      expect(toast.error).toHaveBeenCalled();
    });
  });

  test('search retry logic: 408 once then success', async () => {
    apiImpl.searchUsers
      .mockRejectedValueOnce(new MockApiError(408, 'timeout'))
      .mockResolvedValueOnce({
        items: [{ user_profile: { user_id: 'u_9', anonymous_handle: 'Falcon', country_code: 'ZA' } }],
      });

    jest.useFakeTimers();
    render(<LetterApp />);

    await waitFor(() => expect(apiImpl.searchUsers).toHaveBeenCalledTimes(1));
    await act(async () => { jest.advanceTimersByTime(1000); });

    await waitFor(() => expect(screen.getByTestId('selected-name')).toHaveTextContent('Falcon'));
    expect(apiImpl.searchUsers).toHaveBeenCalledTimes(2);
    jest.useRealTimers();
  });

  test('Back to inbox button navigates', async () => {
    seedSearch([{ id: 'u_2', name: 'Tiger' }]);
    render(<LetterApp />);
    await waitFor(() => expect(screen.getByTestId('selected-name')).toHaveTextContent('Tiger'));

    const backBtn = screen.getByRole('button', { name: /back to inbox/i });
    await userEvent.click(backBtn);
    expect(mockRouter.push).toHaveBeenCalledWith('/inbox');
  });

 test('applying a template replaces editor content', async () => {
  seedSearch([{ id: 'u_2', name: 'Tiger' }]);
  render(<LetterApp />);

  await waitFor(() => expect(screen.getByTestId('selected-name')).toHaveTextContent('Tiger'));

  const editor = await screen.findByTestId('editor');
  const before = editor.textContent;

  await userEvent.click(screen.getByText(/apply template t1/i));

  await waitFor(() => {
    const after = screen.getByTestId('editor').textContent;
    expect(after && after.trim()).not.toBe(before && before.trim());
  });

  // (Optional) You could also assert the Send button is present:
  expect(await screen.findByRole('button', { name: /send now/i })).toBeInTheDocument();
});

});
