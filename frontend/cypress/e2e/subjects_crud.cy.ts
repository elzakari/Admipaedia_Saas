describe('Subjects CRUD', () => {
  it('loads subjects page and shows controls', () => {
    cy.visit('/settings')
    cy.contains('Academic').click()
    cy.contains('Subjects').click()
    cy.contains('Subjects').should('be.visible')
    cy.get('input[placeholder*="Search"]').should('exist')
    cy.contains('button', 'Add Subject').should('exist')
  })
})
/// <reference types="cypress" />
