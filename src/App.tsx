import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Receipt, 
  Wallet, 
  Plus, 
  TrendingUp, 
  Calendar,
  ChevronLeft,
  ChevronRight,
  Trash2,
  PieChart as PieChartIcon
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend,
  LineChart,
  Line
} from 'recharts';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Types
interface Category {
  id: number;
  name: string;
  color: string;
}

interface Expense {
  id: number;
  amount: number;
  category_id: number;
  category_name: string;
  category_color: string;
  description: string;
  date: string;
}

interface Budget {
  id: number;
  category_id: number;
  category_name: string;
  amount: number;
  month: string;
}

interface Stats {
  totalSpent: number;
  categoryBreakdown: { name: string; value: number; color: string }[];
  dailySpending: { date: string; amount: number }[];
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'expenses' | 'budgets'>('dashboard');
  const [categories, setCategories] = useState<Category[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStr = format(currentMonth, 'yyyy-MM');

  useEffect(() => {
    fetchData();
  }, [currentMonth]);

  const fetchData = async () => {
    try {
      const [catsRes, expRes, budRes, statsRes] = await Promise.all([
        fetch('/api/categories'),
        fetch('/api/expenses'),
        fetch(`/api/budgets?month=${monthStr}`),
        fetch(`/api/stats/summary?month=${monthStr}`)
      ]);

      setCategories(await catsRes.json());
      setExpenses(await expRes.json());
      setBudgets(await budRes.json());
      setStats(await statsRes.json());
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const addExpense = async (data: any) => {
    await fetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    fetchData();
    setIsAddModalOpen(false);
  };

  const deleteExpense = async (id: number) => {
    await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
    fetchData();
  };

  const updateBudget = async (categoryId: number, amount: number) => {
    await fetch('/api/budgets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category_id: categoryId, amount, month: monthStr })
    });
    fetchData();
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5] text-slate-900 font-sans">
      {/* Sidebar / Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-6 py-3 flex justify-around items-center md:top-0 md:bottom-auto md:flex-col md:w-20 md:h-full md:border-t-0 md:border-r md:py-8 z-50">
        <div className="hidden md:block mb-12">
          <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-200">
            <TrendingUp size={24} />
          </div>
        </div>
        
        <NavButton 
          active={activeTab === 'dashboard'} 
          onClick={() => setActiveTab('dashboard')} 
          icon={<LayoutDashboard size={24} />} 
          label="Dashboard" 
        />
        <NavButton 
          active={activeTab === 'expenses'} 
          onClick={() => setActiveTab('expenses')} 
          icon={<Receipt size={24} />} 
          label="Expenses" 
        />
        <NavButton 
          active={activeTab === 'budgets'} 
          onClick={() => setActiveTab('budgets')} 
          icon={<Wallet size={24} />} 
          label="Budgets" 
        />
        
        <div className="md:mt-auto">
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="w-12 h-12 bg-emerald-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-colors"
          >
            <Plus size={28} />
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pb-24 pt-6 px-4 md:pl-28 md:pt-12 md:pr-12 max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              {activeTab === 'dashboard' && 'Financial Overview'}
              {activeTab === 'expenses' && 'Expense History'}
              {activeTab === 'budgets' && 'Budget Planning'}
            </h1>
            <p className="text-slate-500 mt-1">Manage your wealth with precision.</p>
          </div>

          <div className="flex items-center bg-white rounded-2xl p-1 shadow-sm border border-slate-200">
            <button 
              onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1))}
              className="p-2 hover:bg-slate-50 rounded-xl transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="px-4 font-medium min-w-[140px] text-center">
              {format(currentMonth, 'MMMM yyyy')}
            </div>
            <button 
              onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1))}
              className="p-2 hover:bg-slate-50 rounded-xl transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </header>

        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-6"
            >
              {/* Summary Cards */}
              <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-emerald-600 text-white border-none shadow-emerald-100">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-emerald-100 text-sm font-medium uppercase tracking-wider">Total Spent</p>
                      <h2 className="text-4xl font-bold mt-2">₹{stats?.totalSpent.toLocaleString('en-IN') || '0'}</h2>
                    </div>
                    <div className="p-3 bg-white/10 rounded-2xl">
                      <TrendingUp size={24} />
                    </div>
                  </div>
                  <div className="mt-8 flex items-center gap-2 text-emerald-100 text-sm">
                    <Calendar size={16} />
                    <span>For {format(currentMonth, 'MMMM')}</span>
                  </div>
                </Card>

                <Card>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-slate-500 text-sm font-medium uppercase tracking-wider">Budget Status</p>
                      <h2 className="text-4xl font-bold mt-2">
                        {budgets.length > 0 
                          ? `${Math.round((stats?.totalSpent || 0) / budgets.reduce((acc, b) => acc + b.amount, 0) * 100)}%`
                          : 'N/A'}
                      </h2>
                    </div>
                    <div className="p-3 bg-slate-100 rounded-2xl text-slate-600">
                      <Wallet size={24} />
                    </div>
                  </div>
                  <div className="mt-8">
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-emerald-500 h-full transition-all duration-500" 
                        style={{ width: `${Math.min(100, (stats?.totalSpent || 0) / (budgets.reduce((acc, b) => acc + b.amount, 0) || 1) * 100)}%` }}
                      />
                    </div>
                    <p className="text-slate-500 text-sm mt-2">
                      ₹{stats?.totalSpent.toLocaleString('en-IN')} of ₹{budgets.reduce((acc, b) => acc + b.amount, 0).toLocaleString('en-IN')} spent
                    </p>
                  </div>
                </Card>

                {/* Spending Chart */}
                <Card className="md:col-span-2">
                  <h3 className="text-lg font-bold mb-6">Daily Spending</h3>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={stats?.dailySpending || []}>
                        <XAxis 
                          dataKey="date" 
                          tickFormatter={(val) => format(parseISO(val), 'dd')}
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: '#94a3b8', fontSize: 12 }}
                        />
                        <YAxis 
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: '#94a3b8', fontSize: 12 }}
                        />
                        <Tooltip 
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                          labelFormatter={(val) => format(parseISO(val as string), 'MMM dd, yyyy')}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="amount" 
                          stroke="#059669" 
                          strokeWidth={3} 
                          dot={{ r: 4, fill: '#059669', strokeWidth: 2, stroke: '#fff' }}
                          activeDot={{ r: 6, strokeWidth: 0 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </div>

              {/* Category Breakdown */}
              <Card className="h-full">
                <h3 className="text-lg font-bold mb-6">Category Breakdown</h3>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats?.categoryBreakdown || []}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {(stats?.categoryBreakdown || []).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                         contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-6 space-y-4">
                  {(stats?.categoryBreakdown || []).map((cat, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                        <span className="text-sm font-medium text-slate-600">{cat.name}</span>
                      </div>
                      <span className="text-sm font-bold">₹{cat.value.toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>
          )}

          {activeTab === 'expenses' && (
            <motion.div 
              key="expenses"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <Card className="p-0 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-bottom border-slate-200">
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Description</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Category</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Amount</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {expenses.map((expense) => (
                        <tr key={expense.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 text-sm text-slate-600">
                            {format(parseISO(expense.date), 'MMM dd, yyyy')}
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-slate-900">
                            {expense.description}
                          </td>
                          <td className="px-6 py-4">
                            <span 
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                              style={{ backgroundColor: `${expense.category_color}20`, color: expense.category_color }}
                            >
                              {expense.category_name}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm font-bold text-slate-900 text-right">
                            ₹{expense.amount.toLocaleString('en-IN')}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button 
                              onClick={() => deleteExpense(expense.id)}
                              className="text-slate-400 hover:text-red-500 transition-colors"
                            >
                              <Trash2 size={18} />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {expenses.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">
                            No expenses recorded yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </motion.div>
          )}

          {activeTab === 'budgets' && (
            <motion.div 
              key="budgets"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {categories.map((category) => {
                const budget = budgets.find(b => b.category_id === category.id);
                const spent = stats?.categoryBreakdown.find(c => c.name === category.name)?.value || 0;
                const percentage = budget ? (spent / budget.amount) * 100 : 0;

                return (
                  <Card key={category.id} className="relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: category.color }} />
                    <div className="flex justify-between items-start mb-6">
                      <h3 className="font-bold text-lg">{category.name}</h3>
                      <div className="p-2 bg-slate-100 rounded-xl text-slate-600">
                        <Wallet size={20} />
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-slate-500">Spent: <strong>₹{spent.toLocaleString('en-IN')}</strong></span>
                          <span className="text-slate-500">Budget: <strong>₹{budget?.amount.toLocaleString('en-IN') || '0'}</strong></span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div 
                            className={cn(
                              "h-full transition-all duration-500",
                              percentage > 100 ? "bg-red-500" : "bg-emerald-500"
                            )} 
                            style={{ width: `${Math.min(100, percentage)}%` }}
                          />
                        </div>
                      </div>

                      <div className="pt-4 border-t border-slate-100">
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Set Monthly Budget</label>
                        <div className="flex gap-2">
                          <input 
                            type="number" 
                            defaultValue={budget?.amount || 0}
                            onBlur={(e) => updateBudget(category.id, parseFloat(e.target.value) || 0)}
                            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Add Expense Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <h2 className="text-2xl font-bold mb-6">Log New Expense</h2>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  addExpense({
                    amount: parseFloat(formData.get('amount') as string),
                    category_id: parseInt(formData.get('category_id') as string),
                    description: formData.get('description'),
                    date: formData.get('date')
                  });
                }} className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Amount</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                      <input 
                        name="amount"
                        type="number" 
                        step="0.01"
                        required
                        autoFocus
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-8 pr-4 py-4 text-xl font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Category</label>
                    <select 
                      name="category_id"
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    >
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Description</label>
                    <input 
                      name="description"
                      type="text" 
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      placeholder="What was this for?"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Date</label>
                    <input 
                      name="date"
                      type="date" 
                      required
                      defaultValue={new Date().toISOString().split('T')[0]}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button 
                      type="button"
                      onClick={() => setIsAddModalOpen(false)}
                      className="flex-1 px-6 py-3 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      className="flex-1 px-6 py-3 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-colors"
                    >
                      Save Expense
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex flex-col md:flex-row items-center gap-1 md:gap-4 p-2 md:p-3 md:w-full rounded-2xl transition-all duration-200 group",
        active ? "text-emerald-600 md:bg-emerald-50" : "text-slate-400 hover:text-slate-600 md:hover:bg-slate-50"
      )}
    >
      <div className={cn(
        "transition-transform duration-200 group-hover:scale-110",
        active && "scale-110"
      )}>
        {icon}
      </div>
      <span className="text-[10px] md:text-sm font-bold md:hidden lg:block">{label}</span>
      {active && <motion.div layoutId="nav-active" className="hidden md:block absolute left-0 w-1 h-8 bg-emerald-600 rounded-r-full" />}
    </button>
  );
}

function Card({ children, className }: { children: React.ReactNode, className?: string, key?: React.Key }) {
  return (
    <div className={cn(
      "bg-white border border-slate-200 rounded-[32px] p-8 shadow-sm",
      className
    )}>
      {children}
    </div>
  );
}
