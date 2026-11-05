import { fileURLToPath } from 'node:url';
import { pool } from './index.ts';

const CREATE_GAMES_TABLE = `
CREATE TABLE IF NOT EXISTS \`games\` (
  \`id\` char(32) NOT NULL,
  \`name\` varchar(100) NOT NULL,
  \`description\` text,
  \`status\` enum('available','unavailable') DEFAULT NULL,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;

const CREATE_USERS_TABLE = `
CREATE TABLE IF NOT EXISTS \`users\` (
  \`id\` char(32) NOT NULL,
  \`username\` varchar(50) DEFAULT NULL,
  \`hashed_password\` varchar(200) DEFAULT NULL,
  \`role\` enum('staff','admin') DEFAULT NULL,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`ix_users_username\` (\`username\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;

const CREATE_TRANSACTIONS_TABLE = `
CREATE TABLE IF NOT EXISTS \`transactions\` (
  \`id\` char(32) NOT NULL,
  \`amount\` decimal(12,2) NOT NULL,
  \`payment_mode\` enum('bank_transfer','landmark_app','upside_down_house') NOT NULL,
  \`game_id\` char(32) NOT NULL,
  \`created_at\` datetime DEFAULT NULL,
  PRIMARY KEY (\`id\`),
  KEY \`ix_transactions_game_id\` (\`game_id\`),
  CONSTRAINT \`transactions_ibfk_1\` FOREIGN KEY (\`game_id\`) REFERENCES \`games\` (\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;

const SEED_GAMES_SQL = `
INSERT IGNORE INTO \`games\` (\`id\`, \`name\`, \`description\`, \`status\`) VALUES
  ('286de56fccc849eda17f0586367e5eb9','Archery','An ecstatic experience of shooting arrows','available'),
  ('8a553e5492e5444c94d294ee667bd1aa','Virtual Reality','This is a virtual intimate experience ','available'),
  ('91078d98e86841b6ae22844bad7b80ba','PES Football ','This a video game experience of football','available'),
  ('b12d5dd5648247cda959fb47c0688ea8','Horse Riding','This is an unreal experience of riding a horse within and outside the facility','available'),
  ('c1823405c38d41f8b716b07b5ad6dfe7','Mortal Combat','Virtual experience of mortal combat ','available');
`;

const SEED_USERS_SQL = `
INSERT IGNORE INTO \`users\` (\`id\`, \`username\`, \`hashed_password\`, \`role\`) VALUES
  ('08cac1fb827a49659971da9a6ce0fddd','omejestellao@gmail.com','$argon2id$v=19$m=65536,t=3,p=4$bQ0hJKSU0rrXmvM+Z0wJQQ$AbjHXJWlcupIfDDLw3UOWhEJKB/fvz3h+B2ZPVuECcI','staff'),
  ('235f256e1f784cefb2d49cdff9a783de','omejesixtusnnanna@yahoo.com','$argon2id$v=19$m=65536,t=3,p=4$n7O29t47Z6y1Vipl7B0jBA$jP+oZjBfydaH/rMZnal1JxSpF4JmzZ2N90vWr9UaBK4','admin'),
  ('4bfb87f503d44bd3810d154458580432','nancynas63@gmail.com','$argon2id$v=19$m=65536,t=3,p=4$/d/bG0OIkVIqZYyx1prT2g$W5ymy7cXslb3BqYwjnvJQUMT/u7VQPD5IzwPNusitX8','admin'),
  ('51e9514a40b4465eacd3e753e57a10c6','matins','$argon2id$v=19$m=65536,t=3,p=4$f++9l5JSCqFUyrlXSgnhnA$lKG2xUSryGTLJwfuddroRPqXqnWH5pSv7ISxGSpYFq4','staff'),
  ('754c3d5276504e2e9627cd40a7a28a76','omejesixtusnnannamakuo@gmail.com','$argon2id$v=19$m=65536,t=3,p=4$h5ByrtVayxkDYGyt1RoDoA$Rz+izlh5Pww+slUqvZQKx3UK0VcMqDmtmSTKVwuh5fA','staff'),
  ('88ede0ac383c4f269675e14816f44230','Staff2026','$argon2id$v=19$m=65536,t=3,p=4$/n8PYWyNcW6NkfK+1/ofow$JYeeB7wWDvkU1HgmAFPJEQRLsmtH1PnJMUFF29zEwFk','staff'),
  ('cbe132aa821d459a8a143d49197bbe97','Valentina ','$argon2id$v=19$m=65536,t=3,p=4$wPgfwzhHiNEa4zznXOsdYw$u78ozGIQb7wkAe+hxyUBd5RvttKLxM0VJFWhClkUUBc','staff');
`;

