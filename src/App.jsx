import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Trash2, Settings, ChevronLeft, ChevronRight, TrendingUp,
  Pizza, Bus, ShoppingBag, Ticket, MoreHorizontal, X, ArrowRight,
  Activity, Calendar, Wallet
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const CATEGORIES = {
  Food: { icon: Pizza, color: 'text-orange-600', bg: 'bg-orange-100' },
  Transit: { icon: Bus, color: 'text-blue-600', bg: 'bg-blue-100' },
  Shopping: { icon: ShoppingBag, color: 'text-pink-600', bg: 'bg-pink-100' },
  Activity: { icon: Ticket, color: 'text-emerald-600', bg: 'bg-emerald-100' },
  Other: { icon: MoreHorizontal, color: 'text-g-text-variant', bg: 'bg-g-aluminium' },
};

const triggerHaptic = (type = 'light') => {
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(type === 'light' ? 10 : 20);
    }
  } catch (e) {}
};

const formatCurrency = (amount) => new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY', maximumFractionDigits: 0 }).format(Math.round(amount));

const formatDateSafely = (dateString, offset = 0) => {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '2026-06-09';
    date.setDate(date.getDate() + offset);
    return date.toISOString().split('T')[0];
  } catch (e) { return '2026-06-09'; }
};

