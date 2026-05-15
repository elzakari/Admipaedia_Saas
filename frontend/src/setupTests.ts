/// <reference types="vitest" />
import * as matchers from '@testing-library/jest-dom/matchers';
import { expect } from 'vitest';
import * as jestAxe from 'jest-axe';

expect.extend(matchers);
expect.extend((jestAxe as any).toHaveNoViolations);
