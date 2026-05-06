describe('Student Management', () => {
  beforeEach(() => {
    // Login as admin
    cy.login('admin@example.com', 'password');
    cy.visit('/students');
  });

  it('should display students list', () => {
    cy.get('[data-testid="students-table"]').should('be.visible');
    cy.get('[data-testid="student-row"]').should('have.length.greaterThan', 0);
  });

  it('should create a new student', () => {
    cy.get('[data-testid="add-student-btn"]').click();
    
    // Fill out the form
    cy.get('[data-testid="student-name"]').type('John Doe');
    cy.get('[data-testid="student-email"]').type('john@example.com');
    cy.get('[data-testid="admission-number"]').type('A12345');
    cy.get('[data-testid="date-of-birth"]').type('2000-01-01');
    cy.get('[data-testid="gender"]').select('male');
    
    cy.get('[data-testid="submit-btn"]').click();
    
    // Verify success message
    cy.get('[data-testid="success-message"]').should('contain', 'Student created successfully');
    
    // Verify student appears in list
    cy.get('[data-testid="students-table"]').should('contain', 'John Doe');
  });

  it('should edit an existing student', () => {
    cy.get('[data-testid="student-row"]').first().within(() => {
      cy.get('[data-testid="edit-btn"]').click();
    });
    
    cy.get('[data-testid="student-name"]').clear().type('Jane Smith');
    cy.get('[data-testid="submit-btn"]').click();
    
    cy.get('[data-testid="success-message"]').should('contain', 'Student updated successfully');
    cy.get('[data-testid="students-table"]').should('contain', 'Jane Smith');
  });

  it('should delete a student', () => {
    cy.get('[data-testid="student-row"]').first().within(() => {
      cy.get('[data-testid="delete-btn"]').click();
    });
    
    cy.get('[data-testid="confirm-delete"]').click();
    
    cy.get('[data-testid="success-message"]').should('contain', 'Student deleted successfully');
  });

  it('should search for students', () => {
    cy.get('[data-testid="search-input"]').type('John');
    
    cy.get('[data-testid="student-row"]').should('have.length.lessThan', 10);
    cy.get('[data-testid="student-row"]').each(($row) => {
      cy.wrap($row).should('contain', 'John');
    });
  });
});