import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'

import SystemSettingsPage from '../SystemSettingsPage'

jest.mock('../../../lib/api', () => {
  return {
    __esModule: true,
    default: {
      get: jest.fn(async () => ({ data: { data: {} } })),
      post: jest.fn(async () => ({ data: { success: true, data: {} } })),
    },
  }
})

function renderWithQuery(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

describe('SystemSettingsPage (Super Admin)', () => {
  it('renders platform settings and does not show admissions config', async () => {
    renderWithQuery(<SystemSettingsPage />)

    expect(await screen.findByText('Platform Settings')).toBeInTheDocument()
    expect(screen.queryByText('Admission Configuration')).not.toBeInTheDocument()

    expect(screen.getByRole('tab', { name: /platform/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /tenancy/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /licensing/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /security/i })).toBeInTheDocument()
  })
})

