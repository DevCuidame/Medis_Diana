const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src', 'components', 'admin');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // 1. Add Building2 to lucide-react imports
  if (!content.includes('Building2')) {
    content = content.replace(/import\s+\{([^}]+)\}\s+from\s+['"]lucide-react['"]/, (match, imports) => {
      return `import { Building2, ${imports.trim()} } from 'lucide-react'`;
    });
  }

  // 2. Add isInfraExpanded state (replace isServicesExpanded if found, or add next to it)
  if (content.includes('isServicesExpanded')) {
    // Replace state initialization
    content = content.replace(/const\s+\[isServicesExpanded,\s*setIsServicesExpanded\]\s*=\s*useState\(([^)]+)\);?/g, 'const [isInfraExpanded, setIsInfraExpanded] = useState($1);');
  }

  // 3. Update NAV_ITEMS
  // We need to inject Infraestructura before Servicios.
  // Find where Servicios is defined
  const serviciosRegex = /\{\s*icon:\s*Briefcase,\s*label:\s*['"]Servicios['"],\s*active:\s*(true|false)\s*\}/;
  const match = content.match(serviciosRegex);
  if (match) {
    const isActive = match[1] === 'true';
    let infraActive = 'false';
    let servActive = 'false';
    
    // If we are in Sedes or Espacios or CreateLocation or CreateRoom, Infra is active.
    if (['SedesDashboard.tsx', 'EspaciosDashboard.tsx', 'CreateLocation.tsx', 'CreateRoom.tsx'].includes(file)) {
      infraActive = 'true';
    }
    // If we are in CreateService, Servicios is active
    if (['CreateService.tsx'].includes(file)) {
      servActive = 'true';
    }

    content = content.replace(serviciosRegex, `{ icon: Building2, label: 'Infraestructura', active: ${infraActive} },\n  { icon: Briefcase, label: 'Servicios', active: ${servActive} }`);
  }

  // 4. Update navigation click handlers
  // In MainDashboard.tsx and others with `handleNavClick`
  content = content.replace(/if\s*\(\s*item\.label\s*===\s*['"]Servicios['"]\s*\)\s*\{[\s\S]*?setIsServicesExpanded\(!isServicesExpanded\);?\s*\}/, 
    `if (item.label === 'Infraestructura') {
                  setIsInfraExpanded(!isInfraExpanded);
                } else if (item.label === 'Servicios') {
                  navigate('/admin/services/create');
                  setIsMobileMenuOpen(false);
                }`);
                
  content = content.replace(/if\s*\(\s*item\.label\s*===\s*['"]Servicios['"]\s*\)\s*setIsServicesExpanded\((?:!isServicesExpanded|v\s*=>\s*!v)\);?/, 
    `if (item.label === 'Infraestructura') setIsInfraExpanded(!isInfraExpanded);
    if (item.label === 'Servicios') { navigate('/admin/services/create'); if (typeof setIsMobileMenuOpen !== 'undefined') setIsMobileMenuOpen(false); }`);

  // Handle inline onClick for NAV_ITEMS
  // if (label === 'Servicios') setIsServicesExpanded(v => !v) in handleNavClick(label: string)
  content = content.replace(/if\s*\(\s*label\s*===\s*['"]Servicios['"]\s*\)\s*setIsServicesExpanded\([^)]+\)/, 
    `if (label === 'Infraestructura') setIsInfraExpanded(v => !v)
    if (label === 'Servicios') { navigate('/admin/services/create'); if (typeof setIsMobileMenuOpen !== 'undefined') setIsMobileMenuOpen(false); }`);

  // 5. Update render logic for the expander Chevron
  // From item.label === 'Servicios' to item.label === 'Infraestructura'
  // Also change isServicesExpanded to isInfraExpanded
  content = content.replace(/\{item\.label\s*===\s*['"]Servicios['"]\s*&&\s*([^{]*?)\{isServicesExpanded\s*\?/g, 
    `{item.label === 'Infraestructura' && $1{isInfraExpanded ?`);

  // Update the submenu rendering condition
  content = content.replace(/\{item\.label\s*===\s*['"]Servicios['"]\s*&&\s*isServicesExpanded\s*&&\s*\(/g, 
    `{item.label === 'Infraestructura' && isInfraExpanded && (`);

  // Remove the 'Servicios' link from the submenu if it's there
  content = content.replace(/<span[^>]*onClick=\{\(\)\s*=>\s*navigate\(['"]\/admin\/services\/create['"]\)\}[^>]*>Servicios<\/span>\s*/, '');
  content = content.replace(/\[\s*['"]Servicios['"]\s*,\s*['"]\/admin\/services\/create['"]\s*\]/, '');

  // For AdminClasses map syntax: [['Sedes','/admin/services/locations'],['Espacios','/admin/services/rooms'],['Servicios','/admin/services/create']]
  content = content.replace(/\[\s*\[\s*['"]Sedes['"][^\]]+\],\s*\[\s*['"]Espacios['"][^\]]+\],\s*\[\s*['"]Servicios['"][^\]]+\]\s*\]/, 
    `[['Sedes','/admin/services/locations'],['Espacios','/admin/services/rooms']]`);

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Updated ${file}`);
}
