import React from 'react'
import {
  act,
  renderHook,
  waitFor,
} from '@testing-library/react'
import {
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query'
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import { useSaasTenant } from '../useSaasTenant'
import saasService from '@/services/saasService'


vi.mock('@/services/saasService', () => ({
  default: {
    listMyTenants: vi.fn(),
  },
}))


const tenantA = {
  tenant: {
    id: 'tenant-a',
    slug: 'school-a',
    name: 'School A',
    country_code: 'TG',
  },
  membership: {
    role: 'school_admin',
    status: 'active',
  },
} as any

const tenantB = {
  tenant: {
    id: 'tenant-b',
    slug: 'school-b',
    name: 'School B',
    country_code: 'GH',
  },
  membership: {
    role: 'school_admin',
    status: 'active',
  },
} as any

const suspendedTenant = {
  tenant: {
    id: 'tenant-suspended',
    slug: 'school-suspended',
    name: 'Suspended School',
    country_code: 'TG',
  },
  membership: {
    role: 'school_admin',
    status: 'suspended',
  },
} as any


function createWrapper(queryClient: QueryClient) {
  return function Wrapper({
    children,
  }: {
    children: React.ReactNode
  }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    )
  }
}


describe('useSaasTenant tenant isolation', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()

    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    })

    vi.mocked(
      saasService.listMyTenants
    ).mockResolvedValue({
      success: true,
      items: [
        tenantA,
        tenantB,
        suspendedTenant,
      ],
    } as any)

    localStorage.setItem(
      'token',
      'access-token'
    )

    localStorage.setItem(
      'saas_current_tenant_id',
      'tenant-a'
    )
  })

  afterEach(() => {
    queryClient.clear()
    vi.restoreAllMocks()
    localStorage.clear()
    sessionStorage.clear()
  })

  it(
    'clears tenant-scoped browser state and query cache before switching to another active tenant',
    async () => {
      localStorage.setItem(
        'active_branch_id',
        'branch-a'
      )

      localStorage.setItem(
        'saas_current_branch_id',
        'branch-a'
      )

      localStorage.setItem(
        'cached_calendar_events',
        JSON.stringify([{ id: 1 }])
      )

      localStorage.setItem(
        'cached_shared_calendar_events',
        JSON.stringify([{ id: 2 }])
      )

      localStorage.setItem(
        'api_cache_students',
        JSON.stringify([{ id: 3 }])
      )

      localStorage.setItem(
        'student_draft_new',
        JSON.stringify({ firstName: 'Old Tenant' })
      )

      localStorage.setItem(
        'admipaedia.teacher.assignments.v1.class-a',
        JSON.stringify([{ id: 4 }])
      )

      sessionStorage.setItem(
        'fees:navigation-intent',
        'open-records'
      )

      queryClient.setQueryData(
        ['students'],
        [{ id: 100 }]
      )

      const { result } = renderHook(
        () => useSaasTenant(),
        {
          wrapper: createWrapper(
            queryClient
          ),
        }
      )

      await waitFor(() => {
        expect(
          result.current.currentTenantId
        ).toBe('tenant-a')

        expect(
          result.current.current?.membership.status
        ).toBe('active')
      })

      act(() => {
        result.current.setCurrentTenant(
          'tenant-b'
        )
      })

      await waitFor(() => {
        expect(
          result.current.currentTenantId
        ).toBe('tenant-b')

        expect(
          result.current.current?.tenant.id
        ).toBe('tenant-b')
      })

      expect(
        localStorage.getItem(
          'saas_current_tenant_id'
        )
      ).toBe('tenant-b')

      expect(
        localStorage.getItem(
          'active_branch_id'
        )
      ).toBeNull()

      expect(
        localStorage.getItem(
          'saas_current_branch_id'
        )
      ).toBeNull()

      expect(
        localStorage.getItem(
          'cached_calendar_events'
        )
      ).toBeNull()

      expect(
        localStorage.getItem(
          'cached_shared_calendar_events'
        )
      ).toBeNull()

      expect(
        localStorage.getItem(
          'api_cache_students'
        )
      ).toBeNull()

      expect(
        localStorage.getItem(
          'student_draft_new'
        )
      ).toBeNull()

      expect(
        localStorage.getItem(
          'admipaedia.teacher.assignments.v1.class-a'
        )
      ).toBeNull()

      expect(
        sessionStorage.getItem(
          'fees:navigation-intent'
        )
      ).toBeNull()

      expect(
        queryClient.getQueryData(
          ['students']
        )
      ).toBeUndefined()

      // Authentication/session state must survive
      // the tenant boundary transition.
      expect(
        localStorage.getItem('token')
      ).toBe('access-token')
    }
  )

  it(
    'refuses suspended and unknown tenants without clearing the current tenant state',
    async () => {
      const warn = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined)

      localStorage.setItem(
        'active_branch_id',
        'branch-a'
      )

      localStorage.setItem(
        'api_cache_students',
        JSON.stringify([{ id: 10 }])
      )

      queryClient.setQueryData(
        ['students'],
        [{ id: 100 }]
      )

      const { result } = renderHook(
        () => useSaasTenant(),
        {
          wrapper: createWrapper(
            queryClient
          ),
        }
      )

      await waitFor(() => {
        expect(
          result.current.currentTenantId
        ).toBe('tenant-a')

        expect(
          result.current.tenants.map(
            (tenant) => tenant.id
          )
        ).toEqual([
          'tenant-a',
          'tenant-b',
        ])
      })

      act(() => {
        result.current.setCurrentTenant(
          'tenant-suspended'
        )
      })

      expect(
        result.current.currentTenantId
      ).toBe('tenant-a')

      expect(
        localStorage.getItem(
          'saas_current_tenant_id'
        )
      ).toBe('tenant-a')

      expect(
        localStorage.getItem(
          'active_branch_id'
        )
      ).toBe('branch-a')

      expect(
        localStorage.getItem(
          'api_cache_students'
        )
      ).not.toBeNull()

      expect(
        queryClient.getQueryData(
          ['students']
        )
      ).toEqual([{ id: 100 }])

      act(() => {
        result.current.setCurrentTenant(
          'tenant-unknown'
        )
      })

      expect(
        result.current.currentTenantId
      ).toBe('tenant-a')

      expect(
        localStorage.getItem(
          'saas_current_tenant_id'
        )
      ).toBe('tenant-a')

      expect(
        queryClient.getQueryData(
          ['students']
        )
      ).toEqual([{ id: 100 }])

      expect(warn).toHaveBeenCalled()
    }
  )
})
