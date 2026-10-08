const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src', 'components', 'admin');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Fix Chevron logic for Infraestructura
  content = content.replace(/\{item\.label\s*===\s*['"]Servicios['"]\s*&&\s*\([\s\S]*?\{isServicesExpanded\s*\?/g, 
    (match) => match.replace('Servicios', 'Infraestructura').replace('isServicesExpanded', 'isInfraExpanded'));

  // Also replace any remaining `isServicesExpanded` that might be passed to the Chevron
  content = content.replace(/\{item\.label\s*===\s*['"]Infraestructura['"]\s*&&\s*\([\s\S]*?\{isServicesExpanded\s*\?/g, 
    (match) => match.replace('isServicesExpanded', 'isInfraExpanded'));

  // Remove the 'Servicios' link from the submenu if it's there
  content = content.replace(/<span[^>]*onClick=\{\(\)\s*=>\s*navigate\(['"]\/admin\/services\/create['"]\)\}[^>]*>Servicios<\/span>\s*/g, '');
  content = content.replace(/\[\s*['"]Servicios['"]\s*,\s*['"]\/admin\/services\/create['"]\s*\]/g, '');

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Updated ${file}`);
}
