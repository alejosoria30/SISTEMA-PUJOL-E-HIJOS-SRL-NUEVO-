const fs = require('fs');

const file = 'admin_metronic_8.2/src/styles.scss';
let content = fs.readFileSync(file, 'utf8');

const colorMap = [
  { from: /#FBF8F4/ig, to: '#F1F5F9' }, // Warm Cream -> Slate 100
  { from: /#FAF5EB/ig, to: '#FFFFFF' }, // Cream sidebar -> White
  { from: /#4D2C18/ig, to: '#1E293B' }, // Dark coffee -> Slate 800
  { from: /#6B4C3B/ig, to: '#64748B' }, // Coffee icon -> Slate 500
  { from: /#3D2510/ig, to: '#0F172A' }, // Dark brown text -> Slate 900
  { from: /77,\s*44,\s*24/g, to: '30, 41, 59' }, // rgba(77, 44, 24, ...) -> rgba(30, 41, 59, ...)
  { from: /250,\s*245,\s*235/g, to: '255, 255, 255' },
  { from: /#B84E30/ig, to: '#F97316' }, // Terracotta -> Orange 500
  { from: /#8C7060/ig, to: '#94A3B8' }, // Light brown -> Slate 400
  { from: /#392011/ig, to: '#0F172A' }, // Darkest coffee -> Slate 900
  { from: /#0095E8/ig, to: '#F97316' }, // Primary blue -> Orange 500
  { from: /#E65A28/ig, to: '#F97316' }, // Soft orange -> Orange 500
  { from: /230,\s*90,\s*40/g, to: '249, 115, 22' }, // rgb soft orange -> Orange 500
  { from: /#D81A48/ig, to: '#EF4444' } // Danger red
];

colorMap.forEach(r => {
  content = content.replace(r.from, r.to);
});

fs.writeFileSync(file, content, 'utf8');
console.log('styles.scss colors updated successfully.');
