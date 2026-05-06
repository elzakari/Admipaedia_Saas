/// <reference types="cypress" />
/// <reference types="cypress-axe" />

declare namespace Cypress {
  interface Chainable {
    /**
     * Custom command to inject axe-core into the page under test
     * @example cy.injectAxe()
     */
    injectAxe(): Chainable<Element>;

    /**
     * Custom command to check a11y violations
     * @example cy.checkA11y()
     */
    checkA11y(options?: any): Chainable<Element>;
  }
}