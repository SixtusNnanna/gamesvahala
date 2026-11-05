# Valhala Games - Financial Register (MySQL Edition)

A full-stack React + TypeScript + Express application powered by **MySQL**, designed as a drop-in replacement for the original FastAPI/SQLAlchemy `SixtusNnanna/financialregister` application. It connects directly to your existing MySQL database and tables (`users`, `games`, `transactions`) without altering or losing existing data.

## Key Features & Compatibility

- **100% FastAPI Database Schema Compatibility**:
  - `users`: `(id CHAR(32)/VARCHAR(36), username VARCHAR(50), hashed_password VARCHAR(200), role ENUM('staff', 'admin'))`
  - `games`: `(id CHAR(32)/VARCHAR(36), name VARCHAR(100), description TEXT, status ENUM('available', 'unavailable'))`
  - `transactions`: `(id CHAR(32)/VARCHAR(36), amount NUMERIC(12, 2), payment_mode ENUM('bank_transfer', 'landmark_app', 'upside_down_house'), game_id CHAR(32)/VARCHAR(36), created_at DATETIME)`
- **Argon2 & Bcrypt Password Support**:
  - Verifies existing Passlib `$argon2id$` password hashes from the Python FastAPI app natively via Node.js `crypto.argon2Sync`, so existing admin and staff accounts can log in immediately without resetting passwords.
- **Automated Financial Fee Deductions**:
  - **Bank Transfer**: 23.23% fee deduction (`net = amount - 0.2323 * amount`).
  - **Landmark App**: 15.00% fee deduction (`net = amount - 0.15 * amount`).
  - **Up Side Down House**: Gross total preserved.

---

## Deploying with Your Existing MySQL Database

### 1. Free & Low-Cost Hosting Options

- **Render (Free Web Service)**: \$0/month for Node.js or Docker web services (spins down after 15 mins of inactivity, or \$7/mo always-on).
- **Koyeb (Free Tier)**: \$0/month for 1 nano web service deployed directly from GitHub.
- **Railway (Hobby Plan)**: ~\$5/month (includes \$5 usage credit) — supports hosting both the Node app and MySQL in the same project.
- **TiDB Cloud Serverless / Aiven for MySQL (Free Database Tier)**: \$0/month if you also want to migrate your local MySQL database to a free cloud MySQL cluster.

### 2. Environment Variables

Configure the following environment variables on your hosting provider (see `.env.example`):

```env
NODE_ENV=production
PORT=3000
JWT_SECRET=your-secret-key

# Option A: Connection URI
DATABASE_URL=mysql://user:password@your-mysql-host:3306/your_db_name

# Option B: Discrete MySQL Parameters
MYSQL_HOST=your-mysql-host
MYSQL_PORT=3306
MYSQL_USER=your_db_user
MYSQL_PASSWORD=your_db_password
MYSQL_DATABASE=your_db_name
MYSQL_SSL=false
```

### 3. Build & Start Commands

- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm run start`
