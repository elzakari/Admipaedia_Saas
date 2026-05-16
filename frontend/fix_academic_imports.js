const fs = require('fs');
const path = require('path');

const fixImportsForDir = (dirName) => {
  const p = path.join(process.cwd(), 'src', 'components', dirName);
  if (!fs.existsSync(p)) return;
  
  const testDir = path.join(p, '__tests__');
  if (!fs.existsSync(testDir)) return;

  const files = fs.readdirSync(p).filter(f => f.endsWith('.tsx') && !f.endsWith('.test.tsx'));
  
  files.forEach(f => {
    const componentContent = fs.readFileSync(path.join(p, f), 'utf8');
    if (!componentContent.includes('export default')) {
      const cName = f.replace('.tsx', '');
      const testF = path.join(testDir, f.replace('.tsx', '.test.tsx'));
      if (fs.existsSync(testF)) {
        let testContent = fs.readFileSync(testF, 'utf8');
        const defaultImport = `import ${cName} from '../${cName}';`;
        const namedImport = `import { ${cName} } from '../${cName}';`;
        if (testContent.includes(defaultImport)) {
          testContent = testContent.replace(defaultImport, namedImport);
          fs.writeFileSync(testF, testContent);
          console.log(`Fixed named import in ${testF}`);
        }
      }
    }
  });
};

fixImportsForDir('students');
fixImportsForDir('classes');
fixImportsForDir('academics');
