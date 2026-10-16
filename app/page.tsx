"use client";
import { useEffect, useRef, useState } from "react";
import { Activity, ArrowRight, BarChart3, Bell, Check, ChevronLeft, ChevronRight, Download, Dumbbell, Home, Minus, Moon, MoreHorizontal, Pause, Pencil, Play, Plus, RotateCcw, Search, Settings, Shield, Sun, Trash2, Utensils, Wallet, X } from "lucide-react";
import { InstallApp } from "./install-app";
import { FinanceTabV2 } from "./finance-v2";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { State, Run, Session, Meal, Night, SavingsTransaction, initial, migrate, valid, uid, dateKey, asDate, addDays, weekday, money, pace, categories, foods, exercises, supplements, insightFor } from "./data";
type Tab = "today" | "run" | "strength" | "nutrition" | "sleep" | "budget" | "evolution" | "settings";
const nav: [
    Tab,
    string,
    typeof Home
][] = [["today", "Aujourd’hui", Home], ["run", "Course & marche", Activity], ["strength", "Entraînement", Dumbbell], ["nutrition", "Nutrition", Utensils], ["sleep", "Sommeil", Moon], ["budget", "Dépenses du mois", Wallet], ["evolution", "Évolution", BarChart3], ["settings", "Réglages", Settings]];
const dayNames = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const num = (v: string | number) => Math.max(0, Number(v) || 0);
const positive = (v: number) => Number.isFinite(v) && v >= 0;
const searchText = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const monthOf = (d: string) => d.slice(0, 7);
const mins = (v: string) => { const [h, m] = v.split(":").map(Number); return h * 60 + m; };
const elapsedMinutes = (start?: string, end?: string) => {
    if (!start || !end)
        return 0;
    let delta = mins(end) - mins(start);
    if (delta < 0)
        delta += 1440;
    return Math.min(delta, 720);
};
const interruptedMinutes = (n?: Night) => (n?.wakePeriods || []).reduce((total, period) => total + elapsedMinutes(period.start, period.end), 0);
function estimateNight(n: Night) {
    if (n.hours > 0)
        return Math.max(0, Math.round((n.hours - interruptedMinutes(n) / 60) * 10) / 10);
    const start = n.phone || n.bed;
    if (!start || !n.awake)
        return 0;
    const delta = elapsedMinutes(start, n.awake) - interruptedMinutes(n);
    return Math.max(0, Math.round(delta / 6) / 10);
}
const activityCalories = (r: Run, weight: number) => Math.round(r.km * weight * (r.kind === "walk" ? .5 : 1));
const strengthCalories = (minutes: number, weight: number, averageRpe = 6) => {
    const met = averageRpe >= 8 ? 6 : averageRpe >= 5 ? 4.5 : 3.5;
    return Math.round(met * 3.5 * weight / 200 * minutes);
};
function Metric({ label, value, sub }: {
    label: string;
    value: string;
    sub: string;
}) { return <div className="v-metric"><span>{label}</span><strong>{value}</strong><small>{sub}</small></div>; }
function Insight({ area, date }: {
    area: "run" | "strength" | "nutrition" | "sleep";
    date: string;
}) { const i = insightFor(area, date); return <div className="v-insight"><span className="eyebrow">LE POINT DU JOUR · {date}</span><p>{i.text}</p><a href={i.url} target="_blank" rel="noreferrer">Source : {i.source} ↗</a></div>; }
function Calendar({ date, setDate, kind, state, setState }: {
    date: string;
    setDate: (s: string) => void;
    kind: "run" | "strength";
    state: State;
    setState: React.Dispatch<React.SetStateAction<State>>;
}) {
    const d = asDate(date), start = new Date(d.getFullYear(), d.getMonth(), 1), length = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(), offset = (start.getDay() + 6) % 7;
    const days = Array.from({ length: offset + length }, (_, i) => i < offset ? null : dateKey(new Date(d.getFullYear(), d.getMonth(), i - offset + 1)));
    const log = (k: string) => kind === "run" ? state.runs.some(r => r.date === k) : state.sessions.some(x => x.date === k);
    const active = kind === "run" ? state.runDays : state.strengthDays;
    return <div className="panel v-cal"><div className="v-between"><div><span className="eyebrow">JOURNAL CONTINU</span><h3>{d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}</h3></div><div className="v-buttons"><button aria-label="Mois précédent" onClick={() => setDate(dateKey(new Date(d.getFullYear(), d.getMonth() - 1, Math.min(d.getDate(), 28))))}><ChevronLeft size={17}/></button><button aria-label="Mois suivant" onClick={() => setDate(dateKey(new Date(d.getFullYear(), d.getMonth() + 1, Math.min(d.getDate(), 28))))}><ChevronRight size={17}/></button></div></div><div className="v-calendar">{dayNames.map(x => <b key={x}>{x}</b>)}{days.map((k, i) => k ? <button key={k} title={`${k} · ${log(k) ? "fait" : state.marks[k]?.[kind] === "rest" ? "repos" : state.marks[k]?.[kind] === "missed" ? "sans séance" : active.includes(weekday(k)) && k >= state.startedOn && k < dateKey() ? "prévu, non renseigné" : "à venir"}`} className={["v-day", k === date ? "selected" : "", log(k) ? "done" : state.marks[k]?.[kind] === "rest" ? "rest" : state.marks[k]?.[kind] === "missed" || active.includes(weekday(k)) && k >= state.startedOn && k < dateKey() ? "missed" : ""].join(" ")} onClick={() => setDate(k)}><span>{asDate(k).getDate()}</span>{log(k) ? <Check size={13}/> : state.marks[k]?.[kind] === "rest" ? "·" : active.includes(weekday(k)) ? <i /> : null}</button> : <div key={"blank" + i}/>)}</div><div className="v-legend"><span><i className="done"/> Séance faite</span><span><i className="missed"/> Prévue sans saisie</span><span><i className="rest"/> Repos choisi</span></div><div className="v-weekdays"><small>Jours habituels, modifiables</small><div>{dayNames.map((n, i) => <button key={i} className={active.includes(i) ? "on" : ""} onClick={() => { const next = active.includes(i) ? active.filter(x => x !== i) : [...active, i].sort(); setState(s => ({ ...s, [kind === "run" ? "runDays" : "strengthDays"]: next })); }}>{n}</button>)}</div></div></div>;
}
function Trend({ values, labels, unit = "" }: {
    values: number[];
    labels: string[];
    unit?: string;
}) { const max = Math.max(1, ...values); return <div className="v-trend">{values.map((v, i) => <div className="v-bar" key={i} title={`${labels[i]} : ${v}${unit}`}><span style={{ height: `${Math.max(v ? 7 : 2, v / max * 100)}%` }}/><small>{labels[i]}</small></div>)}</div>; }

