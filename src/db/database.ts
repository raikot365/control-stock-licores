// src/db/database.ts
import * as SQLite from 'expo-sqlite';

export const DB_NAME = 'licores_stock.db';

let dbInstance: SQLite.SQLiteDatabase | null = null;

export function getDB(): SQLite.SQLiteDatabase {
  if (!dbInstance) {
    dbInstance = SQLite.openDatabaseSync(DB_NAME);
    initDatabase(dbInstance);
  }
  return dbInstance;
}

export function initDatabase(db: SQLite.SQLiteDatabase) {
  // Configuración de llaves foráneas y modo WAL para mejor rendimiento
  db.execSync('PRAGMA foreign_keys = ON;');
  db.execSync('PRAGMA journal_mode = WAL;');

  // 1. Sabores
  db.execSync(`
    CREATE TABLE IF NOT EXISTS flavors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );
  `);

  // 2. Stock actual por sabor y tamaño
  db.execSync(`
    CREATE TABLE IF NOT EXISTS stock (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      flavor_id INTEGER NOT NULL,
      size TEXT NOT NULL CHECK(size IN ('GRANDE', 'CHICA')),
      quantity INTEGER NOT NULL DEFAULT 0,
      UNIQUE(flavor_id, size),
      FOREIGN KEY(flavor_id) REFERENCES flavors(id) ON DELETE CASCADE
    );
  `);

  // 3. Precios vigentes
  db.execSync(`
    CREATE TABLE IF NOT EXISTS prices (
      size TEXT PRIMARY KEY CHECK(size IN ('GRANDE', 'CHICA')),
      price INTEGER NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // 4. Combos y sus items
  db.execSync(`
    CREATE TABLE IF NOT EXISTS combos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      price INTEGER NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );
  `);

  db.execSync(`
    CREATE TABLE IF NOT EXISTS combo_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      combo_id INTEGER NOT NULL,
      size TEXT NOT NULL CHECK(size IN ('GRANDE', 'CHICA')),
      quantity INTEGER NOT NULL,
      FOREIGN KEY(combo_id) REFERENCES combos(id) ON DELETE CASCADE
    );
  `);

  // 5. Eventos y stock llevado
  db.execSync(`
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      date TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('PREPARADO', 'EN_CURSO', 'FINALIZADO')) DEFAULT 'PREPARADO',
      created_at TEXT NOT NULL
    );
  `);

  db.execSync(`
    CREATE TABLE IF NOT EXISTS event_stock (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER NOT NULL,
      flavor_id INTEGER NOT NULL,
      size TEXT NOT NULL CHECK(size IN ('GRANDE', 'CHICA')),
      quantity_taken INTEGER NOT NULL,
      UNIQUE(event_id, flavor_id, size),
      FOREIGN KEY(event_id) REFERENCES events(id) ON DELETE CASCADE,
      FOREIGN KEY(flavor_id) REFERENCES flavors(id)
    );
  `);

  // 6. Ventas y líneas de venta
  db.execSync(`
    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER,
      total INTEGER NOT NULL,
      payment_method TEXT DEFAULT 'Efectivo',
      note TEXT,
      status TEXT NOT NULL CHECK(status IN ('ACTIVA', 'ANULADA')) DEFAULT 'ACTIVA',
      created_at TEXT NOT NULL,
      FOREIGN KEY(event_id) REFERENCES events(id) ON DELETE SET NULL
    );
  `);

  db.execSync(`
    CREATE TABLE IF NOT EXISTS sale_lines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL,
      combo_id INTEGER,
      combo_name TEXT,
      flavor_id INTEGER NOT NULL,
      size TEXT NOT NULL CHECK(size IN ('GRANDE', 'CHICA')),
      quantity INTEGER NOT NULL,
      unit_price INTEGER NOT NULL,
      line_total INTEGER NOT NULL,
      FOREIGN KEY(sale_id) REFERENCES sales(id) ON DELETE CASCADE,
      FOREIGN KEY(flavor_id) REFERENCES flavors(id)
    );
  `);

  // 7. Movimientos de stock para auditoría y trazabilidad
  db.execSync(`
    CREATE TABLE IF NOT EXISTS stock_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      flavor_id INTEGER NOT NULL,
      size TEXT NOT NULL CHECK(size IN ('GRANDE', 'CHICA')),
      quantity_delta INTEGER NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('INGRESO', 'VENTA', 'AJUSTE', 'ANULACION')),
      note TEXT,
      sale_id INTEGER,
      created_at TEXT NOT NULL,
      FOREIGN KEY(flavor_id) REFERENCES flavors(id),
      FOREIGN KEY(sale_id) REFERENCES sales(id) ON DELETE SET NULL
    );
  `);

  // Inicializar precios por defecto si no existen
  const grandePrice = db.getFirstSync<{ price: number }>('SELECT price FROM prices WHERE size = "GRANDE"');
  if (!grandePrice) {
    db.runSync(
      'INSERT INTO prices (size, price, updated_at) VALUES (?, ?, ?)',
      'GRANDE',
      8000,
      new Date().toISOString()
    );
  }

  const chicaPrice = db.getFirstSync<{ price: number }>('SELECT price FROM prices WHERE size = "CHICA"');
  if (!chicaPrice) {
    db.runSync(
      'INSERT INTO prices (size, price, updated_at) VALUES (?, ?, ?)',
      'CHICA',
      5000,
      new Date().toISOString()
    );
  }

  // Inicializar sabores de muestra si la base está totalmente vacía
  const flavorCount = db.getFirstSync<{ count: number }>('SELECT COUNT(*) as count FROM flavors');
  if (!flavorCount || flavorCount.count === 0) {
    const defaultFlavors = [
      'Frutilla',
      'Chocolate',
      'Dulce de Leche',
      'Pomelo',
      'Café',
      'Limón',
    ];
    const now = new Date().toISOString();
    for (const name of defaultFlavors) {
      const res = db.runSync(
        'INSERT INTO flavors (name, active, created_at) VALUES (?, 1, ?)',
        name,
        now
      );
      const flavorId = res.lastInsertRowId;
      // Inicializar stock en 0 para GRANDE y CHICA
      db.runSync('INSERT INTO stock (flavor_id, size, quantity) VALUES (?, "GRANDE", 0)', flavorId);
      db.runSync('INSERT INTO stock (flavor_id, size, quantity) VALUES (?, "CHICA", 0)', flavorId);
    }

    // Inicializar un combo de ejemplo común: "Dúo Chicas" (2 botellas chicas)
    const comboRes = db.runSync(
      'INSERT INTO combos (name, price, active, created_at) VALUES (?, ?, 1, ?)',
      'Dúo Chicas',
      9000,
      now
    );
    db.runSync(
      'INSERT INTO combo_items (combo_id, size, quantity) VALUES (?, "CHICA", 2)',
      comboRes.lastInsertRowId
    );
  }
}
