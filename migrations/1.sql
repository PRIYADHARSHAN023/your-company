
CREATE TABLE companies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_companies_name ON companies(name);

CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_users_company_userid ON users(company_id, user_id);

CREATE TABLE products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  description TEXT,
  initial_quantity INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_products_company ON products(company_id);

CREATE TABLE distributions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  worker_name TEXT NOT NULL,
  worker_gender TEXT,
  worker_mobile TEXT,
  quantity INTEGER NOT NULL,
  distributed_by_user_id INTEGER NOT NULL,
  distributed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_distributions_company ON distributions(company_id);
CREATE INDEX idx_distributions_product ON distributions(product_id);
CREATE INDEX idx_distributions_worker ON distributions(company_id, worker_name);
CREATE INDEX idx_distributions_date ON distributions(distributed_at);
