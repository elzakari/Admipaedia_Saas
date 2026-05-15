import React from 'react';
import { screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { render } from '../../../utils/testUtils';
import Footer from '../Footer';

describe('Footer Component', () => {
  it('renders the current year and copyright text', () => {
    render(<Footer />);
    const currentYear = new Date().getFullYear();
    expect(screen.getByText(`© ${currentYear} ADMIPAEDIA. All rights reserved.`)).toBeInTheDocument();
  });

  it('renders footer links', () => {
    render(<Footer />);
    expect(screen.getByText('Terms of Service')).toHaveAttribute('href', '/terms');
    expect(screen.getByText('Privacy Policy')).toHaveAttribute('href', '/privacy');
    expect(screen.getByText('Help Center')).toHaveAttribute('href', '/help');
  });
});
