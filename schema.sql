-- schema.sql
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS admin_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  hint TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  icon TEXT DEFAULT '🏷️',
  is_custom INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price REAL NOT NULL,
  old_price REAL,
  rating REAL DEFAULT 4.5,
  reviews INTEGER DEFAULT 0,
  icon TEXT DEFAULT '📦',
  badge TEXT,
  stock INTEGER DEFAULT 0,
  image TEXT,
  description TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (category) REFERENCES categories(id)
);

-- Categorías base
INSERT OR IGNORE INTO categories (id, label, icon, is_custom) VALUES
('tecnologia',   'Tecnología',   '💻', 0),
('hogar',        'Hogar',        '🏠', 0),
('herramientas', 'Herramientas', '🔧', 0),
('audifonos',    'Audífonos',    '🎧', 0),
('camaras',      'Cámaras',      '📷', 0);

-- Admin único (tecnovision / 29671203k)
INSERT OR IGNORE INTO admin_users (id, username, password_hash, hint)
VALUES (1, 'tecnovision', 'e3980992fded029e59b567ac43d0e4eb5e2791269ab29f2550bfbfdf5a226da1', '');
