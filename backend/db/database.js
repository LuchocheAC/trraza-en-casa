const initSqlJs = require('sql.js');
const bcrypt    = require('bcryptjs');
const fs        = require('fs');
const path      = require('path');

const DB_PATH = path.join(__dirname, '..', 'pos.db');

let _raw = null;   // raw sql.js Database
let _inTx = false; // true while inside a transaction (suppress mid-tx saves)

function _save() {
  if (_inTx || !_raw) return;
  fs.writeFileSync(DB_PATH, Buffer.from(_raw.export()));
}

function _lastId() {
  const s = _raw.prepare('SELECT last_insert_rowid() as id');
  s.step();
  const { id } = s.getAsObject();
  s.free();
  return Number(id) || 0;
}

// Normalize variadic args: run(a,b,c) and run([a,b,c]) both become [a,b,c]
function _p(args) {
  return args.length === 1 && Array.isArray(args[0]) ? args[0] : Array.from(args);
}

// Thin wrapper that mimics the better-sqlite3 synchronous API
const db = {
  prepare(sql) {
    return {
      run(...args) {
        const p = _p(args);
        _raw.run(sql, p.length ? p : null);
        const lastInsertRowid = _lastId();
        _save();
        return { lastInsertRowid };
      },
      get(...args) {
        const p = _p(args);
        const s = _raw.prepare(sql);
        if (p.length) s.bind(p);
        const found = s.step();
        const row = found ? s.getAsObject() : undefined;
        s.free();
        return row;
      },
      all(...args) {
        const p = _p(args);
        const s = _raw.prepare(sql);
        if (p.length) s.bind(p);
        const rows = [];
        while (s.step()) rows.push(s.getAsObject());
        s.free();
        return rows;
      },
    };
  },
  exec(sql) {
    _raw.exec(sql);
    _save();
  },
  transaction(fn) {
    return (...args) => {
      _raw.run('BEGIN');
      _inTx = true;
      try {
        const result = fn(...args);
        _raw.run('COMMIT');
        _inTx = false;
        _save();
        return result;
      } catch (e) {
        try { _raw.run('ROLLBACK'); } catch (_) {}
        _inTx = false;
        throw e;
      }
    };
  },
};