export default function App() {
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('budget_settings');
    const def = { totalBudget: 585000, startDate: '2026-06-09', endDate: '2026-07-06' };
    if (!saved) return def;
    try {
      const parsed = JSON.parse(saved);
      return { ...def, ...parsed };
    } catch (e) { return def; }
  });

  const [expenses, setExpenses] = useState(() => {
    const saved = localStorage.getItem('budget_expenses');
    if (!saved) return [];
    try {
      return JSON.parse(saved);
    } catch (e) { return []; }
  });

  const [currentDayOffset, setCurrentDayOffset] = useState(() => {
    const saved = localStorage.getItem('budget_current_day_offset');
    return saved ? parseInt(saved) : 0;
  });

  const [isAdding, setIsAdding] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [newExpense, setNewExpense] = useState({ amount: '', category: 'Food', note: '' });

  useEffect(() => {
    localStorage.setItem('budget_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('budget_expenses', JSON.stringify(expenses));
    const remaining = settings.totalBudget - expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
    localStorage.setItem('onyx_total_budget', Math.round(remaining).toString());
  }, [expenses, settings.totalBudget]);

  useEffect(() => {
    localStorage.setItem('budget_current_day_offset', currentDayOffset.toString());
  }, [currentDayOffset]);

  const totalDays = useMemo(() => {
    const start = new Date(settings.startDate);
    const end = new Date(settings.endDate);
    return Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1);
  }, [settings.startDate, settings.endDate]);

  const targetDailyBudget = useMemo(() => settings.totalBudget / totalDays, [settings.totalBudget, totalDays]);
  const currentTripDayDate = useMemo(() => formatDateSafely(settings.startDate, currentDayOffset), [settings.startDate, currentDayOffset]);
  const getDayTotal = useCallback((dateStr) => expenses.filter(e => e.date === dateStr).reduce((sum, exp) => sum + Number(exp.amount), 0), [expenses]);

  const cumulativeBuffer = useMemo(() => {
    let buffer = 0;
    for (let i = 0; i < currentDayOffset; i++) {
      buffer += (targetDailyBudget - getDayTotal(formatDateSafely(settings.startDate, i)));
    }
    return buffer;
  }, [settings.startDate, targetDailyBudget, getDayTotal, currentDayOffset]);

  const todaySpent = useMemo(() => getDayTotal(currentTripDayDate), [getDayTotal, currentTripDayDate]);
  const todayAllowance = useMemo(() => targetDailyBudget + cumulativeBuffer, [targetDailyBudget, cumulativeBuffer]);
  const totalRemaining = useMemo(() => settings.totalBudget - expenses.reduce((sum, exp) => sum + Number(exp.amount), 0), [settings.totalBudget, expenses]);

  const handleAddExpense = (e) => {
    if (e) e.preventDefault();
    const val = Number(newExpense.amount);
    if (!newExpense.amount || isNaN(val) || val === 0) return;
    triggerHaptic('medium');
    const expense = { id: Date.now(), date: currentTripDayDate, amount: Math.abs(val), category: newExpense.category, note: newExpense.note.trim() };
    setExpenses(prev => [expense, ...prev]);

    // Suica Sync Hack
    if (newExpense.category === 'Transit') {
      const wallet = JSON.parse(localStorage.getItem('onyx_wallet') || '{"liquid": 585000, "suica": 12450}');
      wallet.suica -= Math.abs(val);
      localStorage.setItem('onyx_wallet', JSON.stringify(wallet));
    }

    setNewExpense({ amount: '', category: 'Food', note: '' });
    setIsAdding(false);
  };

  const handleDelete = useCallback((id) => {
    triggerHaptic('light');
    setExpenses(prev => {
      const expenseToDelete = prev.find(e => e.id === id);
      if (expenseToDelete && expenseToDelete.category === 'Transit') {
        const wallet = JSON.parse(localStorage.getItem('onyx_wallet') || '{"liquid": 585000, "suica": 12450}');
        wallet.suica += expenseToDelete.amount;
        localStorage.setItem('onyx_wallet', JSON.stringify(wallet));
      }
      return prev.filter(e => e.id !== id);
    });
  }, []);

  return (
    <div className="fixed inset-0 bg-g-bg text-g-text selection:bg-g-primary-container font-sans overflow-hidden flex flex-col">
      <div className="flex-1 overflow-y-auto no-scrollbar p-8 pb-40 relative z-10">
        <header className="flex justify-between items-start pt-12 mb-12 shrink-0">
          <div className="flex flex-col gap-3">
             <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-g-primary rounded-full" />
                <span className="text-[10px] font-bold text-g-primary uppercase tracking-[0.5em]">Mission Budget</span>
             </div>
             <h1 className="text-4xl font-bold tracking-tight text-g-text leading-none">Budget Buffer</h1>
          </div>
          <button onClick={() => setIsSettingsOpen(true)} className="p-3 bg-g-surface rounded-full shadow-elevation-1 flex items-center justify-center hover:bg-g-aluminium transition-colors ripple"><Settings size={18} className="text-g-text-variant" /></button>
        </header>

        <section className="mb-12 shrink-0">
          <div className="flex items-center gap-2 mb-2"><TrendingUp size={14} className="text-g-primary/80" /><span className="text-[10px] font-bold uppercase tracking-[0.2em] text-g-text-variant">Net Buffer</span></div>
          <motion.h2 key={cumulativeBuffer} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`text-6xl font-bold tracking-tighter ${cumulativeBuffer < 0 ? 'text-red-600' : 'text-g-text'}`}>{formatCurrency(cumulativeBuffer).replace('¥', '')}<span className="text-2xl ml-2 font-medium opacity-50">¥</span></motion.h2>
        </section>

        <div className="grid grid-cols-2 gap-4 mb-10 shrink-0">
          <div className="material-card p-5">
             <div className="flex items-center gap-2 mb-2">
                <Wallet size={14} className="text-g-primary" />
                <span className="text-[9px] font-bold text-g-text-variant uppercase tracking-widest">Remaining</span>
             </div>
             <span className="text-xl font-bold tabular-nums text-g-text">{formatCurrency(totalRemaining)}</span>
          </div>
          <div className="material-card p-5">
             <div className="flex items-center gap-2 mb-2">
                <Activity size={14} className="text-g-text-variant" />
                <span className="text-[9px] font-bold text-g-text-variant uppercase tracking-widest">Base Cap</span>
             </div>
             <span className="text-xl font-bold tabular-nums text-g-text-variant">{formatCurrency(targetDailyBudget)}</span>
          </div>
        </div>

        <section className="material-card mb-10 overflow-hidden shrink-0 shadow-elevation-2">
          <div className="p-5 border-b border-g-outline/20 bg-g-surface flex justify-between items-center">
            <div className="flex items-center gap-6">
              <button onClick={() => { triggerHaptic(); setCurrentDayOffset(Math.max(0, currentDayOffset - 1)); }} className="text-g-text-variant hover:text-g-text transition-colors w-10 h-10 flex items-center justify-center rounded-full ripple"><ChevronLeft size={20} /></button>
              <div className="text-center min-w-[100px]"><p className="text-[10px] font-bold text-g-primary uppercase tracking-[0.2em] mb-0.5">Day {currentDayOffset + 1}</p><p className="text-sm font-bold uppercase tracking-tight text-g-text">{new Date(currentTripDayDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p></div>
              <button onClick={() => { triggerHaptic(); setCurrentDayOffset(currentDayOffset + 1); }} className="text-g-text-variant hover:text-g-text transition-colors w-10 h-10 flex items-center justify-center rounded-full ripple"><ChevronRight size={20} /></button>
            </div>
            <Calendar size={18} className="text-g-text-variant" />
          </div>
          <div className="p-7 space-y-6">
            <div className="flex justify-between items-end">
              <div><span className="text-[10px] font-bold text-g-text-variant uppercase tracking-widest block mb-2">Allowance</span><span className="text-4xl font-bold tabular-nums text-g-text">{formatCurrency(todayAllowance)}</span></div>
              <div className="text-right"><span className="text-[10px] font-bold text-g-text-variant uppercase tracking-widest block mb-2">Spent</span><span className="text-2xl font-bold text-g-text-variant tabular-nums">{formatCurrency(todaySpent)}</span></div>
            </div>
            <div className="h-2 w-full bg-g-aluminium rounded-full overflow-hidden"><motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, (todaySpent / todayAllowance) * 100)}%` }} className={`h-full ${todaySpent > todayAllowance ? 'bg-red-500' : 'bg-g-primary'}`} /></div>
          </div>
        </section>

        <section>
          <div className="flex items-center gap-3 mb-6">
             <div className="w-12 h-[1px] bg-g-outline/50" />
             <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-g-text-variant">Data Ledger</h3>
          </div>
          <div className="space-y-4">
            {expenses.filter(e => e.date === currentTripDayDate).length === 0 ? (
              <div className="py-20 text-center border-2 border-dashed border-g-outline/30 rounded-3xl text-g-text-variant text-xs font-bold uppercase tracking-[0.2em]">No entries for today</div>
            ) : (
              expenses.filter(e => e.date === currentTripDayDate).map(exp => {
                const Cat = CATEGORIES[exp.category];
                return (
                  <div key={exp.id} className="material-card p-5 flex items-center gap-5 ripple shadow-elevation-1 cursor-pointer">
                    <div className={`w-12 h-12 flex items-center justify-center rounded-full ${Cat.bg} ${Cat.color}`}><Cat.icon size={20} /></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-1"><span className="font-bold text-base tracking-tight truncate text-g-text">{exp.note || exp.category}</span><span className="font-bold text-base tabular-nums text-g-text">{formatCurrency(exp.amount)}</span></div>
                      <span className="text-[10px] font-bold text-g-text-variant uppercase tracking-wider">{exp.category}</span>
                    </div>
                    <button onClick={() => handleDelete(exp.id)} className="p-2 text-g-text-variant hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"><Trash2 size={18} /></button>
                  </div>
                )
              })
            )}
          </div>
        </section>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-8 pb-[calc(2.5rem+env(safe-area-inset-bottom))] flex justify-center pointer-events-none z-[200] bg-gradient-to-t from-g-bg via-g-bg/90 to-transparent">
        <motion.button 
          whileTap={{ scale: 0.9 }} 
          onPointerDown={() => { triggerHaptic(); setIsAdding(true); }} 
          className="pointer-events-auto h-16 w-16 bg-g-primary flex items-center justify-center shadow-elevation-3 rounded-2xl text-white hover:bg-blue-700 active:bg-blue-800 transition-colors ripple"
        >
          <Plus size={32} strokeWidth={2.5} />
        </motion.button>
      </div>

      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-[300] flex items-end justify-center px-0">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAdding(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.form 
              onSubmit={handleAddExpense}
              initial={{ y: "100%" }} 
              animate={{ y: 0 }} 
              exit={{ y: "100%" }} 
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="relative w-full max-w-md bg-g-surface rounded-t-[28px] p-6 pb-[env(safe-area-inset-bottom)] shadow-elevation-3 overflow-y-auto max-h-[95vh]"
            >
              <div className="w-12 h-1.5 bg-g-outline/50 rounded-full mx-auto mb-6" />
              <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-bold text-g-text">New Entry</h3><button type="button" onClick={() => setIsAdding(false)} className="w-10 h-10 flex items-center justify-center rounded-full bg-g-aluminium text-g-text ripple"><X size={20} /></button></div>
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-g-text-variant uppercase tracking-widest ml-1">Amount (¥)</label>
                  <input autoFocus inputMode="decimal" type="number" placeholder="0" value={newExpense.amount} onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})} className="w-full text-5xl font-bold text-g-primary bg-transparent border-none p-0 focus:ring-0 placeholder:text-g-outline tabular-nums outline-none" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {Object.keys(CATEGORIES).map(cat => (
                    <button key={cat} type="button" onClick={() => { triggerHaptic(); setNewExpense({...newExpense, category: cat}); }} className={`py-3 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all ripple ${newExpense.category === cat ? 'bg-g-primary-container text-g-primary' : 'bg-g-bg border border-g-outline/20 text-g-text-variant'}`}>{cat}</button>
                  ))}
                </div>
                <div className="space-y-3"><label className="text-[11px] font-bold text-g-text-variant uppercase tracking-widest ml-1">Note</label><input type="text" placeholder="What was this for?" value={newExpense.note} onChange={(e) => setNewExpense({...newExpense, note: e.target.value})} className="w-full py-4 px-5 bg-g-bg border border-g-outline/20 rounded-xl text-g-text font-medium placeholder:text-g-text-variant focus:outline-none focus:border-g-primary transition-colors" /></div>
                <button type="submit" className="w-full py-5 bg-g-primary text-white font-bold rounded-2xl shadow-elevation-2 active:scale-95 transition-transform flex items-center justify-center gap-2 ripple">Add Expense <ArrowRight size={20} /></button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isSettingsOpen && (
          <div className="fixed inset-0 z-[400] flex justify-end">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsSettingsOpen(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "tween", duration: 0.3, ease: [0.22, 1, 0.36, 1] }} className="relative w-80 bg-g-surface border-l border-g-outline/20 h-full p-8 flex flex-col shadow-elevation-3">
              <div className="flex justify-between items-center mb-12"><h2 className="text-2xl font-bold text-g-text">Settings</h2><button onClick={() => setIsSettingsOpen(false)} className="w-10 h-10 rounded-full bg-g-aluminium flex items-center justify-center text-g-text ripple"><X size={20} /></button></div>
              <div className="space-y-8 flex-1">
                <div className="space-y-2"><label className="text-[11px] font-bold text-g-text-variant uppercase tracking-wider">Total Budget (¥)</label><input type="number" value={settings.totalBudget} onChange={(e) => setSettings({...settings, totalBudget: Number(e.target.value)})} className="w-full py-4 px-5 bg-g-bg border border-g-outline/20 rounded-xl text-lg font-bold text-g-text outline-none focus:border-g-primary" /></div>
                <div className="space-y-2"><label className="text-[11px] font-bold text-g-text-variant uppercase tracking-wider">Start Date</label><input type="date" value={settings.startDate} onChange={(e) => setSettings({...settings, startDate: e.target.value})} className="w-full py-4 px-5 bg-g-bg border border-g-outline/20 rounded-xl font-bold text-g-text text-sm outline-none focus:border-g-primary" /></div>
                <div className="space-y-2"><label className="text-[11px] font-bold text-g-text-variant uppercase tracking-wider">End Date</label><input type="date" value={settings.endDate} onChange={(e) => setSettings({...settings, endDate: e.target.value})} className="w-full py-4 px-5 bg-g-bg border border-g-outline/20 rounded-xl font-bold text-g-text text-sm outline-none focus:border-g-primary" /></div>
              </div>
              <div className="space-y-4 mt-auto pt-8 border-t border-g-outline/20"><button onClick={() => { if(confirm('Erase all ledger data?')) setExpenses([]); }} className="w-full py-4 text-[11px] font-bold text-red-600 uppercase tracking-wider border border-red-200 rounded-xl hover:bg-red-50 transition-colors">Wipe Data</button><button onClick={() => setIsSettingsOpen(false)} className="w-full py-5 bg-g-primary text-white font-bold rounded-xl shadow-elevation-2 ripple active:scale-95 transition-transform">Save Settings</button></div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
