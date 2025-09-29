// __tests__/moderation.test.js
// @jest-environment jsdom
import React from 'react';
import { render, screen, within, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// ---------- Context mock ----------
let mockProfileState = { profile: null, loading: false };
jest.mock('../lib/context/ProfileContext', () => ({
  useProfile: () => mockProfileState,
}));

// ---------- moderationApiClient mock (define object *inside* factory) ----------
jest.mock('../lib/moderationApiClient', () => {
  const moderationApi = {
    getModerationLogs: jest.fn(),
    getBannedUsers: jest.fn(),
    banUser: jest.fn(),
    resolveCase: jest.fn(),
    unbanUser: jest.fn(),
    unbanClerkUser: jest.fn(),
  };
  return { __esModule: true, moderationApi };
});

// Import the mocked api so tests can configure return values and make assertions
import { moderationApi as api } from '../lib/moderationApiClient';

// ---------- Icons (simple SVG stub) ----------
jest.mock('lucide-react', () => {
  const React = require('react');
  const Icon = (props) => <svg data-testid="icon" {...props} />;
  return {
    Shield: Icon, AlertTriangle: Icon, User: Icon, MessageSquare: Icon,
    Clock: Icon, Check: Icon, X: Icon, Ban: Icon, Eye: Icon,
    Filter: Icon, RefreshCw: Icon,
  };
});

// ---------- sonner mock (define toast inside factory, then import it) ----------
jest.mock('sonner', () => {
  const toast = Object.assign(
    jest.fn((message, options) => {
      // keep the last call accessible to tests
      toast._last = { message, options };
    }),
    {
      success: jest.fn(),
      error: jest.fn(),
      dismiss: jest.fn(),
    }
  );
  const Toaster = () => null;
  return { __esModule: true, toast, Toaster };
});

// Import the mocked toast for use in tests
import { toast as toastFn } from 'sonner';

// ---------- SUT import AFTER mocks ----------
import ModerationPage from '../app/moderation/page';

// ---------- helpers / fixtures below ----------
const logsFixture = [
  {
    log_id: 'log-1',
    violation_type: 'spam',
    violation_description: 'spam links in messages',
    target_type: 'message',
    severity_level: 'high',
    status: 'open',
    created_at: new Date('2025-09-01T10:00:00Z').toISOString(),
  },
  {
    log_id: 'log-2',
    violation_type: 'harassment',
    violation_description: 'user sent threats',
    target_type: 'user',
    severity_level: 'medium',
    status: 'in_review',
    created_at: new Date('2025-09-02T11:00:00Z').toISOString(),
  },
  {
    log_id: 'log-3',
    violation_type: 'nudity',
    violation_description: 'nsfw content',
    target_type: 'message',
    severity_level: 'low',
    status: 'resolved',
    created_at: new Date('2025-09-03T12:00:00Z').toISOString(),
  },
];

const bannedFixture = [
  { user_id: 'u-123', anonymous_handle: 'ghost_owl', account_status: 'banned' },
  { clerk_id: 'clerk-999', anonymous_handle: 'shadow_fox', account_status: 'banned' },
];

const renderAs = async (role) => {
  jest.clearAllMocks();
  if (role === 'loading') mockProfileState = { profile: null, loading: true };
  else if (role === 'viewer') mockProfileState = { profile: { moderator: false, user_id: 'u-viewer' }, loading: false };
  else if (role === 'moderator') mockProfileState = { profile: { moderator: true, user_id: 'mod-1' }, loading: false };
  else mockProfileState = { profile: null, loading: false };
  return render(<ModerationPage />);
};

const setApiHappy = () => {
  api.getModerationLogs.mockResolvedValue([...logsFixture]);
  api.getBannedUsers.mockResolvedValue([...bannedFixture]);
  api.unbanUser.mockResolvedValue({});
  api.unbanClerkUser.mockResolvedValue({});
  api.resolveCase.mockResolvedValue({});
  api.banUser.mockResolvedValue({});
};

// … your tests go here (unchanged) …


const setApiEmpty = () => {
  api.getModerationLogs.mockResolvedValue(null); // component guards with `|| []`
  api.getBannedUsers.mockResolvedValue(null);
};

const setApiBannedError = () => {
  api.getModerationLogs.mockResolvedValue([...logsFixture]);
  api.getBannedUsers.mockRejectedValue(new Error('boom'));
};

// -----------------------------------------------
// Tests
// -----------------------------------------------

describe('ModerationDashboard — access & rendering', () => {
  test('shows loading state while profile is loading', async () => {
    await renderAs('loading');
    expect(screen.getByText(/Loading\.\.\./i)).toBeInTheDocument();
    // Spinner present
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  test('blocks access when user is not a moderator', async () => {
    await renderAs('viewer');
    expect(screen.getByRole('heading', { name: /access denied/i })).toBeInTheDocument();
    expect(screen.getByText(/you don't have permission/i)).toBeInTheDocument();
    expect(api.getModerationLogs).not.toHaveBeenCalled();
    expect(api.getBannedUsers).not.toHaveBeenCalled();
  });

test('renders dashboard for moderators and fetches data', async () => {
  setApiHappy();
  await renderAs('moderator');

  // Initial fetches fire due to useEffect
  await waitFor(() => {
    expect(api.getModerationLogs).toHaveBeenCalledWith('mod-1');
  });
  await waitFor(() => {
    expect(api.getBannedUsers).toHaveBeenCalled();
  });

  // Header states visible
  expect(screen.getByRole('heading', { name: /moderation dashboard/i })).toBeInTheDocument();
  expect(screen.getByText(/manage reports and moderate content/i)).toBeInTheDocument();

  // Constrain to <p> metric labels to avoid matching <option> "In Review"
  expect(screen.getByText('Total Cases', { selector: 'p' }).nextSibling).toHaveTextContent('3');
  expect(screen.getByText('Open Cases', { selector: 'p' }).nextSibling).toHaveTextContent('1');
  expect(screen.getByText('In Review', { selector: 'p' }).nextSibling).toHaveTextContent('1');
  expect(screen.getByText('Resolved', { selector: 'p' }).nextSibling).toHaveTextContent('1');

  // Cases table shows our logs
  expect(screen.getByRole('heading', { name: /moderation cases/i })).toBeInTheDocument();
  expect(screen.getByText(/spam links in messages/i)).toBeInTheDocument();
  expect(screen.getByText(/user sent threats/i)).toBeInTheDocument();
  expect(screen.getByText(/nsfw content/i)).toBeInTheDocument();

  // Banned users table shows entries
  expect(screen.getByRole('heading', { name: /banned users/i })).toBeInTheDocument();
  expect(screen.getByText(/ghost_owl/i)).toBeInTheDocument();
  expect(screen.getByText(/shadow_fox/i)).toBeInTheDocument();
});

});

describe('ModerationDashboard — filters & refresh', () => {
test('can filter by status and type', async () => {
  setApiHappy();
  await renderAs('moderator');

  // Wait for table
  await screen.findByRole('heading', { name: /moderation cases/i });

  // Scope to the status group (label + select are siblings, label has no htmlFor)
  const statusGroup = screen.getByText(/^Status:$/i).parentElement;
  const statusSelect = within(statusGroup).getByRole('combobox');
  await userEvent.selectOptions(statusSelect, 'open');

  // Now only the open case should show
  expect(screen.getByText(/spam links in messages/i)).toBeInTheDocument();
  expect(screen.queryByText(/user sent threats/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/nsfw content/i)).not.toBeInTheDocument();

  // Further narrow Type: User (removes message cases)
  const typeGroup = screen.getByText(/^Type:$/i).parentElement;
  const typeSelect = within(typeGroup).getByRole('combobox');
  await userEvent.selectOptions(typeSelect, 'user');

  // Open + user filters => no rows (since open case was message)
  expect(screen.getByText(/no moderation cases found/i)).toBeInTheDocument();
});


 test('refresh buttons trigger the respective fetches', async () => {
  setApiHappy();
  await renderAs('moderator');

  await screen.findByRole('heading', { name: /moderation cases/i });

  // Scope to the header bar containing the "Moderation Cases" heading
  const casesHeaderBar = screen.getByRole('heading', { name: /moderation cases/i }).parentElement;
  const caseRefresh = within(casesHeaderBar).getByRole('button', { name: /refresh/i });
  await userEvent.click(caseRefresh);
  await waitFor(() => expect(api.getModerationLogs).toHaveBeenCalledTimes(2));

  // Scope to the header bar containing the "Banned Users" heading
  const bannedHeaderBar = screen.getByRole('heading', { name: /banned users/i }).parentElement;
  const bannedRefresh = within(bannedHeaderBar).getByRole('button', { name: /refresh/i });
  await userEvent.click(bannedRefresh);
  await waitFor(() => expect(api.getBannedUsers).toHaveBeenCalledTimes(2));
});

});

describe('ModerationDashboard — edge cases & actions', () => {
// --- FIXED: handles empty datasets gracefully ---
test('handles empty datasets gracefully', async () => {
  setApiEmpty();
  await renderAs('moderator');

  await screen.findByRole('heading', { name: /moderation cases/i });

  // No logs
  expect(screen.getByText(/no moderation cases found/i)).toBeInTheDocument();
  // No banned users
  expect(screen.getByText(/no banned users found/i)).toBeInTheDocument();

  // Constrain to <p> labels to avoid matching the <option> "In Review"
  expect(screen.getByText('Total Cases', { selector: 'p' }).nextSibling)
    .toHaveTextContent('0');
  expect(screen.getByText('Open Cases', { selector: 'p' }).nextSibling)
    .toHaveTextContent('0');
  expect(screen.getByText('In Review', { selector: 'p' }).nextSibling)
    .toHaveTextContent('0');
  expect(screen.getByText('Resolved', { selector: 'p' }).nextSibling)
    .toHaveTextContent('0');
});

// --- FIXED: unban flow: confirms via toast action and refreshes both lists ---
test('unban flow: confirms via toast action and refreshes both lists', async () => {
  setApiHappy();
  await renderAs('moderator');
  await screen.findByRole('heading', { name: /banned users/i });

  // Scope to the "Banned Users" panel so we pick the right table
  const bannedPanelHeader = screen.getByRole('heading', { name: /banned users/i });
  const bannedPanel = bannedPanelHeader.closest('div').parentElement;
  const bannedTable = within(bannedPanel).getByRole('table');

  // Click Unban on the first row (user with user_id)
  const firstRow = within(bannedTable).getAllByRole('row')[1];
  await userEvent.click(within(firstRow).getByRole('button', { name: /unban/i }));

  // A confirmation toast is shown; simulate clicking its action ("Unban")
  expect(toastFn).toHaveBeenCalled();
  const last = toastFn._last;
  expect(last?.options?.action?.label?.toLowerCase()).toContain('unban');

  await act(async () => {
    await last.options.action.onClick();
  });

  await waitFor(() => {
    expect(api.unbanUser).toHaveBeenCalledWith('u-123');
  });
  // Both lists are refreshed
  await waitFor(() => expect(api.getBannedUsers).toHaveBeenCalledTimes(2));
  await waitFor(() => expect(api.getModerationLogs).toHaveBeenCalledTimes(2));
  // Success toast
  expect(toastFn.success).toHaveBeenCalledWith('User has been unbanned.');
});

});
