import fs from 'fs';
import path from 'path';

const dir = 'c:/Users/julie/Downloads/Proyectos_Trabajo/medisdiana/medisdiana-landing/src/components/admin';
const userDir = 'c:/Users/julie/Downloads/Proyectos_Trabajo/medisdiana/medisdiana-landing/src/components/user';

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // Add Menu to lucide-react imports if not present
  if (content.includes('from \'lucide-react\'') && !content.includes('Menu,')) {
    content = content.replace(/([a-zA-Z]+)(,\n|\s*}\s+from\s+['"]lucide-react['"])/, '$1, Menu$2');
    changed = true;
  }

  // Update MainDashboard.css
  if (filePath.endsWith('MainDashboard.css')) {
    content = content.replace(/\.menu-toggle\s*\{\s*display:\s*none;\s*\}/, `.menu-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: #F5F3F3;
  border: 1px solid #E8E3DA;
  color: #775A00;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-right: 12px;
}`);
    content = content.replace(/body\.sidebar-collapsed \.sidebar\s*\{[^}]*\}/, '');
    content += `\nbody.sidebar-collapsed .sidebar {\n  margin-left: -240px;\n  opacity: 0;\n}\n`;
    content += `\n@media (max-width: 768px) {\n  body.sidebar-collapsed .sidebar.open {\n    margin-left: 0;\n    opacity: 1;\n  }\n}\n`;
    fs.writeFileSync(filePath, content);
    console.log('Updated CSS', filePath);
    return;
  }

  // Ensure there is a toggleSidebar function
  if (content.includes('export const') && !content.includes('toggleSidebar')) {
    const toggleFunc = `
  const toggleSidebar = () => {
    if (window.innerWidth <= 768) {
      if (typeof setIsMobileMenuOpen === 'function') setIsMobileMenuOpen(p => !p);
    } else {
      document.body.classList.toggle('sidebar-collapsed');
    }
  };
`;
    // Insert after const navigate = useNavigate()
    content = content.replace(/(const navigate = useNavigate\(\)[;\n])/, '$1' + toggleFunc);
    changed = true;
  }

  // Replace existing menu-toggle
  if (content.includes('className="menu-toggle"')) {
    content = content.replace(/<button className="menu-toggle" onClick=\{[^}]+\}>\s*<Menu size=\{20\} \/>\s*<\/button>/, `<button className="menu-toggle" onClick={toggleSidebar}>\n              <Menu size={20} />\n            </button>`);
    changed = true;
  } else if (content.includes('<header')) {
    // Inject menu-toggle if missing
    // Find the first <h2> or similar inside header
    content = content.replace(/(<header[^>]*>\s*<div[^>]*>)/, `$1\n            <button className="menu-toggle" onClick={toggleSidebar}>\n              <Menu size={20} />\n            </button>`);
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(filePath, content);
    console.log('Updated', filePath);
  }
}

function walkDir(d) {
  const files = fs.readdirSync(d);
  for (const f of files) {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) {
      walkDir(p);
    } else if (p.endsWith('.tsx') || p.endsWith('.css')) {
      processFile(p);
    }
  }
}

walkDir(dir);
walkDir(userDir);
