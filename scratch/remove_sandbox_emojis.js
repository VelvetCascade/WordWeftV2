const fs = require('fs');
const path = require('path');

const targetFile = 'c:\\Users\\hp\\OneDrive\\Desktop\\New folder\\WordWeftV2\\components\\FeatureSandbox.tsx';
const emojiRegex = /([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g;

let content = fs.readFileSync(targetFile, 'utf8');
content = content.replace(emojiRegex, '');

fs.writeFileSync(targetFile, content, 'utf8');
console.log('Done replacing emojis in FeatureSandbox.tsx');
