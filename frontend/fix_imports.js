const fs = require('fs');
const path = require('path');
const p = path.join(process.cwd(), 'src/components/dashboard');
const testDir = path.join(p, '__tests__');
const files = [
  'AppTile.tsx', 
  'DashboardFilters.tsx', 
  'DataSyncWidget.tsx', 
  'LazyDashboardComponents.tsx', 
  'SmartHomeWidget.tsx', 
  'StorageWidget.tsx', 
  'SystemStatusWidget.tsx', 
  'TimeWidget.tsx', 
  'WidgetSettingsWidget.tsx'
];

files.forEach(f => {
  const cName = f.replace('.tsx', '');
  const testF = path.join(testDir, f.replace('.tsx', '.test.tsx'));
  if(fs.existsSync(testF)) {
    let content = fs.readFileSync(testF, 'utf8');
    content = content.replace(`import ${cName} from '../${cName}';`, `import { ${cName} } from '../${cName}';`);
    fs.writeFileSync(testF, content);
    console.log('Fixed ' + testF);
  }
});
