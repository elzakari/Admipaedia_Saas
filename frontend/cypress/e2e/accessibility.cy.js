describe('Accessibility Tests', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.injectAxe();
  });

  it('Has no detectable accessibility violations on load', () => {
    cy.checkA11y();
  });

  it('Login page has no accessibility violations', () => {
    cy.visit('/login');
    cy.injectAxe();
    cy.checkA11y();
  });

  it('Dashboard has no accessibility violations', () => {
    // Login first
    cy.intercept('POST', '/api/v1/auth/login', {
      statusCode: 200,
      body: {
        success: true,
        access_token: 'fake-token',
        user: { id: 1, username: 'admin', role: 'admin' }
      }
    });
    
    cy.visit('/login');
    cy.get('input[name="email"]').type('admin@example.com');
    cy.get('input[name="password"]').type('password');
    cy.get('button[type="submit"]').click();
    
    // Check dashboard accessibility
    cy.visit('/dashboard');
    cy.injectAxe();
    cy.checkA11y();
  });
});