# cs2-inventory-resolver

Resolve raw CS2 Game Coordinator (GC) items into human-readable names, images, and categories.

## Installation

The package is not yet published to npm. Install directly from GitHub:

```bash
npm install cs2-inventory-resolver
```

## Usage

### `resolveItem(gcItem)`

Takes a raw GC item and returns its name, image URL, and category.

```ts
import { resolveItem } from 'cs2-inventory-resolver';

const result = resolveItem({ def_index: 7, paint_index: 282 });
// => { name: "AK-47 | Redline", image: "https://...", category: "skin" }
```

Returns `null` if the item could not be identified.

### `getAttributeUint32(item, attrDefIndex)`

Reads a uint32 value from a GC item's raw `attribute[]` array.

```ts
import { getAttributeUint32 } from 'cs2-inventory-resolver';

const musicIndex = getAttributeUint32(gcItem, 166);
if (musicIndex) {
  console.log('Music kit ID:', musicIndex);
}
```

Common attribute def_indexes:


| def_index | Attribute        |
| --------- | ---------------- |
| 166       | `music_index`    |
| 233       | `graffiti_tint`  |
| 299       | `keychain_index` |


## Types

The package also exports the following types:

- `**GcItemInput**` - The input shape accepted by `resolveItem()`
- `**ResolvedItemData**` - The object returned by `resolveItem()`
- `**ItemCategory**` - `'skin' | 'music_kit' | 'keychain' | 'graffiti' | 'crate' | 'collectible' | 'sticker'`

