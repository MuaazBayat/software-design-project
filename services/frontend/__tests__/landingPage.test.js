// __tests__/landingPage.test.js

import { render, screen } from '@testing-library/react';
import Home from '@/app/page';

// Mock Next.js Image component
jest.mock('next/image', () => {
  return function MockImage({ src, alt, fill, priority, ...props }) {
    // Filter out Next.js specific props to avoid React warnings
    const { width, height, ...imgProps } = props;
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={typeof src === 'string' ? src : '/img.jpg'} alt={alt} width={width} height={height} {...imgProps} />;
  };
});

describe('HomePage', () => {
  it('should render the landing page content', () => {
    render(<Home />);

    // Check for main heading
    expect(screen.getByText(/Connecting Cultures/)).toBeInTheDocument();
    expect(screen.getByText('Letter at a Time')).toBeInTheDocument();

    // Check for main CTA button
    expect(screen.getByRole('link', { name: /Find Your Match/i })).toBeInTheDocument();

    // Check for statistics section
    expect(screen.getByText('50+')).toBeInTheDocument();
    expect(screen.getByText('Countries')).toBeInTheDocument();
  });

  it('should render the globe image', () => {
    render(<Home />);

    // Check for the globe image
    const globeImage = screen.getByAltText('Cute globe illustration');
    expect(globeImage).toBeInTheDocument();
    expect(globeImage).toHaveAttribute('src', '/globe.png');
  });
});