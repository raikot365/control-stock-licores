// src/services/eventService.ts
import { getDB } from '@/db/database';
import { BottleSize, EventStatus, EventStockItem, LiquorEvent } from '@/db/types';

export interface EventBalanceSummary {
  event: LiquorEvent;
  totalTaken: number;
  totalSold: number;
  totalRemaining: number;
  totalRevenue: number;
  items: EventStockItem[];
}

export const EventService = {
  getEvents(): LiquorEvent[] {
    const db = getDB();
    const rows = db.getAllSync<{
      id: number;
      name: string;
      date: string;
      status: EventStatus;
      created_at: string;
      total_taken: number;
      total_sold: number;
      total_revenue: number;
    }>(`
      SELECT 
        e.id,
        e.name,
        e.date,
        e.status,
        e.created_at,
        COALESCE(SUM(es.quantity_taken), 0) as total_taken,
        COALESCE(SUM(
          (SELECT COALESCE(SUM(sl.quantity), 0) 
           FROM sale_lines sl 
           INNER JOIN sales s ON sl.sale_id = s.id 
           WHERE s.event_id = e.id AND s.status = 'ACTIVA' 
             AND sl.flavor_id = es.flavor_id AND sl.size = es.size)
        ), 0) as total_sold,
        COALESCE(
          (SELECT SUM(s.total) FROM sales s WHERE s.event_id = e.id AND s.status = 'ACTIVA'), 
          0
        ) as total_revenue
      FROM events e
      LEFT JOIN event_stock es ON e.id = es.event_id
      GROUP BY e.id
      ORDER BY e.id DESC;
    `);

    return rows;
  },

  getActiveEvents(): LiquorEvent[] {
    const db = getDB();
    return db.getAllSync<LiquorEvent>(`
      SELECT id, name, date, status, created_at
      FROM events
      WHERE status IN ('PREPARADO', 'EN_CURSO')
      ORDER BY id DESC;
    `);
  },

  getEventById(id: number): LiquorEvent | null {
    const db = getDB();
    return db.getFirstSync<LiquorEvent>('SELECT * FROM events WHERE id = ?', id);
  },

  getEventStockItems(eventId: number): EventStockItem[] {
    const db = getDB();
    const query = `
      SELECT 
        es.id,
        es.event_id,
        es.flavor_id,
        f.name as flavor_name,
        es.size,
        es.quantity_taken,
        COALESCE(
          (SELECT SUM(sl.quantity) 
           FROM sale_lines sl 
           INNER JOIN sales s ON sl.sale_id = s.id 
           WHERE s.event_id = es.event_id 
             AND s.status = 'ACTIVA' 
             AND sl.flavor_id = es.flavor_id 
             AND sl.size = es.size), 
          0
        ) as quantity_sold
      FROM event_stock es
      INNER JOIN flavors f ON es.flavor_id = f.id
      WHERE es.event_id = ?
      ORDER BY f.name ASC, es.size DESC;
    `;
    const rows = db.getAllSync<{
      id: number;
      event_id: number;
      flavor_id: number;
      flavor_name: string;
      size: BottleSize;
      quantity_taken: number;
      quantity_sold: number;
    }>(query, eventId);

    return rows.map((r) => ({
      ...r,
      quantity_remaining: Math.max(0, r.quantity_taken - r.quantity_sold),
    }));
  },

  createEvent(
    name: string,
    date: string,
    stockItems: { flavorId: number; size: BottleSize; quantityTaken: number }[]
  ): number {
    const cleanName = name.trim();
    if (!cleanName) throw new Error('El nombre del evento es requerido');
    if (!date) throw new Error('La fecha es requerida');

    const db = getDB();
    const now = new Date().toISOString();
    let eventId = 0;

    db.withTransactionSync(() => {
      const res = db.runSync(
        'INSERT INTO events (name, date, status, created_at) VALUES (?, ?, "EN_CURSO", ?)',
        cleanName,
        date,
        now
      );
      eventId = Number(res.lastInsertRowId);

      for (const item of stockItems) {
        if (item.quantityTaken > 0) {
          db.runSync(
            'INSERT INTO event_stock (event_id, flavor_id, size, quantity_taken) VALUES (?, ?, ?, ?)',
            eventId,
            item.flavorId,
            item.size,
            item.quantityTaken
          );
        }
      }
    });

    return eventId;
  },

  addStockToEvent(
    eventId: number,
    flavorId: number,
    size: BottleSize,
    quantityToAdd: number
  ): void {
    if (quantityToAdd <= 0) return;
    const db = getDB();

    db.runSync(
      `INSERT INTO event_stock (event_id, flavor_id, size, quantity_taken)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(event_id, flavor_id, size) 
       DO UPDATE SET quantity_taken = quantity_taken + excluded.quantity_taken`,
      eventId,
      flavorId,
      size,
      quantityToAdd
    );
  },

  updateEventStatus(id: number, status: EventStatus): void {
    const db = getDB();
    db.runSync('UPDATE events SET status = ? WHERE id = ?', status, id);
  },

  getEventBalance(eventId: number): EventBalanceSummary | null {
    const event = this.getEventById(eventId);
    if (!event) return null;

    const items = this.getEventStockItems(eventId);
    const db = getDB();

    const revenueRow = db.getFirstSync<{ total: number }>(
      'SELECT COALESCE(SUM(total), 0) as total FROM sales WHERE event_id = ? AND status = "ACTIVA"',
      eventId
    );

    const totalTaken = items.reduce((acc, curr) => acc + curr.quantity_taken, 0);
    const totalSold = items.reduce((acc, curr) => acc + curr.quantity_sold, 0);
    const totalRemaining = items.reduce((acc, curr) => acc + curr.quantity_remaining, 0);
    const totalRevenue = revenueRow?.total ?? 0;

    return {
      event,
      totalTaken,
      totalSold,
      totalRemaining,
      totalRevenue,
      items,
    };
  },
};
