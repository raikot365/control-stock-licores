// src/services/salesService.ts
import { getDB } from '@/db/database';
import { BottleSize, CartItem, Sale, SaleLine } from '@/db/types';

export interface CreateSaleParams {
  eventId?: number | null;
  paymentMethod?: string;
  note?: string;
  cart: CartItem[];
}

export const SalesService = {
  createSale(params: CreateSaleParams): { saleId: number; total: number } {
    const { eventId, paymentMethod = 'Efectivo', note, cart } = params;
    if (!cart || cart.length === 0) {
      throw new Error('El carrito no puede estar vacío');
    }

    const db = getDB();
    const now = new Date().toISOString();
    let totalSale = 0;

    // Calcular desglose de botellas necesarias por (flavorId, size)
    const requiredBottles: Record<string, { flavorId: number; size: BottleSize; quantity: number }> = {};

    for (const item of cart) {
      if (item.type === 'BOTTLE') {
        const key = `${item.flavorId}_${item.size}`;
        if (!requiredBottles[key]) {
          requiredBottles[key] = { flavorId: item.flavorId, size: item.size, quantity: 0 };
        }
        requiredBottles[key].quantity += item.quantity;
        totalSale += item.lineTotal;
      } else if (item.type === 'COMBO') {
        totalSale += item.price;
        for (const b of item.bottles) {
          const key = `${b.flavorId}_${b.size}`;
          if (!requiredBottles[key]) {
            requiredBottles[key] = { flavorId: b.flavorId, size: b.size, quantity: 0 };
          }
          requiredBottles[key].quantity += 1;
        }
      }
    }

    let createdSaleId = 0;

    db.withTransactionSync(() => {
      // 1. Validar disponibilidad en stock general
      for (const req of Object.values(requiredBottles)) {
        const stockRow = db.getFirstSync<{ quantity: number; flavor_name: string }>(`
          SELECT s.quantity, f.name as flavor_name 
          FROM stock s 
          INNER JOIN flavors f ON s.flavor_id = f.id 
          WHERE s.flavor_id = ? AND s.size = ?
        `, req.flavorId, req.size);

        const available = stockRow?.quantity ?? 0;
        const flavorName = stockRow?.flavor_name || 'Desconocido';
        const sizeLabel = req.size === 'GRANDE' ? 'grande' : 'chica';

        if (available < req.quantity) {
          throw new Error(
            `No hay suficiente stock de ${flavorName} (${sizeLabel}). Disponibles: ${available}, solicitados: ${req.quantity}`
          );
        }
      }

      // 2. Si es venta en evento, validar stock disponible en dicho evento
      if (eventId) {
        for (const req of Object.values(requiredBottles)) {
          const eventStockRow = db.getFirstSync<{ quantity_taken: number; flavor_name: string }>(`
            SELECT es.quantity_taken, f.name as flavor_name 
            FROM event_stock es 
            INNER JOIN flavors f ON es.flavor_id = f.id 
            WHERE es.event_id = ? AND es.flavor_id = ? AND es.size = ?
          `, eventId, req.flavorId, req.size);

          const taken = eventStockRow?.quantity_taken ?? 0;
          const soldRow = db.getFirstSync<{ sold: number }>(`
            SELECT COALESCE(SUM(sl.quantity), 0) as sold 
            FROM sale_lines sl 
            INNER JOIN sales s ON sl.sale_id = s.id 
            WHERE s.event_id = ? AND s.status = 'ACTIVA' AND sl.flavor_id = ? AND sl.size = ?
          `, eventId, req.flavorId, req.size);

          const alreadySold = soldRow?.sold ?? 0;
          const remainingInEvent = taken - alreadySold;
          const flavorName = eventStockRow?.flavor_name || 'Desconocido';
          const sizeLabel = req.size === 'GRANDE' ? 'grande' : 'chica';

          if (remainingInEvent < req.quantity) {
            throw new Error(
              `No hay suficiente stock en el evento para ${flavorName} (${sizeLabel}). Quedan en el evento: ${remainingInEvent}, solicitados: ${req.quantity}`
            );
          }
        }
      }

      // 3. Crear cabecera de venta
      const saleResult = db.runSync(
        `INSERT INTO sales (event_id, total, payment_method, note, status, created_at)
         VALUES (?, ?, ?, ?, 'ACTIVA', ?)`,
        eventId ?? null,
        Math.round(totalSale),
        paymentMethod,
        note ?? null,
        now
      );
      createdSaleId = Number(saleResult.lastInsertRowId);

      // 4. Insertar líneas de venta
      for (const item of cart) {
        if (item.type === 'BOTTLE') {
          db.runSync(
            `INSERT INTO sale_lines (sale_id, combo_id, combo_name, flavor_id, size, quantity, unit_price, line_total)
             VALUES (?, NULL, NULL, ?, ?, ?, ?, ?)`,
            createdSaleId,
            item.flavorId,
            item.size,
            item.quantity,
            item.unitPrice,
            item.lineTotal
          );
        } else if (item.type === 'COMBO') {
          const bottleCount = item.bottles.length;
          const unitPriceProportional = bottleCount > 0 ? Math.round(item.price / bottleCount) : item.price;
          let distributedTotal = 0;

          item.bottles.forEach((b, index) => {
            // El último ítem absorbe la diferencia de redondeo
            const linePrice = index === bottleCount - 1 ? item.price - distributedTotal : unitPriceProportional;
            distributedTotal += linePrice;

            db.runSync(
              `INSERT INTO sale_lines (sale_id, combo_id, combo_name, flavor_id, size, quantity, unit_price, line_total)
               VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
              createdSaleId,
              item.comboId,
              item.comboName,
              b.flavorId,
              b.size,
              linePrice,
              linePrice
            );
          });
        }
      }

      // 5. Descontar del stock general y registrar movimientos
      for (const req of Object.values(requiredBottles)) {
        db.runSync(
          'UPDATE stock SET quantity = quantity - ? WHERE flavor_id = ? AND size = ?',
          req.quantity,
          req.flavorId,
          req.size
        );

        db.runSync(
          `INSERT INTO stock_movements (flavor_id, size, quantity_delta, type, note, sale_id, created_at)
           VALUES (?, ?, ?, 'VENTA', ?, ?, ?)`,
          req.flavorId,
          req.size,
          -req.quantity,
          eventId ? 'Venta en evento' : 'Venta particular',
          createdSaleId,
          now
        );
      }
    });

    return { saleId: createdSaleId, total: totalSale };
  },

  cancelSale(saleId: number): void {
    const db = getDB();
    const now = new Date().toISOString();

    db.withTransactionSync(() => {
      const sale = db.getFirstSync<{ id: number; status: string }>(
        'SELECT id, status FROM sales WHERE id = ?',
        saleId
      );
      if (!sale) throw new Error('Venta no encontrada');
      if (sale.status === 'ANULADA') throw new Error('Esta venta ya fue anulada previamente');

      // Obtener líneas para reponer el stock
      const lines = db.getAllSync<{ flavor_id: number; size: BottleSize; quantity: number }>(
        'SELECT flavor_id, size, quantity FROM sale_lines WHERE sale_id = ?',
        saleId
      );

      // Reponer stock
      for (const line of lines) {
        db.runSync(
          'UPDATE stock SET quantity = quantity + ? WHERE flavor_id = ? AND size = ?',
          line.quantity,
          line.flavor_id,
          line.size
        );

        db.runSync(
          `INSERT INTO stock_movements (flavor_id, size, quantity_delta, type, note, sale_id, created_at)
           VALUES (?, ?, ?, 'ANULACION', 'Reposición por venta anulada', ?, ?)`,
          line.flavor_id,
          line.size,
          line.quantity,
          saleId,
          now
        );
      }

      // Marcar venta como anulada
      db.runSync('UPDATE sales SET status = "ANULADA" WHERE id = ?', saleId);
    });
  },

  getSales(eventId?: number | null, limit: number = 50): Sale[] {
    const db = getDB();
    let query = `
      SELECT 
        s.id,
        s.event_id,
        e.name as event_name,
        s.total,
        s.payment_method,
        s.note,
        s.status,
        s.created_at
      FROM sales s
      LEFT JOIN events e ON s.event_id = e.id
    `;
    const params: any[] = [];

    if (eventId !== undefined && eventId !== null) {
      query += ' WHERE s.event_id = ? ';
      params.push(eventId);
    }

    query += ' ORDER BY s.id DESC LIMIT ?;';
    params.push(limit);

    const sales = db.getAllSync<Sale>(query, ...params);

    // Adjuntar líneas de venta
    return sales.map((sale) => {
      const lines = db.getAllSync<SaleLine>(`
        SELECT 
          sl.id,
          sl.sale_id,
          sl.combo_id,
          sl.combo_name,
          sl.flavor_id,
          f.name as flavor_name,
          sl.size,
          sl.quantity,
          sl.unit_price,
          sl.line_total
        FROM sale_lines sl
        INNER JOIN flavors f ON sl.flavor_id = f.id
        WHERE sl.sale_id = ?
        ORDER BY sl.id ASC;
      `, sale.id);

      return {
        ...sale,
        lines,
      };
    });
  },

  getLastActiveSale(): Sale | null {
    const sales = this.getSales(undefined, 1);
    const first = sales[0];
    return first && first.status === 'ACTIVA' ? first : null;
  },
};
