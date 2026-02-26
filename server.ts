import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("expenses.db");

// ============================
// Initialize Database
// ============================
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT
  );

  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE,
    color TEXT
  );

  CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    amount REAL,
    category_id INTEGER,
    description TEXT,
    date TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(category_id) REFERENCES categories(id)
  );

  CREATE TABLE IF NOT EXISTS budgets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    category_id INTEGER,
    amount REAL,
    month TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(category_id) REFERENCES categories(id),
    UNIQUE(user_id, category_id, month)
  );
`);

// ============================
// Seed Default Categories
// ============================
const categoryCount = db
  .prepare("SELECT COUNT(*) as count FROM categories")
  .get() as { count: number };

if (categoryCount.count === 0) {
  const insertCategory = db.prepare(
    "INSERT INTO categories (name, color) VALUES (?, ?)"
  );

  const defaultCategories = [
    ["Food", "#ef4444"],
    ["Transport", "#3b82f6"],
    ["Entertainment", "#a855f7"],
    ["Shopping", "#ec4899"],
    ["Utilities", "#f59e0b"],
    ["Health", "#10b981"],
    ["Other", "#6b7280"],
  ];

  defaultCategories.forEach(([name, color]) =>
    insertCategory.run(name, color)
  );
}

// ============================
// Create Default Demo User
// ============================
const userCount = db
  .prepare("SELECT COUNT(*) as count FROM users")
  .get() as { count: number };

if (userCount.count === 0) {
  db.prepare("INSERT INTO users (username, password) VALUES (?, ?)")
    .run("demo", "password");
}

// ============================
// Start Server
// ============================
async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  const currentUser = 1; // Hardcoded demo user

  // ============================
  // API Routes
  // ============================

  // Get Categories
  app.get("/api/categories", (req, res) => {
    const categories = db.prepare("SELECT * FROM categories").all();
    res.json(categories);
  });

  // Get Expenses
  app.get("/api/expenses", (req, res) => {
    const expenses = db
      .prepare(`
        SELECT e.*, c.name as category_name, c.color as category_color
        FROM expenses e
        JOIN categories c ON e.category_id = c.id
        WHERE e.user_id = ?
        ORDER BY e.date DESC
      `)
      .all(currentUser);

    res.json(expenses);
  });

  // Add Expense
  app.post("/api/expenses", (req, res) => {
    const { amount, category_id, description, date } = req.body;

    const result = db
      .prepare(`
        INSERT INTO expenses (user_id, amount, category_id, description, date)
        VALUES (?, ?, ?, ?, ?)
      `)
      .run(currentUser, amount, category_id, description, date);

    res.json({ id: result.lastInsertRowid });
  });

  // Delete Expense
  app.delete("/api/expenses/:id", (req, res) => {
    db.prepare("DELETE FROM expenses WHERE id = ? AND user_id = ?")
      .run(req.params.id, currentUser);

    res.json({ success: true });
  });

  // Get Budgets
  app.get("/api/budgets", (req, res) => {
    const month =
      (req.query.month as string) ||
      new Date().toISOString().slice(0, 7);

    const budgets = db
      .prepare(`
        SELECT b.*, c.name as category_name
        FROM budgets b
        JOIN categories c ON b.category_id = c.id
        WHERE b.user_id = ? AND b.month = ?
      `)
      .all(currentUser, month);

    res.json(budgets);
  });

  // Add / Update Budget
  app.post("/api/budgets", (req, res) => {
    const { category_id, amount, month } = req.body;

    const result = db
      .prepare(`
        INSERT INTO budgets (user_id, category_id, amount, month)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(user_id, category_id, month)
        DO UPDATE SET amount = excluded.amount
      `)
      .run(currentUser, category_id, amount, month);

    res.json({ id: result.lastInsertRowid });
  });

  // Monthly Summary Stats
  app.get("/api/stats/summary", (req, res) => {
    const month =
      (req.query.month as string) ||
      new Date().toISOString().slice(0, 7);

    const totalSpent = db
      .prepare(`
        SELECT SUM(amount) as total
        FROM expenses
        WHERE user_id = ?
        AND strftime('%Y-%m', date) = ?
      `)
      .get(currentUser, month) as { total: number };

    const categoryBreakdown = db
      .prepare(`
        SELECT c.name, SUM(e.amount) as value, c.color
        FROM expenses e
        JOIN categories c ON e.category_id = c.id
        WHERE e.user_id = ?
        AND strftime('%Y-%m', date) = ?
        GROUP BY c.id
      `)
      .all(currentUser, month);

    const dailySpending = db
      .prepare(`
        SELECT date, SUM(amount) as amount
        FROM expenses
        WHERE user_id = ?
        AND strftime('%Y-%m', date) = ?
        GROUP BY date
        ORDER BY date ASC
      `)
      .all(currentUser, month);

    res.json({
      totalSpent: totalSpent.total || 0,
      categoryBreakdown,
      dailySpending,
    });
  });

  // ============================
  // Vite (Development) or Static (Production)
  // ============================

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });

    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));

    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  // ============================
  // Start Listening
  // ============================
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
