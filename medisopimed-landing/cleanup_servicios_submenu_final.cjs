const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src', 'components', 'admin');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Match any <span> that contains navigate('/admin/services/create') and remove it completely
  const regex = /<span[^>]*onClick=\{\(\)\s*=>\s*navigate\(['"]\/admin\/services\/create['"]\)\}[^>]*>.*?<\/span>\s*/g;
  
  if (regex.test(content)) {
    content = content.replace(regex, '');
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Cleaned up completely in ${file}`);
  }
}
