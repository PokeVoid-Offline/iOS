const fs = require('fs');

const filePath = 'pokevoid-src/package.json';
let content = fs.readFileSync(filePath, 'utf8');

const anchor = `		"remove-pokesave": "if exist .\\\\dist\\\\pokesave rmdir /s /q .\\\\dist\\\\pokesave",`;

if (!content.includes(anchor)) {
  console.warn('remove-pokesave Anchor not found — skipping');
  process.exit(1);
}
const injection = `		"remove-pokesave": "if [ -d ./dist/pokesave ]; then rm -rf ./dist/pokesave; fi;",`;
content = content.replace(anchor, injection );


fs.writeFileSync(filePath, content);
console.log('Fixed remove-pokesave for linux building');
