describe('Login Flow', () => {
  beforeEach(() => {
    // Visit the login page before each test
    cy.visit('/login');
  });

  it('displays login form', () => {
    cy.get('input[name="email"]').should('exist');
    cy.get('input[name="password"]').should('exist');
    cy.get('button[type="submit"]').should('exist');
  });

  it('shows error with invalid credentials', () => {
    cy.get('input[name="email"]').type('wrong@example.com');
    cy.get('input[name="password"]').type('wrongpassword');
    cy.get('button[type="submit"]').click();
    
    // Check for error message
    cy.contains('Invalid credentials').should('be.visible');
  });

  it('logs in successfully with valid credentials', () => {
    // Intercept the login API call
    cy.intercept('POST', '/api/v1/auth/login', {
      statusCode: 200,
      body: {
        success: true,
        access_token: 'fake-token',
        user: {
          id: 1,
          username: 'testuser',
          email: 'test@example.com',
          role: 'admin'
        }
      }
    }).as('loginRequest');
    
    cy.get('input[name="email"]').type('test@example.com');
    cy.get('input[name="password"]').type('password123');
    cy.get('button[type="submit"]').click();
    
    // Wait for the login request to complete
    cy.wait('@loginRequest');
    
    // Should be redirected to dashboard
    cy.url().should('include', '/dashboard');
    
    // Dashboard should show user name
    cy.contains('testuser').should('be.visible');
  });
});