const SEED_TRANSACTIONS_SQL = `
INSERT IGNORE INTO \`transactions\` (\`id\`, \`amount\`, \`payment_mode\`, \`game_id\`, \`created_at\`) VALUES
  ('030bcf14a46d428caa843a042e0c0316',19800.00,'bank_transfer','b12d5dd5648247cda959fb47c0688ea8','2026-10-30 14:09:46'),
  ('0b98273268ae45e69e405470ab636550',7200.00,'bank_transfer','b12d5dd5648247cda959fb47c0688ea8','2026-11-03 11:28:09'),
  ('1806efaff1e04b358e52ed3ccb17be3a',14400.00,'bank_transfer','b12d5dd5648247cda959fb47c0688ea8','2026-10-31 18:25:13'),
  ('1b7ad0924a7c4e53a8d8ac5bf6d7e641',13200.00,'bank_transfer','b12d5dd5648247cda959fb47c0688ea8','2026-10-29 15:41:37'),
  ('1bbe484946814c368e8e6f5b82ee3050',13200.00,'bank_transfer','b12d5dd5648247cda959fb47c0688ea8','2026-10-30 14:09:46'),
  ('1c5ee34b7f374506a142a5d512d054c3',24000.00,'bank_transfer','b12d5dd5648247cda959fb47c0688ea8','2026-10-30 13:43:01'),
  ('248e51f8c1864956b42399187f35f242',7200.00,'bank_transfer','b12d5dd5648247cda959fb47c0688ea8','2026-11-03 14:17:13'),
  ('3d89d521f57a4e0d8de6372b353c665f',1.00,'bank_transfer','91078d98e86841b6ae22844bad7b80ba','2026-11-03 11:28:09'),
  ('40f949e74b624cbe805874520acf3dd4',24000.00,'bank_transfer','b12d5dd5648247cda959fb47c0688ea8','2026-10-30 13:43:01'),
  ('55e4d7d99aa543b68b20661f20412946',24000.00,'bank_transfer','b12d5dd5648247cda959fb47c0688ea8','2026-10-30 13:43:01'),
  ('67ab62034fa045248d7fdda9e8cc5d38',13200.00,'bank_transfer','b12d5dd5648247cda959fb47c0688ea8','2026-10-31 11:02:38'),
  ('6caa751e14ed40fa9a3fde95317fea7d',24000.00,'bank_transfer','b12d5dd5648247cda959fb47c0688ea8','2026-10-30 13:43:01'),
  ('79f817f734b847d0af47674e1b56e4de',6600.00,'bank_transfer','b12d5dd5648247cda959fb47c0688ea8','2026-10-29 11:11:28'),
  ('8b7ceb87788449ef82e4479ed300cee1',8800.00,'bank_transfer','8a553e5492e5444c94d294ee667bd1aa','2026-10-27 16:34:24'),
  ('9a959e94ca6441029e6964d2827e19a6',6600.00,'bank_transfer','b12d5dd5648247cda959fb47c0688ea8','2026-10-27 17:04:24'),
  ('a715c88ca83048c7becbdcbdb534a46b',10000.00,'bank_transfer','b12d5dd5648247cda959fb47c0688ea8','2026-10-29 14:23:36'),
  ('ba14ab932201464185b4ecff2ce21d17',1.00,'bank_transfer','8a553e5492e5444c94d294ee667bd1aa','2026-11-02 17:56:38'),
  ('c38f80ba76ab481d9280bbc1ba45f7ce',6600.00,'bank_transfer','b12d5dd5648247cda959fb47c0688ea8','2026-10-30 14:09:46'),
  ('c3e93a3c9db74a0791470dce5576b601',13200.00,'bank_transfer','b12d5dd5648247cda959fb47c0688ea8','2026-10-28 16:15:40'),
  ('caf67a60a3034b3e9727174c19de4456',6600.00,'bank_transfer','b12d5dd5648247cda959fb47c0688ea8','2026-10-27 15:30:29'),
  ('ceb1ce4fa87a4f078d45f5067047a44e',7200.00,'bank_transfer','b12d5dd5648247cda959fb47c0688ea8','2026-11-03 14:17:13'),
  ('cf05d0bf8c734c6ab85b3596cf7de0a0',5000.00,'bank_transfer','b12d5dd5648247cda959fb47c0688ea8','2026-10-27 11:58:30'),
  ('d14f9f0b85b74f818715045e46167d25',7200.00,'bank_transfer','b12d5dd5648247cda959fb47c0688ea8','2026-11-03 11:28:09'),
  ('e74922663a3b4e2b89ce654f8238164f',5500.00,'upside_down_house','b12d5dd5648247cda959fb47c0688ea8','2026-11-02 17:56:38'),
  ('f4ae195d0c294e6e903bc705e4d71221',6000.00,'landmark_app','b12d5dd5648247cda959fb47c0688ea8','2026-11-03 11:28:09');
`;

export async function initDatabase(): Promise<void> {
  const connection = await pool.getConnection();
  try {
    await connection.query(CREATE_GAMES_TABLE);
    await connection.query(CREATE_USERS_TABLE);
    await connection.query(CREATE_TRANSACTIONS_TABLE);

    await connection.query(SEED_GAMES_SQL);
    await connection.query(SEED_USERS_SQL);
    await connection.query(SEED_TRANSACTIONS_SQL);

    console.log('MySQL schema verified and vahala_backup.sql records persisted (idempotent).');
  } finally {
    connection.release();
  }
}

// Allow running directly via `npm run db:import`
const isDirectExecution =
  process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

if (isDirectExecution) {
  initDatabase()
    .then(async () => {
      console.log('Database import completed successfully.');
      await pool.end();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('Database import failed:', err);
      await pool.end();
      process.exit(1);
    });
}
