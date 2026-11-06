// src/services/priceService.ts
import { getDB } from '@/db/database';
import { BottleSize, PriceRecord } from '@/db/types';

export const PriceService = {
  getPrices(): Record<BottleSize, number> {
    const db = getDB();
    const rows = db.getAllSync<PriceRecord>('SELECT size, price, updated_at FROM prices');
    const result: Record<BottleSize, number> = {
      GRANDE: 8000,
      CHICA: 5000,
    };
    for (const r of rows) {
      result[r.size] = r.price;
    }
    return result;
  },

  updatePrices(grandePrice: number, chicaPrice: number): void {
    if (grandePrice < 0 || chicaPrice < 0) {
      throw new Error('Los precios no pueden ser negativos');
    }
    const db = getDB();
    const now = new Date().toISOString();

    db.withTransactionSync(() => {
      db.runSync(
        `INSERT INTO prices (size, price, updated_at) VALUES ('GRANDE', ?, ?)
         ON CONFLICT(size) DO UPDATE SET price = excluded.price, updated_at = excluded.updated_at`,
        Math.round(grandePrice),
        now
      );
      db.runSync(
        `INSERT INTO prices (size, price, updated_at) VALUES ('CHICA', ?, ?)
         ON CONFLICT(size) DO UPDATE SET price = excluded.price, updated_at = excluded.updated_at`,
        Math.round(chicaPrice),
        now
      );
    });
  },
};
