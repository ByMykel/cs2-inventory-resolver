// Generates GitHub release notes by diffing two inventory.json snapshots.
//
// Usage: node scripts/release-notes.mjs <old.json> <new.json> [prevTag] [newTag]
//
// Writes markdown to stdout. The compare link is emitted only when both tags
// are given and GITHUB_REPOSITORY is set.

import { readFileSync } from 'node:fs';

// Categories keyed by defindex -> paintindex instead of a flat id.
const NESTED = new Set(['skins']);

const SINGULAR = {
  skins: 'skin',
  crates: 'crate',
  collectibles: 'collectible',
  stickers: 'sticker',
  graffiti: 'graffiti',
  music_kits: 'music kit',
  keychains: 'keychain',
  highlights: 'highlight',
  agents: 'agent',
  patches: 'patch',
  keys: 'key',
  sticker_slabs: 'sticker slab',
  tools: 'tool'
};

const MAX_LISTED = 15;

const label = (category, count) => {
  const singular = SINGULAR[category] ?? category.replace(/_/g, ' ');
  const plural = singular === 'graffiti' ? 'graffiti' : `${singular}s`;
  return `${count} ${count === 1 ? singular : plural}`;
};

// Flattens one category into a Map of stable key -> display name.
function entries(category, value) {
  const flat = new Map();
  if (!value || typeof value !== 'object') return flat;

  if (NESTED.has(category)) {
    for (const [defindex, paints] of Object.entries(value)) {
      if (!paints || typeof paints !== 'object') continue;
      for (const [paintindex, item] of Object.entries(paints)) {
        flat.set(`${defindex}/${paintindex}`, item?.name ?? `${defindex}/${paintindex}`);
      }
    }
    return flat;
  }

  for (const [id, item] of Object.entries(value)) {
    flat.set(id, item?.name ?? id);
  }
  return flat;
}

function diff(oldData, newData) {
  const categories = [...new Set([...Object.keys(oldData), ...Object.keys(newData)])];
  const result = [];

  for (const category of categories) {
    const before = entries(category, oldData[category]);
    const after = entries(category, newData[category]);

    const added = [...after].filter(([key]) => !before.has(key)).map(([, name]) => name);
    const removed = [...before].filter(([key]) => !after.has(key)).map(([, name]) => name);

    if (added.length || removed.length) result.push({ category, added, removed });
  }

  return result;
}

const [, , oldPath, newPath, prevTag, newTag] = process.argv;

if (!oldPath || !newPath) {
  console.error('usage: release-notes.mjs <old.json> <new.json> [prevTag] [newTag]');
  process.exit(1);
}

const oldData = JSON.parse(readFileSync(oldPath, 'utf8'));
const newData = JSON.parse(readFileSync(newPath, 'utf8'));
const changes = diff(oldData, newData);

const lines = ['## Inventory data update', ''];

const added = changes.filter((c) => c.added.length);
const removed = changes.filter((c) => c.removed.length);

if (!added.length && !removed.length) {
  // Upstream can change an item's image, rarity or market flags without
  // adding or removing anything.
  lines.push('**Changed** — item metadata only, no items added or removed');
} else {
  if (added.length) {
    lines.push(`**Added** — ${added.map((c) => label(c.category, c.added.length)).join(', ')}`);
  }
  if (removed.length) {
    lines.push(`**Removed** — ${removed.map((c) => label(c.category, c.removed.length)).join(', ')}`);
  }
}

if (added.length) {
  const flat = added.flatMap((c) => c.added.map((name) => `- ${SINGULAR[c.category] ?? c.category}: ${name}`));
  lines.push('', '<details><summary>New items</summary>', '');
  lines.push(...flat.slice(0, MAX_LISTED));
  if (flat.length > MAX_LISTED) lines.push(`- …and ${flat.length - MAX_LISTED} more`);
  lines.push('', '</details>');
}

if (removed.length) {
  const flat = removed.flatMap((c) => c.removed.map((name) => `- ${SINGULAR[c.category] ?? c.category}: ${name}`));
  lines.push('', '<details><summary>Removed items</summary>', '');
  lines.push(...flat.slice(0, MAX_LISTED));
  if (flat.length > MAX_LISTED) lines.push(`- …and ${flat.length - MAX_LISTED} more`);
  lines.push('', '</details>');
}

if (prevTag && newTag && process.env.GITHUB_REPOSITORY) {
  const url = `https://github.com/${process.env.GITHUB_REPOSITORY}/compare/${prevTag}...${newTag}`;
  lines.push('', `**Compare:** ${url}`);
}

console.log(lines.join('\n'));
