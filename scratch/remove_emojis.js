const fs = require('fs');
const path = require('path');

const emojiRegex = /[\u{1F300}-\u{1F5FF}\u{1F900}-\u{1F9FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F191}-\u{1F251}\u{1F004}\u{1F0CF}\u{1F170}-\u{1F171}\u{1F17E}-\u{1F17F}\u{1F18E}\u{3030}\u{2B50}\u{2B55}\u{2934}-\u{2935}\u{2B05}-\u{2B07}\u{2B1B}-\u{2B1C}\u{3297}\u{3299}\u{303D}\u{00A9}\u{00AE}\u{2122}\u{23F3}\u{24C2}\u{23E9}-\u{23EF}\u{25B6}\u{23F8}-\u{23FA}\u{200D}]/gu;

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      if (file !== 'node_modules' && file !== 'dist' && file !== '.git') {
        results = results.concat(walk(filePath));
      }
    } else {
      if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        results.push(filePath);
      }
    }
  });
  return results;
}

const files = walk(path.join(__dirname, '..', '..', '..', '..', '..', '..', 'c:', 'Users', 'hp', 'OneDrive', 'Desktop', 'New folder', 'WordWeftV2')); // __dirname is scratch folder, let's just use absolute path
const targetDir = 'c:\\Users\\hp\\OneDrive\\Desktop\\New folder\\WordWeftV2';
const filesList = walk(targetDir);

let changedFiles = 0;
filesList.forEach((file) => {
  const content = fs.readFileSync(file, 'utf8');
  if (emojiRegex.test(content)) {
    const newContent = content.replace(emojiRegex, '');
    if (newContent !== content) {
      fs.writeFileSync(file, newContent, 'utf8');
      console.log('Removed emojis from: ' + file);
      changedFiles++;
    }
  }
});
console.log('Total files changed: ' + changedFiles);
