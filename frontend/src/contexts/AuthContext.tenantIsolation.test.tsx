import React from 'react'
import {
  act,
  render,
  waitFor,
} from '@testing-library/react'
import {
  MemoryRouter,
} from 'react-router-dom'
import {
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest'

import {
  AuthProvider,
} from './AuthContext'
import {
  queryClient,
} from '@/lib/queryClient'


describe(
  'AuthContext tenant-change safety net',
  () => {
    beforeEach(() => {
      localStorage.clear()
      sessionStorage.clear()
      queryClient.clear()

      localStorage.setItem(
        'saas_current_tenant_id',
        'tenant-a'
      )
    })

    it(
      'clears stale tenant state when the active tenant changes outside useSaasTenant',
      async () => {
        render(
          <MemoryRouter>
            <AuthProvider>
              <div>child</div>
            </AuthProvider>
          </MemoryRouter>
        )

        // Allow the initial tenant salt to settle.
        await waitFor(() => {
          expect(
            localStorage.getItem(
              'saas_current_tenant_id'
            )
          ).toBe('tenant-a')
        })

        queryClient.setQueryData(
          ['students'],
          [{ id: 1 }]
        )

        localStorage.setItem(
          'active_branch_id',
          'branch-a'
        )

        localStorage.setItem(
          'api_cache_students',
          JSON.stringify([{ id: 1 }])
        )

        localStorage.setItem(
          'saas_current_tenant_id',
          'tenant-b'
        )

        window.dispatchEvent(
          new Event(
            'local-storage-change'
          )
        )

        await waitFor(() => {
          expect(
            queryClient.getQueryData(
              ['students']
            )
          ).toBeUndefined()
        })

        expect(
          localStorage.getItem(
            'active_branch_id'
          )
        ).toBeNull()

        expect(
          localStorage.getItem(
            'api_cache_students'
          )
        ).toBeNull()

        expect(
          localStorage.getItem(
            'saas_current_tenant_id'
          )
        ).toBe('tenant-b')
      }
    )
  }
)
