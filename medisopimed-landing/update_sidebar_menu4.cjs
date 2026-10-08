const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src', 'components', 'admin');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Fix Chevron for AdminClasses and others that were missed
  content = content.replace(/\{item\.label\s*===\s*['"]Servicios['"]\s*&&\s*<\s*div[^>]*>\{isServicesExpanded\s*\?/g, 
    (match) => match.replace('Servicios', 'Infraestructura').replace('isServicesExpanded', 'isInfraExpanded'));
    
  content = content.replace(/\{item\.label\s*===\s*['"]Servicios['"]\s*&&\s*<div\s+style=\{\{\s*marginLeft:\s*'auto'\s*\}\}>\{isServicesExpanded\s*\?/g,
    (match) => match.replace('Servicios', 'Infraestructura').replace('isServicesExpanded', 'isInfraExpanded'));

  // Let's do a more robust Chevron fix
  // Find {item.label === 'Servicios' && <div ...> {isServicesExpanded ?
  content = content.replace(/\{item\.label === 'Servicios' && (?:<div[^>]*>)?\s*\{?isServicesExpanded \?/g, 
    match => match.replace('Servicios', 'Infraestructura').replace('isServicesExpanded', 'isInfraExpanded'));
    
  // And remove the <span onClick={() => navigate('/admin/services/create')} ...>Servicios</span>
  content = content.replace(/<span\s+onClick=\{\(\)\s*=>\s*navigate\(['"]\/admin\/services\/create['"]\)\}[^>]*>Servicios<\/span>/g, '');
  
  // And fix AdminClasses array
  content = content.replace(/\[\s*\[\s*['"]Sedes['"][^\]]+\],\s*\[\s*['"]Espacios['"][^\]]+\],\s*\]/, 
    `[['Sedes','/admin/services/locations'],['Espacios','/admin/services/rooms']]`);

  fs.writeFileSync(filePath, content, 'utf8');
}
