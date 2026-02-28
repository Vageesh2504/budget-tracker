import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import dns from "node:dns";

// Use Google public DNS to resolve MongoDB Atlas SRV records
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================
// Mongoose Schemas & Models
// ============================

// Counter schema for auto-incrementing numeric IDs
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});
const Counter = mongoose.model("Counter", counterSchema);

async function getNextId(name: string): Promise<number> {
  const counter = await Counter.findByIdAndUpdate(
    name,
    { $inc: { seq: 1 } },
    { returnDocument: "after", upsert: true }
  );
  return counter.seq;
}

const userSchema = new mongoose.Schema({
  id: { type: Number, unique: true },
  username: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  email: { type: String, default: null },
  phone: { type: String, default: null },
  created_at: { type: Date, default: Date.now },
});
const UserModel = mongoose.model("User", userSchema);

const categorySchema = new mongoose.Schema({
  id: { type: Number, unique: true },
  name: { type: String, unique: true, required: true },
  color: { type: String, required: true },
});
const CategoryModel = mongoose.model("Category", categorySchema);

const expenseSchema = new mongoose.Schema({
  id: { type: Number, unique: true },
  user_id: { type: Number, required: true },
  amount: { type: Number, required: true },
  category_id: { type: Number, required: true },
  description: { type: String },
  date: { type: String },
});
const ExpenseModel = mongoose.model("Expense", expenseSchema);

const budgetSchema = new mongoose.Schema({
  id: { type: Number, unique: true },
  user_id: { type: Number, required: true },
  category_id: { type: Number, required: true },
  amount: { type: Number, required: true },
  month: { type: String, required: true },
});
budgetSchema.index({ user_id: 1, category_id: 1, month: 1 }, { unique: true });
const BudgetModel = mongoose.model("Budget", budgetSchema);

// ============================
// Seed Default Data
// ============================
async function seedDatabase() {
  // Seed default categories
  const categoryCount = await CategoryModel.countDocuments();
  if (categoryCount === 0) {
    const defaultCategories = [
      { name: "Food", color: "#ef4444" },
      { name: "Transport", color: "#3b82f6" },
      { name: "Entertainment", color: "#a855f7" },
      { name: "Shopping", color: "#ec4899" },
      { name: "Utilities", color: "#f59e0b" },
      { name: "Health", color: "#10b981" },
      { name: "Other", color: "#6b7280" },
    ];

    for (const cat of defaultCategories) {
      const catId = await getNextId("category");
      await CategoryModel.create({ id: catId, ...cat });
    }
  }

  // Seed default demo user
  const userCount = await UserModel.countDocuments();
  if (userCount === 0) {
    const userId = await getNextId("user");
    await UserModel.create({
      id: userId,
      username: "demo",
      password: "password",
    });
  }
}

// ============================
// Start Server
// ============================
async function startServer() {
  // Connect to MongoDB (non-blocking in dev) so server can start even if Atlas is unreachable
  const mongoUri = process.env.MONGO_URI || "mongodb+srv://hlvageesh2504_db_user:vageesh123@visitorlog.cfn3jcq.mongodb.net/?appName=visitorLog";
  mongoose.connect(mongoUri)
    .then(async () => {
      console.log('MongoDB connected');
      try {
        await seedDatabase();
      } catch (err) {
        console.error('Error seeding database:', err);
      }
    })
    .catch((err) => {
      console.error('MongoDB connection failed (continuing in dev without DB):', err.message || err);
    });

  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(express.json());

  // middleware to extract current user from header
  app.use((req, res, next) => {
    const header = req.header("x-user-id");
    // default to demo user 1 if no header provided
    (req as any).currentUser = header ? parseInt(header, 10) : 1;
    next();
  });

  // ============================
  // API Routes
  // ============================

  // User signup
 app.post("/api/signup", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: "Missing username or password" });
    }

    try {
      const userId = await getNextId("user");
      await UserModel.create({ id: userId, username, password });
      return res.json({ success: true, userId });
    } catch (err: any) {
      if (err.code === 11000) {
        return res.status(409).json({ success: false, message: "Username already taken" });
      }
      return res.status(500).json({ success: false, message: "Server error" });
    }
  });

  // User login
  app.post("/api/login", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: "Missing username or password" });
    }
    const user = await UserModel.findOne({ username });
    if (!user || user.password !== password) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }
    return res.json({ success: true, userId: user.id });
  });

  // Get User Profile
  app.get("/api/user/profile", async (req, res) => {
    const currentUser = (req as any).currentUser;
    const user = await UserModel.findOne({ id: currentUser }).lean();

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const expensesCount = await ExpenseModel.countDocuments({ user_id: currentUser });

    const totalResult = await ExpenseModel.aggregate([
      { $match: { user_id: currentUser } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const totalSpent = totalResult.length > 0 ? totalResult[0].total : 0;

    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      phone: user.phone,
      created_at: user.created_at,
      expenses_count: expensesCount,
      total_spent: totalSpent,
    });
  });

  // Update User Profile
  app.put("/api/user/profile", async (req, res) => {
    const currentUser = (req as any).currentUser;
    const { username, email, phone } = req.body;

    if (!username) {
      return res.status(400).json({ success: false, message: "Username is required" });
    }

    try {
      await UserModel.updateOne(
        { id: currentUser },
        { $set: { username, email, phone } }
      );
      return res.json({ success: true, message: "Profile updated successfully" });
    } catch (err: any) {
      if (err.code === 11000) {
        return res.status(409).json({ success: false, message: "Username already taken" });
      }
      return res.status(500).json({ success: false, message: "Server error" });
    }
  });

  // Delete User Account
  app.delete("/api/user/profile", async (req, res) => {
    const currentUser = (req as any).currentUser;
    try {
      await ExpenseModel.deleteMany({ user_id: currentUser });
      await BudgetModel.deleteMany({ user_id: currentUser });
      await UserModel.deleteOne({ id: currentUser });
      return res.json({ success: true, message: "Account deleted successfully" });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: "Server error" });
    }
  });

  // Get Categories
  app.get("/api/categories", async (req, res) => {
    const categories = await CategoryModel.find().lean();
    res.json(categories.map((c) => ({ id: c.id, name: c.name, color: c.color })));
  });

  // Get Expenses
  app.get("/api/expenses", async (req, res) => {
    const currentUser = (req as any).currentUser;

    const expenses = await ExpenseModel.find({ user_id: currentUser })
      .sort({ date: -1 })
      .lean();

    // Join category info
    const categoryIds = [...new Set(expenses.map((e) => e.category_id))];
    const categories = await CategoryModel.find({ id: { $in: categoryIds } }).lean();
    const catMap = new Map(categories.map((c) => [c.id, c]));

    const result = expenses.map((e) => {
      const cat = catMap.get(e.category_id);
      return {
        id: e.id,
        amount: e.amount,
        category_id: e.category_id,
        category_name: cat?.name || "Unknown",
        category_color: cat?.color || "#6b7280",
        description: e.description,
        date: e.date,
      };
    });

    res.json(result);
  });

  // Add Expense
  app.post("/api/expenses", async (req, res) => {
    const currentUser = (req as any).currentUser;
    const { amount, category_id, description, date } = req.body;

    const expenseId = await getNextId("expense");
    await ExpenseModel.create({
      id: expenseId,
      user_id: currentUser,
      amount,
      category_id,
      description,
      date,
    });

    res.json({ id: expenseId });
  });
  // Change Password
