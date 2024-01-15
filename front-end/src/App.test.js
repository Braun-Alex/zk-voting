import { render, screen } from '@testing-library/react';
import App from './App';

test('renders greeting link', () => {
  render(<App />);
  const linkElement = screen.getByText(/greeting/i);
  expect(linkElement).toBeInTheDocument();
});
