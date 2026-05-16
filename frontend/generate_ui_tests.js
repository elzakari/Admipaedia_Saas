const fs = require('fs');
const path = require('path');

const commonPath = path.join(__dirname, 'src/components/common');
const testDir = path.join(commonPath, '__tests__');

if (!fs.existsSync(testDir)) {
  fs.mkdirSync(testDir);
}

// Read all tsx files in common directory
const files = fs.readdirSync(commonPath).filter(file => file.endsWith('.tsx') && !file.endsWith('.test.tsx'));

const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1).replace('.tsx', '');
const componentNameMap = {
  'avatar.tsx': 'Avatar',
  'badge.tsx': 'Badge',
  'breadcrumb.tsx': 'Breadcrumb',
  'button.tsx': 'Button',
  'card.tsx': 'Card',
  'checkbox.tsx': 'Checkbox',
  'dialog.tsx': 'Dialog',
  'dropdown-menu.tsx': 'DropdownMenu',
  'input.tsx': 'Input',
  'label.tsx': 'Label',
  'navbar.tsx': 'Navbar',
  'progress.tsx': 'Progress',
  'quick-actions.tsx': 'QuickActions',
  'select.tsx': 'Select',
  'separator.tsx': 'Separator',
  'slider.tsx': 'Slider',
  'switch.tsx': 'Switch',
  'table.tsx': 'Table',
  'tabs.tsx': 'Tabs',
  'textarea.tsx': 'Textarea',
  'tooltip.tsx': 'Tooltip',
  'Dropdown.tsx': 'Dropdown',
  'Modal.tsx': 'Modal',
  'Pagination.tsx': 'Pagination',
};

const getComponentName = (file) => {
  if (componentNameMap[file]) return componentNameMap[file];
  const name = file.replace('.tsx', '');
  // Extract export from file if it's named export, or use PascalCase file name
  return name;
};

// Generate basic smoke tests for simple UI components
const uiComponents = Object.keys(componentNameMap);

for (const file of uiComponents) {
  if (!files.includes(file)) continue;
  
  const componentName = getComponentName(file);
  const testFileName = file.replace('.tsx', '.test.tsx');
  const testFilePath = path.join(testDir, testFileName);
  
  if (!fs.existsSync(testFilePath)) {
    const content = `import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import * as Component from '../${file.replace('.tsx', '')}';

// This is an auto-generated smoke test
describe('${componentName} Component', () => {
  it('exports the module without crashing', () => {
    expect(Component).toBeDefined();
  });
});
`;
    fs.writeFileSync(testFilePath, content);
    console.log(`Generated test for ${file}`);
  }
}