app.post("/api/user/change-password", async (req, res) => {
  const currentUser = (req as any).currentUser;
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    return res.status(400).json({
      success: false,
      message: "Old password and new password are required",
    });
  }

  try {
    const user = await UserModel.findOne({ id: currentUser });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.password !== oldPassword) {
      return res.status(401).json({
        success: false,
        message: "Old password is incorrect",
      });
    }

    user.password = newPassword;
    await user.save();

    return res.json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

  

  // Delete Expense
  app.delete("/api/expenses/:id", async (req, res) => {
    const currentUser = (req as any).currentUser;
    await ExpenseModel.deleteOne({
      id: parseInt(req.params.id, 10),
      user_id: currentUser,
    });

    res.json({ success: true });
  });

  // Get Budgets
  app.get("/api/budgets", async (req, res) => {
    const currentUser = (req as any).currentUser;
    const month =
      (req.query.month as string) ||
      new Date().toISOString().slice(0, 7);

    const budgets = await BudgetModel.find({
      user_id: currentUser,
      month,
    }).lean();

    // Join category names
    const categoryIds = budgets.map((b) => b.category_id);
    const categories = await CategoryModel.find({ id: { $in: categoryIds } }).lean();
    const catMap = new Map(categories.map((c) => [c.id, c]));

    const result = budgets.map((b) => ({
      id: b.id,
      category_id: b.category_id,
      category_name: catMap.get(b.category_id)?.name || "Unknown",
      amount: b.amount,
      month: b.month,
    }));

    res.json(result);
  });

  // Add / Update Budget
  app.post("/api/budgets", async (req, res) => {
    const currentUser = (req as any).currentUser;
    const { category_id, amount, month } = req.body;

    const existing = await BudgetModel.findOne({
      user_id: currentUser,
      category_id,
      month,
    });

    if (existing) {
      existing.amount = amount;
      await existing.save();
      res.json({ id: existing.id });
    } else {
      const budgetId = await getNextId("budget");
      await BudgetModel.create({
        id: budgetId,
        user_id: currentUser,
        category_id,
        amount,
        month,
      });
      res.json({ id: budgetId });
    }
  });

  // Monthly Summary Stats
  app.get("/api/stats/summary", async (req, res) => {
    const currentUser = (req as any).currentUser;
    const month =
      (req.query.month as string) ||
      new Date().toISOString().slice(0, 7);

    // Match expenses for this user whose date starts with the month string (YYYY-MM)
    const monthRegex = new RegExp(`^${month}`);

    // Total spent
    const totalResult = await ExpenseModel.aggregate([
      { $match: { user_id: currentUser, date: { $regex: monthRegex } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const totalSpent = totalResult.length > 0 ? totalResult[0].total : 0;

    // Category breakdown
    const categoryBreakdownRaw = await ExpenseModel.aggregate([
      { $match: { user_id: currentUser, date: { $regex: monthRegex } } },
      { $group: { _id: "$category_id", value: { $sum: "$amount" } } },
    ]);

    const catIds = categoryBreakdownRaw.map((c) => c._id);
    const categories = await CategoryModel.find({ id: { $in: catIds } }).lean();
    const catMap = new Map(categories.map((c) => [c.id, c]));

    const categoryBreakdown = categoryBreakdownRaw.map((c) => ({
      name: catMap.get(c._id)?.name || "Unknown",
      value: c.value,
      color: catMap.get(c._id)?.color || "#6b7280",
    }));

    // Daily spending
    const dailySpending = await ExpenseModel.aggregate([
      { $match: { user_id: currentUser, date: { $regex: monthRegex } } },
      { $group: { _id: "$date", amount: { $sum: "$amount" } } },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, date: "$_id", amount: 1 } },
    ]);

    res.json({
      totalSpent,
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
 
const port = process.env.PORT || 4000

app.get('/', (req, res) => {
  res.send('https://budget-tracker-l4s7.onrender.com')
})

 app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
}

startServer();
