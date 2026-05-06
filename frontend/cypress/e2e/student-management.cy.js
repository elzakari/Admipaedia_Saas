describe('Student Management', () => {
  beforeEach(() => {
    // Login before each test
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
    
    // Navigate to students page
    cy.visit('/students');
  });

  it('displays student list', () => {
    // Mock the API response for students
    cy.intercept('GET', '/api/v1/students*', {
      statusCode: 200,
      body: {
        success: true,
        students: [
          { id: 1, name: 'John Doe', admission_number: 'ADM001', class_id: 1 },
          { id: 2, name: 'Jane Smith', admission_number: 'ADM002', class_id: 1 }
        ],
        pagination: { total: 2, pages: 1 }
      }
    }).as('getStudents');
    
    // Wait for the API call to complete
    cy.wait('@getStudents');
    
    // Check if students are displayed
    cy.contains('John Doe').should('be.visible');
    cy.contains('Jane Smith').should('be.visible');
  });

  it('can create a new student', () => {
    // Mock the API response for creating a student
    cy.intercept('POST', '/api/v1/students', {
      statusCode: 201,
      body: {
        success: true,
        message: 'Student created successfully',
        student: {
          id: 3,
          name: 'New Student',
          admission_number: 'ADM003',
          email: 'new@example.com',
          date_of_birth: '2005-05-05',
          gender: 'female',
          class_id: null
        }
      }
    }).as('createStudent');
    
    // Click on add student button
    cy.contains('Add Student').click();
    
    // Fill the form
    cy.get('input[name="name"]').type('New Student');
    cy.get('input[name="email"]').type('new@example.com');
    cy.get('input[name="admission_number"]').type('ADM003');
    cy.get('input[name="date_of_birth"]').type('2005-05-05');
    cy.get('select[name="gender"]').select('female');
    
    // Submit the form
    cy.get('button[type="submit"]').click();
    
    // Wait for the API call to complete
    cy.wait('@createStudent');
    
    // Check for success message
    cy.contains('Student created successfully').should('be.visible');
  });
});