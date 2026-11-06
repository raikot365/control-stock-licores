// src/services/comboService.ts
import { getDB } from '@/db/database';
import { BottleSize, Combo, ComboItem } from '@/db/types';

export const ComboService = {
  getCombos(includeInactive: boolean = false): Combo[] {
    const db = getDB();
    const combos = db.getAllSync<{
      id: number;
      name: string;
      price: number;
      active: number;
      created_at: string;
    }>(`
      SELECT id, name, price, active, created_at
      FROM combos
      ${includeInactive ? '' : 'WHERE active = 1'}
      ORDER BY name COLLATE NOCASE ASC;
    `);

    const allItems = db.getAllSync<ComboItem>(`
      SELECT id, combo_id, size, quantity
      FROM combo_items
      ORDER BY id ASC;
    `);

    return combos.map((c) => ({
      ...c,
      items: allItems.filter((item) => item.combo_id === c.id),
    }));
  },

  createCombo(
    name: string,
    price: number,
    items: { size: BottleSize; quantity: number }[]
  ): number {
    const cleanName = name.trim();
    if (!cleanName) throw new Error('El nombre del combo es requerido');
    if (price <= 0) throw new Error('El precio debe ser mayor a 0');
    if (!items || items.length === 0 || items.every((i) => i.quantity <= 0)) {
      throw new Error('El combo debe incluir al menos una botella');
    }

    const db = getDB();
    const now = new Date().toISOString();
    let comboId = 0;

    db.withTransactionSync(() => {
      const res = db.runSync(
        'INSERT INTO combos (name, price, active, created_at) VALUES (?, ?, 1, ?)',
        cleanName,
        Math.round(price),
        now
      );
      comboId = Number(res.lastInsertRowId);

      for (const item of items) {
        if (item.quantity > 0) {
          db.runSync(
            'INSERT INTO combo_items (combo_id, size, quantity) VALUES (?, ?, ?)',
            comboId,
            item.size,
            item.quantity
          );
        }
      }
    });

    return comboId;
  },

  updateCombo(
    id: number,
    name: string,
    price: number,
    active: number,
    items: { size: BottleSize; quantity: number }[]
  ): void {
    const cleanName = name.trim();
    if (!cleanName) throw new Error('El nombre del combo es requerido');
    if (price <= 0) throw new Error('El precio debe ser mayor a 0');

    const db = getDB();
    db.withTransactionSync(() => {
      db.runSync(
        'UPDATE combos SET name = ?, price = ?, active = ? WHERE id = ?',
        cleanName,
        Math.round(price),
        active,
        id
      );

      // Reemplazar items
      db.runSync('DELETE FROM combo_items WHERE combo_id = ?', id);
      for (const item of items) {
        if (item.quantity > 0) {
          db.runSync(
            'INSERT INTO combo_items (combo_id, size, quantity) VALUES (?, ?, ?)',
            id,
            item.size,
            item.quantity
          );
        }
      }
    });
  },

  deleteOrDeactivateCombo(id: number): { action: 'deleted' | 'deactivated' } {
    const db = getDB();
    const saleCount = db.getFirstSync<{ count: number }>(
      'SELECT COUNT(*) as count FROM sale_lines WHERE combo_id = ?',
      id
    );

    if (saleCount && saleCount.count > 0) {
      // Tiene ventas históricas -> desactivar para no romper historial
      db.runSync('UPDATE combos SET active = 0 WHERE id = ?', id);
      return { action: 'deactivated' };
    } else {
      // Sin ventas -> borrar
      db.runSync('DELETE FROM combos WHERE id = ?', id);
      return { action: 'deleted' };
    }
  },
};
