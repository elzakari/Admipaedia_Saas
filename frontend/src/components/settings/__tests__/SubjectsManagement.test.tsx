import React from 'react'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import SubjectsManagement from '../subjects/SubjectsManagement'

function Wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient()
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

test('renders subjects management table and controls', () => {
  render(<SubjectsManagement />, { wrapper: Wrapper as any })
  expect(screen.getByRole('heading', { name: /Subjects/i })).toBeInTheDocument()
  expect(screen.getByPlaceholderText(/Search/i)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /Add Subject/i })).toBeInTheDocument()
})
