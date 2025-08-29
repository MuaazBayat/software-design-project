// __tests__/landingPage.test.js

import { render, screen } from '@testing-library/react';
import Home from '@/app/page';

//  Mock the Globe component BEFORE the tests run
// We are telling Jest: "When any code asks for '@/components/globe',
// give them this fake version instead of the real one."
jest.mock('@/components/globe', () => ({
  Globe: () => <div data-testid="mock-globe" />,
}));

describe('HomePage', () => {
  it('should render the mocked Globe component', () => {
    // 1. Render the Home component
    render(<Home />);

    // 2. Look for the placeholder from our mock, not the real component
    const mockGlobe = screen.getByTestId('mock-globe');

    // 3. Assert that our mock placeholder is in the document
    expect(mockGlobe).toBeInTheDocument();
  });
});