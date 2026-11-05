import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import * as dotenv from 'dotenv';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import jwt from 'jsonwebtoken';
import { getGames, createGame, updateGameStatus } from './src/db/games.ts';
import { getTransactionsWithTotal, getRecentTransactions, createTransaction } from './src/db/transactions.ts';
import { authenticateUser, createUser, getStaffUsers, getUserByUsername } from './src/db/users.ts';
import { initDatabase } from './src/db/initDb.ts';

dotenv.config();

// Only auto-start local MariaDB if no remote host/URI is configured and the local init script exists
const isLocalDb =
  !process.env.DATABASE_URL &&
  !process.env.MYSQL_URL &&
  !process.env.MYSQL_PUBLIC_URL &&
  !process.env.MYSQLHOST &&
  (!process.env.MYSQL_HOST || process.env.MYSQL_HOST === '127.0.0.1' || process.env.MYSQL_HOST === 'localhost');

if (isLocalDb && fs.existsSync('/etc/init.d/mariadb')) {
  try {
    execSync('/etc/init.d/mariadb status || /etc/init.d/mariadb start', { stdio: 'ignore' });
  } catch {
    try {
      execSync('/etc/init.d/mariadb start', { stdio: 'ignore' });
    } catch (err) {
      console.warn('Could not auto-start local MariaDB service:', err);
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || process.env.SECRETS || 'valhala-secret-key-arcade-2026';

interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
    role: 'admin' | 'staff';
  };
}

// Middleware to authenticate JWT
const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; username: string; role: 'admin' | 'staff' };
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
  }
};

// Middleware to require admin role
const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Admin access required' });
  }
  next();
};

async function startServer() {
  try {
    await initDatabase();
  } catch (err) {
    console.error('Warning: Database initialization failed on startup:', err);
  }

  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  const isProd = process.env.NODE_ENV === 'production';

  app.use(express.json());

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', database: 'MySQL', time: new Date().toISOString() });
  });

  // Auth: User Login (verifies Argon2 or bcrypt credentials against MySQL)
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required.' });
      }

      const user = await authenticateUser(username, password);
      if (!user) {
        return res.status(401).json({ error: 'Invalid username or password.' });
      }

      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({
        user,
        token,
      });
    } catch (error: any) {
      console.error('Login error:', error);
      res.status(500).json({ error: error.message || 'Login failed' });
    }
  });

  // Auth: Verify current session
  app.get('/api/auth/me', authenticateToken, (req: AuthRequest, res) => {
    res.json({ user: req.user });
  });

  // Auth: Create Staff Access (Admin only)
  app.post('/api/auth/signup-staff', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password || password.length < 3) {
        return res.status(400).json({ error: 'Username and password (min 3 chars) are required.' });
      }

      const existing = await getUserByUsername(username);
      if (existing) {
        return res.status(400).json({ error: 'User already Exist' });
      }

      const newUser = await createUser(username, password, 'staff');
      res.status(201).json({
        user: { id: String(newUser.id), username: newUser.username, role: 'staff' },
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to create staff account' });
    }
  });

  // Staff: List all staff members
  app.get('/api/staff', authenticateToken, requireAdmin, async (_req, res) => {
    try {
      const staffList = await getStaffUsers();
      res.json(staffList);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to fetch staff members' });
    }
  });

  // Games: List all games from MySQL
  app.get('/api/games', async (_req, res) => {
    try {
      const gamesList = await getGames();
      res.json(gamesList);
    } catch (error: any) {
      console.error('API Error fetching games:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch games' });
    }
  });

  // Games: Create new game in MySQL
  app.post('/api/games', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const { name, description, status } = req.body;
      if (!name || !description) {
        return res.status(400).json({ error: 'Name and description are required' });
      }
      const validStatus = status === 'unavailable' ? 'unavailable' : 'available';
      const newGame = await createGame(name, description, validStatus);
      res.status(201).json(newGame);
    } catch (error: any) {
      console.error('API Error creating game:', error);
      res.status(500).json({ error: error.message || 'Failed to create game' });
    }
  });

  // Games: Update game status in MySQL (supports UUID primary keys)
  app.patch('/api/games/:id/status', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const { status } = req.body;
      if (!idParam || (status !== 'available' && status !== 'unavailable')) {
        return res.status(400).json({ error: 'Valid game ID and status are required' });
      }
      const updated = await updateGameStatus(idParam, status);
      if (!updated) {
        return res.status(404).json({ error: 'Game not found' });
      }
      res.json(updated);
    } catch (error: any) {
      console.error('API Error updating game status:', error);
      res.status(500).json({ error: error.message || 'Failed to update game status' });
    }
  });

  // Transactions: Get latest 5 transactions for both staff and admin register terminals
  app.get('/api/transactions/recent', authenticateToken, async (_req: AuthRequest, res) => {
    try {
      const recent = await getRecentTransactions(5);
      res.json({ transactions: recent });
    } catch (error: any) {
      console.error('API Error fetching recent transactions:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch recent transactions' });
    }
  });

  // Transactions: Get matching transactions with revenue summary and fee deduction
  app.get('/api/transactions', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const gameIdQuery = req.query.gameId;
      const dateQuery = req.query.date;
      const paymentModeQuery = req.query.paymentMode;

      const gameIdParam = typeof gameIdQuery === 'string' && gameIdQuery.trim() ? gameIdQuery.trim() : undefined;
      const dateParam = typeof dateQuery === 'string' && dateQuery.trim() ? dateQuery.trim() : undefined;
      const paymentModeParam =
        typeof paymentModeQuery === 'string' &&
        (paymentModeQuery === 'bank_transfer' ||
          paymentModeQuery === 'landmark_app' ||
          paymentModeQuery === 'upside_down_house')
          ? paymentModeQuery
          : undefined;

      const result = await getTransactionsWithTotal({
        gameId: gameIdParam,
        date: dateParam,
        paymentMode: paymentModeParam,
      });

      res.json(result);
    } catch (error: any) {
      console.error('API Error fetching transactions:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch transactions' });
    }
  });

  // Transactions: Create new transaction in MySQL (supports UUID game_id)
  app.post('/api/transactions', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { gameId, amount, paymentMode } = req.body;
      const trimmedGameId = gameId ? String(gameId).trim() : '';
      const parsedAmount = parseFloat(String(amount));
      const validMode =
        paymentMode === 'bank_transfer' ||
        paymentMode === 'landmark_app' ||
        paymentMode === 'upside_down_house'
          ? paymentMode
          : null;

      if (!trimmedGameId || isNaN(parsedAmount) || parsedAmount <= 0 || !validMode) {
        return res.status(400).json({ error: 'Invalid transaction payload' });
      }

      const tx = await createTransaction(trimmedGameId, parsedAmount, validMode);
      res.status(201).json(tx);
    } catch (error: any) {
      console.error('API Error creating transaction:', error);
      res.status(500).json({ error: error.message || 'Failed to create transaction' });
    }
  });

  // Mount Vite middleware in dev or static files in production
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
    app.get('/{*splat}', (_req, res) => {
      res.sendFile('dist/index.html', { root: '.' });
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Valhala Games MySQL server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