async function initDb() {
  const SQL = await initSqlJs();
  _raw = fs.existsSync(DB_PATH)
    ? new SQL.Database(fs.readFileSync(DB_PATH))
    : new SQL.Database();

  _raw.run('PRAGMA foreign_keys = ON');

  _raw.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id   INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS products (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT    NOT NULL,
      description TEXT,
      price       REAL    NOT NULL DEFAULT 0,
      cost        REAL             DEFAULT 0,
      stock       INTEGER NOT NULL DEFAULT 0,
      category_id INTEGER REFERENCES categories(id),
      barcode     TEXT    UNIQUE,
      unit        TEXT             DEFAULT 'unidad',
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sales (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      subtotal       REAL    NOT NULL DEFAULT 0,
      discount       REAL             DEFAULT 0,
      total          REAL    NOT NULL DEFAULT 0,
      payment_method TEXT    NOT NULL DEFAULT 'efectivo',
      cash_received  REAL,
      change_amount  REAL,
      notes          TEXT,
      created_at     DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sale_items (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id      INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
      product_id   INTEGER REFERENCES products(id),
      product_name TEXT    NOT NULL,
      quantity     REAL    NOT NULL DEFAULT 1,
      price        REAL    NOT NULL DEFAULT 0,
      subtotal     REAL    NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS cash_closings (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      date              TEXT    NOT NULL UNIQUE,
      total_sales       REAL    NOT NULL DEFAULT 0,
      cash_total        REAL    NOT NULL DEFAULT 0,
      card_total        REAL    NOT NULL DEFAULT 0,
      transfer_total    REAL    NOT NULL DEFAULT 0,
      transaction_count INTEGER NOT NULL DEFAULT 0,
      notes             TEXT,
      closed_at         DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS users (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      username   TEXT    NOT NULL UNIQUE,
      password   TEXT    NOT NULL,
      role       TEXT    NOT NULL DEFAULT 'cajero',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Seed users if empty
  const userCount = (_raw.exec('SELECT COUNT(*) FROM users')[0]?.values[0]?.[0]) || 0;
  if (userCount === 0) {
    _raw.run('INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
      ['admin',  bcrypt.hashSync('admin123',  10), 'admin']);
    _raw.run('INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
      ['cajero', bcrypt.hashSync('cajero123', 10), 'cajero']);
  }

  // Seed restaurant menu – also migrates if old grocery menu is detected
  const catCount = (_raw.exec('SELECT COUNT(*) as n FROM categories')[0]?.values[0]?.[0]) || 0;
  const hasOldMenu = catCount > 0 && !!(_raw.exec("SELECT id FROM categories WHERE name='Bebidas'")?.[0]?.values?.length);
  if (catCount === 0 || hasOldMenu) {
    if (hasOldMenu) {
      _raw.run('UPDATE sale_items SET product_id = NULL');
      _raw.run('DELETE FROM products');
      _raw.run('DELETE FROM categories');
    }

    ['Patacones','Sandwich','Perros Calientes','Chuzos','Desgranados','Hamburguesas','Salchipapas','Extras'].forEach(name =>
      _raw.run('INSERT OR IGNORE INTO categories (name) VALUES (?)', [name])
    );

    const cid = (name) =>
      _raw.exec(`SELECT id FROM categories WHERE name='${name}'`)[0]?.values[0]?.[0];

    const pa = cid('Patacones'),   sw = cid('Sandwich'),        pc = cid('Perros Calientes'),
          ch = cid('Chuzos'),      dg = cid('Desgranados'),     hb = cid('Hamburguesas'),
          sp = cid('Salchipapas'), ex = cid('Extras');

    const ins = 'INSERT INTO products (name, price, cost, stock, category_id, unit) VALUES (?,?,?,?,?,?)';
    [
      ['Patacón Pollo',               16000, 0, 999, pa, 'unidad'],
      ['Patacón Carne',               18000, 0, 999, pa, 'unidad'],
      ['Patacón Mixto',               20000, 0, 999, pa, 'unidad'],
      ['Patacón Pollo Ranchero',      22000, 0, 999, pa, 'unidad'],
      ['Patacón Carne Ranchero',      24000, 0, 999, pa, 'unidad'],
      ['Patacón Super',               26000, 0, 999, pa, 'unidad'],
      ['Sandwich Club House',         24000, 0, 999, sw, 'unidad'],
      ['Perro Sencillo',              12000, 0, 999, pc, 'unidad'],
      ['Perro Ranchero',              15000, 0, 999, pc, 'unidad'],
      ['Polli Perro',                 20000, 0, 999, pc, 'unidad'],
      ['Perro Suizo',                 22000, 0, 999, pc, 'unidad'],
      ['Chuzo de Pollo',              22000, 0, 999, ch, 'unidad'],
      ['Chuzo Mixto',                 24000, 0, 999, ch, 'unidad'],
      ['Chuzo Suizo Ranchero',        26000, 0, 999, ch, 'unidad'],
      ['Desgranado de Pollo',         23000, 0, 999, dg, 'unidad'],
      ['Desgranado Mixto',            25000, 0, 999, dg, 'unidad'],
      ['Desgranado Suizo Ranchero',   27000, 0, 999, dg, 'unidad'],
      ['Hamburguesa Sencilla',        18000, 0, 999, hb, 'unidad'],
      ['Hamburguesa de Pollo',        18000, 0, 999, hb, 'unidad'],
      ['Hamburguesa Pollo Ranchera',  22000, 0, 999, hb, 'unidad'],
      ['Hamburguesa Mixta',           24000, 0, 999, hb, 'unidad'],
      ['Hamburguesa Doble Carne',     28000, 0, 999, hb, 'unidad'],
      ['Hamburguesa Gigantona',       30000, 0, 999, hb, 'unidad'],
      ['Salchipapa Sencilla',         16000, 0, 999, sp, 'unidad'],
      ['Salchipapa Ranchera',         20000, 0, 999, sp, 'unidad'],
      ['Salchipapa Suiza Ranchera',   25000, 0, 999, sp, 'unidad'],
      ['Salchipollo',                 22000, 0, 999, sp, 'unidad'],
      ['Salchipollo Ranchero',        24000, 0, 999, sp, 'unidad'],
      ['Turbulencia',                 22000, 0, 999, sp, 'unidad'],
      ['Proteinas',                   22000, 0, 999, sp, 'unidad'],
      ["Salchi T'rraza x1",           27000, 0, 999, sp, 'unidad'],
      ['Crema de Ajo',                12000, 0, 999, ex, 'unidad'],
    ].forEach(row => _raw.run(ins, row));
  }

  _save();
  console.log('Base de datos lista:', DB_PATH);
}

module.exports = db;
module.exports.initDb = initDb;
