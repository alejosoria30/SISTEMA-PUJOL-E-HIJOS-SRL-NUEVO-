const fs = require('fs');
const path = require('path');

const replacements = [
  { from: /SBAVECA Gastronomía/g, to: 'Pujol e Hijos S.R.L.' },
  { from: /SBAVECA Gastronomía ERP/g, to: 'Pujol e Hijos S.R.L. ERP' },
  { from: /Sbaveca2025!/g, to: 'Pujol2026!' },
  { from: /SBAVECA/g, to: 'Pujol e Hijos' },
  { from: /sbaveca_erp_data/g, to: 'pujol_erp_data' },
  { from: /sbavecaLogo\.png/g, to: 'logos/default-dark.svg' },
  { from: /sbaveca-favicon\.png/g, to: 'logos/favicon.ico' },
  { from: /sbaveca_remembered_username/g, to: 'pujol_remembered_username' },
  { from: /Sbaveca/g, to: 'Pujol' },
  { from: /sbaveca/g, to: 'pujol' }
];

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;
  
  replacements.forEach(r => {
    content = content.replace(r.from, r.to);
  });
  
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Updated:', filePath);
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.html') || fullPath.endsWith('.scss')) {
      processFile(fullPath);
    }
  }
}

walkDir('admin_metronic_8.2/src');
console.log('Done.');
