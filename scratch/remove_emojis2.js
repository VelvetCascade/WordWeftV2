const fs = require('fs');
const path = require('path');

// Safe, simple regex for stripping most emojis
const emojiRegex = /([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g;

function cleanString(str) {
    return str.replace(emojiRegex, '');
}

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(filePath));
    } else {
      if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        results.push(filePath);
      }
    }
  });
  return results;
}

const targetDir = 'c:\\Users\\hp\\OneDrive\\Desktop\\New folder\\WordWeftV2';
const dirsToScan = ['components', 'pages', 'hooks', 'utils', 'contexts', 'api', 'types'].map(d => path.join(targetDir, d));

let filesList = [];
dirsToScan.forEach(dir => {
    filesList = filesList.concat(walk(dir));
});
filesList.push(path.join(targetDir, 'App.tsx'));
filesList.push(path.join(targetDir, 'index.tsx'));

let changedFiles = 0;
filesList.forEach((file) => {
  if (!fs.existsSync(file)) return;
  const content = fs.readFileSync(file, 'utf8');
  const newContent = cleanString(content);
  if (newContent !== content) {
    fs.writeFileSync(file, newContent, 'utf8');
    console.log('Removed emojis from: ' + file);
    changedFiles++;
  }
});
console.log('Total files changed: ' + changedFiles);
