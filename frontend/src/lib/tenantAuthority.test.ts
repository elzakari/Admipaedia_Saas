import {
  describe,
  expect,
  it,
} from 'vitest'

import {
  authorityHasRole,
  resolveTenantAuthority,
} from './tenantAuthority'

describe(
  'tenant authority resolution',
  () => {
    it(
      'does not let a global school role override the active tenant membership',
      () => {
        const authority =
          resolveTenantAuthority(
            'admin',
            'teacher'
          )

        expect(
          authority.primaryRole
        ).toBe('teacher')

        expect(
          authority.roles
        ).toEqual(['teacher'])

        expect(
          authorityHasRole(
            authority,
            'admin'
          )
        ).toBe(false)

        expect(
          authorityHasRole(
            authority,
            'teacher'
          )
        ).toBe(true)
      }
    )

    it(
      'fails closed for a school user without an active tenant membership',
      () => {
        const authority =
          resolveTenantAuthority(
            'school_admin',
            null
          )

        expect(
          authority.primaryRole
        ).toBeNull()

        expect(
          authority.roles
        ).toEqual([])

        expect(
          authorityHasRole(
            authority,
            [
              'admin',
              'school_admin',
            ]
          )
        ).toBe(false)
      }
    )

    it(
      'preserves platform authority independently of tenant membership',
      () => {
        const authority =
          resolveTenantAuthority(
            'super_admin',
            'teacher'
          )

        expect(
          authority.isPlatform
        ).toBe(true)

        expect(
          authority.primaryRole
        ).toBe('super_admin')

        expect(
          authority.roles
        ).toEqual([
          'super_admin',
        ])

        expect(
          authorityHasRole(
            authority,
            'teacher'
          )
        ).toBe(false)
      }
    )

    it(
      'preserves super manager as a platform role',
      () => {
        const authority =
          resolveTenantAuthority(
            'super_manager',
            null
          )

        expect(
          authority.isPlatform
        ).toBe(true)

        expect(
          authorityHasRole(
            authority,
            'super_manager'
          )
        ).toBe(true)
      }
    )

    it(
      'maps school admin to the legacy admin alias',
      () => {
        const authority =
          resolveTenantAuthority(
            'admin',
            'school_admin'
          )

        expect(
          authority.roles
        ).toEqual(
          expect.arrayContaining([
            'school_admin',
            'admin',
          ])
        )

        expect(
          authority.primaryRole
        ).toBe('admin')
      }
    )

    it(
      'maps readonly school staff to the staff alias',
      () => {
        const authority =
          resolveTenantAuthority(
            'staff',
            'school_staff_readonly'
          )

        expect(
          authority.roles
        ).toEqual(
          expect.arrayContaining([
            'school_staff_readonly',
            'staff',
          ])
        )

        expect(
          authority.primaryRole
        ).toBe('staff')
      }
    )
  }
)
