import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import * as Component from '../VirtualizedTable';

describe('VirtualizedTable Component', () => {
  it('exports the module without crashing', () => {
    expect(Component).toBeDefined();
  });
});
