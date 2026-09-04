// Builds the client in demo mode (mock API + hash routing) and inlines the JS
// and CSS into one self-contained HTML file that runs from any static host.
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const outDir = path.join(root, 'client', 'dist-demo');
const target = path.join(root, 'demo', 'mindbridge-demo.html');

execSync('npx vite build --outDir dist-demo --emptyOutDir', {
  cwd: path.join(root, 'client'),
  stdio: 'inherit',
  env: { ...process.env, VITE_DEMO: '1' },
});

let html = fs.readFileSync(path.join(outDir, 'index.html'), 'utf8');
const asset = (file) => fs.readFileSync(path.join(outDir, file), 'utf8');

html = html.replace(/<script type="module" crossorigin src="\/(.+?)"><\/script>/g,
  (_, file) => `<script type="module">\n${asset(file)}\n</script>`);
html = html.replace(/<link rel="stylesheet" crossorigin href="\/(.+?)">/g,
  (_, file) => `<style>\n${asset(file)}\n</style>`);

// The artifact host supplies <!doctype>, <html>, <head> and <body>; keep only
// the document's own head contents plus the body markup.
const head = /<head>([\s\S]*?)<\/head>/.exec(html)[1];
const body = /<body>([\s\S]*?)<\/body>/.exec(html)[1];
const cleanHead = head
  .replace(/<meta charset="UTF-8"\s*\/?>/i, '')
  .replace(/<meta name="viewport"[^>]*>/i, '')
  // The artifact gallery shows the title as the page's name; the tagline moves
  // to the publish description.
  .replace(/<title>[\s\S]*?<\/title>/i, '<title>MindBridge</title>')
  .trim();

fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, `${cleanHead}\n${body.trim()}\n`);

const kb = (fs.statSync(target).size / 1024).toFixed(0);
console.log(`Demo έτοιμο: ${path.relative(root, target)} (${kb} KB)`);
