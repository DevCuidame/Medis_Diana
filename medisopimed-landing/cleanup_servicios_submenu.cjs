const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src', 'components', 'admin');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Regex to remove the entire span for either "Servicios" or "Creación de Servicios" 
  // that navigates to /admin/services/create inside the submenus
  const regex = /<span[^>]*onClick=\{\(\)\s*=>\s*navigate\(['"]\/admin\/services\/create['"]\)\}[^>]*>(Servicios|Creación de Servicios)<\/span>\s*/g;
  
  if (regex.test(content)) {
    content = content.replace(regex, '');
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Cleaned up in ${file}`);
  }
}
