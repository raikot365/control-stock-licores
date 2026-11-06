// src/services/exportService.ts
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';
import { getDB } from '@/db/database';
import { EventService } from '@/services/eventService';
import { StatsService } from '@/services/statsService';
import { StockService } from '@/services/stockService';
import { formatDateOnly, formatDateTime, formatMoney } from '@/utils/format';

export const ExportService = {
  /**
   * Exporta estadísticas generales a Excel (.xlsx) con 4 hojas
   */
  async exportGeneralXLSX(): Promise<string> {
    const stats = StatsService.getStats('all');
    const stockSummary = StockService.getStockSummary();
    const flavorsStock = StockService.getFlavorsWithStock(true);
    const db = getDB();

    // 1. Hoja Resumen
    const resumenData = [
      ['Reporte General de Ventas y Stock de Licores'],
      ['Generado el', formatDateTime(new Date().toISOString())],
      [],
      ['Métrica', 'Valor'],
      ['Recaudación Total', formatMoney(stats.totalRevenue)],
      ['Total Botellas Vendidas', stats.totalBottlesSold],
      ['Botellas Grandes Vendidas', stats.totalGrandeSold],
      ['Botellas Chicas Vendidas', stats.totalChicaSold],
      ['Ventas Particulares ($)', formatMoney(stats.particularRevenue)],
      ['Ventas Particulares (Botellas)', stats.particularBottles],
      ['Ventas en Eventos ($)', formatMoney(stats.eventsRevenue)],
      ['Ventas en Eventos (Botellas)', stats.eventsBottles],
      ['Stock Actual Total (Botellas)', stockSummary.totalBottles],
      ['Stock Actual Grandes', stockSummary.totalGrande],
      ['Stock Actual Chicas', stockSummary.totalChica],
    ];
    const wsResumen = XLSX.utils.aoa_to_sheet(resumenData);

    // 2. Hoja Por Sabor y Tamaño
    const saborData: any[][] = [
      ['Sabor', 'Grandes Vendidas', 'Chicas Vendidas', 'Total Vendidas', 'Ingresos Totales ($)'],
    ];
    for (const f of stats.byFlavor) {
      saborData.push([f.flavorName, f.grandeQty, f.chicaQty, f.totalQty, f.totalRevenue]);
    }
    const wsSabor = XLSX.utils.aoa_to_sheet(saborData);

    // 3. Hoja Detalle de Ventas
    const salesLines = db.getAllSync<{
      created_at: string;
      event_name: string | null;
      combo_name: string | null;
      flavor_name: string;
      size: string;
      quantity: number;
      unit_price: number;
      line_total: number;
      payment_method: string | null;
    }>(`
      SELECT 
        s.created_at,
        e.name as event_name,
        sl.combo_name,
        f.name as flavor_name,
        sl.size,
        sl.quantity,
        sl.unit_price,
        sl.line_total,
        s.payment_method
      FROM sale_lines sl
      INNER JOIN sales s ON sl.sale_id = s.id
      INNER JOIN flavors f ON sl.flavor_id = f.id
      LEFT JOIN events e ON s.event_id = e.id
      WHERE s.status = 'ACTIVA'
      ORDER BY s.id DESC;
    `);

    const ventasData: any[][] = [
      ['Fecha y Hora', 'Tipo/Evento', 'Combo', 'Sabor', 'Tamaño', 'Cantidad', 'Precio Unitario', 'Total Línea', 'Pago'],
    ];
    for (const l of salesLines) {
      ventasData.push([
        formatDateTime(l.created_at),
        l.event_name ? `Evento: ${l.event_name}` : 'Particular',
        l.combo_name || '-',
        l.flavor_name,
        l.size,
        l.quantity,
        l.unit_price,
        l.line_total,
        l.payment_method || 'Efectivo',
      ]);
    }
    const wsVentas = XLSX.utils.aoa_to_sheet(ventasData);

    // 4. Hoja Stock Actual
    const stockData: any[][] = [
      ['Sabor', 'Estado', 'Stock Grandes', 'Stock Chicas', 'Total Botellas'],
    ];
    for (const fs of flavorsStock) {
      stockData.push([
        fs.name,
        fs.active ? 'Activo' : 'Inactivo',
        fs.grandeQty,
        fs.chicaQty,
        fs.totalQty,
      ]);
    }
    const wsStock = XLSX.utils.aoa_to_sheet(stockData);

    // Crear libro con las 4 hojas
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen');
    XLSX.utils.book_append_sheet(wb, wsSabor, 'Por Sabor');
    XLSX.utils.book_append_sheet(wb, wsVentas, 'Detalle Ventas');
    XLSX.utils.book_append_sheet(wb, wsStock, 'Stock Actual');

    const base64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
    const fileName = `Estadisticas_Total_${new Date().toISOString().split('T')[0]}.xlsx`;
    const fileUri = `${FileSystem.documentDirectory}${fileName}`;

    await FileSystem.writeAsStringAsync(fileUri, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    return fileUri;
  },

  /**
   * Exporta estadísticas generales a CSV con BOM UTF-8
   */
  async exportGeneralCSV(): Promise<string> {
    const stats = StatsService.getStats('all');
    const db = getDB();

    const salesLines = db.getAllSync<{
      created_at: string;
      event_name: string | null;
      combo_name: string | null;
      flavor_name: string;
      size: string;
      quantity: number;
      unit_price: number;
      line_total: number;
      payment_method: string | null;
    }>(`
      SELECT 
        s.created_at,
        e.name as event_name,
        sl.combo_name,
        f.name as flavor_name,
        sl.size,
        sl.quantity,
        sl.unit_price,
        sl.line_total,
        s.payment_method
      FROM sale_lines sl
      INNER JOIN sales s ON sl.sale_id = s.id
      INNER JOIN flavors f ON sl.flavor_id = f.id
      LEFT JOIN events e ON s.event_id = e.id
      WHERE s.status = 'ACTIVA'
      ORDER BY s.id DESC;
    `);

    let csv = '\uFEFF'; // BOM UTF-8 para Excel
    csv += 'REPORTE GENERAL DE VENTAS DE LICORES\n';
    csv += `Recaudación Total;${stats.totalRevenue}\n`;
    csv += `Botellas Vendidas;${stats.totalBottlesSold}\n`;
    csv += `Grandes Vendidas;${stats.totalGrandeSold}\n`;
    csv += `Chicas Vendidas;${stats.totalChicaSold}\n\n`;

    csv += 'Fecha;Tipo;Combo;Sabor;Tamaño;Cantidad;Precio Unitario;Total;Forma de Pago\n';
    for (const l of salesLines) {
      const tipo = l.event_name ? `Evento: ${l.event_name}` : 'Particular';
      const combo = l.combo_name || '-';
      csv += `"${formatDateTime(l.created_at)}";"${tipo}";"${combo}";"${l.flavor_name}";"${l.size}";${l.quantity};${l.unit_price};${l.line_total};"${l.payment_method || 'Efectivo'}"\n`;
    }

    const fileName = `Estadisticas_Total_${new Date().toISOString().split('T')[0]}.csv`;
    const fileUri = `${FileSystem.documentDirectory}${fileName}`;

    await FileSystem.writeAsStringAsync(fileUri, csv, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    return fileUri;
  },

  /**
   * Exporta evento específico a Excel (.xlsx)
   */
  async exportEventXLSX(eventId: number): Promise<string> {
    const balance = EventService.getEventBalance(eventId);
    if (!balance) throw new Error('Evento no encontrado');

    const db = getDB();
    const eventSales = db.getAllSync<{
      created_at: string;
      combo_name: string | null;
      flavor_name: string;
      size: string;
      quantity: number;
      unit_price: number;
      line_total: number;
      payment_method: string | null;
    }>(`
      SELECT 
        s.created_at,
        sl.combo_name,
        f.name as flavor_name,
        sl.size,
        sl.quantity,
        sl.unit_price,
        sl.line_total,
        s.payment_method
      FROM sale_lines sl
      INNER JOIN sales s ON sl.sale_id = s.id
      INNER JOIN flavors f ON sl.flavor_id = f.id
      WHERE s.event_id = ? AND s.status = 'ACTIVA'
      ORDER BY s.id DESC;
    `, eventId);

    // 1. Resumen Evento
    const resumenData = [
      [`Reporte de Evento: ${balance.event.name}`],
      ['Fecha del Evento', formatDateOnly(balance.event.date)],
      ['Estado', balance.event.status],
      ['Recaudación Total', formatMoney(balance.totalRevenue)],
      ['Total Botellas Llevadas', balance.totalTaken],
      ['Total Botellas Vendidas', balance.totalSold],
      ['Total Botellas Sobrantes', balance.totalRemaining],
      [],
      ['Sabor', 'Tamaño', 'Llevado', 'Vendido', 'Sobrante'],
    ];

    for (const item of balance.items) {
      resumenData.push([
        item.flavor_name,
        item.size,
        item.quantity_taken,
        item.quantity_sold,
        item.quantity_remaining,
      ]);
    }
    const wsResumen = XLSX.utils.aoa_to_sheet(resumenData);

    // 2. Ventas del evento
    const ventasData: any[][] = [
      ['Fecha y Hora', 'Combo', 'Sabor', 'Tamaño', 'Cantidad', 'Precio Unitario', 'Total', 'Forma de Pago'],
    ];
    for (const s of eventSales) {
      ventasData.push([
        formatDateTime(s.created_at),
        s.combo_name || '-',
        s.flavor_name,
        s.size,
        s.quantity,
        s.unit_price,
        s.line_total,
        s.payment_method || 'Efectivo',
      ]);
    }
    const wsVentas = XLSX.utils.aoa_to_sheet(ventasData);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsResumen, 'Balance Evento');
    XLSX.utils.book_append_sheet(wb, wsVentas, 'Ventas');

    const cleanEventName = balance.event.name.replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `Evento_${cleanEventName}_${balance.event.date}.xlsx`;
    const fileUri = `${FileSystem.documentDirectory}${fileName}`;

    const base64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
    await FileSystem.writeAsStringAsync(fileUri, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    return fileUri;
  },

  /**
   * Exporta evento específico a CSV
   */
  async exportEventCSV(eventId: number): Promise<string> {
    const balance = EventService.getEventBalance(eventId);
    if (!balance) throw new Error('Evento no encontrado');

    const db = getDB();
    const eventSales = db.getAllSync<{
      created_at: string;
      combo_name: string | null;
      flavor_name: string;
      size: string;
      quantity: number;
      unit_price: number;
      line_total: number;
    }>(`
      SELECT 
        s.created_at,
        sl.combo_name,
        f.name as flavor_name,
        sl.size,
        sl.quantity,
        sl.unit_price,
        sl.line_total
      FROM sale_lines sl
      INNER JOIN sales s ON sl.sale_id = s.id
      INNER JOIN flavors f ON sl.flavor_id = f.id
      WHERE s.event_id = ? AND s.status = 'ACTIVA'
      ORDER BY s.id DESC;
    `, eventId);

    let csv = '\uFEFF';
    csv += `EVENTO: ${balance.event.name}\n`;
    csv += `Fecha;${formatDateOnly(balance.event.date)}\n`;
    csv += `Recaudación Total;${balance.totalRevenue}\n`;
    csv += `Total Llevado;${balance.totalTaken}\n`;
    csv += `Total Vendido;${balance.totalSold}\n`;
    csv += `Total Sobrante;${balance.totalRemaining}\n\n`;

    csv += 'BALANCE POR SABOR Y TAMAÑO\n';
    csv += 'Sabor;Tamaño;Llevado;Vendido;Sobrante\n';
    for (const item of balance.items) {
      csv += `"${item.flavor_name}";"${item.size}";${item.quantity_taken};${item.quantity_sold};${item.quantity_remaining}\n`;
    }

    csv += '\nDETALLE DE VENTAS\n';
    csv += 'Fecha;Combo;Sabor;Tamaño;Cantidad;Precio;Total\n';
    for (const s of eventSales) {
      csv += `"${formatDateTime(s.created_at)}";"${s.combo_name || '-'}";"${s.flavor_name}";"${s.size}";${s.quantity};${s.unit_price};${s.line_total}\n`;
    }

    const cleanEventName = balance.event.name.replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `Evento_${cleanEventName}_${balance.event.date}.csv`;
    const fileUri = `${FileSystem.documentDirectory}${fileName}`;

    await FileSystem.writeAsStringAsync(fileUri, csv, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    return fileUri;
  },

  /**
   * Abre el menú nativo para compartir (WhatsApp, Drive, Correo, etc.)
   */
  async shareFile(fileUri: string, dialogTitle: string = 'Compartir estadísticas por WhatsApp'): Promise<void> {
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      throw new Error('La función de compartir no está disponible en este dispositivo');
    }
    await Sharing.shareAsync(fileUri, {
      dialogTitle,
    });
  },
};
