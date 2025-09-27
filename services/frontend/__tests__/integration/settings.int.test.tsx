// __tests__/integration/settings.int.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Page from '@/app/settings/page';

jest.mock('@clerk/nextjs', () => ({
  useUser: () => ({ isLoaded: true, isSignedIn: true, user: { id: 'user_123' } }),
}));

describe('Settings Page – integration', () => {
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
  });
  afterEach(() => {
    alertSpy.mockRestore();
  });

  test('loads with no profile, allows edit, and saves successfully (PUT /profiles/:id)', async () => {
    render(<Page />);

    const saveBtn = await screen.findByRole('button', { name: /save changes/i });
    expect(saveBtn).toBeEnabled();

    // Handle
    const handleInput = screen.getByLabelText(/anonymous handle/i);
    fireEvent.change(handleInput, { target: { value: 'momo_handle' } });

    // Bio — your textarea has a placeholder, not an associated label
    const bioArea = screen.getByPlaceholderText(/tell people about yourself/i);
    fireEvent.change(bioArea, { target: { value: 'Hi! I enjoy hiking and anime.' } });

    // Interest — fill, then click "Add"
    const interestInput = screen.getByPlaceholderText(/e\.g\. hiking, anime, cooking/i);
    fireEvent.change(interestInput, { target: { value: 'anime' } });
    const addBtn = screen.getByRole('button', { name: /add/i });
    fireEvent.click(addBtn);

    // Save
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Saved changes.');
    });
  });

  test('invalid handle shows validation and prevents save side-effects', async () => {
    render(<Page />);

    const saveBtn = await screen.findByRole('button', { name: /save changes/i });
    const handleInput = screen.getByLabelText(/anonymous handle/i);

    // Invalid (uppercase/punctuation)
    fireEvent.change(handleInput, { target: { value: 'Bad!' } });

    // Expect visible validation message (tweak regex if your copy differs)
    const validation = await screen.findByText(/invalid|lowercase|letters|numbers|underscores/i);
    expect(validation).toBeInTheDocument();

    // Clicking save should NOT trigger the success alert
    fireEvent.click(saveBtn);
    await waitFor(() => expect(alertSpy).not.toHaveBeenCalled());
  });
});
