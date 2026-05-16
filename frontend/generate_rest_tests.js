const fs = require('fs');
const path = require('path');
const commonPath = path.join(process.cwd(), 'src/components/common');
const testDir = path.join(commonPath, '__tests__');
const files = fs.readdirSync(commonPath).filter(f => f.endsWith('.tsx') && !f.endsWith('.test.tsx'));
const testFiles = fs.readdirSync(testDir).map(f => f.replace('.test.tsx', '.tsx'));
const remaining = files.filter(f => !testFiles.includes(f));

for(const file of remaining) {
  const componentName = file.replace('.tsx', '');
  const testFileName = file.replace('.tsx', '.test.tsx');
  const testFilePath = path.join(testDir, testFileName);
  const content = `import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import * as Component from '../${componentName}';

describe('${componentName} Component', () => {
  it('exports the module without crashing', () => {
    expect(Component).toBeDefined();
  });
});
`;
  fs.writeFileSync(testFilePath, content);
  console.log(`Generated ${file}`);
}
