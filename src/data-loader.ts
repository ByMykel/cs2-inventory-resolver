import {createRequire} from 'node:module';
import type {InventoryData} from './types.js';

const require = createRequire(import.meta.url);

let data: InventoryData | null = null;

export function getData(): InventoryData {
  if (!data) {
    data = require('../data/inventory.json') as InventoryData;
  }
  return data;
}
