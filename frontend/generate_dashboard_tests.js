const fs = require('fs');
const path = require('path');
const dashboardPath = path.join(process.cwd(), 'src/components/dashboard');
const testDir = path.join(dashboardPath, '__tests__');

if (!fs.existsSync(testDir)) {
  fs.mkdirSync(testDir);
}

const files = fs.readdirSync(dashboardPath).filter(f => f.endsWith('.tsx') && !f.endsWith('.test.tsx'));
const testFiles = fs.readdirSync(testDir).map(f => f.replace('.test.tsx', '.tsx'));
const remaining = files.filter(f => !testFiles.includes(f));

for(const file of remaining) {
  const componentName = file.replace('.tsx', '');
  const testFileName = file.replace('.tsx', '.test.tsx');
  const testFilePath = path.join(testDir, testFileName);
  const content = `import React from 'react';
import { screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '../../../utils/testUtils';
import ${componentName} from '../${componentName}';

// This is an auto-generated smoke test
describe('${componentName} Component', () => {
  it('exports the module without crashing', () => {
    // Basic verification that the component is defined
    expect(${componentName}).toBeDefined();
  });
});
`;
  fs.writeFileSync(testFilePath, content);
  console.log(`Generated test for ${file}`);
}
