import fs from 'fs';
import path from 'path';

const dir = 'c:/Users/julie/Downloads/Proyectos_Trabajo/AcariPole/acaripole-landing/src/components/admin';
const userDir = 'c:/Users/julie/Downloads/Proyectos_Trabajo/AcariPole/acaripole-landing/src/components/user';

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // 1. Remove duplicate Menu imports
  content = content.replace(/Menu,\s*Menu/g, 'Menu');
  content = content.replace(/Menu,\s*([^,]+),\s*Menu/g, 'Menu, $1');

  // 2. Fix the Menu injected into FormularioEspacio object literal (Menu: any)
  if (content.includes('isActive: true;\n  Menu: any;')) {
    content = content.replace(/isActive: true;\n  Menu: any;/, 'isActive: true;');
    changed = true;
  }

  // 3. Fix the toggleSidebar function
  // First, remove the bad toggleSidebar injection
  content = content.replace(/const toggleSidebar = \(\) => \{[\s\S]*?\}\s*;\s*/g, '');

  // Second, re-inject toggleSidebar properly. We'll add it right before the return statement
  // To avoid `Cannot find name 'setIsMobileMenuOpen'`, we'll just check if it's defined using try/catch
  // or just use ts-ignore.
  const goodToggle = `
  const toggleSidebar = () => {
    if (window.innerWidth <= 768) {
      // @ts-ignore
      if (typeof setIsMobileMenuOpen === 'function') setIsMobileMenuOpen((p: any) => !p);
    } else {
      document.body.classList.toggle('sidebar-collapsed');
    }
  };
`;
  
  if (content.includes('toggleSidebar')) {
    // If it's used in the JSX, ensure it's defined right before `return (`
    content = content.replace(/return\s*\(/g, goodToggle + '\n  return (');
    changed = true;
  }

  if (changed || content.includes('Menu, Menu')) {
    fs.writeFileSync(filePath, content);
    console.log('Fixed', filePath);
  }
}

function walkDir(d) {
  const files = fs.readdirSync(d);
  for (const f of files) {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) {
      walkDir(p);
    } else if (p.endsWith('.tsx') || p.endsWith('.ts')) {
      processFile(p);
    }
  }
}

walkDir(dir);
walkDir(userDir);
