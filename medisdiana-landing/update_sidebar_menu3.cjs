const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src', 'components', 'admin');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Regex to remove the entire line containing the navigate to services/create inside a span for "Servicios"
  content = content.replace(/<span[^>]*onClick=\{\(\)\s*=>\s*navigate\(['"]\/admin\/services\/create['"]\)\}[^>]*>Servicios<\/span>/g, '');
  
  // Also clean up any extra empty lines left in that block if needed, but not strictly necessary

  fs.writeFileSync(filePath, content, 'utf8');
}
