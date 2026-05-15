import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Trash2, Settings, ChevronLeft, ChevronRight, TrendingUp,
  Pizza, Bus, ShoppingBag, Ticket, MoreHorizontal, X, ArrowRight,
  Activity, Calendar
} from 'lucide-react';

const CATEGORIES = {
  Food: { icon: Pizza, color: 'text-[#C084FC]', bg: 'bg-[#C084FC]/10' },
  Transit: { icon: Bus, color: 'text-blue-400', bg: 'bg-blue-400/10' },
  Shopping: { icon: ShoppingBag, color: 'text-pink-400', bg: 'bg-pink-400/10' },
  Activity: { icon: Ticket, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
  Other: { icon: MoreHorizontal, color: 'text-zinc-600', bg: 'bg-zinc-600/10' },
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

  const [currentDayOffset, setCurrentDayOffset] = useState(0);
  const [isAdding, setIsAdding] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [newExpense, setNewExpense] = useState({ amount: '', category: 'Food', note: '' });

  // Persistent Sync
  useEffect(() => {
    localStorage.setItem('budget_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('budget_expenses', JSON.stringify(expenses));
    
    // Sync with Onyx Hub
    const remaining = settings.totalBudget - expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
    localStorage.setItem('onyx_total_budget', Math.round(remaining).toString());
  }, [expenses, settings.totalBudget]);

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
    const expense = { 
      id: Date.now(), 
      date: currentTripDayDate, 
      amount: Math.abs(val), 
      category: newExpense.category, 
      note: newExpense.note.trim() 
    };
    
    setExpenses(prev => [expense, ...prev]);
    setNewExpense({ amount: '', category: 'Food', note: '' });
    setIsAdding(false);
  };

  const handleDelete = useCallback((id) => {
    triggerHaptic('light');
    setExpenses(prev => prev.filter(e => e.id !== id));
  }, []);

  return (
    <div className="fixed inset-0 bg-black text-white selection:bg-[#C084FC]/30 font-sans overflow-hidden flex flex-col">
      
      <div className="flex-1 overflow-y-auto no-scrollbar p-6 pb-40">
        <header className="flex justify-between items-center py-6 shrink-0">
          <div className="flex items-center gap-2"><div className="w-1.5 h-6 bg-[#C084FC]" /><h1 className="text-xl font-black uppercase tracking-tighter">Onyx</h1></div>
          <button onClick={() => setIsSettingsOpen(true)} className="w-10 h-10 border border-zinc-900 flex items-center justify-center hover:bg-zinc-900 transition-colors"><Settings size={18} className="text-zinc-600" /></button>
        </header>

        <section className="mt-4 mb-12 shrink-0">
          <div className="flex items-center gap-2 mb-2"><TrendingUp size={12} className="text-[#C084FC]" /><span className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-600">Accumulated Buffer</span></div>
          <motion.h2 key={cumulativeBuffer} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`text-7xl font-black tracking-tighter gradient-text ${cumulativeBuffer < 0 ? '!text-red-500 !bg-none !-webkit-text-fill-color-initial' : ''}`}>{formatCurrency(cumulativeBuffer).replace('¥', '')}<span className="text-2xl ml-1 font-light opacity-20">¥</span></motion.h2>
        </section>

        <div className="grid grid-cols-2 gap-4 mb-10 shrink-0">
          <div className="onyx-card p-5"><span className="text-[10px] font-bold text-zinc-600 uppercase block mb-1">Total Remaining</span><span className="text-xl font-bold">{formatCurrency(totalRemaining)}</span></div>
          <div className="onyx-card p-5"><span className="text-[10px] font-bold text-zinc-600 uppercase block mb-1">Base Target</span><span className="text-xl font-bold opacity-40">{formatCurrency(targetDailyBudget)}</span></div>
        </div>

        <section className="onyx-card mb-10 overflow-hidden shrink-0">
          <div className="p-4 border-b border-zinc-900/50 bg-zinc-900/10 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <button onClick={() => { triggerHaptic(); setCurrentDayOffset(Math.max(0, currentDayOffset - 1)); }} className="hover:text-[#C084FC]"><ChevronLeft size={20} /></button>
              <div className="text-center min-w-[100px]"><p className="text-[10px] font-bold text-[#C084FC] uppercase tracking-widest">Day {currentDayOffset + 1}</p><p className="text-sm font-black">{new Date(currentTripDayDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p></div>
              <button onClick={() => { triggerHaptic(); setCurrentDayOffset(currentDayOffset + 1); }} className="hover:text-[#C084FC]"><ChevronRight size={20} /></button>
            </div>
            <Calendar size={16} className="text-zinc-700" />
          </div>
          <div className="p-6 space-y-6">
            <div className="flex justify-between items-end">
              <div><span className="text-[10px] font-bold text-zinc-600 uppercase block mb-1">Adjusted Cap</span><span className="text-3xl font-black">{formatCurrency(todayAllowance)}</span></div>
              <div className="text-right"><span className="text-[10px] font-bold text-zinc-600 uppercase block mb-1">Spent</span><span className="text-xl font-bold text-zinc-400">{formatCurrency(todaySpent)}</span></div>
            </div>
            <div className="h-1 w-full bg-zinc-900"><motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, (todaySpent / todayAllowance) * 100)}%` }} className={`h-full ${todaySpent > todayAllowance ? 'bg-red-500' : 'bg-[#C084FC]'}`} /></div>
          </div>
        </section>

        <section>
          <div className="flex items-center gap-2 mb-6"><Activity size={12} className="text-zinc-700" /><h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-700">Data Ledger</h3></div>
          <div className="space-y-3">
            {expenses.filter(e => e.date === currentTripDayDate).length === 0 ? (
              <div className="py-16 text-center border border-dashed border-zinc-900 text-zinc-800 text-[10px] font-bold uppercase tracking-widest">Null_Sector</div>
            ) : (
              expenses.filter(e => e.date === currentTripDayDate).map(exp => {
                const Cat = CATEGORIES[exp.category];
                return (
                  <div key={exp.id} className="onyx-card p-4 flex items-center gap-4 group">
                    <div className={`w-10 h-10 flex items-center justify-center border border-zinc-900 ${Cat.color}`}><Cat.icon size={18} /></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-1"><span className="font-bold text-sm uppercase tracking-tight truncate">{exp.note || exp.category}</span><span className="font-black text-sm">{formatCurrency(exp.amount)}</span></div>
                      <span className="text-[10px] font-bold text-zinc-700 uppercase">{exp.category}</span>
                    </div>
                    <button onClick={() => handleDelete(exp.id)} className="text-zinc-900 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                  </div>
                )
              })
            )}
          </div>
        </section>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-8 pb-[calc(2rem+env(safe-area-inset-bottom))] flex justify-center pointer-events-none z-40 bg-gradient-to-t from-black via-black/80 to-transparent">
        <motion.button 
          whileTap={{ scale: 0.9 }} 
          onPointerDown={() => { triggerHaptic(); setIsAdding(true); }} 
          className="pointer-events-auto h-16 w-16 bg-[#C084FC] flex items-center justify-center shadow-lg shadow-[#C084FC]/20 rounded-full"
        >
          <Plus size={32} className="text-black" strokeWidth={3} />
        </motion.button>
      </div>

      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-50 flex items-end justify-center px-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAdding(false)} className="absolute inset-0 bg-black/90 backdrop-blur-md" />
            <motion.form 
              onSubmit={handleAddExpense}
              initial={{ y: "100%" }} 
              animate={{ y: 0 }} 
              exit={{ y: "100%" }} 
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="relative w-full max-w-md bg-[#0A0A0A] border-t border-white/5 rounded-t-[2.5rem] p-8 pb-[calc(4rem+env(safe-area-inset-bottom))]"
            >
              <div className="w-12 h-1 bg-zinc-800 rounded-full mx-auto mb-8" />
              <div className="flex justify-between items-center mb-10"><h3 className="text-2xl font-black uppercase tracking-tighter">New Entry</h3><button type="button" onClick={() => setIsAdding(false)} className="text-zinc-600"><X size={24} /></button></div>
              <div className="space-y-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-600 uppercase ml-1">Amount (¥)</label>
                  <input autoFocus inputMode="decimal" type="number" placeholder="0" value={newExpense.amount} onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})} className="onyx-input text-5xl font-black text-[#C084FC] bg-transparent border-none p-0 focus:ring-0" />
                </div>
                <div className="grid grid-cols-3 gap-2">{Object.keys(CATEGORIES).map(cat => (<button key={cat} type="button" onClick={() => { triggerHaptic(); setNewExpense({...newExpense, category: cat}); }} className={`py-3 border text-[10px] font-bold uppercase transition-all ${newExpense.category === cat ? 'bg-[#C084FC] border-[#C084FC] text-black' : 'border-zinc-900 text-zinc-600'}`}>{cat}</button>))}</div>
                <div className="space-y-2"><label className="text-[10px] font-bold text-zinc-600 uppercase ml-1">Note</label><input type="text" placeholder="Optional" value={newExpense.note} onChange={(e) => setNewExpense({...newExpense, note: e.target.value})} className="onyx-input" /></div>
                <button type="submit" className="onyx-button-primary w-full py-5 text-base mt-4">Confirm Entry <ArrowRight size={20} className="ml-2" /></button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isSettingsOpen && (
          <div className="fixed inset-0 z-[60] flex justify-end">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsSettingsOpen(false)} className="absolute inset-0 bg-black/90 backdrop-blur-md" />
            <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="relative w-80 bg-black border-l border-zinc-900 h-full p-8 flex flex-col">
              <div className="flex justify-between items-center mb-12"><h2 className="text-2xl font-black uppercase tracking-tighter">Settings</h2><button onClick={() => setIsSettingsOpen(false)}><X size={24} /></button></div>
              <div className="space-y-8 flex-1">
                <div className="space-y-2"><label className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Budget (¥)</label><input type="number" value={settings.totalBudget} onChange={(e) => setSettings({...settings, totalBudget: Number(e.target.value)})} className="onyx-input text-xl font-bold" /></div>
                <div className="space-y-2"><label className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">End Date</label><input type="date" value={settings.endDate} onChange={(e) => setSettings({...settings, endDate: e.target.value})} className="onyx-input font-bold" /></div>
                <div className="space-y-2"><label className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Start Date</label><input type="date" value={settings.startDate} onChange={(e) => setSettings({...settings, startDate: e.target.value})} className="onyx-input font-bold" /></div>
              </div>
              <div className="space-y-4 mt-auto pt-8 border-t border-zinc-900"><button onClick={() => { if(confirm('Erase all ledger data?')) setExpenses([]); }} className="w-full py-4 text-[10px] font-bold text-red-500 uppercase tracking-widest border border-red-500/20 hover:bg-red-500/10 transition-colors">Reset Ledger</button><button onClick={() => setIsSettingsOpen(false)} className="onyx-button-primary w-full py-5">Save Mission</button></div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
