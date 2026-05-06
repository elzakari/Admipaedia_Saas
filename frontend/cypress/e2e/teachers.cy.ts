describe('Teachers Management', () => {
  beforeEach(() => {
    cy.visit('/teachers');
    cy.injectAxe(); // Inject axe-core for accessibility testing
  });

  it('should load teachers page without accessibility violations', () => {
    cy.get('[data-testid="teachers-page"]').should('be.visible');
    cy.checkA11y(); // Check accessibility
  });

  it('should search for teachers', () => {
    cy.get('[data-testid="search-input"]').type('John');
    cy.get('[data-testid="teacher-card"]').should('contain', 'John');
    cy.checkA11y();
  });

  it('should create a new teacher', () => {
    cy.get('[data-testid="add-teacher-btn"]').click();
    cy.get('[data-testid="teacher-form"]').should('be.visible');
    
    // Fill form
    cy.get('[name="name"]').type('New Teacher');
    cy.get('[name="email"]').type('new.teacher@school.com');
    cy.get('[name="subject"]').select('Mathematics');
    
    cy.get('[data-testid="submit-btn"]').click();
    cy.get('[data-testid="success-message"]').should('be.visible');
    cy.checkA11y();
  });

  it('should handle offline functionality', () => {
    // Simulate offline
    cy.window().then((win) => {
      cy.stub(win.navigator, 'onLine').value(false);
      cy.window().trigger('offline');
    });

    cy.get('[data-testid="add-teacher-btn"]').click();
    cy.get('[name="name"]').type('Offline Teacher');
    cy.get('[data-testid="submit-btn"]').click();
    
    // Should show offline indicator
    cy.get('[data-testid="offline-indicator"]').should('be.visible');
    
    // Simulate back online
    cy.window().then((win) => {
      cy.stub(win.navigator, 'onLine').value(true);
      cy.window().trigger('online');
    });
    
    // Should sync data
    cy.get('[data-testid="sync-indicator"]').should('be.visible');
  });
});