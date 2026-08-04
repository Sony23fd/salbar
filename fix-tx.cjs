const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

// We know the exact locations from earlier:
// lines 255, 436, 567, 620 start the transaction.
// we can replace the corresponding closing brackets.
// Actually, an easier way is to just do a global replace for `});` that belong to transactions.
// It's safer to just run a regex that replaces `})` with `}, { maxWait: 10000, timeout: 20000 })` ONLY for prisma.$transaction.
// But JavaScript regex doesn't support recursive balancing groups.

// Let's just find `prisma.$transaction(async (tx) => {` and the matching closing bracket.
let index = 0;
while (true) {
  index = content.indexOf('prisma.$transaction(async (tx) => {', index);
  if (index === -1) break;
  
  // find the matching closing bracket
  let openBrackets = 0;
  let closeIndex = -1;
  for (let i = index; i < content.length; i++) {
    if (content[i] === '{') openBrackets++;
    else if (content[i] === '}') {
      openBrackets--;
      if (openBrackets === 0) {
        closeIndex = i;
        break;
      }
    }
  }
  
  if (closeIndex !== -1) {
    // The closing is `}`. The full string is usually `});` or `})`.
    // Let's check the characters right after `}`
    const after = content.substring(closeIndex, closeIndex + 10);
    // Replace the `}` with `}, { maxWait: 10000, timeout: 20000 }`
    content = content.substring(0, closeIndex) + '}, { maxWait: 10000, timeout: 20000 }' + content.substring(closeIndex + 1);
    
    // adjust index
    index = closeIndex + 40;
  } else {
    index += 20;
  }
}

fs.writeFileSync('server.ts', content);
console.log("Done");
