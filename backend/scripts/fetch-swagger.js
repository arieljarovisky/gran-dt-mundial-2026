import fs from 'fs';

const urls = [
  'https://worldcup26.ir/api-docs/swagger.json',
  'http://worldcup26.ir:3050/api-docs/swagger.json',
];

for (const url of urls) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
    const text = await res.text();
    console.log(url, res.status, text.slice(0, 100));
    if (text.startsWith('{')) {
      fs.writeFileSync('backend/scripts/swagger.json', text);
      const spec = JSON.parse(text);
      console.log('paths:', Object.keys(spec.paths || {}));
      break;
    }
  } catch (e) {
    console.log(url, e.message);
  }
}
