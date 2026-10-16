"use client";

import { useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, ChevronLeft, ChevronRight, Download, Minus, Plus, Target, Trash2, TrendingUp, Wallet } from "lucide-react";
import { Area, Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { SavingsTransaction, State, addDays, asDate, categories, dateKey, money, uid } from "./data";

const REFERENCE_INCOME = 1_200_000;
const SPENDING_CAP = 200_000;
const recommendedCaps: Record<string, number> = {
  "Loyer": 65_000,
  "Alimentation": 60_000,
  "Transport": 15_000,
  "Carburant": 10_000,
  "Électricité": 8_000,
  "Eau": 2_000,
  "Téléphone & Internet": 5_000,
  "Santé": 5_000,
  "Soins & hygiène": 5_000,
  "Sport": 3_000,
  "Compléments": 2_000,
  "Loisirs": 5_000,
  "Imprévus": 15_000,
};

const periods = [{ days: 1, label: "1 jour" }, { days: 7, label: "1 semaine" }, { days: 30, label: "1 mois" }, { days: 90, label: "3 mois" }, { days: 180, label: "6 mois" }] as const;
const num = (value: string | number) => Math.max(0, Number(value) || 0);
const monthOf = (date: string) => date.slice(0, 7);
const signedMoney = (value: number) => `${value > 0 ? "+" : value < 0 ? "−" : ""}${money(Math.abs(value))}`;
const axisMoney = (value: number) => value >= 1_000_000 ? `${(value / 1_000_000).toFixed(value % 1_000_000 ? 1 : 0)}M` : value >= 1_000 ? `${Math.round(value / 1_000)}k` : String(value);

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ color?: string; name?: string; value?: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return <div className="v-chart-tooltip"><b>{label}</b>{payload.map((item, index) => <span key={`${item.name}-${index}`}><i style={{ background: item.color }}/><small>{item.name}</small><strong>{money(Number(item.value) || 0)}</strong></span>)}</div>;
}

function Metric({ label, value, sub, tone = "" }: { label: string; value: string; sub: string; tone?: string }) {
  return <div className={`v-metric ${tone}`}><span>{label}</span><strong>{value}</strong><small>{sub}</small></div>;
}

