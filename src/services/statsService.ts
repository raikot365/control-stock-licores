// src/services/statsService.ts
import { getDB } from '@/db/database';

export type StatPeriod = 'today' | 'week' | 'month' | 'all';

export interface FlavorStat {
  flavorId: number;
  flavorName: string;
  grandeQty: number;
  chicaQty: number;
  totalQty: number;
  totalRevenue: number;
}

export interface ComboStat {
  comboName: string;
  count: number;
  totalRevenue: number;
}

export interface GeneralStats {
  totalRevenue: number;
  totalBottlesSold: number;
  totalGrandeSold: number;
  totalChicaSold: number;
  particularRevenue: number;
  particularBottles: number;
  eventsRevenue: number;
  eventsBottles: number;
  byFlavor: FlavorStat[];
  topCombos: ComboStat[];
}

export const StatsService = {
  getPeriodFilter(period: StatPeriod): { clause: string; params: string[] } {
    const now = new Date();
    if (period === 'today') {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      return { clause: 'AND s.created_at >= ?', params: [startOfDay] };
    }
    if (period === 'week') {
      // Últimos 7 días
      const past = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      return { clause: 'AND s.created_at >= ?', params: [past] };
    }
    if (period === 'month') {
      // Primer día del mes
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      return { clause: 'AND s.created_at >= ?', params: [startOfMonth] };
    }
    return { clause: '', params: [] };
  },

  getStats(period: StatPeriod = 'all'): GeneralStats {
    const db = getDB();
    const { clause, params } = this.getPeriodFilter(period);

    // 1. Totales generales
    const totalRow = db.getFirstSync<{
      totalRevenue: number;
      particularRevenue: number;
      eventsRevenue: number;
    }>(`
      SELECT 
        COALESCE(SUM(total), 0) as totalRevenue,
        COALESCE(SUM(CASE WHEN event_id IS NULL THEN total ELSE 0 END), 0) as particularRevenue,
        COALESCE(SUM(CASE WHEN event_id IS NOT NULL THEN total ELSE 0 END), 0) as eventsRevenue
      FROM sales s
      WHERE s.status = 'ACTIVA' ${clause}
    `, ...params);

    // 2. Unidades por tamaño y contexto
    const unitsRow = db.getFirstSync<{
      totalBottles: number;
      totalGrande: number;
      totalChica: number;
      particularBottles: number;
      eventsBottles: number;
    }>(`
      SELECT 
        COALESCE(SUM(sl.quantity), 0) as totalBottles,
        COALESCE(SUM(CASE WHEN sl.size = 'GRANDE' THEN sl.quantity ELSE 0 END), 0) as totalGrande,
        COALESCE(SUM(CASE WHEN sl.size = 'CHICA' THEN sl.quantity ELSE 0 END), 0) as totalChica,
        COALESCE(SUM(CASE WHEN s.event_id IS NULL THEN sl.quantity ELSE 0 END), 0) as particularBottles,
        COALESCE(SUM(CASE WHEN s.event_id IS NOT NULL THEN sl.quantity ELSE 0 END), 0) as eventsBottles
      FROM sale_lines sl
      INNER JOIN sales s ON sl.sale_id = s.id
      WHERE s.status = 'ACTIVA' ${clause}
    `, ...params);

    // 3. Desglose por sabor
    const flavorRows = db.getAllSync<{
      flavorId: number;
      flavorName: string;
      grandeQty: number;
      chicaQty: number;
      totalQty: number;
      totalRevenue: number;
    }>(`
      SELECT 
        f.id as flavorId,
        f.name as flavorName,
        COALESCE(SUM(CASE WHEN sl.size = 'GRANDE' THEN sl.quantity ELSE 0 END), 0) as grandeQty,
        COALESCE(SUM(CASE WHEN sl.size = 'CHICA' THEN sl.quantity ELSE 0 END), 0) as chicaQty,
        COALESCE(SUM(sl.quantity), 0) as totalQty,
        COALESCE(SUM(sl.line_total), 0) as totalRevenue
      FROM flavors f
      LEFT JOIN sale_lines sl ON f.id = sl.flavor_id
      LEFT JOIN sales s ON sl.sale_id = s.id AND s.status = 'ACTIVA' ${clause}
      GROUP BY f.id, f.name
      HAVING totalQty > 0
      ORDER BY totalQty DESC, totalRevenue DESC;
    `, ...params);

    // 4. Combos más vendidos
    const comboRows = db.getAllSync<{
      comboName: string;
      count: number;
      totalRevenue: number;
    }>(`
      SELECT 
        sl.combo_name as comboName,
        COUNT(DISTINCT sl.sale_id || '-' || sl.combo_id) as count,
        COALESCE(SUM(sl.line_total), 0) as totalRevenue
      FROM sale_lines sl
      INNER JOIN sales s ON sl.sale_id = s.id
      WHERE s.status = 'ACTIVA' AND sl.combo_id IS NOT NULL ${clause}
      GROUP BY sl.combo_name
      ORDER BY count DESC;
    `, ...params);

    return {
      totalRevenue: totalRow?.totalRevenue ?? 0,
      totalBottlesSold: unitsRow?.totalBottles ?? 0,
      totalGrandeSold: unitsRow?.totalGrande ?? 0,
      totalChicaSold: unitsRow?.totalChica ?? 0,
      particularRevenue: totalRow?.particularRevenue ?? 0,
      particularBottles: unitsRow?.particularBottles ?? 0,
      eventsRevenue: totalRow?.eventsRevenue ?? 0,
      eventsBottles: unitsRow?.eventsBottles ?? 0,
      byFlavor: flavorRows,
      topCombos: comboRows,
    };
  },
};
