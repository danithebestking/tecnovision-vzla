-- Admin único (tecnovision / 29671203k)
-- Ejecutar en D1 remoto:
-- wrangler d1 execute tecnovision-db --remote --file=./seed-admin.sql
DELETE FROM admin_users WHERE lower(username) != 'tecnovision';
INSERT OR REPLACE INTO admin_users (id, username, password_hash, hint, updated_at)
VALUES (1, 'tecnovision', 'e3980992fded029e59b567ac43d0e4eb5e2791269ab29f2550bfbfdf5a226da1', '', datetime('now'));
