# cs2-inventory-resolver

Resolve raw CS2 Game Coordinator (GC) items into human-readable names, images, and categories.

## Installation

```bash
npm install cs2-inventory-resolver
```

This package is ESM-only. Use `import`, or `await import()` from CommonJS.

## Where the input comes from

`resolveItem` takes a raw `CSOEconItem` as delivered by the CS2 Game Coordinator —
the shape you get from [`node-globaloffensive`](https://github.com/DoctorMcKay/node-globaloffensive)
(via [`steam-user`](https://github.com/DoctorMcKay/node-steam-user)) when reading an
inventory. This library does no networking of its own; it only turns those raw
items into readable data.

## Usage

### `resolveItem(gcItem)`

Takes a raw GC item and returns its name, image URL, entity type, rarity, and marketability.

For skins, the `name` is fully decorated with the appropriate prefix and wear:

- `StatTrak™` prefix (detected via attribute 80)
- `Souvenir` prefix (detected via attribute 140)
- `★` for knives/gloves (already included in the base name)
- Wear suffix based on `paint_wear` (e.g. `Factory New`, `Field-Tested`)

```ts
import { resolveItem } from 'cs2-inventory-resolver';

// Regular skin
resolveItem({ def_index: 7, paint_index: 282, paint_wear: 0.30 });
// => {
//      name: "AK-47 | Redline (Field-Tested)",
//      image: "https://community.akamai.steamstatic.com/economy/image/...",
//      entity: "skin",
//      rarity: { id: "rarity_legendary_weapon", name: "Classified", color: "#d32ce6" },
//      marketable: true,
//      status: "tradable",
//      trade_hold_expires: null
//    }

// StatTrak skin (attribute 80 present)
const statTrak = [{ def_index: 80, value_bytes: Buffer.from([1, 0, 0, 0]) }];
resolveItem({ def_index: 7, paint_index: 282, paint_wear: 0.30, attribute: statTrak });
// => { name: "StatTrak™ AK-47 | Redline (Field-Tested)", ... }

// StatTrak knife (quality 3 = ★ already in name)
resolveItem({ def_index: 507, paint_index: 38, quality: 3, paint_wear: 0.01, attribute: statTrak });
// => { name: "★ StatTrak™ Karambit | Fade (Factory New)", entity: "skin", ... }

// Non-skin item
resolveItem({ def_index: 1203 });
// => {
//      name: "CS:GO Case Key",
//      image: "https://community.akamai.steamstatic.com/economy/image/...",
//      entity: "key",
//      rarity: null,
//      marketable: true,
//      status: "tradable",
//      trade_hold_expires: null
//    }
```

Returns `null` if the item could not be identified.

#### Input (`GcItemInput`)

| Field | Type | Description |
|-------|------|-------------|
| `def_index` | `number` | Item definition index (required) |
| `paint_index` | `number?` | Paint/skin index |
| `quality` | `number?` | Item quality (`3` = ★ knife/glove) |
| `paint_wear` | `number?` | Wear float (`0.0`–`1.0`) |
| `stickers` | `{sticker_id?: number}[]?` | Sticker slots |
| `attribute` | `{def_index: number; value_bytes?: Buffer}[]?` | Raw attribute array |

#### Output (`ResolvedItemData`)

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Decorated item name |
| `image` | `string` | Image URL |
| `entity` | `ItemEntity` | Item type (`skin`, `crate`, `key`, `collectible`, etc.) |
| `rarity` | `{id, name, color} \| null` | Rarity info or `null` |
| `marketable` | `boolean` | Whether the item is marketable on Steam |
| `status` | `TradeStatus` | Trade state of this instance (see below) |
| `trade_hold_expires` | `string \| null` | ISO 8601 trade-hold expiry, or `null` |

#### Trade status (`TradeStatus`)

Derived from attribute `312` (`trade_protected_escrow_date`). Items that are not
`'tradable'` cannot be moved into or out of a storage unit.

| Value | Meaning | `trade_hold_expires` |
|-------|---------|--------------------|
| `'tradable'` | No hold — freely tradable and movable (attribute absent) | `null` |
| `'market_listed'` | Listed on the Steam Community Market, kept in the inventory until it sells (attribute is `0`) | `null` |
| `'trade_hold'` | Under a trade-protection / escrow hold (attribute is a future timestamp) | ISO date |

```ts
const escrow = Buffer.alloc(4);
escrow.writeUInt32LE(Math.floor(new Date('2026-09-01T12:00:00Z').getTime() / 1000));

resolveItem({ def_index: 7, paint_index: 282, paint_wear: 0.30, attribute: [{ def_index: 312, value_bytes: escrow }] });
// => { ..., status: "trade_hold", trade_hold_expires: "2026-09-01T12:00:00.000Z" }

// An escrow date of 0 means the item is listed on the Market
resolveItem({ def_index: 7, paint_index: 282, paint_wear: 0.30, attribute: [{ def_index: 312, value_bytes: Buffer.alloc(4) }] });
// => { ..., status: "market_listed", trade_hold_expires: null }
```

### `getAttributeUint32(item, attrDefIndex)`

Reads a uint32 value from a GC item's raw `attribute[]` array.

```ts
import { getAttributeUint32 } from 'cs2-inventory-resolver';

const musicIndex = getAttributeUint32(gcItem, 166);
if (musicIndex) {
  console.log('Music kit ID:', musicIndex);
}
```

## Item data

Item names, images, rarities and marketability come from
[CSGO-API](https://github.com/ByMykel/CSGO-API) and ship with the package as
`data/inventory.json` — no network calls at runtime.

That file is refreshed daily by a scheduled workflow. When the upstream data
changes, a new **patch** release is published, so a `^0.4.0` dependency picks up
new skins, cases and stickers automatically. Each release lists what was added or
removed.

## License

[MIT](LICENSE)
