// No imports needed for cy

describe('Accessibility Tests', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.injectAxe();
  });

  it('should have no detectable accessibility violations on home page', () => {
    cy.checkA11y();
  });

  it('should have no detectable accessibility violations on login page', () => {
    cy.visit('/login');
    cy.injectAxe();
    cy.checkA11y();
  });

  it('should have no detectable accessibility violations on dashboard', () => {
    // Login first
    cy.visit('/login');
    cy.get('input[name="email"]').type('admin@example.com');
    cy.get('input[name="password"]').type('password123');
    cy.get('button[type="submit"]').click();
    
    // Check dashboard accessibility
    cy.url().should('include', '/dashboard');
    cy.injectAxe();
    cy.checkA11y();
  });
});