import { cp, readFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { URL } from 'node:url';
const source = new URL('../data/static-snapshot/', import.meta.url);
const target = new URL('../dist/prod-mock/snapshot/', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('manifest.json', source), 'utf8'));
await mkdir(target, { recursive: true });
for (const file of Object.values(manifest.files)) {
  if (!/^[a-z]+-[a-f0-9]{12}\.json$/.test(file.path)) throw new Error('Invalid snapshot path');
  const content = await readFile(new URL(file.path, source));
  if (createHash('sha256').update(content).digest('hex') !== file.sha256) throw new Error('Snapshot checksum mismatch');
  await cp(new URL(file.path, source), new URL(file.path, target));
}
await cp(new URL('manifest.json', source), new URL('manifest.json', target));
