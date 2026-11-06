// src/services/stockService.ts
import { getDB } from '@/db/database';
import { BottleSize, FlavorWithStock, StockMovement, StockSummary } from '@/db/types';

export const StockService = {
  getFlavorsWithStock(includeInactive: boolean = false): FlavorWithStock[] {
    const db = getDB();
    const query = `
      SELECT 
        f.id,
        f.name,
        f.active,
        COALESCE(sg.quantity, 0) as grandeQty,
        COALESCE(sc.quantity, 0) as chicaQty,
        (COALESCE(sg.quantity, 0) + COALESCE(sc.quantity, 0)) as totalQty
      FROM flavors f
      LEFT JOIN stock sg ON f.id = sg.flavor_id AND sg.size = 'GRANDE'
      LEFT JOIN stock sc ON f.id = sc.flavor_id AND sc.size = 'CHICA'
      ${includeInactive ? '' : 'WHERE f.active = 1'}
      ORDER BY f.name COLLATE NOCASE ASC;
    `;
    return db.getAllSync<FlavorWithStock>(query);
  },

  getStockSummary(): StockSummary {
    const db = getDB();
    const result = db.getFirstSync<{
      totalBottles: number;
      totalGrande: number;
      totalChica: number;
    }>(`
      SELECT 
        COALESCE(SUM(quantity), 0) as totalBottles,
        COALESCE(SUM(CASE WHEN size = 'GRANDE' THEN quantity ELSE 0 END), 0) as totalGrande,
        COALESCE(SUM(CASE WHEN size = 'CHICA' THEN quantity ELSE 0 END), 0) as totalChica
      FROM stock s
      INNER JOIN flavors f ON s.flavor_id = f.id
      WHERE f.active = 1;
    `);

    // Alertas de stock bajo (por sabor y tamaño: <= 2 y > 0) y sin stock (== 0)
    const alertStats = db.getFirstSync<{ lowCount: number; zeroCount: number }>(`
      SELECT 
        COUNT(CASE WHEN quantity > 0 AND quantity <= 2 THEN 1 END) as lowCount,
        COUNT(CASE WHEN quantity = 0 THEN 1 END) as zeroCount
      FROM stock s
      INNER JOIN flavors f ON s.flavor_id = f.id
      WHERE f.active = 1;
    `);

    return {
      totalBottles: result?.totalBottles ?? 0,
      totalGrande: result?.totalGrande ?? 0,
      totalChica: result?.totalChica ?? 0,
      lowStockCount: alertStats?.lowCount ?? 0,
      outOfStockCount: alertStats?.zeroCount ?? 0,
    };
  },

  getAvailableStock(flavorId: number, size: BottleSize): number {
    const db = getDB();
    const row = db.getFirstSync<{ quantity: number }>(
      'SELECT quantity FROM stock WHERE flavor_id = ? AND size = ?',
      flavorId,
      size
    );
    return row?.quantity ?? 0;
  },

  addFlavor(name: string): number {
    const db = getDB();
    const cleanName = name.trim();
    if (!cleanName) throw new Error('El nombre del sabor no puede estar vacío');

    const now = new Date().toISOString();
    let newId = 0;

    db.withTransactionSync(() => {
      // Verificar si ya existe (incluso inactivo)
      const existing = db.getFirstSync<{ id: number; active: number }>(
        'SELECT id, active FROM flavors WHERE LOWER(name) = LOWER(?)',
        cleanName
      );

      if (existing) {
        if (existing.active === 0) {
          // Reactivar
          db.runSync('UPDATE flavors SET active = 1 WHERE id = ?', existing.id);
          newId = existing.id;
        } else {
          throw new Error('Ya existe un sabor con ese nombre');
        }
      } else {
        const res = db.runSync(
          'INSERT INTO flavors (name, active, created_at) VALUES (?, 1, ?)',
          cleanName,
          now
        );
        newId = Number(res.lastInsertRowId);

        // Crear registros de stock iniciales
        db.runSync('INSERT INTO stock (flavor_id, size, quantity) VALUES (?, "GRANDE", 0)', newId);
        db.runSync('INSERT INTO stock (flavor_id, size, quantity) VALUES (?, "CHICA", 0)', newId);
      }
    });

    return newId;
  },

  updateFlavor(id: number, name: string, active: number): void {
    const db = getDB();
    const cleanName = name.trim();
    if (!cleanName) throw new Error('El nombre no puede estar vacío');

    const existing = db.getFirstSync<{ id: number }>(
      'SELECT id FROM flavors WHERE LOWER(name) = LOWER(?) AND id != ?',
      cleanName,
      id
    );
    if (existing) throw new Error('Ya existe otro sabor con ese nombre');

    db.runSync('UPDATE flavors SET name = ?, active = ? WHERE id = ?', cleanName, active, id);
  },

  addStock(flavorId: number, size: BottleSize, quantityToAdd: number, note?: string): void {
    if (quantityToAdd <= 0) return;
    const db = getDB();
    const now = new Date().toISOString();

    db.withTransactionSync(() => {
      // Incrementar stock
      db.runSync(
        `INSERT INTO stock (flavor_id, size, quantity)
         VALUES (?, ?, ?)
         ON CONFLICT(flavor_id, size) DO UPDATE SET quantity = quantity + excluded.quantity`,
        flavorId,
        size,
        quantityToAdd
      );

      // Registrar movimiento
      db.runSync(
        `INSERT INTO stock_movements (flavor_id, size, quantity_delta, type, note, created_at)
         VALUES (?, ?, ?, 'INGRESO', ?, ?)`,
        flavorId,
        size,
        quantityToAdd,
        note || 'Carga de stock',
        now
      );
    });
  },

  adjustStock(flavorId: number, size: BottleSize, newQuantity: number, note?: string): void {
    if (newQuantity < 0) throw new Error('La cantidad no puede ser negativa');
    const db = getDB();
    const now = new Date().toISOString();

    db.withTransactionSync(() => {
      const current = db.getFirstSync<{ quantity: number }>(
        'SELECT quantity FROM stock WHERE flavor_id = ? AND size = ?',
        flavorId,
        size
      );
      const currentQty = current?.quantity ?? 0;
      const delta = newQuantity - currentQty;

      if (delta === 0) return;

      db.runSync(
        `INSERT INTO stock (flavor_id, size, quantity)
         VALUES (?, ?, ?)
         ON CONFLICT(flavor_id, size) DO UPDATE SET quantity = excluded.quantity`,
        flavorId,
        size,
        newQuantity
      );

      db.runSync(
        `INSERT INTO stock_movements (flavor_id, size, quantity_delta, type, note, created_at)
         VALUES (?, ?, ?, 'AJUSTE', ?, ?)`,
        flavorId,
        size,
        delta,
        note || 'Ajuste manual de stock',
        now
      );
    });
  },

  getMovements(limit: number = 30): StockMovement[] {
    const db = getDB();
    return db.getAllSync<StockMovement>(`
      SELECT 
        sm.id,
        sm.flavor_id,
        f.name as flavor_name,
        sm.size,
        sm.quantity_delta,
        sm.type,
        sm.note,
        sm.sale_id,
        sm.created_at
      FROM stock_movements sm
      INNER JOIN flavors f ON sm.flavor_id = f.id
      ORDER BY sm.id DESC
      LIMIT ?;
    `, limit);
  },
};
