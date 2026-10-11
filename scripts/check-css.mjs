// Lista las clases usadas en src/**/*.js que no tienen estilo en src/styles/*.css
import fs from 'node:fs';
import path from 'node:path';

const walk = (d) =>
  fs.readdirSync(d, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]
  );

const css = walk('src/styles')
  .filter((f) => f.endsWith('.css'))
  .map((f) => fs.readFileSync(f, 'utf8'))
  .join('\n')
  .replace(/\/\*[\s\S]*?\*\//g, '');
const defined = new Set([...css.matchAll(/\.([a-zA-Z_][\w-]*)/g)].map((m) => m[1]));

const used = new Map();
for (const f of walk('src').filter((f) => f.endsWith('.js'))) {
  const s = fs.readFileSync(f, 'utf8');
  for (const m of s.matchAll(/class(?:Name)?="([^"]*)"/g)) {
    const tokens = m[1].replace(/\$\{[^}]*\}/g, ' ').split(/\s+/).filter(Boolean);
    for (const c of tokens) {
      if (c.endsWith('-') || !/^[a-zA-Z_][\w-]*$/.test(c)) continue;
      if (!used.has(c)) used.set(c, new Set());
      used.get(c).add(path.basename(f));
    }
  }
}

const missing = [...used].filter(([c]) => !defined.has(c));
const byFile = new Map();
for (const [c, files] of missing) for (const f of files) {
  if (!byFile.has(f)) byFile.set(f, []);
  byFile.get(f).push(c);
}
console.log(`Clases usadas: ${used.size} · definidas en CSS: ${defined.size} · SIN estilo: ${missing.length}`);
for (const [f, cs] of [...byFile].sort()) console.log(`\n${f} (${cs.length}):\n  ${cs.sort().join(' ')}`);
process.exit(missing.length ? 1 : 0);
