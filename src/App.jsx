import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Trash2, Settings, ChevronLeft, ChevronRight, TrendingUp,
  Pizza, Bus, ShoppingBag, Ticket, MoreHorizontal, X, ArrowRight,
  Activity, Calendar, Wallet
} from 'lucide-react';

const CATEGORIES = {
  Food: { icon: Pizza, color: 'text-[#FFC107]', bg: 'bg-[#FFC107]/10' },
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
    setNewExpense({ amount: '', category: 'Food', note: '' });
    setIsAdding(false);
  };

  const handleDelete = useCallback((id) => {
    triggerHaptic('light');
    setExpenses(prev => prev.filter(e => e.id !== id));
  }, []);

  return (
    <div className="fixed inset-0 bg-black text-white selection:bg-[#FFC107]/30 font-sans overflow-hidden flex flex-col">
      
      {/* Premium Overlays */}
      <div className="fixed inset-0 pointer-events-none z-[100] opacity-[0.03] mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
      <div className="fixed inset-0 pointer-events-none z-[101] opacity-[0.02] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]" />

      <div className="flex-1 overflow-y-auto no-scrollbar p-8 pb-40 relative z-10">
        <header className="flex justify-between items-start pt-12 mb-12 shrink-0">
          <div className="flex flex-col gap-3">
             <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-[#FFC107] animate-pulse" />
                <span className="text-[10px] font-black text-[#FFC107] uppercase tracking-[0.5em] opacity-60">Mission Budget</span>
             </div>
             <h1 className="text-4xl font-black uppercase tracking-tighter text-white leading-none">Budget Buffer</h1>
          </div>
          <button onClick={() => setIsSettingsOpen(true)} className="p-3 border border-zinc-900 flex items-center justify-center hover:bg-zinc-900 transition-colors"><Settings size={18} className="text-zinc-600" /></button>
        </header>

        <section className="mb-12 shrink-0">
          <div className="flex items-center gap-2 mb-2"><TrendingUp size={10} className="text-[#FFC107]/40" /><span className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-600">Net Buffer</span></div>
          <motion.h2 key={cumulativeBuffer} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`text-7xl font-black tracking-tighter ${cumulativeBuffer < 0 ? 'text-red-500' : 'text-white'}`}>{formatCurrency(cumulativeBuffer).replace('¥', '')}<span className="text-2xl ml-2 font-light opacity-20">¥</span></motion.h2>
        </section>

        <div className="grid grid-cols-2 gap-4 mb-10 shrink-0">
          <div className="bg-[#0A0A0A] border border-white/5 p-5 rounded-2xl">
             <div className="flex items-center gap-2 mb-1">
                <Wallet size={10} className="text-[#FFC107] opacity-40" />
                <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Remaining</span>
             </div>
             <span className="text-xl font-bold tabular-nums">{formatCurrency(totalRemaining)}</span>
          </div>
          <div className="bg-[#0A0A0A] border border-white/5 p-5 rounded-2xl">
             <div className="flex items-center gap-2 mb-1">
                <Activity size={10} className="text-zinc-600 opacity-40" />
                <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Base Cap</span>
             </div>
             <span className="text-xl font-bold opacity-40 tabular-nums">{formatCurrency(targetDailyBudget)}</span>
          </div>
        </div>

        <section className="bg-[#0A0A0A] border border-white/5 rounded-3xl mb-10 overflow-hidden shrink-0 shadow-2xl">
          <div className="p-5 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
            <div className="flex items-center gap-6">
              <button onClick={() => { triggerHaptic(); setCurrentDayOffset(Math.max(0, currentDayOffset - 1)); }} className="text-zinc-600 hover:text-white transition-colors"><ChevronLeft size={20} /></button>
              <div className="text-center min-w-[100px]"><p className="text-[9px] font-black text-[#FFC107] uppercase tracking-[0.4em] mb-0.5">Day {currentDayOffset + 1}</p><p className="text-sm font-black uppercase tracking-tight">{new Date(currentTripDayDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p></div>
              <button onClick={() => { triggerHaptic(); setCurrentDayOffset(currentDayOffset + 1); }} className="text-zinc-600 hover:text-white transition-colors"><ChevronRight size={20} /></button>
            </div>
            <Calendar size={16} className="text-zinc-800" />
          </div>
          <div className="p-7 space-y-6">
            <div className="flex justify-between items-end">
              <div><span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest block mb-2">Allowance</span><span className="text-4xl font-black tabular-nums">{formatCurrency(todayAllowance)}</span></div>
              <div className="text-right"><span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest block mb-2">Spent</span><span className="text-2xl font-black text-zinc-500 tabular-nums">{formatCurrency(todaySpent)}</span></div>
            </div>
            <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden shadow-inner"><motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, (todaySpent / todayAllowance) * 100)}%` }} className={`h-full ${todaySpent > todayAllowance ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]' : 'bg-[#FFC107] shadow-[0_0_10px_rgba(255,193,7,0.3)]'}`} /></div>
          </div>
        </section>

        <section>
          <div className="flex items-center gap-3 mb-8">
             <div className="w-12 h-[1px] bg-zinc-900" />
             <h3 className="text-[10px] font-bold uppercase tracking-[0.5em] text-zinc-700">Data Ledger</h3>
          </div>
          <div className="space-y-4">
            {expenses.filter(e => e.date === currentTripDayDate).length === 0 ? (
              <div className="py-20 text-center border border-dashed border-zinc-900 rounded-3xl text-zinc-800 text-[10px] font-bold uppercase tracking-[0.4em]">Empty_Sector</div>
            ) : (
              expenses.filter(e => e.date === currentTripDayDate).map(exp => {
                const Cat = CATEGORIES[exp.category];
                return (
                  <div key={exp.id} className="bg-[#0A0A0A] border border-white/5 p-5 rounded-2xl flex items-center gap-5 group transition-all hover:border-white/10 shadow-xl">
                    <div className={`w-12 h-12 flex items-center justify-center rounded-xl bg-white/[0.03] border border-white/5 ${Cat.color}`}><Cat.icon size={20} /></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-1"><span className="font-black text-base uppercase tracking-tight truncate">{exp.note || exp.category}</span><span className="font-black text-base tabular-nums">{formatCurrency(exp.amount)}</span></div>
                      <span className="text-[9px] font-bold text-zinc-700 uppercase tracking-widest">{exp.category}</span>
                    </div>
                    <button onClick={() => handleDelete(exp.id)} className="p-2 text-zinc-800 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
                  </div>
                )
              })
            )}
          </div>
        </section>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-8 pb-[calc(2.5rem+env(safe-area-inset-bottom))] flex justify-center pointer-events-none z-[200] bg-gradient-to-t from-black via-black/80 to-transparent">
        <motion.button 
          whileTap={{ scale: 0.9 }} 
          onPointerDown={() => { triggerHaptic(); setIsAdding(true); }} 
          className="pointer-events-auto h-20 w-20 bg-[#FFC107] flex items-center justify-center shadow-[0_20px_50px_rgba(255,193,7,0.3)] rounded-full text-black hover:scale-105 transition-transform"
        >
          <Plus size={36} strokeWidth={3} />
        </motion.button>
      </div>

      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-[300] flex items-end justify-center px-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAdding(false)} className="absolute inset-0 bg-black/80 backdrop-blur-xl" />
            <motion.form 
              onSubmit={handleAddExpense}
              initial={{ y: "100%" }} 
              animate={{ y: 0 }} 
              exit={{ y: "100%" }} 
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="relative w-full max-w-md bg-[#0A0A0A] border-t border-white/5 rounded-t-[3rem] p-10 pb-[calc(4rem+env(safe-area-inset-bottom))]"
            >
              <div className="w-16 h-1.5 bg-zinc-800 rounded-full mx-auto mb-10" />
              <div className="flex justify-between items-center mb-12"><h3 className="text-3xl font-black uppercase tracking-tighter">New Entry</h3><button type="button" onClick={() => setIsAdding(false)} className="text-zinc-600"><X size={28} /></button></div>
              <div className="space-y-10">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest ml-1">Magnitude (¥)</label>
                  <input autoFocus inputMode="decimal" type="number" placeholder="0" value={newExpense.amount} onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})} className="w-full text-7xl font-black text-[#FFC107] bg-transparent border-none p-0 focus:ring-0 placeholder:opacity-10 tabular-nums" />
                </div>
                <div className="grid grid-cols-3 gap-3">{Object.keys(CATEGORIES).map(cat => (<button key={cat} type="button" onClick={() => { triggerHaptic(); setNewExpense({...newExpense, category: cat}); }} className={`py-4 border rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${newExpense.category === cat ? 'bg-[#FFC107] border-[#FFC107] text-black shadow-[0_0_20px_rgba(255,193,7,0.3)]' : 'bg-white/5 border-white/5 text-zinc-600'}`}>{cat}</button>))}</div>
                <div className="space-y-3"><label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest ml-1">Annotation</label><input type="text" placeholder="Entry Context..." value={newExpense.note} onChange={(e) => setNewExpense({...newExpense, note: e.target.value})} className="w-full py-5 px-6 bg-white/[0.03] border border-white/5 rounded-2xl text-white font-bold placeholder:text-zinc-800 focus:border-[#FFC107]/50 transition-colors" /></div>
                <button type="submit" className="w-full py-6 bg-[#FFC107] text-black font-black uppercase tracking-[0.2em] rounded-2xl shadow-2xl hover:scale-[1.02] transition-transform flex items-center justify-center gap-3">Confirm Entry <ArrowRight size={20} /></button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isSettingsOpen && (
          <div className="fixed inset-0 z-[400] flex justify-end">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsSettingsOpen(false)} className="absolute inset-0 bg-black/80 backdrop-blur-xl" />
            <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="relative w-80 bg-[#0A0A0A] border-l border-white/5 h-full p-10 flex flex-col shadow-2xl">
              <div className="flex justify-between items-center mb-16"><h2 className="text-3xl font-black uppercase tracking-tighter">Settings</h2><button onClick={() => setIsSettingsOpen(false)} className="text-zinc-600"><X size={28} /></button></div>
              <div className="space-y-10 flex-1">
                <div className="space-y-3"><label className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em]">Total Budget (¥)</label><input type="number" value={settings.totalBudget} onChange={(e) => setSettings({...settings, totalBudget: Number(e.target.value)})} className="w-full py-5 px-6 bg-white/[0.03] border border-white/5 rounded-2xl text-xl font-black text-white" /></div>
                <div className="space-y-3"><label className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em]">Start Date</label><input type="date" value={settings.startDate} onChange={(e) => setSettings({...settings, startDate: e.target.value})} className="w-full py-5 px-6 bg-white/[0.03] border border-white/5 rounded-2xl font-black text-white text-sm" /></div>
                <div className="space-y-3"><label className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em]">End Date</label><input type="date" value={settings.endDate} onChange={(e) => setSettings({...settings, endDate: e.target.value})} className="w-full py-5 px-6 bg-white/[0.03] border border-white/5 rounded-2xl font-black text-white text-sm" /></div>
              </div>
              <div className="space-y-4 mt-auto pt-10 border-t border-white/5"><button onClick={() => { if(confirm('Erase all ledger data?')) setExpenses([]); }} className="w-full py-5 text-[10px] font-black text-red-500 uppercase tracking-[0.3em] border border-red-500/20 rounded-2xl hover:bg-red-500/10 transition-colors">Wipe Lattice</button><button onClick={() => setIsSettingsOpen(false)} className="w-full py-6 bg-white text-black font-black uppercase tracking-[0.2em] rounded-2xl">Save Chassis</button></div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
