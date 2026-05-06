/// <reference types="jest" />
import '@testing-library/jest-dom';
import { toHaveNoViolations } from 'jest-axe';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Import Jest types
import './types/jest.d.ts';
import './types/jest-globals.d.ts';