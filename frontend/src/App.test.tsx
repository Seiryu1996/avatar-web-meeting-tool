import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders Avatar Web Meeting heading', () => {
  render(<App />);
  const linkElement = screen.getByText(/Avatar Web Meeting/i);
  expect(linkElement).toBeInTheDocument();
});