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

const label = (change, count) => {
  const category = change.category ?? change;
  const singular = SINGULAR[category] ?? category.replace(/_/g, ' ');
  const plural = singular === 'graffiti' ? 'graffiti' : `${singular}s`;
  const base = `${count} ${count === 1 ? singular : plural}`;
  if (!change.mirroredBy) return base;

  const mirror = SINGULAR[change.mirroredBy] ?? change.mirroredBy;
  // "579 stickers (and matching sticker slabs)"
  return `${base} (and matching ${mirror}s)`;
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

    const added = [...after].filter(([key]) => !before.has(key)).map(([key, name]) => ({ key, name }));
    const removed = [...before].filter(([key]) => !after.has(key)).map(([key, name]) => ({ key, name }));

    if (added.length || removed.length) result.push({ category, added, removed });
  }

  return result;
}

// Every sticker has a matching sticker slab, so a capsule release shows up
// twice. Fold the mirror into the primary category when both sides changed
// identically - if they ever diverge, keep them separate so it is visible.
function foldMirrored(changes, primary, mirror) {
  const a = changes.find((c) => c.category === primary);
  const b = changes.find((c) => c.category === mirror);
  if (!a || !b) return changes;

  const keys = (items) => items.map((i) => i.key).sort().join(',');
  const identical = keys(a.added) === keys(b.added) && keys(a.removed) === keys(b.removed);
  if (!identical) return changes;

  a.mirroredBy = mirror;
  return changes.filter((c) => c !== b);
}

const [, , oldPath, newPath, prevTag, newTag] = process.argv;

if (!oldPath || !newPath) {
  console.error('usage: release-notes.mjs <old.json> <new.json> [prevTag] [newTag]');
  process.exit(1);
}

const oldData = JSON.parse(readFileSync(oldPath, 'utf8'));
const newData = JSON.parse(readFileSync(newPath, 'utf8'));
const changes = foldMirrored(diff(oldData, newData), 'stickers', 'sticker_slabs');

const lines = ['## Inventory data update', ''];

const added = changes.filter((c) => c.added.length);
const removed = changes.filter((c) => c.removed.length);

if (!added.length && !removed.length) {
  // Upstream can change an item's image, rarity or market flags without
  // adding or removing anything.
  lines.push('**Changed** — item metadata only, no items added or removed');
} else {
  if (added.length) {
    lines.push(`**Added** — ${added.map((c) => label(c, c.added.length)).join(', ')}`);
  }
  if (removed.length) {
    lines.push(`**Removed** — ${removed.map((c) => label(c, c.removed.length)).join(', ')}`);
  }
}

if (added.length) {
  const flat = added.flatMap((c) => c.added.map(({ name }) => `- ${SINGULAR[c.category] ?? c.category}: ${name}`));
  lines.push('', '<details><summary>New items</summary>', '');
  lines.push(...flat.slice(0, MAX_LISTED));
  if (flat.length > MAX_LISTED) lines.push(`- …and ${flat.length - MAX_LISTED} more`);
  lines.push('', '</details>');
}

if (removed.length) {
  const flat = removed.flatMap((c) => c.removed.map(({ name }) => `- ${SINGULAR[c.category] ?? c.category}: ${name}`));
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