function FinanceTab({ state, setState, budgetMonth, setBudgetMonth, today, notify }: {
    state: State;
    setState: React.Dispatch<React.SetStateAction<State>>;
    budgetMonth: string;
    setBudgetMonth: React.Dispatch<React.SetStateAction<string>>;
    today: string;
    notify: (message: string) => void;
}) {
    const [incomeAmount, setIncomeAmount] = useState(""), [incomeNote, setIncomeNote] = useState("Salaire");
    const [purchaseDrafts, setPurchaseDrafts] = useState<Record<string, { name: string; amount: string }>>({});
    const [savingKind, setSavingKind] = useState<"deposit" | "withdrawal">("deposit"), [savingLocation, setSavingLocation] = useState<"Agence" | "GAB">("Agence"), [savingAmount, setSavingAmount] = useState(""), [savingDate, setSavingDate] = useState(today), [filterFrom, setFilterFrom] = useState(today.slice(0, 4) + "-01-01"), [filterTo, setFilterTo] = useState(today);
    const limits = state.monthBudgets[budgetMonth] || state.budgets;
    const monthlySpends = state.spends.filter(x => monthOf(x.date) === budgetMonth);
    const monthlyIncomes = state.incomes.filter(x => monthOf(x.date) === budgetMonth);
    const monthlyIncome = monthlyIncomes.reduce((sum, x) => sum + x.amount, 0);
    const plannedTotal = categories.reduce((sum, c) => sum + (limits[c] || 0), 0);
    const spentTotal = monthlySpends.reduce((sum, x) => sum + x.amount, 0);
    const addIncome = () => {
        if (!num(incomeAmount))
            return notify("Indique le montant reçu.");
        setState(v => ({ ...v, incomes: [...v.incomes, { id: uid(), date: budgetMonth + "-01", amount: num(incomeAmount), note: incomeNote.trim() || "Revenu" }] }));
        setIncomeAmount("");
        notify("Revenu enregistré.");
    };
    const updateSpend = (id: string, patch: Partial<State["spends"][number]>) => setState(v => {
        const updated = v.spends.map(x => x.id === id ? { ...x, ...patch } : x);
        const changed = updated.find(x => x.id === id);
        return { ...v, spends: updated, meals: changed ? v.meals.map(m => m.expenseId === id ? { ...m, date: changed.date, cost: changed.amount } : m) : v.meals };
    });
    const updateSaving = (id: string, patch: Partial<SavingsTransaction>) => setState(v => {
        const target = v.savingsTransactions.find(x => x.id === id);
        if (!target) return v;
        const nextDate = patch.date || target.date;
        const annualId = nextDate.slice(0, 4) !== target.date.slice(0, 4)
            ? Math.max(0, ...v.savingsTransactions.filter(x => x.id !== id && x.date.startsWith(nextDate.slice(0, 4))).map(x => x.annualId)) + 1
            : target.annualId;
        return { ...v, savingsTransactions: v.savingsTransactions.map(x => x.id === id ? { ...x, ...patch, annualId } : x) };
    });
    const addDirectPurchase = (category: string) => {
        const draft = purchaseDrafts[category];
        if (!draft?.name.trim() || !num(draft.amount))
            return notify("Indique l’achat et son montant réel.");
        const maxDay = new Date(Number(budgetMonth.slice(0, 4)), Number(budgetMonth.slice(5)), 0).getDate();
        const date = `${budgetMonth}-${String(Math.min(maxDay, Number(today.slice(8)))).padStart(2, "0")}`;
        setState(v => ({ ...v, spends: [...v.spends, { id: uid(), date, category, amount: num(draft.amount), note: draft.name.trim() }] }));
        setPurchaseDrafts(v => ({ ...v, [category]: { name: "", amount: "" } }));
        notify(`Achat déduit de ${category}.`);
    };
    const savingSorted = [...state.savingsTransactions].sort((a, b) => a.date.localeCompare(b.date) || a.annualId - b.annualId);
    let running = state.savingsOpeningBalance;
    const withBalance = savingSorted.map(tx => {
        running += tx.kind === "deposit" ? tx.amount : -tx.amount;
        return { ...tx, balance: running };
    });
    const currentSavings = running;
    const selectedMonthTx = savingSorted.filter(x => monthOf(x.date) === budgetMonth);
    const selectedMonthWithdrawals = selectedMonthTx.filter(x => x.kind === "withdrawal").reduce((sum, x) => sum + x.amount, 0);
    const selectedYear = Number(budgetMonth.slice(0, 4));
    const yearWithdrawals = savingSorted.filter(x => x.date.startsWith(String(selectedYear)) && x.kind === "withdrawal").reduce((sum, x) => sum + x.amount, 0);
    const monthsForAverage = selectedYear === Number(today.slice(0, 4)) ? Math.max(1, Number(today.slice(5, 7))) : 12;
    const filteredTransactions = withBalance.filter(x => x.date >= filterFrom && x.date <= filterTo).reverse();
    const addSaving = () => {
        if (!num(savingAmount))
            return notify("Indique le montant de la transaction.");
        if (savingKind === "withdrawal" && num(savingAmount) > currentSavings)
            return notify("Retrait impossible : le montant dépasse le solde d’épargne.");
        const year = savingDate.slice(0, 4);
        const annualId = Math.max(0, ...state.savingsTransactions.filter(x => x.date.startsWith(year)).map(x => x.annualId)) + 1;
        const transaction: SavingsTransaction = { id: uid(), annualId, date: savingDate, kind: savingKind, location: savingLocation, amount: num(savingAmount) };
        setState(v => ({ ...v, savingsTransactions: [...v.savingsTransactions, transaction] }));
        setSavingAmount("");
        notify(`Transaction n°${annualId} enregistrée.`);
    };
    const exportSavings = () => {
        const rows = [["ID annuel", "Date", "Type", "Lieu", "Montant FCFA", "Solde FCFA"], ...withBalance.map(x => [x.annualId, x.date, x.kind === "deposit" ? "Dépôt" : "Retrait", x.location, x.amount, x.balance])];
        const csv = rows.map(row => row.map(cell => `"${String(cell).replaceAll('"', '""')}"`).join(";")).join("\n");
        const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob), a = document.createElement("a");
        a.href = url;
        a.download = `epargne-saliou-${today}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };
    return <>{<div className="v-sectionhead"><span className="eyebrow">FINANCES / LE MOIS</span><h1>Dépenses réelles et épargne.</h1><p>Chaque montant reste modifiable après l’enregistrement : revenus, achats, budgets, dépôts et retraits.</p></div>}<div className="v-month-picker"><button aria-label="Mois précédent" onClick={() => setBudgetMonth(v => { const [y, m] = v.split("-").map(Number); return dateKey(new Date(y, m - 2, 1)).slice(0, 7); })}><ChevronLeft size={17}/></button><strong>{new Date(Number(budgetMonth.slice(0, 4)), Number(budgetMonth.slice(5)) - 1, 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}</strong><button aria-label="Mois suivant" onClick={() => setBudgetMonth(v => { const [y, m] = v.split("-").map(Number); return dateKey(new Date(y, m, 1)).slice(0, 7); })}><ChevronRight size={17}/></button></div><div className="v-metrics"><Metric label="REVENUS · MOIS" value={money(monthlyIncome)} sub="revenus enregistrés"/><Metric label="BUDGETS ATTRIBUÉS" value={money(plannedTotal)} sub="limites choisies par catégorie"/><Metric label="DÉPENSÉ · MOIS" value={money(spentTotal)} sub={`${money(monthlyIncome - spentTotal)} après dépenses`}/></div><div className="panel v-income-panel"><span className="eyebrow">REVENUS DU MOIS</span><h3>Ajouter ou corriger un revenu.</h3><div className="v-fields"><label>Montant reçu · F<input type="number" min="0" value={incomeAmount} onChange={e => setIncomeAmount(e.target.value)}/></label><label>Libellé<input value={incomeNote} onChange={e => setIncomeNote(e.target.value)}/></label></div><button className="button-primary" onClick={addIncome}><Plus size={16}/> Ajouter le revenu</button><div className="v-edit-list">{monthlyIncomes.map(income => <div className="v-edit-row" key={income.id}><input aria-label="Date du revenu" type="date" value={income.date} onChange={e => setState(v => ({ ...v, incomes: v.incomes.map(x => x.id === income.id ? { ...x, date: e.target.value || x.date } : x) }))}/><input aria-label="Libellé du revenu" value={income.note} onChange={e => setState(v => ({ ...v, incomes: v.incomes.map(x => x.id === income.id ? { ...x, note: e.target.value } : x) }))}/><input aria-label="Montant du revenu" type="number" min="0" value={income.amount} onChange={e => setState(v => ({ ...v, incomes: v.incomes.map(x => x.id === income.id ? { ...x, amount: num(e.target.value) } : x) }))}/><button aria-label="Supprimer le revenu" onClick={() => setState(v => ({ ...v, incomes: v.incomes.filter(x => x.id !== income.id) }))}><Trash2 size={16}/></button></div>)}</div></div><div className="v-fin-grid">{categories.map(c => { const spent = monthlySpends.filter(x => x.category === c).reduce((sum, x) => sum + x.amount, 0), balance = (limits[c] || 0) - spent, draft = purchaseDrafts[c] || { name: "", amount: "" }; return <div className="panel v-budget-card" key={c}><span className="eyebrow">CATÉGORIE</span><h3>{c}</h3><div className="v-budget-totals"><div><small>Budget</small><label><input type="number" min="0" value={limits[c] || ""} onChange={e => setState(v => ({ ...v, monthBudgets: { ...v.monthBudgets, [budgetMonth]: { ...(v.monthBudgets[budgetMonth] || v.budgets), [c]: num(e.target.value) } } }))}/> F</label></div><div><small>Reste</small><strong className={balance < 0 ? "over" : ""}>{money(balance)}</strong></div></div><div className="v-progress"><span style={{ width: `${Math.min(100, limits[c] ? spent / limits[c] * 100 : 0)}%` }}/></div><small className="v-muted">Dépensé : {money(spent)}</small><div className="v-direct-purchase"><input aria-label={`Achat ${c}`} placeholder="Nom de l’achat" value={draft.name} onChange={e => setPurchaseDrafts(v => ({ ...v, [c]: { ...draft, name: e.target.value } }))}/><input aria-label={`Montant ${c}`} type="number" min="0" placeholder="Montant F" value={draft.amount} onChange={e => setPurchaseDrafts(v => ({ ...v, [c]: { ...draft, amount: e.target.value } }))}/><button onClick={() => addDirectPurchase(c)}><Plus size={16}/> Acheter</button></div></div>; })}</div><div className="panel v-savings"><div className="v-between"><div><span className="eyebrow">COMPTE D’ÉPARGNE</span><h3>Dépôts, retraits et solde chronologique.</h3></div><button className="button-secondary" onClick={exportSavings}><Download size={16}/> Exporter CSV</button></div><div className="v-fields"><label>Solde initial · F<input type="number" min="0" value={state.savingsOpeningBalance || ""} onChange={e => setState(v => ({ ...v, savingsOpeningBalance: num(e.target.value) }))}/></label><label>Date<input type="date" value={savingDate} onChange={e => setSavingDate(e.target.value || today)}/></label><label>Transaction<select value={savingKind} onChange={e => setSavingKind(e.target.value as "deposit" | "withdrawal")}><option value="deposit">Dépôt</option><option value="withdrawal">Retrait</option></select></label><label>Lieu<select value={savingLocation} onChange={e => setSavingLocation(e.target.value as "Agence" | "GAB")}><option>Agence</option><option>GAB</option></select></label><label>Montant · F<input type="number" min="0" value={savingAmount} onChange={e => setSavingAmount(e.target.value)}/></label></div><button className="button-primary" onClick={addSaving}><Plus size={16}/> Enregistrer la transaction</button><div className="v-metrics"><Metric label="TRANSACTIONS · MOIS" value={String(selectedMonthTx.length)} sub={budgetMonth}/><Metric label="RETRAIT MOYEN · MOIS" value={money(Math.round(yearWithdrawals / monthsForAverage))} sub={`moyenne ${selectedYear}`}/><Metric label="RETIRÉ · MOIS" value={money(selectedMonthWithdrawals)} sub="total depuis le début du mois"/><Metric label="ÉPARGNE ACTUELLE" value={money(currentSavings)} sub="solde après toutes les transactions"/></div><div className="v-table-filter"><label>Du<input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)}/></label><label>Au<input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)}/></label></div><div className="v-table-wrap"><table className="v-table v-table-edit"><thead><tr><th>ID</th><th>Date</th><th>Type</th><th>Lieu</th><th>Montant</th><th>Solde après opération</th><th /></tr></thead><tbody>{filteredTransactions.map(tx => <tr key={tx.id}><td>{tx.annualId}/{tx.date.slice(0, 4)}</td><td><input aria-label="Date transaction" type="date" value={tx.date} onChange={e => updateSaving(tx.id, { date: e.target.value || tx.date })}/></td><td><select aria-label="Type transaction" value={tx.kind} onChange={e => updateSaving(tx.id, { kind: e.target.value as "deposit" | "withdrawal" })}><option value="deposit">Dépôt</option><option value="withdrawal">Retrait</option></select></td><td><select aria-label="Lieu transaction" value={tx.location} onChange={e => updateSaving(tx.id, { location: e.target.value as "Agence" | "GAB" })}><option>Agence</option><option>GAB</option></select></td><td><input aria-label="Montant transaction" type="number" min="0" value={tx.amount} onChange={e => updateSaving(tx.id, { amount: num(e.target.value) })}/></td><td>{money(tx.balance)}</td><td><button aria-label="Supprimer" onClick={() => setState(v => ({ ...v, savingsTransactions: v.savingsTransactions.filter(x => x.id !== tx.id) }))}><Trash2 size={15}/></button></td></tr>)}{!filteredTransactions.length && <tr><td colSpan={7}>Aucune transaction sur cette période.</td></tr>}</tbody></table></div></div><div className="panel"><span className="eyebrow">DÉPENSES DU MOIS</span><h3>Chaque achat peut être corrigé.</h3>{monthlySpends.length ? <div className="v-edit-list">{[...monthlySpends].reverse().map(x => <div className="v-edit-row v-edit-spend" key={x.id}><input aria-label="Date de la dépense" type="date" value={x.date} onChange={e => updateSpend(x.id, { date: e.target.value || x.date })}/><select aria-label="Catégorie de la dépense" value={x.category} onChange={e => updateSpend(x.id, { category: e.target.value })}>{categories.map(c => <option key={c}>{c}</option>)}</select><input aria-label="Nom de la dépense" value={x.note} onChange={e => updateSpend(x.id, { note: e.target.value })}/><input aria-label="Montant de la dépense" type="number" min="0" value={x.amount} onChange={e => updateSpend(x.id, { amount: num(e.target.value) })}/><button aria-label="Supprimer la dépense" onClick={() => setState(v => ({ ...v, spends: v.spends.filter(e => e.id !== x.id), meals: v.meals.map(m => m.expenseId === x.id ? { ...m, expenseId: undefined, cost: 0 } : m) }))}><Trash2 size={15}/></button></div>)}</div> : <p>Aucun achat enregistré ce mois.</p>}</div></>;
}

function EvolutionTab({ state, setState, today, days7, sleep7, proteinTarget, notify }: {
    state: State;
    setState: React.Dispatch<React.SetStateAction<State>>;
    today: string;
    days7: string[];
    sleep7: number[];
    proteinTarget: number;
    notify: (message: string) => void;
}) {
    const [period, setPeriod] = useState<1 | 7 | 30 | 90 | 365>(7), [weightDate, setWeightDate] = useState(today), [weightValue, setWeightValue] = useState("");
    const start = addDays(today, -(period - 1));
    const previousEnd = addDays(start, -1), previousStart = addDays(previousEnd, -(period - 1));
    const summary = (from: string, to: string) => {
        const runs = state.runs.filter(x => x.date >= from && x.date <= to);
        const sessions = state.sessions.filter(x => x.date >= from && x.date <= to);
        const meals = state.meals.filter(x => x.date >= from && x.date <= to);
        const nights = state.nights.filter(x => x.date >= from && x.date <= to && estimateNight(x) > 0);
        const nutritionDays = new Set(meals.map(x => x.date)).size;
        return {
            runs, sessions, meals, nights,
            distance: runs.reduce((sum, x) => sum + x.km, 0),
            activeDays: new Set([...runs.map(x => x.date), ...sessions.map(x => x.date)]).size,
            trainingDays: new Set(sessions.map(x => x.date)).size,
            sets: sessions.reduce((sum, x) => sum + x.sets.length, 0),
            avgProtein: nutritionDays ? Math.round(meals.reduce((sum, x) => sum + (x.protein || 0) * x.portion, 0) / nutritionDays) : 0,
            avgSleep: nights.length ? nights.reduce((sum, x) => sum + estimateNight(x), 0) / nights.length : 0,
            nutritionDays
        };
    };
    const current = summary(start, today), previous = summary(previousStart, previousEnd);
    const periodRuns = current.runs, periodSessions = current.sessions;
    const weights = [...state.weights].sort((a, b) => a.date.localeCompare(b.date));
    const visibleWeights = weights.filter(x => x.date >= start && x.date <= today);
    const firstWeight = visibleWeights[0]?.kg;
    const lastWeight = visibleWeights.at(-1)?.kg;
    const deltaWeight = firstWeight !== undefined && lastWeight !== undefined ? lastWeight - firstWeight : null;
    const addWeight = () => {
        if (!num(weightValue))
            return notify("Indique un poids valide.");
        setState(v => ({ ...v, weight: num(weightValue), weights: [...v.weights.filter(x => x.date !== weightDate), { date: weightDate, kg: num(weightValue) }].sort((a, b) => a.date.localeCompare(b.date)) }));
        setWeightValue("");
        notify("Poids hebdomadaire enregistré.");
    };
    const weightChart = visibleWeights.slice(-10);
    const plannedDaysPerWeek = new Set([...state.runDays, ...state.strengthDays]).size || 1;
    const expectedActiveDays = Math.max(1, Math.round(period / 7 * plannedDaysPerWeek));
    const weightScore = Math.min(100, Math.round(visibleWeights.length / Math.max(1, Math.ceil(period / 7)) * 100));
    const activityScore = Math.min(100, Math.round(current.activeDays / expectedActiveDays * 100));
    const proteinScore = Math.min(100, Math.round(current.avgProtein / Math.max(1, proteinTarget) * 100));
    const sleepScore = Math.min(100, Math.round(current.avgSleep / 7 * 100));
    const score = Math.round((weightScore + activityScore + proteinScore + sleepScore) / 4);
    const tone = (value: number) => value >= 80 ? "good" : value >= 50 ? "watch" : "alert";
    const verdict = score >= 80 ? "Trajectoire solide" : score >= 50 ? "Progression à stabiliser" : "Données ou constance insuffisantes";
    const deltaText = (value: number, suffix = "") => `${value > 0 ? "+" : ""}${Number.isInteger(value) ? value : value.toFixed(1)}${suffix}`;
    const compare = [
        { label: "Distance", previous: `${previous.distance.toFixed(1)} km`, current: `${current.distance.toFixed(1)} km`, delta: deltaText(current.distance - previous.distance, " km"), tone: tone(current.distance > 0 ? current.distance >= previous.distance ? 100 : 35 : 0) },
        { label: "Jours actifs", previous: String(previous.activeDays), current: String(current.activeDays), delta: deltaText(current.activeDays - previous.activeDays), tone: tone(current.activeDays > 0 ? current.activeDays >= previous.activeDays ? 100 : 35 : 0) },
        { label: "Protéines / jour", previous: `${previous.avgProtein} g`, current: `${current.avgProtein} g`, delta: deltaText(current.avgProtein - previous.avgProtein, " g"), tone: tone(proteinScore) },
        { label: "Sommeil moyen", previous: `${previous.avgSleep.toFixed(1)} h`, current: `${current.avgSleep.toFixed(1)} h`, delta: deltaText(current.avgSleep - previous.avgSleep, " h"), tone: tone(sleepScore) }
    ];
    return <>
        <div className="v-evo-head">
            <span className="eyebrow">ÉVOLUTION / CENTRE DE PROGRESSION</span>
            <h1>Les données montrent<br/>ce qui avance.</h1>
            <p>Chaque indicateur compare la période actuelle aux {period} jours précédents. Le vert signale un repère atteint, l’orange une progression partielle et le rouge un écart à corriger.</p>
            <div className="v-tabs v-evo-tabs"><button className={period === 1 ? "active" : ""} onClick={() => setPeriod(1)}>1 jour</button><button className={period === 7 ? "active" : ""} onClick={() => setPeriod(7)}>1 semaine</button><button className={period === 30 ? "active" : ""} onClick={() => setPeriod(30)}>30 jours</button><button className={period === 90 ? "active" : ""} onClick={() => setPeriod(90)}>90 jours</button><button className={period === 365 ? "active" : ""} onClick={() => setPeriod(365)}>1 an</button></div>
        </div>
        <div className={`panel v-evo-command ${tone(score)}`}>
            <div className="v-evo-score" style={{ background: `conic-gradient(var(--evo-color) ${score * 3.6}deg, #ffffff12 0deg)` }}><div><strong>{score}</strong><span>/100</span></div></div>
            <div className="v-evo-verdict"><span className="eyebrow">BILAN · {period} JOURS</span><h2>{verdict}</h2><p>Score calculé à partir de la régularité des données de poids, des jours actifs, des protéines consommées et du sommeil estimé.</p></div>
            <img src="/saliou-profile.jpg" alt="Saliou THIAW"/>
        </div>
        <div className="v-evo-pillars">
            {[{ label: "Suivi du poids", value: `${lastWeight ?? state.weight} kg`, detail: `${visibleWeights.length} mesure(s) / ${Math.ceil(period / 7)} attendue(s)`, score: weightScore }, { label: "Activité", value: `${current.activeDays} jours`, detail: `${current.distance.toFixed(1)} km · ${current.trainingDays} jour(s) d’entraînement`, score: activityScore }, { label: "Protéines", value: `${current.avgProtein} g/j`, detail: `repère indicatif ${proteinTarget} g/j`, score: proteinScore }, { label: "Sommeil", value: `${current.avgSleep.toFixed(1)} h`, detail: `${current.nights.length} nuit(s) · repère 7 h`, score: sleepScore }].map(item => <div className={`v-evo-pillar ${tone(item.score)}`} key={item.label}><div><span>{item.label}</span><i>{item.score}%</i></div><strong>{item.value}</strong><small>{item.detail}</small><b><em style={{ width: `${item.score}%` }}/></b></div>)}
        </div>
        <div className="panel v-evo-compare"><span className="eyebrow">PÉRIODE ACTUELLE VS PÉRIODE PRÉCÉDENTE</span><h3>La comparaison centrale.</h3><div className="v-evo-compare-head"><span>Indicateur</span><span>Avant</span><span>Maintenant</span><span>Écart</span></div>{compare.map(item => <div className="v-evo-compare-row" key={item.label}><b>{item.label}</b><span>{item.previous}</span><strong>{item.current}</strong><em className={item.tone}>{item.delta}</em></div>)}</div>
        <div className="v-two v-evo-detail">
            <div className="panel"><span className="eyebrow">POIDS HEBDOMADAIRE</span><h3>{deltaWeight === null ? "Deux mesures sont nécessaires pour une tendance." : `${firstWeight?.toFixed(1)} kg → ${lastWeight?.toFixed(1)} kg · ${deltaText(deltaWeight, " kg")}`}</h3><div className="v-fields"><label>Date<input type="date" value={weightDate} onChange={e => setWeightDate(e.target.value || today)}/></label><label>Poids · kg<input type="number" min="1" step="0.1" value={weightValue} onChange={e => setWeightValue(e.target.value)}/></label></div><button className="button-primary" onClick={addWeight}><Plus size={16}/> Enregistrer le poids</button>{weightChart.length ? <Trend values={weightChart.map(x => x.kg)} labels={weightChart.map(x => x.date.slice(5))} unit=" kg"/> : <p>Aucune mesure enregistrée sur cette période.</p>}<div className="v-comparison">{weightChart.slice().reverse().map(x => <div key={x.date}><span>{x.date}</span><strong>{x.kg.toFixed(1)} kg</strong></div>)}</div></div>
            <div className="panel"><span className="eyebrow">ENTRAÎNEMENT · PAR MOUVEMENT</span><h3>Première série comparée à la dernière.</h3>{Array.from(new Set(periodSessions.map(x => x.name))).map(name => { const entries = periodSessions.filter(x => x.name === name).sort((a, b) => a.date.localeCompare(b.date)); const first = entries[0]?.sets.at(-1), last = entries.at(-1)?.sets.at(-1); return <div className="v-record" key={name}><div><b>{name}</b><small>{entries[0]?.date} → {entries.at(-1)?.date}</small></div><strong>{first?.reps || 0} → {last?.reps || 0} reps</strong></div>; })}{!periodSessions.length && <p>Les comparaisons apparaîtront après les premières séries.</p>}<div className="v-evo-mini"><span>{current.trainingDays}<small>jours</small></span><span>{current.sets}<small>séries</small></span></div></div>
        </div>
        <div className="v-two"><div className="panel"><span className="eyebrow">SOMMEIL · 7 NUITS</span><h3>Durée estimée après déduction des réveils.</h3><Trend values={sleep7} labels={days7.map(k => dayNames[weekday(k)])} unit=" h"/></div><div className="panel"><span className="eyebrow">NUTRITION · 7 JOURS</span><h3>Protéines réellement enregistrées.</h3><Trend values={days7.map(k => Math.round(state.meals.filter(m => m.date === k).reduce((sum, m) => sum + (m.protein || 0) * m.portion, 0)))} labels={days7.map(k => dayNames[weekday(k)])} unit=" g"/></div></div>
    </>;
}
export default function Page() {
    const [s, setS] = useState<State>(initial), [loaded, setLoaded] = useState(false), [financeMonth, setFinanceMonth] = useState(dateKey().slice(0, 7)), [tab, setTab] = useState<Tab>("today"), [date, setDate] = useState(""), [foodTab, setFoodTab] = useState("Petit-déjeuner"), [draftPrices, setDraftPrices] = useState<Record<string, string>>({}), [exercise, setExercise] = useState("Tractions"), [customExercise, setCustomExercise] = useState(""), [reps, setReps] = useState(""), [kg, setKg] = useState(""), [rpe, setRpe] = useState(""), [knee, setKnee] = useState("0"), [km, setKm] = useState(""), [duration, setDuration] = useState(""), [effort, setEffort] = useState("3"), [runKind, setRunKind] = useState<"run" | "walk">("run"), [runNote, setRunNote] = useState(""), [wakeTime, setWakeTime] = useState(""), [wakeEnd, setWakeEnd] = useState(""), [timer, setTimer] = useState(0), [timerOn, setTimerOn] = useState(false), [message, setMessage] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [editingRunId, setEditingRunId] = useState<string | null>(null);
    const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const file = useRef<HTMLInputElement>(null);
    const today = dateKey();
    useEffect(() => {
        setDate(dateKey());
        const requestedTab = new URLSearchParams(window.location.search).get("tab");
        if (nav.some(([key]) => key === requestedTab))
            setTab(requestedTab as Tab);
        try {
            const raw = localStorage.getItem("saliou-os-v1");
            if (raw) {
                const v = JSON.parse(raw);
                if (valid(v))
                    setS(migrate(v));
            }
        }
        catch { }
        setLoaded(true);
    }, []);
    useEffect(() => {
        const onBack = () => {
            const requestedTab = new URLSearchParams(window.location.search).get("tab");
            setTab(nav.some(([key]) => key === requestedTab) ? requestedTab as Tab : "today");
            setMobileMenuOpen(false);
            window.scrollTo({ top: 0 });
        };
        window.addEventListener("popstate", onBack);
        return () => window.removeEventListener("popstate", onBack);
    }, []);
    useEffect(() => {
        if (loaded)
            try {
                localStorage.setItem("saliou-os-v1", JSON.stringify(s));
            }
            catch {
                setMessage("Stockage saturé : exporte une sauvegarde de tes données.");
            }
    }, [s, loaded]);
    useEffect(() => { document.documentElement.dataset.theme = s.theme === "light" ? "light" : "dark"; }, [s.theme]);
    useEffect(() => {
        if (!timerOn)
            return;
        const id = window.setInterval(() => setTimer(v => v + 1), 1000);
        return () => window.clearInterval(id);
    }, [timerOn]);
    const d = date || today, month = monthOf(today), budgetMonth = financeMonth, monthLimits = s.monthBudgets[budgetMonth] || s.budgets, currentFoodLimit = s.monthBudgets[month]?.Alimentation ?? s.budgets.Alimentation, runs = s.runs.filter(r => r.date === d), sessions = s.sessions.filter(x => x.date === d), meals = s.meals.filter(m => m.date === d), night = s.nights.find(n => n.date === d), monthly = s.spends.filter(e => monthOf(e.date) === budgetMonth), foodSpent = s.spends.filter(e => monthOf(e.date) === month && e.category === "Alimentation").reduce((a, e) => a + e.amount, 0), foodLeft = (currentFoodLimit || 0) - foodSpent, last = [...s.runs].filter(r => r.date < d).sort((a, b) => b.date.localeCompare(a.date))[0];
    const days7 = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
    const run7 = days7.map(k => Math.round(s.runs.filter(r => r.date === k).reduce((a, r) => a + r.km, 0) * 10) / 10);
    const sleep7 = days7.map(k => Math.round(estimateNight(s.nights.find(n => n.date === k) || { date: k, hours: 0, wakes: 0, quality: 0 }) * 10) / 10);
    const calorie = meals.reduce((a, m) => a + (m.kcal || 0) * m.portion, 0), protein = meals.reduce((a, m) => a + (m.protein || 0) * m.portion, 0), mealCost = meals.reduce((a, m) => a + (m.cost || 0), 0), burned = runs.reduce((a, r) => a + activityCalories(r, s.weight), 0), proteinTarget = Math.round(s.weight * 1.6);
    const recordedStrengthMinutes = Math.max(0, ...sessions.map(x => x.durationMin || 0));
    const averageSessionRpe = sessions.length ? sessions.flatMap(x => x.sets).reduce((sum, x) => sum + (x.rpe || 6), 0) / Math.max(1, sessions.flatMap(x => x.sets).length) : 6;
    const strengthBurned = strengthCalories(Math.max(recordedStrengthMinutes, Math.floor(timer / 60)), s.weight, averageSessionRpe);
    const totalActivityBurned = burned + strengthBurned;
    const todayMonthLimits = s.monthBudgets[month] || s.budgets;
    const monthIncome = s.incomes.filter(x => monthOf(x.date) === month).reduce((sum, x) => sum + x.amount, 0);
    const monthSpent = s.spends.filter(x => monthOf(x.date) === month).reduce((sum, x) => sum + x.amount, 0);
    const monthSpendingBudget = categories.filter(x => x !== "Épargne").reduce((sum, x) => sum + (todayMonthLimits[x] || 0), 0);
    const monthSavingsGoal = todayMonthLimits["Épargne"] || 0;
    const monthSavingsDeposits = s.savingsTransactions.filter(x => monthOf(x.date) === month && x.kind === "deposit").reduce((sum, x) => sum + x.amount, 0);
    const monthSavingsWithdrawals = s.savingsTransactions.filter(x => monthOf(x.date) === month && x.kind === "withdrawal").reduce((sum, x) => sum + x.amount, 0);
    const monthNetSavings = monthSavingsDeposits - monthSavingsWithdrawals;
    const monthAvailable = monthIncome - monthSpent - monthNetSavings;
    const savingsBalance = s.savingsOpeningBalance + s.savingsTransactions.reduce((sum, x) => sum + (x.kind === "deposit" ? x.amount : -x.amount), 0);
    const financeTone = monthAvailable < 0 || monthIncome > 0 && monthSpent > monthIncome || monthSpendingBudget > 0 && monthSpent > monthSpendingBudget ? "alert" : monthSavingsGoal > 0 && monthNetSavings < monthSavingsGoal ? "watch" : monthSpent > 0 || monthIncome > 0 ? "good" : "neutral";
    const financeVerdict = financeTone === "alert" ? "Dépenses au-dessus du cadre fixé" : financeTone === "watch" ? "Budget tenu, objectif d’épargne en cours" : financeTone === "good" ? monthSavingsGoal > 0 ? "Budget et objectif d’épargne respectés" : "Dépenses sous contrôle" : "Ajoute un revenu ou une dépense pour obtenir le diagnostic";
    const todayRunDone = s.runs.some(x => x.date === today), todayRunDue = s.runDays.includes(weekday(today));
    const todayTrainingDone = s.sessions.some(x => x.date === today), todayTrainingDue = s.strengthDays.includes(weekday(today));
    const todayMeals = s.meals.filter(x => x.date === today), todayNutritionTone = todayMeals.length >= 3 ? "good" : todayMeals.length ? "watch" : "alert";
    const todayNight = s.nights.find(x => x.date === today), todaySleepHours = todayNight ? estimateNight(todayNight) : 0, todaySleepTone = todaySleepHours >= 7 ? "good" : todaySleepHours > 0 ? "watch" : "alert";
    const todayRunTone = todayRunDone ? "good" : todayRunDue ? "alert" : "neutral", todayTrainingTone = todayTrainingDone ? "good" : todayTrainingDue ? "alert" : "neutral";
    const dueScores = [todayTrainingDone ? 1 : 0, todayMeals.length >= 3 ? 1 : todayMeals.length ? .5 : 0, todaySleepHours >= 7 ? 1 : todaySleepHours > 0 ? .5 : 0, financeTone === "good" ? 1 : financeTone === "watch" ? .5 : financeTone === "neutral" ? .5 : 0, ...(todayRunDue ? [todayRunDone ? 1 : 0] : [])];
    const todayScore = Math.round(dueScores.reduce((sum, value) => sum + value, 0) / dueScores.length * 100);
    const changeNight = (key: keyof Night, value: string) => setS(v => { const old = v.nights.find(n => n.date === d) || { date: d, hours: 0, wakes: 0, quality: 3 }; const next = { ...old, [key]: ["hours", "wakes", "quality", "awakeMinutes", "soreness"].includes(key) ? num(value) : value }; return { ...v, nights: [...v.nights.filter(n => n.date !== d), next] }; });
    const mark = (kind: "run" | "strength", value: "rest" | "missed") => setS(v => ({ ...v, marks: { ...v.marks, [d]: { ...v.marks[d], [kind]: value } } }));
    const addRun = () => {
        if (!num(km) || !num(duration)) {
            setMessage("Indique une distance et une durée supérieures à zéro.");
            return;
        }
        setS(v => ({ ...v, runs: editingRunId
            ? v.runs.map(r => r.id === editingRunId ? { ...r, date: d, kind: runKind, km: num(km), min: num(duration), effort: num(effort), note: runNote.trim() } : r)
            : [...v.runs, { id: uid(), date: d, kind: runKind, km: num(km), min: num(duration), effort: num(effort), note: runNote.trim() }] }));
        setKm("");
        setDuration("");
        setRunNote("");
        setEditingRunId(null);
        setMessage((runKind === "walk" ? "Marche" : "Course") + (editingRunId ? " modifiée" : " enregistrée") + " pour le " + d);
    };
    const addSet = () => {
        if (!num(reps)) {
            setMessage("Renseigne au moins une répétition réelle.");
            return;
        }
        const name = customExercise.trim() || exercise;
        setS(v => {
            const set = { reps: num(reps), kg: num(kg), rpe: num(rpe) };
            if (editingSessionId) return { ...v, sessions: v.sessions.map(x => x.id === editingSessionId ? { ...x, date: d, name, sets: x.sets.length ? [...x.sets.slice(0, -1), set] : [set], knee: num(knee) } : x) };
            const found = v.sessions.find(x => x.date === d && x.name === name);
            return { ...v, sessions: found ? v.sessions.map(x => x.id === found.id ? { ...x, sets: [...x.sets, set], knee: num(knee) } : x) : [...v.sessions, { id: uid(), date: d, name, sets: [set], knee: num(knee) }] };
        });
        setReps("");
        setKg("");
        setRpe("");
        setCustomExercise("");
        setEditingSessionId(null);
        setMessage(editingSessionId ? "Série modifiée" : "Série enregistrée");
    };
    const addFood = (f: typeof foods[string][number]) => { setS(v => ({ ...v, meals: [...v.meals, { id: uid(), date: d, slot: foodTab, name: f.name, portion: 1, kcal: f.kcal, protein: f.protein, cost: 0 }] })); setMessage(f.name + " ajouté à la journée"); };
    const addSupplement = (x: typeof supplements[number]) => {
        if (s.supplements[d]?.[x.name]) {
            setS(v => {
                const matchingMeals = v.meals.filter(m => m.date === d && m.slot === "Complément" && m.name.startsWith(x.name));
                const linkedExpenses = new Set(matchingMeals.map(m => m.expenseId).filter(Boolean));
                return {
                    ...v,
                    meals: v.meals.filter(m => !matchingMeals.some(item => item.id === m.id)),
                    spends: v.spends.filter(expense => !linkedExpenses.has(expense.id)),
                    supplements: { ...v.supplements, [d]: { ...v.supplements[d], [x.name]: false } }
                };
            });
            setMessage(x.name + " retiré de la journée.");
            return;
        }
        setS(v => ({ ...v, meals: [...v.meals, { id: uid(), date: d, slot: "Complément", name: `${x.name} · ${x.brand}`, portion: 1, kcal: x.kcal, protein: x.protein, cost: 0 }], supplements: { ...v.supplements, [d]: { ...v.supplements[d], [x.name]: true } } }));
        setMessage(x.name + " ajouté aux consommations du jour");
    };
    const addWake = () => {
        if (!wakeTime || !wakeEnd)
            return setMessage("Indique l’heure du réveil et l’heure du rendormissement.");
        if (!elapsedMinutes(wakeTime, wakeEnd))
            return setMessage("L’interruption doit avoir une durée supérieure à zéro.");
        setS(v => { const old = v.nights.find(n => n.date === d) || { date: d, hours: 0, wakes: 0, quality: 3 }; const periods = [...(old.wakePeriods || []), { id: uid(), start: wakeTime, end: wakeEnd }].sort((a, b) => a.start.localeCompare(b.start)); return { ...v, nights: [...v.nights.filter(n => n.date !== d), { ...old, wakePeriods: periods, wakes: periods.length }] }; });
        setWakeTime("");
        setWakeEnd("");
        setMessage("Interruption nocturne déduite du sommeil estimé.");
    };
    const finishTraining = () => {
        const minutes = Math.max(1, Math.round(timer / 60));
        if (!sessions.length)
            return setMessage("Enregistre au moins une série avant de terminer la séance.");
        setS(v => ({ ...v, sessions: v.sessions.map(x => x.date === d ? { ...x, durationMin: minutes } : x) }));
        setTimerOn(false);
        setMessage(`${minutes} min enregistrées · environ ${strengthCalories(minutes, s.weight, averageSessionRpe)} kcal dépensées.`);
    };
    const enableNotifications = async () => {
        if (!("Notification" in window)) {
            setMessage("Les notifications ne sont pas disponibles sur ce navigateur.");
            return;
        }
        const permission = await Notification.requestPermission();
        setS(v => ({ ...v, notifications: permission === "granted" }));
        setMessage(permission === "granted" ? "Notifications autorisées" : "Notifications non autorisées");
    };
    const setMealCost = (m: Meal, value: number) => {
        if (!positive(value))
            return;
        setS(v => { const expenseId = m.expenseId || uid(); return { ...v, meals: v.meals.map(x => x.id === m.id ? { ...x, cost: value, expenseId: value > 0 ? expenseId : undefined } : x), spends: [...v.spends.filter(x => x.id !== m.expenseId), ...(value > 0 ? [{ id: expenseId, date: m.date, category: "Alimentation", amount: value, note: m.name }] : [])] }; });
    };
    const removeMeal = (m: Meal) => setS(v => ({ ...v, meals: v.meals.filter(x => x.id !== m.id), spends: v.spends.filter(x => x.id !== m.expenseId) }));
    const saveFile = () => { const blob = new Blob([JSON.stringify({ version: 2, exportedAt: new Date().toISOString(), data: s }, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob), a = document.createElement("a"); a.href = url; a.download = "saliou-os-sauvegarde-" + today + ".json"; a.click(); URL.revokeObjectURL(url); };
    const importFile = async (f: File) => {
        try {
            if (f.size > 10000000)
                throw Error("Fichier trop volumineux");
            const parsed = JSON.parse(await f.text());
            const data = parsed.data || parsed;
            if (!valid(data))
                throw Error("Format de sauvegarde non reconnu");
            const restored = migrate(data);
            if (!window.confirm("Remplacer les données actuelles par cette sauvegarde ? Exporte d’abord les données actuelles si nécessaire."))
                return;
            setS(restored);
            setMessage("Sauvegarde restaurée");
        }
        catch (e) {
            setMessage(e instanceof Error ? e.message : "Import impossible");
        }
    };
    const go = (next: Tab) => {
        if (next !== tab) {
            const url = next === "today" ? window.location.pathname : `${window.location.pathname}?tab=${next}`;
            window.history.pushState({ tab: next }, "", url);
        }
        setTab(next);
        setDate(today);
        setMessage("");
        setMobileMenuOpen(false);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };
    const normalizedSearch = searchText(searchQuery.trim());
    const searchResults = normalizedSearch.length < 2 ? [] : [
        ...nav.filter(([, label]) => searchText(`${label} rubrique menu`).includes(normalizedSearch)).map(([key, label, icon]) => ({
            id: `nav-${key}`, type: "RUBRIQUE", icon, title: label, meta: "Ouvrir directement cette rubrique",
            select: () => { setSearchQuery(""); go(key); }
        })),
        ...categories.filter(category => searchText(`${category} budget dépense finance`).includes(normalizedSearch)).map(category => ({
            id: `category-${category}`, type: "CATÉGORIE FINANCE", icon: Wallet, title: category, meta: `Budget, achats et reste disponible · ${financeMonth}`,
            select: () => { setSearchQuery(""); go("budget"); }
        })),
        ...exercises.filter(item => searchText(`${item.name} ${item.group} ${item.why}`).includes(normalizedSearch)).map(item => ({
            id: `exercise-${item.name}`, type: "EXERCICE", icon: Dumbbell, title: item.name, meta: `${item.group} · ouvrir l’entraînement`,
            select: () => { setExercise(item.name); setCustomExercise(""); setSearchQuery(""); go("strength"); }
        })),
        ...supplements.filter(item => searchText(`${item.name} ${item.brand} complément`).includes(normalizedSearch)).map(item => ({
            id: `supplement-${item.name}`, type: "COMPLÉMENT", icon: Utensils, title: item.name, meta: `${item.brand} · ${item.kcal} kcal · ${item.protein} g protéines`,
            select: () => { setDate(today); addSupplement(item); setSearchQuery(""); setTab("nutrition"); }
        })),
        ...Object.entries(foods).flatMap(([slot, items]) => items.filter(item => searchText(`${item.name} ${slot}`).includes(normalizedSearch)).map(item => ({
            id: `food-${slot}-${item.name}`, type: "ALIMENT", icon: Utensils, title: item.name, meta: `${slot} · ${item.kcal} kcal · ${item.protein} g protéines`,
            select: () => { setS(v => ({ ...v, meals: [...v.meals, { id: uid(), date: today, slot, name: item.name, portion: 1, kcal: item.kcal, protein: item.protein, cost: 0 }] })); setSearchQuery(""); setMessage(`${item.name} ajouté à aujourd’hui`); }
        }))),
        ...s.spends.filter(item => searchText(`${item.note} ${item.category} ${item.date}`).includes(normalizedSearch)).map(item => ({
            id: `spend-${item.id}`, type: "DÉPENSE", icon: Wallet, title: item.note, meta: `${money(item.amount)} · ${item.category} · ${item.date}`,
            select: () => { setFinanceMonth(monthOf(item.date)); setTab("budget"); setDate(item.date); setSearchQuery(""); window.scrollTo({ top: 0, behavior: "smooth" }); }
        })),
        ...s.incomes.filter(item => searchText(`${item.note} revenu salaire ${item.date} ${item.amount}`).includes(normalizedSearch)).map(item => ({
            id: `income-${item.id}`, type: "REVENU", icon: Wallet, title: item.note, meta: `${money(item.amount)} · ${item.date}`,
            select: () => { setFinanceMonth(monthOf(item.date)); setSearchQuery(""); go("budget"); }
        })),
        ...s.savingsTransactions.filter(item => searchText(`${item.kind === "deposit" ? "depot" : "retrait"} epargne ${item.location} ${item.date} ${item.amount}`).includes(normalizedSearch)).map(item => ({
            id: `saving-${item.id}`, type: "ÉPARGNE", icon: Wallet, title: item.kind === "deposit" ? "Dépôt" : "Retrait", meta: `${money(item.amount)} · ${item.location} · ${item.date}`,
            select: () => { setFinanceMonth(monthOf(item.date)); setSearchQuery(""); go("budget"); }
        })),
        ...s.runs.filter(item => searchText(`sport ${item.kind === "walk" ? "marche" : "course"} ${item.note} ${item.date}`).includes(normalizedSearch)).map(item => ({
            id: `run-${item.id}`, type: item.kind === "walk" ? "MARCHE" : "COURSE", icon: Activity, title: `${item.km} km · ${item.min} min`, meta: `${item.date} · ${pace(item.min, item.km)}`,
            select: () => { setTab("run"); setDate(item.date); setSearchQuery(""); window.scrollTo({ top: 0, behavior: "smooth" }); }
        })),
        ...s.sessions.filter(item => searchText(`${item.name} sport entrainement ${item.date}`).includes(normalizedSearch)).map(item => ({
            id: `session-${item.id}`, type: "ENTRAÎNEMENT", icon: Dumbbell, title: item.name, meta: `${item.date} · ${item.sets.length} série(s)`,
            select: () => { setTab("strength"); setDate(item.date); setSearchQuery(""); window.scrollTo({ top: 0, behavior: "smooth" }); }
        })),
        ...s.meals.filter(item => searchText(`${item.name} ${item.slot} repas nutrition ${item.date}`).includes(normalizedSearch)).map(item => ({
            id: `meal-${item.id}`, type: "REPAS ENREGISTRÉ", icon: Utensils, title: item.name, meta: `${item.slot} · ${item.date}`,
            select: () => { setDate(item.date); setSearchQuery(""); setTab("nutrition"); window.scrollTo({ top: 0, behavior: "smooth" }); }
        })),
        ...s.nights.filter(item => searchText(`sommeil nuit reveil ${item.date}`).includes(normalizedSearch)).map(item => ({
            id: `night-${item.date}`, type: "SOMMEIL", icon: Moon, title: `Nuit du ${item.date}`, meta: `${estimateNight(item).toFixed(1)} h estimées`,
            select: () => { setDate(item.date); setSearchQuery(""); setTab("sleep"); window.scrollTo({ top: 0, behavior: "smooth" }); }
        })),
        ...s.weights.filter(item => searchText(`poids evolution ${item.date} ${item.kg}`).includes(normalizedSearch)).map(item => ({
            id: `weight-${item.date}`, type: "POIDS", icon: BarChart3, title: `${item.kg} kg`, meta: item.date,
            select: () => { setSearchQuery(""); go("evolution"); }
        }))
    ].slice(0, 12);
    if (!loaded)
        return <div className="loading"><span>ST</span><small>SALIOU THIAW · ÉVOLUTION</small></div>;
    const header = (tag: string, title: string, description: string) => <div className="v-sectionhead"><span className="eyebrow">{tag}</span><h1>{title}</h1><p>{description}</p></div>;
    return <div className="shell"><aside className="sidebar"><button className="brand" onClick={() => go("today")}><img className="v-brand-photo" src="/icon-192.png" alt=""/><span>SALIOU <em>THIAW</em><small>ÉVOLUTION · PERSONAL TRACKER</small></span></button><span className="side-title">TON ESPACE</span><nav>{nav.map(([key, label, Icon]) => <button key={key} className={`side-link ${tab === key ? "active" : ""}`} onClick={() => go(key)}><Icon size={18}/>{label}<span className="side-indicator"/></button>)}</nav><div className="sidebar-foot"><span>JOUR APRÈS JOUR</span><button onClick={() => go("settings")}><Shield size={16}/> Sauvegarder mes données <ArrowRight size={14}/></button></div></aside><div className="main"><header className="topline"><div><span className="live-dot"/> SALIOU ÉVOLUTION <i>/</i> {nav.find(x => x[0] === tab)?.[1]}</div><div>{new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}<img className="v-top-avatar" src="/icon-192.png" alt="Portrait de Saliou"/></div></header><main className="content" key={tab}>
 <div className={`v-global-search ${searchQuery ? "open" : ""}`}><div className="v-global-search-field"><Search size={17}/><input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Tout rechercher : repas, sport, finance…" aria-label="Recherche globale" autoComplete="off"/>{searchQuery && <button onClick={() => setSearchQuery("")} aria-label="Effacer la recherche"><X size={15}/></button>}<kbd>⌕</kbd></div>{normalizedSearch.length >= 2 && <div className="v-search-results">{searchResults.length ? searchResults.map(result => { const Icon = result.icon; return <button key={result.id} onClick={result.select}><span className="v-search-icon"><Icon size={17}/></span><span><small>{result.type}</small><b>{result.title}</b><em>{result.meta}</em></span><ArrowRight size={15}/></button>; }) : <p>Aucun résultat dans les rubriques, catégories ou historiques.</p>}</div>}</div>
 {message && <div role="status" className="v-toast">{message}<button onClick={() => setMessage("")} aria-label="Fermer">×</button></div>}
 {tab === "today" && <section className="v-today-command"><div className="v-today-command-head"><div><span className="eyebrow">TABLEAU DE BORD · {today}</span><h2>Où tu en es aujourd’hui.</h2><p>Vert : renseigné ou atteint. Rouge : prévu mais absent. Orange : partiellement complété.</p></div><div className={`v-today-score ${todayScore >= 80 ? "good" : todayScore >= 50 ? "watch" : "alert"}`}><strong>{todayScore}</strong><span>%</span><small>du jour</small></div></div><div className="v-today-status-grid">{[
    { key: "run" as Tab, label: "Course & marche", icon: Activity, tone: todayRunTone, value: todayRunDone ? `${s.runs.filter(x => x.date === today).reduce((sum, x) => sum + x.km, 0).toFixed(1)} km` : todayRunDue ? "À faire" : "Jour libre", detail: todayRunDone ? "activité enregistrée" : todayRunDue ? "prévue, non renseignée" : "aucune course imposée" },
    { key: "strength" as Tab, label: "Entraînement", icon: Dumbbell, tone: todayTrainingTone, value: todayTrainingDone ? `${s.sessions.filter(x => x.date === today).reduce((sum, x) => sum + x.sets.length, 0)} séries` : todayTrainingDue ? "À faire" : "Repos", detail: todayTrainingDone ? "séance enregistrée" : todayTrainingDue ? "prévu, non renseigné" : "non programmé" },
    { key: "nutrition" as Tab, label: "Nutrition", icon: Utensils, tone: todayNutritionTone, value: `${Math.round(todayMeals.reduce((sum, x) => sum + (x.kcal || 0) * x.portion, 0))} kcal`, detail: `${todayMeals.length} aliment(s) · ${Math.round(todayMeals.reduce((sum, x) => sum + (x.protein || 0) * x.portion, 0))} g protéines` },
    { key: "sleep" as Tab, label: "Sommeil", icon: Moon, tone: todaySleepTone, value: todaySleepHours ? `${todaySleepHours.toFixed(1)} h` : "À noter", detail: todaySleepHours >= 7 ? "repère de 7 h atteint" : todaySleepHours > 0 ? "sous le repère de 7 h" : "aucune nuit renseignée" },
    { key: "budget" as Tab, label: "Finances", icon: Wallet, tone: financeTone, value: money(monthAvailable), detail: `Épargné ${money(monthNetSavings)} · dépensé ${money(monthSpent)}` }
].map(item => { const Icon = item.icon; return <button key={item.key} className={`v-today-status ${item.tone}`} onClick={() => go(item.key)}><div className="v-today-status-top"><span><Icon size={19}/>{item.label}</span><i>{item.tone === "good" ? "OK" : item.tone === "watch" ? "PARTIEL" : item.tone === "alert" ? "À FAIRE" : "LIBRE"}</i></div><strong>{item.value}</strong><small>{item.detail}</small><ArrowRight size={17}/></button>; })}</div></section>}
 {tab === "today" && <><div className="v-hero"><div className="v-hero-text"><span className="eyebrow">SALIOU THIAW · TON ESPACE PERSONNEL</span><h1>Le sommeil nourrit<br /><em>ta vigilance.</em></h1><p>Le CDC relie un sommeil suffisant à une meilleure attention, mémoire et santé cardiovasculaire. Ton journal met tes nuits en regard de tes courses, entraînements et repas.</p><div className="v-hero-actions"><button className="button-primary" onClick={() => go("run")}>Ouvrir mon journal <ArrowRight size={17}/></button><button className="button-secondary" onClick={() => go("evolution")}>Voir mon évolution</button></div></div><div className="v-hero-image" role="img" aria-label="Portrait de Saliou"><span>COURSE · MARCHE · ENTRAÎNEMENT · NUTRITION · SOMMEIL</span></div></div><div className="v-metrics"><Metric label="COURSE & MARCHE · 7 JOURS" value={`${run7.reduce((a, b) => a + b, 0).toFixed(1)} km`} sub={`${s.runs.filter(x => days7.includes(x.date)).length} activité(s) enregistrée(s)`}/><Metric label="ENTRAÎNEMENT · 7 JOURS" value={String(s.sessions.filter(x => days7.includes(x.date)).length)} sub="séances documentées"/><Metric label="NUTRITION · AUJOURD’HUI" value={`${Math.round(s.meals.filter(x => x.date === today).reduce((a, m) => a + (m.kcal ?? 0) * m.portion, 0))} kcal`} sub={`${Math.round(s.meals.filter(x => x.date === today).reduce((a, m) => a + (m.protein ?? 0) * m.portion, 0))} g de protéines`}/><Metric label="DERNIÈRE NUIT" value={s.nights.length ? `${estimateNight([...s.nights].sort((a, b) => b.date.localeCompare(a.date))[0]).toFixed(1)} h` : "—"} sub="référence générale : au moins 7 h"/></div><div className="panel v-day-balance"><div><span className="eyebrow">BILAN ÉNERGÉTIQUE ESTIMÉ</span><h3>Ce que la journée montre.</h3><p>Les protéines consommées restent un apport nutritionnel : elles ne sont pas soustraites comme des calories.</p></div><div className="v-balance-grid"><Metric label="MANGÉ" value={`${Math.round(calorie)} kcal`} sub="aliments et compléments"/><Metric label="ACTIVITÉ" value={`− ${totalActivityBurned} kcal`} sub="course, marche et entraînement"/><Metric label="PROTÉINES" value={`${Math.round(protein)} g`} sub={`repère ${proteinTarget} g`}/><Metric label="EAU" value={`${s.water[d] || 0} ml`} sub="ajoutée dans Nutrition"/></div></div><button className={`v-finance-feedback ${financeTone}`} onClick={() => go("budget")}><div><span className="eyebrow">FEEDBACK FINANCIER · {month}</span><h3>{financeVerdict}</h3><p>{monthSpendingBudget > 0 ? `${money(monthSpent)} dépensés sur ${money(monthSpendingBudget)} de budgets de dépenses.` : `${money(monthSpent)} dépensés ce mois. Attribue des budgets pour activer le contrôle par limite.`}</p></div><div className="v-finance-feedback-grid"><span><small>REVENU DU MOIS</small><strong>{money(monthIncome)}</strong></span><span><small>DÉPENSÉ</small><strong>{money(monthSpent)}</strong></span><span><small>ÉPARGNÉ NET</small><strong>{money(monthNetSavings)}</strong><em>{monthSavingsGoal > 0 ? `objectif ${money(monthSavingsGoal)}` : "objectif non fixé"}</em></span><span><small>RESTE DISPONIBLE</small><strong>{money(monthAvailable)}</strong></span></div><ArrowRight size={20}/></button><div className="v-two"><div className="panel"><span className="eyebrow">AUJOURD’HUI · {today}</span><h3>Course, marche, entraînement, repas, sommeil : quoi enregistrer aujourd’hui ?</h3><div className="v-home-links">{([["run", "Course & marche", s.runs.some(x => x.date === today) ? "Activité enregistrée" : "Ajouter une activité", Activity], ["strength", "Entraînement", s.sessions.some(x => x.date === today) ? "Séries enregistrées" : "Noter une série", Dumbbell], ["nutrition", "Nutrition", s.meals.filter(x => x.date === today).length + " aliment(s) noté(s)", Utensils], ["sleep", "Sommeil", s.nights.some(x => x.date === today) ? "Nuit renseignée" : "Noter ma nuit", Moon]] as const).map(([k, l, status, Icon]) => <button key={k} onClick={() => go(k)}><Icon size={20}/><span><b>{l}</b><small>{status}</small></span><ArrowRight size={16}/></button>)}</div></div><div className="panel v-profile"><img src="/saliou-profile.jpg" alt="Portrait de Saliou en tenue traditionnelle"/><div><span className="eyebrow">REPÈRE DE SANTÉ · OMS</span><h3>150 à 300 minutes d’activité modérée par semaine.</h3><p>Et au moins deux jours de renforcement. Ton suivi distingue ce qui a été prévu de ce qui a vraiment été fait.</p><a className="v-source-link" href="https://www.who.int/news-room/fact-sheets/detail/physical-activity" target="_blank" rel="noreferrer">Lire la recommandation de l’OMS ↗</a></div></div></div><div className="v-two"><Insight area="run" date={today}/><div className="panel"><span className="eyebrow">APERÇU FINANCES</span><h3>Des choix visibles.</h3><p>Le budget Alimentation réunit courses, repas achetés et achats du quotidien. Les dépenses se déduisent une seule fois.</p><button className="text-action" onClick={() => go("budget")}>Voir les dépenses du mois <ArrowRight size={16}/></button></div></div></>}
 {tab === "run" && <>{header("COURSE & MARCHE / LE JOURNAL", "Chaque activité construit une tendance mesurable.", "Choisis course ou marche, puis enregistre distance, durée et ressenti. Chaque activité reste modifiable après la saisie.")}<div className="v-metrics"><Metric label="DERNIÈRE ACTIVITÉ" value={last ? `${last.km} km` : "—"} sub={last ? `${last.kind === "walk" ? "Marche" : "Course"} · ${last.date} · ${pace(last.min, last.km)}` : "Aucune activité enregistrée"}/><Metric label="CE MOIS" value={`${s.runs.filter(x => monthOf(x.date) === month).reduce((a, r) => a + r.km, 0).toFixed(1)} km`} sub="course et marche"/><Metric label="CALORIES ESTIMÉES · JOUR" value={`${burned} kcal`} sub="activité enregistrée, estimation"/></div><div className="v-two v-main-grid"><Calendar date={d} setDate={setDate} kind="run" state={s} setState={setS}/><div className="panel"><span className="eyebrow">{d} · TON ACTIVITÉ</span><h3>{runs.length ? "Activité enregistrée" : "Qu’as-tu fait ce jour-là ?"}</h3>{runs.map(r => <div className="v-record" key={r.id}><div><b>{r.kind === "walk" ? "Marche" : "Course"} · {r.km} km · {r.min} min</b><small>{pace(r.min, r.km)} · ressenti {r.effort}/5 · ≈ {activityCalories(r, s.weight)} kcal dépensées</small>{r.note && <p>{r.note}</p>}</div><div className="v-record-actions"><button aria-label="Modifier l’activité" onClick={() => { setEditingRunId(r.id); setRunKind(r.kind || "run"); setKm(String(r.km)); setDuration(String(r.min)); setEffort(String(r.effort)); setRunNote(r.note || ""); }}><Pencil size={16}/></button><button aria-label="Supprimer l’activité" onClick={() => setS(v => ({ ...v, runs: v.runs.filter(x => x.id !== r.id) }))}><Trash2 size={16}/></button></div></div>)}<div className="v-tabs"><button className={runKind === "run" ? "active" : ""} onClick={() => setRunKind("run")}>Course</button><button className={runKind === "walk" ? "active" : ""} onClick={() => setRunKind("walk")}>Marche</button></div><div className="v-fields"><label>Distance · km<input type="number" min="0.1" step="0.1" placeholder="ex. 4,5" value={km} onChange={e => setKm(e.target.value)}/></label><label>Durée · minutes<input type="number" min="1" step="1" placeholder="ex. 30" value={duration} onChange={e => setDuration(e.target.value)}/></label><label>Effort ressenti · 1–5<input type="range" min="1" max="5" value={effort} onChange={e => setEffort(e.target.value)}/><small>{effort}/5</small></label><label>Comment tu te sens ?<input placeholder="Souffle, genou, plaisir, terrain…" value={runNote} onChange={e => setRunNote(e.target.value)}/></label></div><button className="button-primary v-wide" onClick={addRun}>{editingRunId ? <Pencil size={16}/> : <Plus size={16}/>} {editingRunId ? "Enregistrer les modifications" : `Enregistrer ${runKind === "walk" ? "ma marche" : "ma course"}`}</button>{editingRunId && <button className="v-cancel-edit" onClick={() => { setEditingRunId(null); setKm(""); setDuration(""); setRunNote(""); }}>Annuler la modification</button>}<div className="v-inline"><button onClick={() => mark("run", "rest")}>Repos choisi</button><button onClick={() => mark("run", "missed")}>Pas d’activité</button></div><p className="v-muted">Estimation utilisée : environ 1 kcal/kg/km pour la course et 0,5 kcal/kg/km pour la marche. L’application ne soustrait jamais des protéines : elle compare les protéines mangées à ton objectif musculaire.</p></div></div><div className="v-two"><div className="panel"><span className="eyebrow">DERNIERS 7 JOURS</span><h3>Distance quotidienne · course et marche.</h3><Trend values={run7} labels={days7.map(k => dayNames[weekday(k)])} unit=" km"/><p>La progression se lit sur plusieurs semaines. Une journée sans activité reste visible, sans effacer la continuité du journal.</p></div><div className="panel"><span className="eyebrow">PROCHAINE ACTIVITÉ</span><h3>Une suggestion fondée sur tes données.</h3><p>{s.nights.length && estimateNight([...s.nights].sort((a, b) => b.date.localeCompare(a.date))[0]) < 7 ? "Ta dernière nuit renseignée est sous 7 h : privilégie une marche ou une course facile selon ton ressenti." : last ? `Après ${last.km} km, refais une distance similaire à allure confortable avant d’augmenter progressivement.` : "Commence par une durée confortable, même courte, puis note le ressenti pour guider la suite."}</p><p className="v-muted">Une gêne au genou qui augmente ou persiste mérite une évaluation professionnelle.</p></div></div><Insight area="run" date={d}/></>}
 {tab === "strength" && <>{header("ENTRAÎNEMENT / TON PROGRAMME", "Chaque série devient une donnée de progression.", "Tractions, pompes, haltères et élastiques. Les séries enregistrées restent modifiables.")}<div className="v-metrics"><Metric label="DURÉE · SÉANCE" value={`${Math.max(recordedStrengthMinutes, Math.floor(timer / 60))} min`} sub="chronomètre enregistré"/><Metric label="CALORIES · ESTIMATION" value={`${strengthBurned} kcal`} sub="selon durée, poids et RPE"/><Metric label="PROTÉINES SOUSTRAITES" value="0 g" sub="les protéines consommées ne sont pas brûlées comme un budget"/></div><div className="v-two v-main-grid"><Calendar date={d} setDate={setDate} kind="strength" state={s} setState={setS}/><div className="panel"><span className="eyebrow">SÉANCE DU {d}</span><h3>{sessions.length ? "Ton travail du jour" : "Composer une séance"}</h3>{sessions.map(x => <div className="v-record" key={x.id}><div><b>{x.name}</b><small>{x.sets.map(t => `${t.reps} reps · ${t.kg} kg · RPE ${t.rpe || "—"}`).join("  /  ")}</small><small>Gêne au genou : {x.knee}/10</small></div><div className="v-record-actions"><button aria-label="Modifier la dernière série" onClick={() => { const t = x.sets.at(-1); setEditingSessionId(x.id); if (exercises.some(e => e.name === x.name)) { setExercise(x.name); setCustomExercise(""); } else setCustomExercise(x.name); setReps(String(t?.reps || "")); setKg(String(t?.kg || "")); setRpe(String(t?.rpe || "")); setKnee(String(x.knee || 0)); }}><Pencil size={16}/></button><button aria-label="Supprimer la séance" onClick={() => setS(v => ({ ...v, sessions: v.sessions.filter(t => t.id !== x.id) }))}><Trash2 size={16}/></button></div></div>)}<div className="v-timer"><span className="eyebrow">CHRONOMÈTRE DE SÉANCE</span><strong>{String(Math.floor(timer / 60)).padStart(2, "0")}:{String(timer % 60).padStart(2, "0")}</strong><button onClick={() => setTimerOn(v => !v)}>{timerOn ? <Pause size={15}/> : <Play size={15}/>} {timerOn ? "Pause" : "Démarrer"}</button><button onClick={() => { setTimer(0); setTimerOn(false); }}><RotateCcw size={15}/></button></div><button className="button-secondary v-wide" onClick={finishTraining}><Check size={16}/> Terminer et enregistrer la durée</button><div className="v-fields"><label>Mouvement<select value={exercise} onChange={e => setExercise(e.target.value)}>{exercises.map(x => <option key={x.name}>{x.name}</option>)}</select></label><label>Ou ton mouvement<input value={customExercise} placeholder="Personnaliser" onChange={e => setCustomExercise(e.target.value)}/></label><label>Répétitions réelles<input type="number" min="1" value={reps} onChange={e => setReps(e.target.value)}/></label><label>Charge · kg (0 si poids du corps)<input type="number" min="0" step="0.5" value={kg} onChange={e => setKg(e.target.value)}/></label><label>Effort RPE · /10<input type="number" min="0" max="10" value={rpe} onChange={e => setRpe(e.target.value)}/></label><label>Gêne au genou · /10<input type="number" min="0" max="10" value={knee} onChange={e => setKnee(e.target.value)}/></label></div><button className="button-primary v-wide" onClick={addSet}>{editingSessionId ? <Pencil size={16}/> : <Plus size={16}/>} {editingSessionId ? "Enregistrer les modifications" : "Valider cette série"}</button>{editingSessionId && <button className="v-cancel-edit" onClick={() => { setEditingSessionId(null); setReps(""); setKg(""); setRpe(""); setCustomExercise(""); }}>Annuler la modification</button>}<div className="v-inline"><button onClick={() => mark("strength", "rest")}>Repos choisi</button><button onClick={() => mark("strength", "missed")}>Pas de séance</button></div></div></div><div className="panel"><span className="eyebrow">BIBLIOTHÈQUE DE MOUVEMENTS</span><h3>À quoi sert chaque exercice ?</h3><div className="v-exercises">{exercises.map(x => <button key={x.name} onClick={() => { setExercise(x.name); setCustomExercise(""); window.scrollTo({ top: 200, behavior: "smooth" }); }}><small>{x.group}</small><b>{x.name}</b><span>{x.why}</span><Plus size={16}/></button>)}</div><p className="v-muted">Si les squats provoquent une douleur, limite l’amplitude ou change de mouvement ; une douleur récurrente mérite un avis médical.</p></div><Insight area="strength" date={d}/></>}
 {tab === "nutrition" && <>{header("NUTRITION / QUOTIDIEN", "Sans énergie suffisante, l’entraînement perd sa base.", "Ajoute ce que tu consommes. Pour un plat acheté, saisis le prix payé : il sera retiré de l’unique enveloppe Alimentation.")}<div className="v-nuttop"><div><span className="eyebrow">JOURNÉE DU {d}</span><h3>{meals.length} aliment{meals.length > 1 ? "s" : ""} noté{meals.length > 1 ? "s" : ""}</h3><p>Énergie indicative {Math.round(calorie)} kcal · protéines indicatives {Math.round(protein)} g</p></div><div><span>ENVELOPPE ALIMENTATION · CE MOIS</span><strong>{money(foodLeft)}</strong><small>restants sur {money(currentFoodLimit || 0)} · budget modifiable</small></div></div><div className="v-metrics"><Metric label="CALORIES MANGÉES" value={`${Math.round(calorie)} kcal`} sub="aliments et compléments"/><Metric label="ACTIVITÉ DÉPENSÉE" value={`− ${totalActivityBurned} kcal`} sub="course, marche et entraînement"/><Metric label="SOLDE ALIMENTATION − ACTIVITÉ" value={`${Math.round(calorie - totalActivityBurned)} kcal`} sub="hors métabolisme de base"/><Metric label="PROTÉINES CONSOMMÉES" value={`${Math.round(protein)} g`} sub={`${Math.max(0, proteinTarget - Math.round(protein))} g avant le repère de ${proteinTarget} g`}/><Metric label="COÛT DU JOUR" value={money(mealCost)} sub="déduit du budget alimentation"/></div><div className="v-date"><button onClick={() => setDate(addDays(d, -1))}><ChevronLeft size={16}/></button><input type="date" value={d} onChange={e => setDate(e.target.value || today)}/><button onClick={() => setDate(addDays(d, 1))}><ChevronRight size={16}/></button><button onClick={() => setDate(today)}>Aujourd’hui</button></div><div className="v-two v-main-grid"><div className="panel"><span className="eyebrow">COMPOSER TES REPAS</span><h3>Choisis une option.</h3><div className="v-tabs">{Object.keys(foods).map(x => <button key={x} className={foodTab === x ? "active" : ""} onClick={() => setFoodTab(x)}>{x}</button>)}</div><div className="v-foodlist">{foods[foodTab].map((f, i) => <button key={i} onClick={() => addFood(f)}><span><b>{f.name}</b><small>{f.portion} · env. {f.kcal} kcal · {f.protein} g protéines · {f.type === "stock" ? "stock / maison" : "achat du jour"}</small></span><Plus size={18}/></button>)}</div><p className="v-muted">Portions et recettes varient : les kcal affichées sont des estimations, pas des mesures. Ajoute le coût réel séparément.</p></div><div className="panel"><span className="eyebrow">TON ASSIETTE · {d}</span><h3>Le journal du jour.</h3>{meals.length ? meals.map(m => <div className="v-meal" key={m.id}><div><small>{m.slot}</small><b>{m.name}</b><span>≈ {Math.round((m.kcal || 0) * m.portion)} kcal · {Math.round((m.protein || 0) * m.portion)} g protéines</span></div><label>Portions<input type="number" min="0.25" step="0.25" value={m.portion} onChange={e => setS(v => ({ ...v, meals: v.meals.map(x => x.id === m.id ? { ...x, portion: num(e.target.value) } : x) }))}/></label><label>Coût payé · F<input type="number" min="0" value={draftPrices[m.id] ?? String(m.cost)} onChange={e => setDraftPrices(v => ({ ...v, [m.id]: e.target.value }))} onBlur={() => {
                    if (draftPrices[m.id] !== undefined)
                        setMealCost(m, num(draftPrices[m.id]));
                }} onKeyDown={e => {
                    if (e.key === "Enter") {
                        e.currentTarget.blur();
                    }
                }}/></label><button aria-label="Supprimer l’aliment" onClick={() => removeMeal(m)}><Trash2 size={16}/></button></div>) : <p>Choisis un aliment avec le bouton +. L’aperçu apparaît ici aussitôt.</p>}<p className="v-muted">Un aliment sorti du frigo coûte 0 F ici : son achat a déjà été compté dans les dépenses. Pour un repas acheté aujourd’hui, saisis son prix dans la ligne ci-dessus.</p><div className="v-water"><span>EAU AUJOURD’HUI</span><strong>{s.water[d] || 0} ml</strong><button onClick={() => setS(v => ({ ...v, water: { ...v.water, [d]: Math.max(0, (v.water[d] || 0) - 250) } }))}><Minus size={16}/></button><button onClick={() => setS(v => ({ ...v, water: { ...v.water, [d]: (v.water[d] || 0) + 250 } }))}><Plus size={16}/> 250 ml</button></div><button className="button-primary v-wide" onClick={() => { setS(v => ({ ...v, habits: { ...v.habits, [d]: { ...v.habits[d], nutrition: true } } })); setMessage("Journée nutrition enregistrée"); }}><Check size={16}/> Enregistrer ma nutrition</button></div></div><div className="panel"><span className="eyebrow">COMPLÉMENTS · JOURNÉE DU {d}</span><h3>Une place claire dans la journée.</h3><div className="v-supp">{supplements.map(x => <div key={x.name}><div><b>{x.name}</b><p>{x.moment} · {x.mix}</p></div><button className={s.supplements[d]?.[x.name] ? "on" : ""} onClick={() => addSupplement(x)}>{s.supplements[d]?.[x.name] ? <Check size={16}/> : <Plus size={16}/>} {s.supplements[d]?.[x.name] ? "Pris · annuler" : "Noter"}</button></div>)}</div><p className="v-muted">Les compléments ne remplacent pas les repas. Les kcal du gainer ne sont pas comptées sans la portion et l’étiquette exactes.</p></div><Insight area="nutrition" date={d}/></>}
 {tab === "sleep" && <>{header("SOMMEIL / RÉCUPÉRATION", "Dormir protège ton attention et ta santé.", "Chez l’adulte, dormir régulièrement moins de 7 heures est associé à davantage de risques cardiométaboliques. Note la durée, les réveils et la qualité de chaque nuit.")}<div className="v-date"><button onClick={() => setDate(addDays(d, -1))}><ChevronLeft size={16}/></button><input type="date" value={d} onChange={e => setDate(e.target.value || today)}/><button onClick={() => setDate(addDays(d, 1))}><ChevronRight size={16}/></button><button onClick={() => setDate(today)}>Aujourd’hui</button></div><div className="v-two v-main-grid"><div className="panel"><span className="eyebrow">NUIT TERMINÉE LE {d}</span><h3>Du lit au réveil.</h3><div className="v-fields"><label>Au lit à<input type="time" value={night?.bed || ""} onChange={e => changeNight("bed", e.target.value)}/></label><label>Téléphone posé à<input type="time" value={night?.phone || ""} onChange={e => changeNight("phone", e.target.value)}/></label><label>Réveil final à<input type="time" value={night?.awake || ""} onChange={e => changeNight("awake", e.target.value)}/></label><label>Qualité ressentie · 1–5<input type="range" min="1" max="5" value={night?.quality || 3} onChange={e => changeNight("quality", e.target.value)}/><small>{night?.quality || 3}/5</small></label><label>Courbatures au réveil · 0–10<input type="number" min="0" max="10" value={night?.soreness ?? ""} onChange={e => changeNight("soreness", e.target.value)}/></label></div><div className="v-wake-add"><label>Réveillé à<input type="time" value={wakeTime} onChange={e => setWakeTime(e.target.value)}/></label><label>Rendormi à<input type="time" value={wakeEnd} onChange={e => setWakeEnd(e.target.value)}/></label><button className="button-secondary" onClick={addWake}><Plus size={16}/> Déduire cette interruption</button></div>{(night?.wakePeriods || []).length > 0 && <div className="v-night-wakes"><b>Interruptions · {interruptedMinutes(night)} min retirées</b>{(night?.wakePeriods || []).map(period => <span key={period.id}>{period.start} → {period.end} · {elapsedMinutes(period.start, period.end)} min <button aria-label="Supprimer cette interruption" onClick={() => setS(v => { const old = v.nights.find(n => n.date === d); if (!old) return v; const periods = (old.wakePeriods || []).filter(x => x.id !== period.id); return { ...v, nights: v.nights.map(n => n.date === d ? { ...n, wakePeriods: periods, wakes: periods.length } : n) }; })}>×</button></span>)}</div>}<p className="v-muted">La durée est estimée entre le téléphone posé (ou le moment au lit) et le réveil final. Le temps entre chaque réveil et rendormissement est retiré de la durée estimée.</p></div><div className="panel v-sleep-result"><span className="eyebrow">LE BILAN DE CETTE NUIT</span><strong>{night && estimateNight(night) > 0 ? estimateNight(night).toFixed(1) : "—"}<small> h de sommeil estimé</small></strong><div className={`v-sleep-status ${night && estimateNight(night) >= 7 && night.quality >= 3 ? "good" : night && estimateNight(night) > 0 ? "partial" : ""}`}>{night && estimateNight(night) > 0 ? estimateNight(night) >= 7 ? "Durée au repère général" : "Moins de 7 heures renseignées" : "À compléter"}</div><p>{night && (night.wakePeriods?.length || 0) > 0 ? `${night.wakePeriods?.length || 0} réveil(s) noté(s), soit ${interruptedMinutes(night)} min éveillé(s). ${night.quality <= 2 ? "La qualité ressentie est basse ; adapte la charge du jour." : "Regarde aussi comment tu te sens aujourd’hui."}` : "Le nombre de réveils et la qualité aident à comprendre la durée."}</p><div className="v-water"><span>QUALITÉ RESSENTIE</span><strong>{night?.quality || "—"}/5</strong></div></div></div><div className="panel"><span className="eyebrow">7 DERNIÈRES NUITS</span><h3>La tendance plutôt qu’une seule nuit.</h3><Trend values={sleep7} labels={days7.map(k => dayNames[weekday(k)])} unit=" h"/><p className="v-muted">Si les réveils très précoces ou un sommeil insuffisant persistent et pèsent sur la journée, parle-en avec un professionnel de santé.</p></div><Insight area="sleep" date={d}/></>}
 {tab === "budget" && <FinanceTabV2 state={s} setState={setS} budgetMonth={financeMonth} setBudgetMonth={setFinanceMonth} today={today} notify={setMessage}/>} 
 {tab === "evolution" && <EvolutionTab state={s} setState={setS} today={today} days7={days7} sleep7={sleep7} proteinTarget={proteinTarget} notify={setMessage}/>}
 {tab === "settings" && <><InstallApp /><div className="panel v-settings-panel"><span className="eyebrow">INTERFACE</span><h3>Une identité stable, selon ton choix.</h3><div className="v-buttons"><button className="button-secondary" onClick={() => setS(v => ({ ...v, theme: "dark" }))}><Moon size={16}/> Mode sombre</button><button className="button-secondary" onClick={() => setS(v => ({ ...v, theme: "light" }))}><Sun size={16}/> Mode clair</button><button className="button-secondary" onClick={enableNotifications}><Bell size={16}/> Notifications</button></div><p className="v-muted">Les rappels du téléphone nécessitent l’autorisation du navigateur.</p></div>{header("RÉGLAGES / TON ESPACE", "Tu gardes la main.", "Personnalise tes repères et garde une copie de ton journal.")}<div className="v-two"><div className="panel"><span className="eyebrow">PROFIL</span><h3>Les informations de Saliou.</h3><div className="v-fields"><label>Prénom affiché<input value={s.name} onChange={e => setS(v => ({ ...v, name: e.target.value }))}/></label><label>Poids indicatif · kg<input type="number" min="1" value={s.weight} onChange={e => setS(v => ({ ...v, weight: num(e.target.value) }))}/></label><label>Taille · cm (facultative)<input type="number" min="1" placeholder="À confirmer" value={s.height || ""} onChange={e => setS(v => ({ ...v, height: num(e.target.value) || null }))}/></label></div><p className="v-muted">La taille reste à confirmer ; la date de naissance fournie est le 1er octobre 1997.</p></div><div className="panel"><span className="eyebrow">MES DONNÉES</span><h3>Exporter. Restaurer.</h3><p>Le journal est sauvegardé sur ce navigateur. Télécharge régulièrement une copie JSON, en particulier avant de changer de téléphone ou de navigateur.</p><div className="v-buttons"><button className="button-primary" onClick={saveFile}><Download size={16}/> Exporter mes données</button><button className="button-secondary" onClick={() => file.current?.click()}>Importer une sauvegarde</button></div><input ref={file} type="file" accept="application/json,.json" hidden onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f)
                    await importFile(f);
                e.target.value = "";
            }}/><p className="v-muted">Import validé avant remplacement. Les photos intégrées à l’interface ne font pas partie de l’export JSON.</p></div></div><div className="panel"><span className="eyebrow">TRANSPARENCE</span><h3>Ce que mes chiffres veulent dire.</h3><p>Les calories des plats et celles d’une course sont des estimations. Les dépenses ne se déduisent que lorsqu’un prix réel est saisi ou qu’un achat est validé. Le journal de sommeil peut contenir des horaires estimés.</p><p>Si une douleur au genou, une fatigue importante ou des réveils précoces persistent, consulte un professionnel de santé.</p></div></>}
 </main><nav className="mobile-nav" aria-label="Navigation principale">{nav.slice(0, 4).map(([k, l, Icon]) => <button key={k} className={tab === k ? "active" : ""} onClick={() => go(k)} aria-current={tab === k ? "page" : undefined}><Icon size={20}/><span>{k === "run" ? "Course" : k === "strength" ? "Entraîner" : l}</span></button>)}<Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}><SheetTrigger asChild><button className={["sleep", "budget", "evolution", "settings"].includes(tab) ? "active" : ""} aria-label="Ouvrir les autres rubriques"><MoreHorizontal size={21}/><span>Plus</span></button></SheetTrigger><SheetContent side="bottom" className="mobile-more-sheet" showCloseButton={false}><div className="mobile-sheet-handle"/><SheetHeader><SheetTitle>Ton espace</SheetTitle><SheetDescription>Accède au suivi, aux finances et aux réglages.</SheetDescription></SheetHeader><div className="mobile-more-grid">{nav.slice(4).map(([k, l, Icon]) => <button key={k} className={tab === k ? "active" : ""} onClick={() => go(k)}><span><Icon size={21}/></span><b>{l}</b><small>{k === "sleep" ? "Nuit et récupération" : k === "budget" ? "Achats et épargne" : k === "evolution" ? "Comparer les progrès" : "Application et données"}</small><ArrowRight size={17}/></button>)}</div></SheetContent></Sheet></nav></div></div>;
}
