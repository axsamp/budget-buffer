import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Drawer } from 'vaul';
import { 
  Plus, 
  Trash2, 
  Settings, 
  ChevronLeft, 
  ChevronRight, 
  TrendingUp,
  Pizza,
  Bus,
  ShoppingBag,
  Ticket,
  MoreHorizontal,
  X,
  ArrowRight,
  Activity,
  Calendar,
  Wallet
} from 'lucide-react';

// --- Constants ---
const CATEGORIES = {
  Food: { icon: Pizza, color: 'text-[#C084FC]', bg: 'bg-[#C084FC]/10' },
  Transit: { icon: Bus, color: 'text-blue-400', bg: 'bg-blue-400/10' },
  Shopping: { icon: ShoppingBag, color: 'text-pink-400', bg: 'bg-pink-400/10' },
  Activity: { icon: Ticket, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
  Other: { icon: MoreHorizontal, color: 'text-zinc-600', bg: 'bg-zinc-600/10' },
};

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
};

const formatDateSafely = (dateString, offset = 0) => {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '2026-06-09';
    date.setDate(date.getDate() + offset);
    return date.toISOString().split('T')[0];
  } catch (e) {
    return '2026-06-09';
  }
};

export default function App() {
  // --- State ---
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('budget_settings');
      const defaultState = { totalBudget: 585000, startDate: '2026-06-09', endDate: '2026-07-06' };
      return saved ? { ...defaultState, ...JSON.parse(saved) } : defaultState;
    } catch (e) {
      return { totalBudget: 585000, startDate: '2026-06-09', endDate: '2026-07-06' };
    }
  });

  const [expenses, setExpenses] = useState(() => {
    try {
      const saved = localStorage.getItem('budget_expenses');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [currentDayOffset, setCurrentDayOffset] = useState(0);
  const [newExpense, setNewExpense] = useState({ amount: '', category: 'Food', note: '' });

  // --- Persistence ---
  useEffect(() => {
    localStorage.setItem('budget_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('budget_expenses', JSON.stringify(expenses));
  }, [expenses]);

  // --- Logic ---
  const totalDays = useMemo(() => {
    const start = new Date(settings.startDate);
    const end = new Date(settings.endDate);
    const diffTime = end.getTime() - start.getTime();
    return Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1);
  }, [settings.startDate, settings.endDate]);

  const targetDailyBudget = settings.totalBudget / totalDays;
  const currentTripDayDate = useMemo(() => formatDateSafely(settings.startDate, currentDayOffset), [settings.startDate, currentDayOffset]);
  
  const expensesByDate = useMemo(() => {
    const grouped = {};
    expenses.forEach(exp => {
      if (!grouped[exp.date]) grouped[exp.date] = [];
      grouped[exp.date].push(exp);
    });
    return grouped;
  }, [expenses]);

  const getDayTotal = (dateStr) => (expensesByDate[dateStr] || []).reduce((sum, exp) => sum + Number(exp.amount), 0);

  const cumulativeBuffer = useMemo(() => {
    let buffer = 0;
    for (let i = 0; i < currentDayOffset; i++) {
      const dateStr = formatDateSafely(settings.startDate, i);
      buffer += (targetDailyBudget - getDayTotal(dateStr));
    }
    return buffer;
  }, [settings, expensesByDate, currentDayOffset, targetDailyBudget]);

  const todaySpent = getDayTotal(currentTripDayDate);
  const todayAllowance = targetDailyBudget + cumulativeBuffer;
  const todayRemaining = todayAllowance - todaySpent;
  const totalRemaining = settings.totalBudget - expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);

  // --- Handlers ---
  const handleAddExpense = () => {
    if (!newExpense.amount) return;
    const expense = {
      id: Date.now(),
      date: currentTripDayDate,
      amount: Number(newExpense.amount),
      category: newExpense.category,
      note: newExpense.note
    };
    setExpenses([expense, ...expenses]);
    setNewExpense({ amount: '', category: 'Food', note: '' });
  };

  return (
    <div className="min-h-screen bg-black text-white selection:bg-[#C084FC]/30 font-sans">
      <div className="max-w-md mx-auto flex flex-col p-6 min-h-screen">
        
        {/* Header */}
        <header className="flex justify-between items-center py-6">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-6 bg-[#C084FC]" />
            <h1 className="text-xl font-black uppercase tracking-tighter">Onyx</h1>
          </div>
          <Drawer.Root direction="right">
            <Drawer.Trigger asChild>
              <button className="w-10 h-10 border border-zinc-900 flex items-center justify-center hover:bg-zinc-900 transition-colors">
                <Settings size={18} className="text-zinc-600" />
              </button>
            </Drawer.Trigger>
            <Drawer.Portal>
              <Drawer.Overlay className="fixed inset-0 bg-black/80 backdrop-blur-md z-50" />
              <Drawer.Content className="fixed right-0 top-0 bottom-0 w-80 bg-black border-l border-zinc-900 z-50 p-8 flex flex-col">
                <div className="flex justify-between items-center mb-12">
                  <h2 className="text-2xl font-black uppercase tracking-tighter">Settings</h2>
                  <Drawer.Close asChild><button><X size={24} /></button></Drawer.Close>
                </div>
                <div className="space-y-8 flex-1">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Budget (¥)</label>
                    <input type="number" value={settings.totalBudget} onChange={(e) => setSettings({...settings, totalBudget: Number(e.target.value)})} className="onyx-input text-xl font-bold" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">End Date</label>
                    <input type="date" value={settings.endDate} onChange={(e) => setSettings({...settings, endDate: e.target.value})} className="onyx-input font-bold" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Start Date</label>
                    <input type="date" value={settings.startDate} onChange={(e) => setSettings({...settings, startDate: e.target.value})} className="onyx-input font-bold" />
                  </div>
                </div>
                <Drawer.Close asChild>
                  <button className="onyx-button-primary w-full py-5">Save Mission</button>
                </Drawer.Close>
              </Drawer.Content>
            </Drawer.Portal>
          </Drawer.Root>
        </header>

        {/* Hero: The Buffer */}
        <section className="mt-4 mb-12">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={12} className="text-[#C084FC]" />
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-600">Accumulated Buffer</span>
          </div>
          <motion.h2 
            key={cumulativeBuffer}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`text-7xl font-black tracking-tighter gradient-text ${cumulativeBuffer < 0 ? '!text-red-500 !bg-none !-webkit-text-fill-color-initial' : ''}`}
          >
            {formatCurrency(cumulativeBuffer).replace('¥', '')}
            <span className="text-2xl ml-1 font-light opacity-20">¥</span>
          </motion.h2>
        </section>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-10">
          <div className="onyx-card p-5">
            <span className="text-[10px] font-bold text-zinc-600 uppercase block mb-1">Total Remaining</span>
            <span className="text-xl font-bold">{formatCurrency(totalRemaining)}</span>
          </div>
          <div className="onyx-card p-5">
            <span className="text-[10px] font-bold text-zinc-600 uppercase block mb-1">Base Target</span>
            <span className="text-xl font-bold opacity-40">{formatCurrency(targetDailyBudget)}</span>
          </div>
        </div>

        {/* Daily Focus */}
        <section className="onyx-card mb-10 overflow-hidden">
          <div className="p-4 border-b border-zinc-900/50 bg-zinc-900/10 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <button onClick={() => setCurrentDayOffset(Math.max(0, currentDayOffset - 1))} className="hover:text-[#C084FC]"><ChevronLeft size={20} /></button>
              <div className="text-center min-w-[100px]">
                <p className="text-[10px] font-bold text-[#C084FC] uppercase tracking-widest">Day {currentDayOffset + 1}</p>
                <p className="text-sm font-black">{new Date(currentTripDayDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
              </div>
              <button onClick={() => setCurrentDayOffset(currentDayOffset + 1)} className="hover:text-[#C084FC]"><ChevronRight size={20} /></button>
            </div>
            <Calendar size={16} className="text-zinc-700" />
          </div>
          <div className="p-6 space-y-6">
            <div className="flex justify-between items-end">
              <div>
                <span className="text-[10px] font-bold text-zinc-600 uppercase block mb-1">Adjusted Cap</span>
                <span className="text-3xl font-black">{formatCurrency(todayAllowance)}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-zinc-600 uppercase block mb-1">Spent</span>
                <span className="text-xl font-bold text-zinc-400">{formatCurrency(todaySpent)}</span>
              </div>
            </div>
            <div className="h-1 w-full bg-zinc-900">
              <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, (todaySpent / todayAllowance) * 100)}%` }} className={`h-full ${todaySpent > todayAllowance ? 'bg-red-500' : 'bg-[#C084FC]'}`} />
            </div>
          </div>
        </section>

        {/* Ledger */}
        <section className="flex-1 pb-40">
          <div className="flex items-center gap-2 mb-6">
            <Activity size={12} className="text-zinc-700" />
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-700">Data Ledger</h3>
          </div>
          <div className="space-y-3">
            {(expensesByDate[currentTripDayDate] || []).length === 0 ? (
              <div className="py-16 text-center border border-dashed border-zinc-900 text-zinc-800 text-[10px] font-bold uppercase tracking-widest">Null_Sector</div>
            ) : (
              expensesByDate[currentTripDayDate].map(exp => {
                const Cat = CATEGORIES[exp.category];
                return (
                  <div key={exp.id} className="onyx-card p-4 flex items-center gap-4 group">
                    <div className={`w-10 h-10 flex items-center justify-center border border-zinc-900 ${Cat.color}`}><Cat.icon size={18} /></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-sm uppercase tracking-tight truncate">{exp.note || exp.category}</span>
                        <span className="font-black text-sm">{formatCurrency(exp.amount)}</span>
                      </div>
                      <span className="text-[10px] font-bold text-zinc-700 uppercase">{exp.category}</span>
                    </div>
                    <button onClick={() => setExpenses(expenses.filter(e => e.id !== exp.id))} className="text-zinc-900 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                  </div>
                )
              })
            )}
          </div>
        </section>

        {/* FAB & Bottom Sheet Entry */}
        <div className="fixed bottom-0 left-0 right-0 p-8 flex justify-center pointer-events-none z-40 bg-gradient-to-t from-black via-black/80 to-transparent pt-16">
          <Drawer.Root>
            <Drawer.Trigger asChild>
              <motion.button 
                whileTap={{ scale: 0.9 }} 
                className="pointer-events-auto h-16 w-16 bg-[#C084FC] flex items-center justify-center shadow-lg shadow-[#C084FC]/20 rounded-full"
              >
                <Plus size={32} className="text-black" strokeWidth={3} />
              </motion.button>
            </Drawer.Trigger>
            <Drawer.Portal>
              <Drawer.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
              <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 p-6 pt-2 pb-12 bg-[#0A0A0A] border-t border-zinc-900 rounded-t-[2rem] max-w-md mx-auto">
                <div className="w-12 h-1 bg-zinc-800 rounded-full mx-auto my-4" />
                <div className="space-y-8">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xl font-black uppercase tracking-tighter">New Entry</h3>
                    <Drawer.Close asChild><button className="text-zinc-600"><X size={24} /></button></Drawer.Close>
                  </div>
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-zinc-600 uppercase ml-1">Amount (¥)</label>
                      <input autoFocus type="number" placeholder="0" value={newExpense.amount} onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})} className="onyx-input text-4xl font-black text-[#C084FC]" />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {Object.keys(CATEGORIES).map(cat => (
                        <button key={cat} onClick={() => setNewExpense({...newExpense, category: cat})} className={`py-3 border text-[10px] font-bold uppercase transition-all ${newExpense.category === cat ? 'bg-[#C084FC] border-[#C084FC] text-black' : 'border-zinc-900 text-zinc-600'}`}>{cat}</button>
                      ))}
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-zinc-600 uppercase ml-1">Note</label>
                      <input type="text" placeholder="Optional" value={newExpense.note} onChange={(e) => setNewExpense({...newExpense, note: e.target.value})} className="onyx-input" />
                    </div>
                  </div>
                  <Drawer.Close asChild>
                    <button onClick={handleAddExpense} className="onyx-button-primary w-full py-5">Confirm Entry <ArrowRight size={18} /></button>
                  </Drawer.Close>
                </div>
              </Drawer.Content>
            </Drawer.Portal>
          </Drawer.Root>
        </div>

      </div>
    </div>
  );
}
