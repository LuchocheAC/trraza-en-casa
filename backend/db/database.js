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

  // Seed only if empty
  const n = (_raw.exec('SELECT COUNT(*) as n FROM categories')[0]?.values[0]?.[0]) || 0;
  if (n === 0) {
    ['Bebidas','Alimentos','Limpieza','Aseo Personal','Miscelánea'].forEach(name =>
      _raw.run('INSERT OR IGNORE INTO categories (name) VALUES (?)', [name])
    );

    const cid = (name) =>
      _raw.exec(`SELECT id FROM categories WHERE name='${name}'`)[0]?.values[0]?.[0];

    const b = cid('Bebidas'), a = cid('Alimentos'), l = cid('Limpieza'),
          p = cid('Aseo Personal'), m = cid('Miscelánea');

    const ins = 'INSERT INTO products (name, price, cost, stock, category_id, unit) VALUES (?,?,?,?,?,?)';
    [
      ['Agua Brisa 600ml',       2000,  1400, 50, b, 'unidad'],
      ['Coca-Cola 350ml',        3000,  2200, 40, b, 'unidad'],
      ['Gatorade 500ml',         4500,  3200, 30, b, 'unidad'],
      ['Jugo Hit 200ml',         2500,  1800, 45, b, 'unidad'],
      ['Leche Alquería 1L',      4200,  3500, 25, b, 'unidad'],
      ['Arroz Diana 500g',       3500,  2800, 60, a, 'paquete'],
      ['Aceite 1L',              9500,  8000, 20, a, 'botella'],
      ['Azúcar 1kg',             5500,  4500, 35, a, 'paquete'],
      ['Sal 500g',               1500,  1000, 40, a, 'paquete'],
      ['Pasta 400g',             3200,  2500, 30, a, 'paquete'],
      ['Pan Tajado',             6500,  5000, 15, a, 'paquete'],
      ['Huevos x12',            14000, 11500,  8, a, 'cubeta'],
      ['Detergente Ariel 500g',  8500,  7000, 25, l, 'paquete'],
      ['Jabón Líquido 500ml',    6000,  4800, 20, l, 'botella'],
      ['Papel Higiénico x4',     7500,  6000,  3, p, 'paquete'],
      ['Shampoo H&S 400ml',     12000,  9500, 15, p, 'botella'],
      ['Pasta Dental Colgate',   5500,  4200,  4, p, 'unidad'],
      ['Pilas AA x2',            4000,  3000, 40, m, 'par'],
      ['Cuaderno 50 hojas',      3500,  2500, 20, m, 'unidad'],
      ['Esfero Azul',            1500,   800, 50, m, 'unidad'],
    ].forEach(row => _raw.run(ins, row));
  }

  _save();
  console.log('Base de datos lista:', DB_PATH);
}

module.exports = db;
module.exports.initDb = initDb;