export function FinanceTabV2({ state, setState, budgetMonth, setBudgetMonth, today, notify }: {
  state: State;
  setState: React.Dispatch<React.SetStateAction<State>>;
  budgetMonth: string;
  setBudgetMonth: React.Dispatch<React.SetStateAction<string>>;
  today: string;
  notify: (message: string) => void;
}) {
  const [view, setView] = useState<"manage" | "analysis">("manage");
  const [selectedCategory, setSelectedCategory] = useState("Alimentation");
  const [purchaseName, setPurchaseName] = useState("");
  const [purchaseAmount, setPurchaseAmount] = useState("");
  const [incomeAmount, setIncomeAmount] = useState("");
  const [incomeNote, setIncomeNote] = useState("Salaire");
  const [periodDays, setPeriodDays] = useState<1 | 7 | 30 | 90 | 180>(30);
  const [savingKind, setSavingKind] = useState<"deposit" | "withdrawal">("deposit");
  const [savingLocation, setSavingLocation] = useState<SavingsTransaction["location"]>("Virement");
  const [savingAmount, setSavingAmount] = useState("");
  const [savingDate, setSavingDate] = useState(today);

  const spendingCategories = categories.filter(category => category !== "Épargne");
  const limits = state.monthBudgets[budgetMonth] || state.budgets;
  const monthlySpends = state.spends.filter(item => monthOf(item.date) === budgetMonth);
  const monthlyIncomes = state.incomes.filter(item => monthOf(item.date) === budgetMonth);
  const monthlyIncome = monthlyIncomes.reduce((sum, item) => sum + item.amount, 0);
  const spentTotal = monthlySpends.reduce((sum, item) => sum + item.amount, 0);
  const selectedSpent = monthlySpends.filter(item => item.category === selectedCategory).reduce((sum, item) => sum + item.amount, 0);
  const selectedLimit = limits[selectedCategory] || 0;
  const selectedRemaining = selectedLimit - selectedSpent;
  const spendingBudget = spendingCategories.reduce((sum, category) => sum + (limits[category] || 0), 0);
  const savingsGoal = limits["Épargne"] || 0;

  const savingSorted = useMemo(() => [...state.savingsTransactions].sort((a, b) => a.date.localeCompare(b.date) || a.annualId - b.annualId), [state.savingsTransactions]);
  let running = state.savingsOpeningBalance;
  const withBalance = savingSorted.map(transaction => {
    running += transaction.kind === "deposit" ? transaction.amount : -transaction.amount;
    return { ...transaction, balance: running };
  });
  const currentSavings = running;
  const monthlySavings = savingSorted.filter(item => monthOf(item.date) === budgetMonth);
  const monthlyDeposits = monthlySavings.filter(item => item.kind === "deposit").reduce((sum, item) => sum + item.amount, 0);
  const monthlyWithdrawals = monthlySavings.filter(item => item.kind === "withdrawal").reduce((sum, item) => sum + item.amount, 0);
  const netMonthlySavings = monthlyDeposits - monthlyWithdrawals;
  const available = monthlyIncome - spentTotal - netMonthlySavings;

  const periodEnd = today;
  const periodStart = addDays(periodEnd, -(periodDays - 1));
  const previousEnd = addDays(periodStart, -1);
  const previousStart = addDays(previousEnd, -(periodDays - 1));
  const inRange = (date: string, from: string, to: string) => date >= from && date <= to;
  const currentSpends = state.spends.filter(item => inRange(item.date, periodStart, periodEnd));
  const previousSpends = state.spends.filter(item => inRange(item.date, previousStart, previousEnd));
  const currentTotal = currentSpends.reduce((sum, item) => sum + item.amount, 0);
  const previousTotal = previousSpends.reduce((sum, item) => sum + item.amount, 0);
  const trendDelta = currentTotal - previousTotal;
  const trendPercent = previousTotal > 0 ? Math.round(trendDelta / previousTotal * 100) : currentTotal > 0 ? 100 : 0;
  const currentDeposits = savingSorted.filter(item => item.kind === "deposit" && inRange(item.date, periodStart, periodEnd)).reduce((sum, item) => sum + item.amount, 0);
  const currentWithdrawals = savingSorted.filter(item => item.kind === "withdrawal" && inRange(item.date, periodStart, periodEnd)).reduce((sum, item) => sum + item.amount, 0);
  const currentPeriodIncome = state.incomes.filter(item => inRange(item.date, periodStart, periodEnd)).reduce((sum, item) => sum + item.amount, 0);
  const categoryTotals = spendingCategories.map(category => ({ category, amount: currentSpends.filter(item => item.category === category).reduce((sum, item) => sum + item.amount, 0) })).sort((a, b) => b.amount - a.amount);
  const activeCategoryTotals = categoryTotals.filter(item => item.amount > 0);
  const topCategory = activeCategoryTotals[0];
  const biggestExpense = [...currentSpends].sort((a, b) => b.amount - a.amount)[0];
  const topCategoryShare = topCategory && currentTotal ? Math.round(topCategory.amount / currentTotal * 100) : 0;
  const periodCap = SPENDING_CAP * Math.min(periodDays, 30) / 30;
  const chartBucketCount = periodDays === 1 ? 1 : periodDays === 7 ? 7 : periodDays === 30 ? 10 : periodDays === 90 ? 13 : 12;
  const chartBucketDays = Math.ceil(periodDays / chartBucketCount);
  let currentCumulative = 0;
  let previousCumulative = 0;
  const evolutionData = [{ label: "Début", depenses: 0, precedente: 0, plafond: 0 }, ...Array.from({ length: chartBucketCount }, (_, index) => {
    const currentBucketStart = addDays(periodStart, index * chartBucketDays);
    const currentBucketEnd = addDays(currentBucketStart, Math.min(chartBucketDays - 1, Math.max(0, periodDays - index * chartBucketDays - 1)));
    const previousBucketStart = addDays(previousStart, index * chartBucketDays);
    const previousBucketEnd = addDays(previousBucketStart, Math.min(chartBucketDays - 1, Math.max(0, periodDays - index * chartBucketDays - 1)));
    currentCumulative += currentSpends.filter(item => inRange(item.date, currentBucketStart, currentBucketEnd)).reduce((sum, item) => sum + item.amount, 0);
    previousCumulative += previousSpends.filter(item => inRange(item.date, previousBucketStart, previousBucketEnd)).reduce((sum, item) => sum + item.amount, 0);
    const label = periodDays === 1 ? "Aujourd’hui" : asDate(currentBucketEnd).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }).replace(".", "");
    return { label, depenses: currentCumulative, precedente: previousCumulative, plafond: Math.round(periodCap * (index + 1) / chartBucketCount) };
  })];
  const categoryChartData = activeCategoryTotals.slice(0, 6);
  const periodIncomeReference = REFERENCE_INCOME * Math.min(periodDays, 30) / 30;
  const savingsRate = currentPeriodIncome > 0 ? Math.round((currentDeposits - currentWithdrawals) / currentPeriodIncome * 100) : 0;
  const monthDate = asDate(today);
  const monthDays = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
  const monthElapsed = Math.max(1, monthDate.getDate());
  const currentMonthSpent = state.spends.filter(item => monthOf(item.date) === monthOf(today)).reduce((sum, item) => sum + item.amount, 0);
  const projectedMonth = Math.round(currentMonthSpent / monthElapsed * monthDays);
  const overruns = spendingCategories.map(category => ({ category, spent: monthlySpends.filter(item => item.category === category).reduce((sum, item) => sum + item.amount, 0), limit: limits[category] || 0 })).filter(item => item.limit > 0 && item.spent > item.limit).sort((a, b) => (b.spent - b.limit) - (a.spent - a.limit));
  const score = Math.max(0, Math.min(100, Math.round(100 - Math.max(0, currentTotal - periodCap) / Math.max(1, periodCap) * 45 - overruns.length * 8 - Math.max(0, trendPercent) * .2 + Math.min(15, Math.max(0, savingsRate) * .15))));

  const updateMonthLimits = (patch: Record<string, number>) => setState(previous => ({ ...previous, monthBudgets: { ...previous.monthBudgets, [budgetMonth]: { ...(previous.monthBudgets[budgetMonth] || previous.budgets), ...patch } } }));
  const applyRecommendedPlan = () => {
    updateMonthLimits({ ...Object.fromEntries(categories.map(category => [category, 0])), ...recommendedCaps, "Épargne": REFERENCE_INCOME - SPENDING_CAP });
    notify("Cadre conseillé appliqué : 200 000 F de dépenses et 1 000 000 F d’épargne. Chaque montant reste modifiable.");
  };
  const addIncome = () => {
    if (!num(incomeAmount)) return notify("Indique le montant reçu.");
    setState(previous => ({ ...previous, incomes: [...previous.incomes, { id: uid(), date: `${budgetMonth}-01`, amount: num(incomeAmount), note: incomeNote.trim() || "Revenu" }] }));
    setIncomeAmount("");
    notify("Revenu enregistré.");
  };
  const addPurchase = () => {
    if (!purchaseName.trim() || !num(purchaseAmount)) return notify("Indique le nom et le montant réel de la dépense.");
    const maxDay = new Date(Number(budgetMonth.slice(0, 4)), Number(budgetMonth.slice(5)), 0).getDate();
    const purchaseDate = `${budgetMonth}-${String(Math.min(maxDay, Number(today.slice(8)))).padStart(2, "0")}`;
    setState(previous => ({ ...previous, spends: [...previous.spends, { id: uid(), date: purchaseDate, category: selectedCategory, amount: num(purchaseAmount), note: purchaseName.trim() }] }));
    setPurchaseName("");
    setPurchaseAmount("");
    notify(`Dépense ajoutée dans ${selectedCategory}.`);
  };
  const updateSpend = (id: string, patch: Partial<State["spends"][number]>) => setState(previous => {
    const updated = previous.spends.map(item => item.id === id ? { ...item, ...patch } : item);
    const changed = updated.find(item => item.id === id);
    return { ...previous, spends: updated, meals: changed ? previous.meals.map(meal => meal.expenseId === id ? { ...meal, date: changed.date, cost: changed.amount } : meal) : previous.meals };
  });
  const addSaving = () => {
    const amount = num(savingAmount);
    if (!amount) return notify("Indique le montant à déposer ou à retirer.");
    if (savingKind === "withdrawal" && amount > currentSavings) return notify("Retrait impossible : le montant dépasse l’épargne disponible.");
    const year = savingDate.slice(0, 4);
    const annualId = Math.max(0, ...state.savingsTransactions.filter(item => item.date.startsWith(year)).map(item => item.annualId)) + 1;
    setState(previous => ({ ...previous, savingsTransactions: [...previous.savingsTransactions, { id: uid(), annualId, date: savingDate, kind: savingKind, location: savingLocation, amount }] }));
    setSavingAmount("");
    notify(savingKind === "deposit" ? "Montant ajouté à l’épargne." : "Retrait d’épargne enregistré.");
  };
  const updateSaving = (id: string, patch: Partial<SavingsTransaction>) => setState(previous => ({ ...previous, savingsTransactions: previous.savingsTransactions.map(item => item.id === id ? { ...item, ...patch } : item) }));
  const exportSavings = () => {
    const rows = [["ID", "Date", "Opération", "Canal", "Montant FCFA", "Solde FCFA"], ...withBalance.map(item => [item.annualId, item.date, item.kind === "deposit" ? "Ajout" : "Retrait", item.location, item.amount, item.balance])];
    const csv = rows.map(row => row.map(cell => `"${String(cell).replaceAll('"', '""')}"`).join(";")).join("\n");
    const url = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = `epargne-saliou-${today}.csv`; link.click(); URL.revokeObjectURL(url);
  };

  return <div className="v-finance-v2">
    <div className="v-sectionhead"><span className="eyebrow">FINANCES · PILOTAGE PERSONNEL</span><h1>Chaque franc reçoit une mission.</h1><p>Gère les dépenses dans un bloc unique, puis utilise l’analyse pour voir les tendances, les dérapages et la capacité réelle d’épargne.</p></div>
    <div className="v-finance-tabs" role="tablist"><button className={view === "manage" ? "active" : ""} onClick={() => setView("manage")}><Wallet size={17}/> Gérer</button><button className={view === "analysis" ? "active" : ""} onClick={() => setView("analysis")}><TrendingUp size={17}/> Analyse avancée</button></div>
    {view === "manage" ? <>
      <div className="v-month-picker"><button aria-label="Mois précédent" onClick={() => setBudgetMonth(value => { const [year, month] = value.split("-").map(Number); return dateKey(new Date(year, month - 2, 1)).slice(0, 7); })}><ChevronLeft size={17}/></button><strong>{new Date(Number(budgetMonth.slice(0, 4)), Number(budgetMonth.slice(5)) - 1, 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}</strong><button aria-label="Mois suivant" onClick={() => setBudgetMonth(value => { const [year, month] = value.split("-").map(Number); return dateKey(new Date(year, month, 1)).slice(0, 7); })}><ChevronRight size={17}/></button></div>
      <div className="v-metrics v-fin-summary"><Metric label="REVENU DISPONIBLE" value={money(monthlyIncome)} sub="revenus enregistrés"/><Metric label="ÉPARGNÉ NET · MOIS" value={money(netMonthlySavings)} sub={`${money(monthlyDeposits)} ajoutés · ${money(monthlyWithdrawals)} retirés`}/><Metric label="DÉPENSÉ · MOIS" value={money(spentTotal)} sub={`plafond conseillé ${money(SPENDING_CAP)}`} tone={spentTotal > SPENDING_CAP ? "danger" : ""}/><Metric label="RESTE DISPONIBLE" value={money(available)} sub="revenus − dépenses − épargne nette" tone={available < 0 ? "danger" : ""}/></div>
      <div className="panel v-fin-plan"><div><span className="eyebrow">CADRE CONSEILLÉ · REVENU 1 200 000 F</span><h3>Limiter les dépenses à 200 000 F.</h3><p>Ce cadre très strict vise 1 000 000 F d’épargne ou d’investissement par mois, soit 83,3 % du revenu. Adapte les plafonds si les charges réelles incompressibles sont supérieures.</p></div><button className="button-primary" onClick={applyRecommendedPlan}><Target size={16}/> Appliquer le cadre conseillé</button><div className="v-plan-kpis"><span><small>DÉPENSES MAX.</small><strong>200 000 F</strong></span><span><small>ÉPARGNE CIBLE</small><strong>1 000 000 F</strong></span><span><small>TAUX CIBLE</small><strong>83,3 %</strong></span></div></div>
      <div className="panel v-income-panel"><span className="eyebrow">REVENUS DU MOIS</span><h3>Ajouter ou corriger un revenu.</h3><div className="v-fields"><label>Montant reçu · F<input type="number" min="0" value={incomeAmount} onChange={event => setIncomeAmount(event.target.value)}/></label><label>Libellé<input value={incomeNote} onChange={event => setIncomeNote(event.target.value)}/></label></div><button className="button-primary" onClick={addIncome}><Plus size={16}/> Ajouter le revenu</button><div className="v-edit-list">{monthlyIncomes.map(income => <div className="v-edit-row" key={income.id}><input aria-label="Date du revenu" type="date" value={income.date} onChange={event => setState(previous => ({ ...previous, incomes: previous.incomes.map(item => item.id === income.id ? { ...item, date: event.target.value || item.date } : item) }))}/><input aria-label="Libellé du revenu" value={income.note} onChange={event => setState(previous => ({ ...previous, incomes: previous.incomes.map(item => item.id === income.id ? { ...item, note: event.target.value } : item) }))}/><input aria-label="Montant du revenu" type="number" min="0" value={income.amount} onChange={event => setState(previous => ({ ...previous, incomes: previous.incomes.map(item => item.id === income.id ? { ...item, amount: num(event.target.value) } : item) }))}/><button aria-label="Supprimer le revenu" onClick={() => setState(previous => ({ ...previous, incomes: previous.incomes.filter(item => item.id !== income.id) }))}><Trash2 size={16}/></button></div>)}</div></div>
      <div className="panel v-category-console"><div className="v-category-head"><div><span className="eyebrow">UNE CATÉGORIE À LA FOIS</span><h3>Budget et dépense.</h3></div><label>Catégorie<select value={selectedCategory} onChange={event => setSelectedCategory(event.target.value)}>{spendingCategories.map(category => <option key={category}>{category}</option>)}</select></label></div><div className="v-category-kpis"><span><small>PLAFOND DU MOIS</small><label><input type="number" min="0" value={selectedLimit || ""} onChange={event => updateMonthLimits({ [selectedCategory]: num(event.target.value) })}/> F</label><em>Conseil : {money(recommendedCaps[selectedCategory] || 0)}</em></span><span><small>DÉPENSÉ</small><strong>{money(selectedSpent)}</strong><em>{selectedLimit ? `${Math.round(selectedSpent / selectedLimit * 100)} % du plafond` : "plafond non fixé"}</em></span><span><small>RESTE</small><strong className={selectedRemaining < 0 ? "over" : ""}>{money(selectedRemaining)}</strong><em>{selectedRemaining < 0 ? `Dépassement de ${money(Math.abs(selectedRemaining))}` : "encore disponible"}</em></span></div><div className="v-progress"><span className={selectedSpent > selectedLimit && selectedLimit > 0 ? "over" : ""} style={{ width: `${Math.min(100, selectedLimit ? selectedSpent / selectedLimit * 100 : 0)}%` }}/></div><div className="v-direct-purchase"><input placeholder={`Dépense · ${selectedCategory}`} value={purchaseName} onChange={event => setPurchaseName(event.target.value)}/><input type="number" min="0" placeholder="Montant F" value={purchaseAmount} onChange={event => setPurchaseAmount(event.target.value)}/><button onClick={addPurchase}><Plus size={16}/> Ajouter</button></div></div>
      <div className="panel v-savings"><div className="v-between"><div><span className="eyebrow">COMPTE D’ÉPARGNE</span><h3>Ce qui entre, ce qui sort et le solde réel.</h3><p>Le solde de départ est l’épargne déjà présente avant la première opération enregistrée dans l’application.</p></div><button className="button-secondary" onClick={exportSavings}><Download size={16}/> Exporter CSV</button></div><div className="v-fields"><label>Épargne déjà disponible au départ · F<input type="number" min="0" value={state.savingsOpeningBalance || ""} onChange={event => setState(previous => ({ ...previous, savingsOpeningBalance: num(event.target.value) }))}/></label><label>Date de l’opération<input type="date" value={savingDate} onChange={event => setSavingDate(event.target.value || today)}/></label><label>Opération<select value={savingKind} onChange={event => setSavingKind(event.target.value as "deposit" | "withdrawal")}><option value="deposit">Ajouter à mon épargne</option><option value="withdrawal">Retirer de mon épargne</option></select></label><label>Canal utilisé<select value={savingLocation} onChange={event => setSavingLocation(event.target.value as SavingsTransaction["location"])}><option>Virement</option><option>Mobile Money</option><option>Agence</option><option>GAB</option></select></label><label>{savingKind === "deposit" ? "Montant à ajouter" : "Montant à retirer"} · F<input type="number" min="0" value={savingAmount} onChange={event => setSavingAmount(event.target.value)}/></label></div><button className="button-primary" onClick={addSaving}>{savingKind === "deposit" ? <Plus size={16}/> : <Minus size={16}/>} {savingKind === "deposit" ? "Ajouter à l’épargne" : "Enregistrer le retrait"}</button><div className="v-metrics"><Metric label="AJOUTÉ · MOIS" value={money(monthlyDeposits)} sub="total versé dans l’épargne"/><Metric label="RETIRÉ · MOIS" value={money(monthlyWithdrawals)} sub="total repris de l’épargne"/><Metric label="ÉPARGNE NETTE · MOIS" value={signedMoney(netMonthlySavings)} sub="ajouts moins retraits" tone={netMonthlySavings < 0 ? "danger" : ""}/><Metric label="SOLDE D’ÉPARGNE" value={money(currentSavings)} sub="solde actuel après toutes les opérations"/></div><div className="v-table-wrap"><table className="v-table v-table-edit"><thead><tr><th>ID</th><th>Date</th><th>Opération</th><th>Canal</th><th>Montant</th><th>Solde après</th><th/></tr></thead><tbody>{withBalance.slice().reverse().map(transaction => <tr key={transaction.id}><td>{transaction.annualId}/{transaction.date.slice(0, 4)}</td><td><input type="date" value={transaction.date} onChange={event => updateSaving(transaction.id, { date: event.target.value || transaction.date })}/></td><td><select value={transaction.kind} onChange={event => updateSaving(transaction.id, { kind: event.target.value as "deposit" | "withdrawal" })}><option value="deposit">Ajout</option><option value="withdrawal">Retrait</option></select></td><td><select value={transaction.location} onChange={event => updateSaving(transaction.id, { location: event.target.value as SavingsTransaction["location"] })}><option>Virement</option><option>Mobile Money</option><option>Agence</option><option>GAB</option></select></td><td><input type="number" min="0" value={transaction.amount} onChange={event => updateSaving(transaction.id, { amount: num(event.target.value) })}/></td><td>{money(transaction.balance)}</td><td><button aria-label="Supprimer l’opération" onClick={() => setState(previous => ({ ...previous, savingsTransactions: previous.savingsTransactions.filter(item => item.id !== transaction.id) }))}><Trash2 size={15}/></button></td></tr>)}{!withBalance.length && <tr><td colSpan={7}>Aucune opération d’épargne enregistrée.</td></tr>}</tbody></table></div></div>
      <div className="panel"><span className="eyebrow">HISTORIQUE DES DÉPENSES · {budgetMonth}</span><h3>Tout reste modifiable.</h3>{monthlySpends.length ? <div className="v-edit-list">{monthlySpends.slice().reverse().map(item => <div className="v-edit-row v-edit-spend" key={item.id}><input type="date" value={item.date} onChange={event => updateSpend(item.id, { date: event.target.value || item.date })}/><select value={item.category} onChange={event => updateSpend(item.id, { category: event.target.value })}>{spendingCategories.map(category => <option key={category}>{category}</option>)}</select><input value={item.note} onChange={event => updateSpend(item.id, { note: event.target.value })}/><input type="number" min="0" value={item.amount} onChange={event => updateSpend(item.id, { amount: num(event.target.value) })}/><button aria-label="Supprimer la dépense" onClick={() => setState(previous => ({ ...previous, spends: previous.spends.filter(expense => expense.id !== item.id), meals: previous.meals.map(meal => meal.expenseId === item.id ? { ...meal, expenseId: undefined, cost: 0 } : meal) }))}><Trash2 size={15}/></button></div>)}</div> : <p>Aucune dépense enregistrée ce mois.</p>}</div>
    </> : <>
      <div className="v-analysis-periods">{periods.map(period => <button key={period.days} className={periodDays === period.days ? "active" : ""} onClick={() => setPeriodDays(period.days)}>{period.label}</button>)}</div>
      <div className={`panel v-finance-score ${score >= 75 ? "good" : score >= 50 ? "watch" : "alert"}`}><div className="v-score-ring" style={{ background: `conic-gradient(var(--score-color) ${score * 3.6}deg, #ffffff12 0)` }}><span><strong>{score}</strong><small>/100</small></span></div><div><span className="eyebrow">DIAGNOSTIC · {periodDays === 1 ? "AUJOURD’HUI" : `${periodDays} JOURS`}</span><h2>{score >= 80 ? "Trajectoire maîtrisée" : score >= 60 ? "Cadre correct, vigilance nécessaire" : "Dépenses à reprendre en main"}</h2><p>{trendDelta <= 0 ? `Les dépenses baissent de ${money(Math.abs(trendDelta))} par rapport à la période précédente.` : `Les dépenses augmentent de ${money(trendDelta)} par rapport à la période précédente.`}</p></div></div>
      <div className="v-metrics v-analysis-metrics"><Metric label="DÉPENSÉ · PÉRIODE" value={money(currentTotal)} sub={`cadre proportionnel ${money(Math.round(periodCap))}`}/><Metric label="TENDANCE" value={`${trendPercent > 0 ? "+" : ""}${trendPercent} %`} sub={`écart ${signedMoney(trendDelta)}`} tone={trendDelta > 0 ? "danger" : ""}/><Metric label="PLUS GROS POSTE" value={topCategory?.category || "—"} sub={topCategory ? money(topCategory.amount) : "aucune dépense"}/><Metric label="ÉPARGNE NETTE" value={signedMoney(currentDeposits - currentWithdrawals)} sub={currentPeriodIncome ? `taux ${savingsRate} % du revenu saisi` : "revenu de période non saisi"}/></div>
      <div className="panel v-evolution-panel"><div className="v-chart-head"><div><span className="eyebrow">COURBE D’ÉVOLUTION · MISE À JOUR AUTOMATIQUE</span><h3>Dépenses cumulées.</h3><p>La courbe verte suit les dépenses enregistrées. Elle se recalcule avec la période et chaque modification.</p></div><div className={`v-trend-badge ${trendDelta > 0 ? "up" : "down"}`}>{trendDelta > 0 ? <ArrowUpRight size={18}/> : <ArrowDownRight size={18}/>}<span><small>VS PÉRIODE PRÉCÉDENTE</small><b>{trendPercent > 0 ? "+" : ""}{trendPercent} %</b></span></div></div><div className="v-chart-legend"><span><i className="current"/>Période actuelle</span><span><i className="previous"/>Période précédente</span><span><i className="limit"/>Plafond conseillé</span></div><div className="v-main-chart"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={evolutionData} margin={{ top: 12, right: 8, left: -12, bottom: 0 }}><defs><linearGradient id="financeArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#c9f369" stopOpacity={.32}/><stop offset="100%" stopColor="#c9f369" stopOpacity={.02}/></linearGradient></defs><CartesianGrid stroke="#ffffff12" vertical={false}/><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#8fa49f", fontSize: 11 }}/><YAxis axisLine={false} tickLine={false} tick={{ fill: "#8fa49f", fontSize: 11 }} tickFormatter={axisMoney}/><Tooltip content={<ChartTooltip/>}/><Area type="monotone" dataKey="depenses" name="Dépenses actuelles" stroke="#c9f369" strokeWidth={3} fill="url(#financeArea)" activeDot={{ r: 5, fill: "#c9f369" }}/><Line type="monotone" dataKey="precedente" name="Période précédente" stroke="#7f918d" strokeWidth={2} strokeDasharray="5 5" dot={false}/><Line type="monotone" dataKey="plafond" name="Plafond conseillé" stroke="#e7bd65" strokeWidth={2} dot={false}/></ComposedChart></ResponsiveContainer></div>{!currentTotal && !previousTotal && <div className="v-chart-empty">Ajoute une dépense : la courbe apparaîtra ici automatiquement.</div>}</div>
      <div className="v-dynamic-insights"><div className="panel"><span className="eyebrow">PLUS GROSSE DÉPENSE · DYNAMIQUE</span><h3>{biggestExpense ? money(biggestExpense.amount) : "—"}</h3><p>{biggestExpense ? `${biggestExpense.note || "Dépense sans libellé"} · ${biggestExpense.category}` : "Aucune dépense sur la période."}</p>{biggestExpense && <small>{currentTotal ? Math.round(biggestExpense.amount / currentTotal * 100) : 0} % de toutes les dépenses de la période</small>}</div><div className="panel"><span className="eyebrow">POSTE PRINCIPAL · DYNAMIQUE</span><h3>{topCategory?.category || "—"}</h3><p>{topCategory ? `${money(topCategory.amount)} dépensés sur ce poste.` : "Aucun poste dominant pour le moment."}</p>{topCategory && <small>{topCategoryShare} % du total · change dès que tes dépenses changent</small>}</div></div>
      <div className="v-analysis-grid"><div className="panel"><span className="eyebrow">PROJECTION FIN DE MOIS</span><h3>{money(projectedMonth)}</h3><p>Projection au rythme actuel, calculée à partir des dépenses du mois jusqu’à aujourd’hui.</p><div className="v-progress"><span className={projectedMonth > SPENDING_CAP ? "over" : ""} style={{ width: `${Math.min(100, projectedMonth / SPENDING_CAP * 100)}%` }}/></div><strong className={projectedMonth > SPENDING_CAP ? "v-red" : "v-green"}>{projectedMonth > SPENDING_CAP ? `Risque de dépasser le plafond de ${money(projectedMonth - SPENDING_CAP)}` : `Marge projetée : ${money(SPENDING_CAP - projectedMonth)}`}</strong></div><div className="panel"><span className="eyebrow">RÉFÉRENCE STRATÉGIQUE</span><h3>{money(REFERENCE_INCOME)} de revenu</h3><p>Pour rester à 200 000 F de dépenses, la consommation maximale est de 16,7 % du revenu. La cible d’épargne ou d’investissement est de 83,3 %.</p><div className="v-ratio"><span style={{ width: "16.7%" }}>16,7 %</span><b>83,3 % à préserver</b></div></div></div>
      <div className="panel v-category-analysis"><div className="v-chart-head"><div><span className="eyebrow">RÉPARTITION DYNAMIQUE</span><h3>Où part l’argent.</h3></div>{topCategory && <div className="v-top-post"><small>N° 1</small><b>{topCategory.category}</b><strong>{money(topCategory.amount)}</strong></div>}</div>{categoryChartData.length ? <><div className="v-category-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={categoryChartData} layout="vertical" margin={{ top: 4, right: 18, left: 6, bottom: 0 }}><CartesianGrid stroke="#ffffff10" horizontal={false}/><XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: "#8fa49f", fontSize: 10 }} tickFormatter={axisMoney}/><YAxis type="category" dataKey="category" width={112} axisLine={false} tickLine={false} tick={{ fill: "#dbe6dc", fontSize: 11 }}/><Tooltip content={<ChartTooltip/>}/><Bar dataKey="amount" name="Dépenses" radius={[0, 7, 7, 0]} barSize={18}>{categoryChartData.map((item, index) => <Cell key={item.category} fill={index === 0 ? "#f28c77" : "#78ad74"}/>)}</Bar></BarChart></ResponsiveContainer></div><div className="v-category-summary">{categoryChartData.map((item, index) => <span key={item.category}><b>{index + 1}. {item.category}</b><small>{currentTotal ? Math.round(item.amount / currentTotal * 100) : 0} % · {money(item.amount)}</small></span>)}</div></> : <p>Aucune dépense sur cette période : les graphiques apparaîtront dès le premier enregistrement.</p>}</div>
      <div className="panel v-advisor"><span className="eyebrow">ANALYSTE FINANCIER · ACTIONS PRIORITAIRES</span><h3>Décisions recommandées.</h3><div className="v-advice-list"><div className={trendDelta > 0 ? "alert" : "good"}>{trendDelta > 0 ? <ArrowUpRight size={20}/> : <ArrowDownRight size={20}/>}<span><b>Tendance</b><small>{trendDelta > 0 ? `Réduire d’abord ${topCategory?.category || "le poste principal"}, responsable de ${money(topCategory?.amount || 0)} sur la période.` : "Les dépenses sont stables ou en baisse : conserver les plafonds actuels."}</small></span></div><div className={overruns.length ? "alert" : "good"}><Target size={20}/><span><b>Plafonds</b><small>{overruns.length ? `${overruns.map(item => item.category).join(", ")} ${overruns.length > 1 ? "dépassent" : "dépasse"} le budget du mois.` : "Aucune catégorie dotée d’un plafond n’est en dépassement."}</small></span></div><div className={(currentDeposits - currentWithdrawals) > 0 ? "good" : "watch"}><Wallet size={20}/><span><b>Épargne</b><small>{(currentDeposits - currentWithdrawals) > 0 ? `${money(currentDeposits - currentWithdrawals)} préservés sur la période.` : `Aucune épargne nette sur la période. Le repère proportionnel serait ${money(Math.round(periodIncomeReference - periodCap))}.`}</small></span></div></div></div>
    </>}
  </div>;
}
