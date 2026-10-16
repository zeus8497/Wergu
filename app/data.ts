export type Run={id:string;date:string;km:number;min:number;effort:number;note:string;kind?:"run"|"walk"};
export type SetEntry={reps:number;kg:number;rpe:number};
export type Session={id:string;date:string;name:string;sets:SetEntry[];knee:number;durationMin?:number};
export type Meal={id:string;date:string;slot:string;name:string;portion:number;protein:number|null;cost:number;kcal?:number|null;expenseId?:string};
export type WakePeriod={id:string;start:string;end:string};
export type Night={date:string;hours:number;wakes:number;quality:number;bed?:string;phone?:string;asleep?:string;awake?:string;awakeMinutes?:number;soreness?:number;wakeTimes?:string[];wakePeriods?:WakePeriod[];energy?:number};
export type Spend={id:string;date:string;category:string;amount:number;note:string};
export type Planned={id:string;category:string;name:string;estimate:number;paidId?:string;month?:string};
export type Income={id:string;date:string;amount:number;note:string};
export type WeightLog={date:string;kg:number};
export type SavingsTransaction={id:string;annualId:number;date:string;kind:"deposit"|"withdrawal";location:"Agence"|"GAB"|"Virement"|"Mobile Money";amount:number;note?:string};
export type State={name:string;weight:number;height:number|null;goalKm:number;goalMin:number|null;runs:Run[];sessions:Session[];meals:Meal[];nights:Night[];spends:Spend[];incomes:Income[];weights:WeightLog[];savingsTransactions:SavingsTransaction[];savingsOpeningBalance:number;budgets:Record<string,number>;monthBudgets:Record<string,Record<string,number>>;checkins:Record<string,{energy:number;knee:number;mood:number}>;habits:Record<string,Record<string,boolean>>;supplements:Record<string,Record<string,boolean>>;startedOn:string;runDays:number[];strengthDays:number[];marks:Record<string,{run?:"rest"|"missed";strength?:"rest"|"missed"}>;planned:Planned[];water:Record<string,number>;theme?:"dark"|"light"|"auto";financeStart?:string;notifications?:boolean;reminderTime?:string};
export const categories=["Alimentation","Loyer","Carburant","Transport","Électricité","Eau","Téléphone & Internet","Soutien familial","Santé","Habillement","Soins & hygiène","Sport","Compléments","Formation","Mariage","Épargne","Investissement","Dettes","Loisirs","Dons","Imprévus","Autres"];
export const initial:State={name:"Saliou",weight:93,height:180,goalKm:0,goalMin:null,runs:[],sessions:[],meals:[],nights:[],spends:[],incomes:[],weights:[],savingsTransactions:[],savingsOpeningBalance:0,budgets:Object.fromEntries(categories.map(c=>[c,c==="Alimentation"?60000:0])),monthBudgets:{},checkins:{},habits:{},supplements:{},startedOn:new Date().toLocaleDateString("sv-SE"),runDays:[2,5],strengthDays:[0,1,2,3,4,5,6],marks:{},planned:[],water:{},theme:"dark",notifications:false,reminderTime:"19:30"};
export const dateKey=(d=new Date())=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");
export const asDate=(key:string)=>new Date(Number(key.slice(0,4)),Number(key.slice(5,7))-1,Number(key.slice(8,10)));
export const addDays=(key:string,n:number)=>{const d=asDate(key);d.setDate(d.getDate()+n);return dateKey(d)};
export const weekday=(key:string)=>(asDate(key).getDay()+6)%7;
export const money=(n:number)=>new Intl.NumberFormat("fr-FR").format(n)+" F";
export const pace=(min:number,km:number)=>{if(!min||!km)return "—";const sec=Math.round(min*60/km);return Math.floor(sec/60)+"’"+String(sec%60).padStart(2,"0")+"”/km"};
export const uid=()=>globalThis.crypto?.randomUUID?.()||Date.now()+"-"+Math.random().toString(36).slice(2);
export const migrate=(v:any):State=>({...initial,...v,budgets:{...initial.budgets,...v.budgets},incomes:Array.isArray(v.incomes)?v.incomes:[],weights:Array.isArray(v.weights)?v.weights:[],savingsTransactions:Array.isArray(v.savingsTransactions)?v.savingsTransactions:[],savingsOpeningBalance:Number(v.savingsOpeningBalance)||0,startedOn:v.startedOn||[...v.runs.map((r:Run)=>r.date),...v.sessions.map((x:Session)=>x.date)].sort()[0]||dateKey(),runDays:Array.isArray(v.runDays)?v.runDays:initial.runDays,strengthDays:Array.isArray(v.strengthDays)?v.strengthDays:initial.strengthDays,marks:v.marks||{},planned:Array.isArray(v.planned)?v.planned:[],water:v.water||{},monthBudgets:v.monthBudgets||{},nights:v.nights.map((n:Night)=>({...n,wakePeriods:Array.isArray(n.wakePeriods)?n.wakePeriods:[]})),meals:v.meals.map((m:Meal)=>({...m,portion:m.portion>10?m.portion/100:m.portion}))});
export const valid=(v:any):v is State=>!!v&&typeof v.name==="string"&&typeof v.weight==="number"&&["runs","sessions","meals","nights","spends"].every(k=>Array.isArray(v[k]))&&["budgets","checkins","habits","supplements"].every(k=>v[k]&&typeof v[k]==="object"&&!Array.isArray(v[k]))&&v.runs.every((r:any)=>r&&typeof r.date==="string"&&typeof r.km==="number"&&r.km>=0&&typeof r.min==="number"&&r.min>=0)&&v.sessions.every((x:any)=>x&&typeof x.date==="string"&&typeof x.name==="string"&&Array.isArray(x.sets)&&x.sets.every((t:any)=>t&&typeof t.reps==="number"&&typeof t.kg==="number"))&&v.meals.every((m:any)=>m&&typeof m.date==="string"&&typeof m.name==="string"&&typeof m.portion==="number"&&typeof m.cost==="number")&&v.nights.every((n:any)=>n&&typeof n.date==="string"&&typeof n.hours==="number")&&v.spends.every((e:any)=>e&&typeof e.amount==="number"&&e.amount>=0&&typeof e.category==="string"&&typeof e.date==="string");
export type Food={name:string;portion:string;kcal:number;protein:number;type:"stock"|"outside"};
export const foods:Record<string,Food[]>={
"Petit-déjeuner":[
{name:"Deux œufs bouillis",portion:"2 œufs",kcal:144,protein:12.6,type:"stock"},
{name:"Omelette de deux œufs",portion:"2 œufs + env. 1 c. à café d’huile",kcal:190,protein:12.6,type:"stock"},
{name:"Lait entier en poudre",portion:"25 g de poudre préparée avec eau",kcal:125,protein:6.5,type:"stock"},
{name:"Banane",portion:"1 moyenne",kcal:105,protein:1.3,type:"stock"},
{name:"Demi-baguette",portion:"environ 100 g",kcal:270,protein:8.5,type:"stock"},
{name:"Baguette entière",portion:"environ 200 g",kcal:540,protein:17,type:"stock"},
{name:"Pain · quantité 500 g",portion:"500 g",kcal:1350,protein:42.5,type:"stock"},
{name:"Nutri Love beurre de cacahuète",portion:"20 g · estimation à confirmer par photo",kcal:120,protein:3.6,type:"stock"},
{name:"Yaourt nature",portion:"1 pot / 125 g",kcal:85,protein:5,type:"stock"},
{name:"Flocons d’avoine",portion:"50 g",kcal:190,protein:6.5,type:"stock"},
{name:"Fromage",portion:"30 g",kcal:110,protein:7,type:"stock"},
{name:"Jus de fruit",portion:"250 ml",kcal:115,protein:0.5,type:"stock"},
{name:"Sandwich omelette",portion:"1 sandwich",kcal:450,protein:19,type:"outside"}],
"Déjeuner":[
{name:"Riz rouge au poisson",portion:"1 assiette normale",kcal:680,protein:30,type:"outside"},
{name:"Riz blanc au poisson",portion:"1 assiette normale",kcal:620,protein:30,type:"outside"},
{name:"Riz rouge au poulet",portion:"1 assiette normale",kcal:750,protein:36,type:"outside"},
{name:"Riz blanc au poulet",portion:"1 assiette normale",kcal:690,protein:36,type:"outside"},
{name:"Yassa poulet",portion:"1 assiette normale",kcal:700,protein:33,type:"outside"},
{name:"Domoda",portion:"1 assiette normale",kcal:720,protein:28,type:"outside"},
{name:"Soupou kandja",portion:"1 assiette normale",kcal:760,protein:30,type:"outside"},
{name:"Mafé",portion:"1 assiette normale",kcal:800,protein:27,type:"outside"},
{name:"Couscous viande et légumes",portion:"1 assiette normale",kcal:650,protein:30,type:"outside"},
{name:"Petits pois à la viande",portion:"1 assiette normale",kcal:560,protein:32,type:"outside"},
{name:"Macaronis à la viande",portion:"1 assiette normale",kcal:650,protein:29,type:"outside"},
{name:"Spaghetti viande ou poulet",portion:"1 assiette normale",kcal:680,protein:30,type:"outside"},
{name:"Tacos",portion:"1 moyen",kcal:750,protein:28,type:"outside"},
{name:"Hamburger",portion:"1 simple",kcal:520,protein:25,type:"outside"},
{name:"Pain froid garni",portion:"1 sandwich",kcal:480,protein:20,type:"outside"},
{name:"Sandwich poulet",portion:"1 sandwich",kcal:550,protein:27,type:"outside"},
{name:"Soupe avec pain",portion:"1 bol + pain",kcal:420,protein:18,type:"outside"},
{name:"Fondé au lait",portion:"1 bol normal",kcal:430,protein:13,type:"outside"}],
"Collation":[
{name:"Pain + thon",portion:"1 sandwich",kcal:380,protein:25,type:"outside"},{name:"Banane",portion:"1 moyenne",kcal:105,protein:1.3,type:"stock"},{name:"Yaourt",portion:"1 pot",kcal:85,protein:5,type:"stock"},{name:"Arachides",portion:"30 g",kcal:175,protein:7,type:"stock"},{name:"Lait entier en poudre préparé",portion:"25 g de poudre",kcal:125,protein:6.5,type:"stock"},{name:"Demi-baguette + Nutri Love",portion:"100 g pain + 20 g",kcal:390,protein:12,type:"stock"}],
"Dîner":[
{name:"Thon + petits pois",portion:"1 assiette",kcal:400,protein:35,type:"outside"},{name:"Vermicelles au poulet",portion:"1 assiette",kcal:600,protein:30,type:"outside"},{name:"Spaghetti au thon",portion:"1 assiette",kcal:600,protein:29,type:"outside"},{name:"Soupe + œufs + pain",portion:"1 bol et accompagnement",kcal:450,protein:21,type:"outside"},{name:"Riz + poisson",portion:"1 assiette",kcal:650,protein:28,type:"outside"},{name:"Riz + poulet",portion:"1 assiette",kcal:700,protein:35,type:"outside"},{name:"Omelette + pain + légumes",portion:"1 assiette",kcal:450,protein:22,type:"outside"},{name:"Lentilles + œufs",portion:"1 assiette",kcal:520,protein:28,type:"outside"},{name:"Sandwich thon",portion:"1 sandwich",kcal:420,protein:25,type:"outside"},{name:"Poisson grillé + légumes",portion:"1 assiette",kcal:480,protein:37,type:"outside"},{name:"Poulet + pommes de terre",portion:"1 assiette",kcal:650,protein:34,type:"outside"}]
};
export const exercises=[
{name:"Tractions",group:"Tirer",why:"Renforce le dos et les bras ; note l’assistance utilisée pour comparer tes séries."},
{name:"Pompes",group:"Pousser",why:"Travaille poitrine, triceps et contrôle du tronc ; adapte l’inclinaison au niveau du jour."},
{name:"Tirage élastique",group:"Tirer",why:"Travaille le haut du dos avec une résistance modulable."},
{name:"Développé haltères",group:"Pousser",why:"Renforce épaules et bras ; privilégie une amplitude confortable."},
{name:"Soulevé de terre haltères",group:"Hanche",why:"Sollicite hanches et chaîne postérieure ; apprends une charnière de hanche stable."},
{name:"Pont de hanches",group:"Hanche",why:"Travaille l’extension de hanche avec une charge adaptable."},
{name:"Squat à amplitude confortable",group:"Jambes",why:"Travaille jambes et contrôle du mouvement ; réduis l’amplitude si le genou gêne."},
{name:"Fente arrière assistée",group:"Jambes",why:"Développe la force unilatérale ; choisis une variante sans douleur."},
{name:"Gainage",group:"Tronc",why:"Aide à contrôler le tronc pendant les autres mouvements."},
{name:"Marche chargée",group:"Corps entier",why:"Associe prise, posture et marche avec une charge gérable."}
];
export const supplements=[
{name:"Whey Protein",brand:"OstroVit",moment:"Après l’entraînement ou avec un repas pauvre en protéines",mix:"1 portion dans de l’eau ou du lait",kcal:115,protein:23,portion:"30 g"},
{name:"Créatine monohydrate",brand:"OstroVit",moment:"Chaque jour à un moment régulier",mix:"Dans de l’eau ou une boisson",kcal:0,protein:0,portion:"5 g"},
{name:"BCAA 2-1-1",brand:"OstroVit",moment:"Facultatif autour de l’entraînement",mix:"Dans de l’eau",kcal:40,protein:0,portion:"10 g"},
{name:"Gainer Mass Up",brand:"OstroVit",moment:"Après l’entraînement ou en collation si les repas sont insuffisants",mix:"Dans de l’eau ou du lait",kcal:380,protein:20,portion:"100 g"}
];
const who="https://www.who.int/news-room/fact-sheets/detail/physical-activity";
const cdc="https://www.cdc.gov/sleep/about/index.html";
const nih="https://ods.od.nih.gov/factsheets/ExerciseAndAthleticPerformance-HealthProfessional/";
export const insights:Record<"run"|"strength"|"nutrition"|"sleep",{text:string;source:string;url:string}[]>={
run:[
"L’OMS associe l’activité physique régulière à un risque plus faible de maladies cardiovasculaires et de diabète de type 2.",
"Pour les adultes, le repère est de 150 à 300 minutes d’activité aérobie modérée par semaine, ou l’équivalent en activité intense.",
"Une sortie compte même sans record : l’OMS indique que toute activité physique vaut mieux que l’inactivité.",
"L’activité aérobie régulière contribue à améliorer la santé cardiorespiratoire ; la répétition des séances compte plus qu’un chrono isolé.",
"La course n’est qu’une manière de bouger : la marche active participe aussi au volume d’activité recommandé.",
"Une activité physique insuffisante est associée à davantage de maladies chroniques ; un calendrier aide à observer la régularité réelle.",
"L’OMS recommande aussi deux jours ou plus de renforcement musculaire par semaine : courir ne remplace pas ce travail.",
"L’activité physique régulière est liée à une réduction des symptômes d’anxiété et de dépression à l’échelle des populations.",
"Additionne les minutes de la semaine : la recommandation de santé porte sur l’activité cumulée, pas sur une distance obligatoire chaque matin.",
"L’OMS indique que l’activité physique réduit le risque de mortalité toutes causes à l’échelle des populations.",
"Un jour facile peut apporter des minutes d’activité sans transformer chaque sortie en effort maximal.",
"L’activité physique est associée à un risque plus faible d’hypertension ; note la durée de tes sorties pour suivre ton volume réel.",
"Enregistrer effort, distance et durée permet de comparer des séances semblables ; une allure seule ne raconte pas tout.",
"Une hausse brutale de kilomètres n’est pas requise pour bénéficier de l’activité physique : le volume peut progresser graduellement.",
"L’OMS relie l’activité régulière à une meilleure santé mentale et à une amélioration du bien-être.",
"Des activités de différentes intensités peuvent se combiner dans le total hebdomadaire recommandé.",
"Le temps d’activité compte également quand une sortie est courte : il n’y a pas de seuil minimal de kilomètres pour qu’elle ait un intérêt.",
"La pratique régulière aide à maintenir la condition cardiorespiratoire ; note les interruptions pour comprendre la tendance.",
"L’activité physique est associée à une diminution du risque de certains cancers à l’échelle des populations.",
"Comparer plusieurs semaines de sorties révèle mieux la constance qu’un seul meilleur temps.",
"Le renforcement et la course sont complémentaires dans les recommandations de l’OMS : prévois une place aux deux.",
"Une sortie lente peut augmenter ton volume d’activité hebdomadaire sans chercher un record de vitesse.",
"L’OMS rappelle que les bénéfices de l’activité apparaissent même en dessous du volume recommandé : reprendre compte.",
"Les minutes de marche rapide ou de course peuvent contribuer au même objectif hebdomadaire selon l’intensité.",
"Enregistre aussi la gêne au genou : une distance n’est utile que si elle reste compatible avec ta récupération.",
"L’activité physique régulière est associée à un meilleur sommeil ; garde une trace séparée des nuits et des séances.",
"La santé ne se mesure pas à la seule allure au kilomètre : les minutes d’activité font aussi partie du bilan.",
"Chez l’adulte, l’OMS recommande de limiter le temps sédentaire et de remplacer une partie de ce temps par du mouvement.",
"Un objectif pertinent peut évoluer avec tes données : regarde la régularité et le ressenti avant d’augmenter le volume.",
"Une course notée aujourd’hui contribue à ton total de la semaine ; une seule sortie ne détermine pas ta santé future."
].map(text=>({text,source:"OMS · Activité physique",url:who})),
strength:[
"L’OMS recommande de renforcer les principaux groupes musculaires au moins deux jours par semaine.",
"Les exercices de force complètent l’activité aérobie dans les recommandations de santé pour les adultes.",
"Noter les répétitions et charges permet de distinguer une progression réelle d’une simple impression.",
"Pousser, tirer et travailler les jambes répartit l’effort sur plusieurs groupes musculaires.",
"Une série de tractions réellement effectuée est une donnée utile ; note aussi l’assistance ou la variante choisie.",
"La fréquence de renforcement se mesure en séances réalisées, pas en exercices prévus puis oubliés."
].map(text=>({text,source:"OMS · Activité physique",url:who})),
nutrition:[
"Le NIH rappelle qu’un apport énergétique, des glucides, des protéines et des liquides suffisants soutiennent l’entraînement.",
"Pour construire ou conserver du muscle avec l’entraînement, l’apport protéique de la journée compte davantage qu’un seul shaker.",
"Les glucides alimentaires contribuent à maintenir la glycémie et à reconstituer les réserves de glycogène utilisées à l’effort.",
"Une whey peut compléter un repas pauvre en protéines ; le NIH précise qu’un complément ne remplace pas une alimentation adéquate.",
"Courir longtemps ou sous forte chaleur peut accroître les besoins en eau et, selon l’effort, en électrolytes.",
"La quantité du plat modifie l’estimation des calories : note la portion avant de comparer deux journées."
].map(text=>({text,source:"NIH · Nutrition et exercice",url:nih})),
sleep:[
"Dormir régulièrement moins de 7 heures est associé à davantage de risques cardiométaboliques ; le CDC recommande au moins 7 heures aux adultes de 18 à 60 ans.",
"Le CDC relie un sommeil suffisant à une meilleure attention et mémoire : une nuit de 6 heures peut peser sur les décisions du lendemain.",
"Le sommeil interrompu n’équivaut pas nécessairement à une nuit réparatrice : le CDC distingue durée et qualité.",
"Des réveils répétés pendant la nuit figurent parmi les signes d’un sommeil de mauvaise qualité selon le CDC.",
"Un sommeil suffisant est associé à un risque plus faible d’hypertension, de maladie cardiaque et de diabète de type 2.",
"Éteindre les appareils électroniques au moins 30 minutes avant le coucher fait partie des conseils du CDC pour mieux dormir.",
"Le CDC recommande des horaires réguliers de coucher et de lever ; noter tes heures permet de voir les écarts réels."
].map(text=>({text,source:"CDC · Sommeil",url:cdc}))
};
export const insightFor=(area:keyof typeof insights,key:string)=>{const d=asDate(key);const index=Math.floor(d.getTime()/86400000);const list=insights[area];return list[((index%list.length)+list.length)%list.length]};
