const fs = require('fs');
const readline = require('readline');

async function search() {
  const fileStream = fs.createReadStream('C:\\Users\\THINKPAD\\.gemini\\antigravity-ide\\brain\\ba40ddc4-29b5-4211-b983-206dadaf13df\\.system_generated\\logs\\transcript.jsonl');

  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  const targets = ['Januari', 'Februari', 'Mei 2025', 'Desember 2026'];

  let lineCount = 0;
  for await (const line of rl) {
    lineCount++;
    const matched = targets.filter(t => line.includes(t));
    if (matched.length > 0) {
      try {
        const obj = JSON.parse(line);
        if (obj.source === 'USER_EXPLICIT') {
          console.log(`Line ${lineCount} (${obj.source}, ${obj.type}):`);
          console.log(obj.content ? obj.content.substring(0, 500) : 'No content');
          console.log('Matches:', matched);
        }
      } catch (e) {
        // Not JSON
      }
    }
  }
  console.log(`Searched ${lineCount} lines.`);
}

search();
