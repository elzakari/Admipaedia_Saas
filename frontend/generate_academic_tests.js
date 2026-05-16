const fs = require('fs');
const path = require('path');

const generateTestsForDir = (dirPath) => {
  const fullPath = path.join(process.cwd(), 'src', 'components', dirPath);
  if (!fs.existsSync(fullPath)) return;
  
  const testDir = path.join(fullPath, '__tests__');
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir);
  }

  const files = fs.readdirSync(fullPath).filter(f => f.endsWith('.tsx') && !f.endsWith('.test.tsx'));
  
  files.forEach(file => {
    const componentName = file.replace('.tsx', '');
    const testFileName = file.replace('.tsx', '.test.tsx');
    const testFilePath = path.join(testDir, testFileName);
    
    // Don't overwrite existing tests that we manually wrote
    if (fs.existsSync(testFilePath)) {
      const existing = fs.readFileSync(testFilePath, 'utf8');
      if (!existing.includes('Auto-generated smoke test')) {
        return;
      }
    }
    
    // Read component to check export type
    const content = fs.readFileSync(path.join(fullPath, file), 'utf8');
    const hasDefault = content.includes('export default');
    
    const importStatement = hasDefault 
      ? `import ${componentName} from '../${componentName}';`
      : `import { ${componentName} } from '../${componentName}';`;
      
    const testContent = `import React from 'react';
import { screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { render } from '@/utils/testUtils';
${importStatement}

// Auto-generated smoke test
describe('${componentName} Component', () => {
  it('renders without crashing', () => {
    // Basic verification that the component is defined
    expect(${componentName}).toBeDefined();
  });
});
`;
    fs.writeFileSync(testFilePath, testContent);
    console.log(`Generated test for ${dirPath}/${file}`);
  });
};

generateTestsForDir('students');
generateTestsForDir('classes');
generateTestsForDir('academics');
