import { useState, useEffect, useCallback, useRef } from "react";
import { loadShared, saveShared, subscribeToKey } from "./storage";

// ─── MATCHES + INLINE BONUSES ────────────────────────────────────────────────
const MATCH_PTS = 5;
const BONUS_PTS = 2;
const matches = [
  // ── NIGHT 1 (Saturday, April 18) ─────────────────────────────────────────
  // ESPN2 First Hour
  { id:"m11", night:1, title:"Six-Man Tag", note:"ESPN2 First Hour", competitors:[
    { name:"Logan Paul, Austin Theory & iShowSpeed", role:"" },
    { name:"LA Knight & The Usos",                   role:"" },
  ], bonuses:[
    { id:"b_m11_a", label:"Who takes the pin?", type:"select", options:["Logan Paul","Austin Theory","iShowSpeed","LA Knight","Jimmy Uso","Jey Uso"] },
  ]},
  { id:"m8",  night:1, title:"Unsanctioned Match", note:"ESPN2 First Hour", competitors:[
    { name:"Drew McIntyre", role:"" },
    { name:"Jacob Fatu",    role:"" },
  ], bonuses:[
    { id:"b_m8_a", label:"Who bleeds first?", type:"select", options:["Drew McIntyre","Jacob Fatu"] },
  ]},
  // Main Card
  { id:"m10", night:1, title:"WWE Women's Tag Team Championship", note:"Fatal 4-Way", belt:"./belts/WWE_Women's_Tag_Team_Championship.png", competitors:[
    { name:"Bayley & Lyra Valkyria",        role:"" },
    { name:"Brie Bella & SURPRISE",         role:"" },
    { name:"Nia Jax & Lash Legend",         role:"Champions" },
    { name:"Alexa Bliss & Charlotte Flair", role:"" },
  ], bonuses:[
    { id:"b_m10_a", label:"Who gets the pin?", type:"select", options:["Bayley","Lyra Valkyria","Nikki Bella","Brie Bella","Paige","Nia Jax","Lash Legend","Alexa Bliss","Charlotte Flair"] },
  ]},
  { id:"m6",  night:1, title:"WWE Women's Intercontinental Championship", belt:"./belts/WWE_Women's_Intercontinental_Championship.png", competitors:[
    { name:"Becky Lynch", role:"Challenger" },
    { name:"AJ Lee",      role:"Champion"   },
  ], bonuses:[
    { id:"b_m6_a", label:"Does this match end in a submission?", type:"yesno" },
  ]},
  { id:"m12", night:1, title:"Singles Match", competitors:[
    { name:"Gunther",      role:"" },
    { name:"Seth Rollins", role:"" },
  ], bonuses:[
    { id:"b_m12_a", label:"Seth Rollins entrance length?", type:"overunder", line:"O/U 2 min 15 sec" },
  ]},
  { id:"m3",  night:1, title:"WWE Women's World Championship", belt:"./belts/Women's_World_Championship_(WWE)_2023.png", competitors:[
    { name:"Stephanie Vaquer", role:"Champion"   },
    { name:"Liv Morgan",       role:"Challenger" },
  ], bonuses:[
    { id:"b_m3_a", label:"Do they fight before or after the bell?", type:"select", options:["Before","After"] },
  ]},
  { id:"m1",  night:1, isMain:true, title:"Undisputed WWE Championship", belt:"./belts/Undisputed_WWE_Championship.png", competitors:[
    { name:"Cody Rhodes",  role:"Champion"   },
    { name:"Randy Orton",  role:"Challenger · w/ Pat MAGAFee" },
  ], bonuses:[
    { id:"b_m1_a", label:"Does Pat McAfee get on commentary?", type:"yesno" },
    { id:"b_m1_b", label:"Clean show of respect after the match?", type:"yesno" },
  ]},
  // ── NIGHT 2 (Sunday, April 19) ───────────────────────────────────────────
  // ESPN2 First Hour
  { id:"m4",  night:2, title:"IC Championship — Ladder Match", note:"6-Way Ladder · ESPN2 First Hour", belt:"./belts/WWE_Intercontinental_Championship_2024.png", competitors:[
    { name:"JD McDonagh",  role:""         },
    { name:"Dragon Lee",   role:""         },
    { name:"Penta",        role:"Champion" },
    { name:"Je'Von Evans", role:""         },
    { name:"Rey Mysterio", role:""         },
    { name:"Rusev",        role:""         },
  ], bonuses:[
    { id:"b_m4_a", label:"First to start climbing towards the belt?", type:"select", options:["JD McDonagh","Dragon Lee","Penta","Je'Von Evans","Rey Mysterio","Rusev"] },
  ]},
  { id:"m9",  night:2, title:"Brock Lesnar vs. Oba Femi", note:"ESPN2 First Hour", competitors:[
    { name:"Brock Lesnar", role:"" },
    { name:"Oba Femi",     role:"" },
  ], bonuses:[
    { id:"b_m9_a", label:"Someone gets held above their opponent's head?", type:"overunder", line:"O/U 2.5 times" },
  ]},
  // Main Card
  { id:"m7",  night:2, title:"Undisputed United States Championship", belt:"./belts/WWE_United_States_Championship_July_2020.png", competitors:[
    { name:"Sami Zayn",       role:"Champion"   },
    { name:"Trick Williams",  role:"Challenger" },
  ], bonuses:[
    { id:"b_m7_a", label:"Lil Yachty makes an appearance?", type:"yesno" },
  ]},
  { id:"m2",  night:2, title:"WWE Women's Championship", belt:"./belts/WWE_Women's_Championship_(2023).png", competitors:[
    { name:"Jade Cargill", role:"Champion"   },
    { name:"Rhea Ripley",  role:"Challenger" },
  ], bonuses:[
    { id:"b_m2_a", label:"Match length?", type:"overunder", line:"O/U 19 minutes" },
  ]},
  { id:"m13", night:2, title:"Street Fight", competitors:[
    { name:"Demon Finn Bálor",  role:"" },
    { name:"Dominik Mysterio",  role:"" },
  ], bonuses:[
    { id:"b_m13_a", label:"Does 'Demonito' make an appearance?", type:"yesno" },
  ]},
  { id:"m5",  night:2, isMain:true, title:"WWE World Heavyweight Championship", belt:"./belts/World_Heavyweight_Championship_WWE_2023.png", competitors:[
    { name:"CM Punk",      role:"Champion"   },
    { name:"Roman Reigns", role:"Challenger" },
  ], bonuses:[
    { id:"b_m5_a", label:"How long do they stare at each other before making a move?", type:"overunder", line:"O/U 1 minute" },
    { id:"b_m5_b", label:"Does the Bloodline interfere?", type:"yesno" },
  ]},
];

// All bonuses flattened for scoring
const allBonuses = matches.flatMap(m => (m.bonuses || []).map(b => ({ ...b, matchId: m.id })));

// Bonus answer aliases: pairs of values that score as equivalent for a given bonus
const BONUS_EQUIV = {
  "b_m10_a": [["Paige", "Nikki Bella"]], // Paige subbed in for Nikki Bella
};
function bonusAnswersMatch(bonusId, actual, guess) {
  if (!actual || !guess) return false;
  if (actual === guess) return true;
  const pairs = BONUS_EQUIV[bonusId] || [];
  return pairs.some(([a, b]) => (actual === a && guess === b) || (actual === b && guess === a));
}

// ─── END BONUSES ─────────────────────────────────────────────────────────────
const matchShorthands = {
  m11: "Six-Man Tag",
  m8:  "Drew vs Jacob (Unsanctioned)",
  m10: "Women's 4-Way Tag (Tag Title)",
  m6:  "AJ Lee vs Becky (Women's IC)",
  m12: "Gunther vs Rollins",
  m3:  "Vaquer vs Liv (Women's World)",
  m1:  "Cody vs Randy (WWE Title)",
  m4:  "IC Ladder Match (IC Title)",
  m9:  "Lesnar vs Oba",
  m7:  "Sami vs Trick (US Title)",
  m2:  "Jade vs Rhea (Women's Title)",
  m13: "Demon Finn vs Dom",
  m5:  "Punk vs Reigns (Heavyweight)",
};
const matchOptions = matches.map(m => matchShorthands[m.id] || m.title);
const endBonuses = [
  { id:"eb1", label:"Longest match of the weekend", type:"select", options:matchOptions },
  { id:"eb2", label:"Shortest match of the weekend", type:"select", options:matchOptions },
];

// ─── SURPRISE APPEARANCES ────────────────────────────────────────────────────
const SURPRISE_SLOTS = 6;
const ADMIN_SURPRISE_SLOTS = 10;
const SURPRISE_PTS   = 2; // +2 per correct, −2 per wrong

const PICKS_KEY    = "wm42_v4_picks";
const RESULTS_KEY  = "wm42_v4_results";
const ADMIN_PASS   = import.meta.env.VITE_ADMIN_PASS || "";
// Lockout: 12:00 AM ET on Saturday April 18, 2026 (midnight before the show)
const LOCKOUT_UTC  = new Date("2026-04-18T04:00:00Z");
function isLocked() { return Date.now() >= LOCKOUT_UTC.getTime(); }

function generateKey(name) {
  const noVowels = name.toUpperCase().replace(/[AEIOU\s]/g, "") || "XXX";
  const suffixes = ["420", "69", "13", "666", "67"];
  const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
  return noVowels + suffix;
}

// ─── DESIGN TOKENS ───────────────────────────────────────────────────────────
const GOLD   = "#c8a028";
const GOLD2  = "#f0d060";
const RED    = "#c0392b";
const GREEN  = "#27ae60";
const PURPLE = "#9b59b6";
const BORDER = "rgba(255,255,255,0.07)";
const BG     = "rgba(255,255,255,0.03)";
// 0=name 1=night1 2=night2 3=endBonuses+surprises 4=review → 5=done
const STEPS = 5;

function maxScore() {
  const matchMax    = matches.length * MATCH_PTS;
  const bonusMax    = allBonuses.length * BONUS_PTS;
  const endMax      = endBonuses.length * BONUS_PTS;
  const surpriseMax = SURPRISE_SLOTS * SURPRISE_PTS;
  return matchMax + bonusMax + endMax + surpriseMax;
}

function normalizeName(s) {
  return (s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}
function parseActualVariants(actual) {
  return (actual || "").split("|").map(normalizeName).filter(Boolean);
}
function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = new Array(b.length + 1);
  let curr = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[b.length];
}
function fuzzyThreshold(len) {
  if (len <= 4) return 0;
  if (len <= 7) return 1;
  if (len <= 11) return 2;
  return 3;
}
function matchesSurprise(guess, variants) {
  const g = normalizeName(guess);
  if (!g) return false;
  for (const v of variants) {
    if (!v) continue;
    if (g === v) return true;
    const threshold = fuzzyThreshold(Math.min(g.length, v.length));
    if (threshold > 0 && levenshtein(g, v) <= threshold) return true;
  }
  return false;
}

function calcScore(sub, results) {
  if (!results?.picks) return null;
  let s = 0;
  // Match winners — 5 pts each
  matches.forEach(m => {
    const winner = results.picks[m.id];
    if (winner && sub.picks?.[m.id] === winner) s += MATCH_PTS;
  });
  // Inline bonuses — 2 pts each
  allBonuses.forEach(b => {
    const actual = results.bonuses?.[b.id];
    const guess  = sub.bonuses?.[b.id];
    if (bonusAnswersMatch(b.id, actual, guess)) s += BONUS_PTS;
  });
  // End bonuses — 2 pts each
  endBonuses.forEach(eb => {
    const actual = results.endBonuses?.[eb.id];
    const guess  = sub.endBonuses?.[eb.id];
    if (actual && guess && actual === guess) s += BONUS_PTS;
  });
  // Surprise guesses: +2 per correct (as soon as confirmed),
  // −2 per wrong only once the show is marked complete (blank = 0)
  const variants = (results.surprises || []).flatMap(parseActualVariants);
  const guesses = (sub.surprises || []).filter(Boolean);
  guesses.forEach(g => {
    if (matchesSurprise(g, variants)) s += SURPRISE_PTS;
    else if (results.gameOver) s -= SURPRISE_PTS;
  });
  return s;
}

// ─── SHARED STYLES ───────────────────────────────────────────────────────────
const S = {
  input: { width:"100%", boxSizing:"border-box", background:"rgba(255,255,255,0.06)", border:`1px solid ${GOLD}35`, borderRadius:10, color:"#f5efe5", fontSize:17, padding:"15px 18px", outline:"none", fontFamily:"Georgia, serif" },
  btn: (color=GOLD, disabled=false) => ({ background:disabled?"rgba(255,255,255,0.04)":`linear-gradient(135deg,${color}cc,${color})`, border:"none", borderRadius:10, color:disabled?"#6a6060":(color===GOLD?"#0c0b12":"#fff"), cursor:disabled?"not-allowed":"pointer", fontSize:15, fontWeight:700, letterSpacing:"0.1em", padding:"16px 30px", textTransform:"uppercase", fontFamily:"Georgia, serif", transition:"all 0.15s" }),
  card: { background:"rgba(255,255,255,0.025)", border:`1px solid rgba(255,255,255,0.06)`, borderRadius:14, padding:"18px 18px", marginBottom:18 },
  lbl:  { fontSize:13, letterSpacing:"0.18em", color:GOLD, textTransform:"uppercase", marginBottom:12 },
  ptsBadge: (pts, color) => ({ fontSize:12, letterSpacing:"0.05em", color:color||GOLD, background:`${color||GOLD}15`, padding:"4px 10px", borderRadius:6, fontWeight:700, whiteSpace:"nowrap" }),
};

// ─── ROOT ────────────────────────────────────────────────────────────────────
export default function WM42() {
  const [tab,       setTab]       = useState("board");
  const [step,      setStep]      = useState(0);
  const [name,      setName]      = useState("");
  const [picks,        setPicks]        = useState({});
  const [bonusPicks,   setBonusPicks]   = useState({});
  const [endPicks,     setEndPicks]     = useState({});
  const [surprises,    setSurprises]    = useState([]);
  const [subs,      setSubs]      = useState([]);
  const [results,   setResults]   = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [lastRefresh,setLastRefresh] = useState(null);
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [adminPass,     setAdminPass]     = useState("");
  const [editKey,       setEditKey]       = useState("");
  const [adminUnlocked2,setAdminUnlocked2]= useState(false);
  const [, forceTick]                     = useState(0);
  const tapCountRef = useRef(0);
  const tapResetRef = useRef(null);
  const contentRef = useRef(null);

  // Re-render every 30s so the lockout takes effect for open sessions
  useEffect(() => {
    const t = setInterval(() => forceTick(n => n + 1), 30000);
    return () => clearInterval(t);
  }, []);

  function handleHeroTap() {
    tapCountRef.current += 1;
    clearTimeout(tapResetRef.current);
    tapResetRef.current = setTimeout(() => { tapCountRef.current = 0; }, 1500);
    if (tapCountRef.current >= 5) {
      setAdminUnlocked2(true);
      tapCountRef.current = 0;
      setTab("admin");
    }
  }

  const fetchBoard = useCallback(async (triggerAI=false) => {
    setLoading(true);
    const [fetchedSubs, fetchedRes] = await Promise.all([
      loadShared(PICKS_KEY, []),
      loadShared(RESULTS_KEY, null),
    ]);

    // ── Migration: rewrite old end-bonus format to new shorthand ──
    // Old: "${m.title} — ${competitors.join(" vs ")}"
    // New: matchShorthands[m.id]
    const oldToNew = {};
    matches.forEach(m => {
      const oldLabel = `${m.title} — ${m.competitors.map(c=>c.name).join(" vs ")}`;
      oldToNew[oldLabel] = matchShorthands[m.id] || m.title;
    });
    let migrated = false;
    const cleanedSubs = fetchedSubs.map(sub => {
      const eb = sub.endBonuses || {};
      const newEb = {};
      let changed = false;
      Object.entries(eb).forEach(([k, v]) => {
        if (v && oldToNew[v]) { newEb[k] = oldToNew[v]; changed = true; }
        else newEb[k] = v;
      });
      if (changed) { migrated = true; return { ...sub, endBonuses: newEb }; }
      return sub;
    });
    if (migrated) {
      await saveShared(PICKS_KEY, cleanedSubs);
    }

    setSubs(cleanedSubs);
    setResults(fetchedRes);
    setLastRefresh(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    if (contentRef.current) contentRef.current.scrollTo(0, 0);
  }, [step, tab]);

  useEffect(() => {
    if (tab==="board") {
      fetchBoard();

      // Realtime subscriptions
      const picksChan = subscribeToKey(PICKS_KEY, (newVal) => {
        if (newVal) setSubs(newVal);
      });
      const resultsChan = subscribeToKey(RESULTS_KEY, (newVal) => {
        setResults(newVal);
      });

      return () => {
        picksChan.unsubscribe();
        resultsChan.unsubscribe();
      };
    }
  }, [tab]);

  async function handleSubmit() {
    // Re-check lockout right at save time so a stale session can't sneak through
    if (isLocked()) {
      alert("Picks are locked — the show has started.");
      return;
    }
    setLoading(true);
    let existing = await loadShared(PICKS_KEY, []);
    const idx = existing.findIndex(s=>s.name.toLowerCase()===name.trim().toLowerCase());
    const key = idx >= 0 ? existing[idx].editKey : generateKey(name.trim());
    const sub = { name:name.trim(), picks, bonuses:bonusPicks, endBonuses:endPicks, surprises:surprises.filter(Boolean), editKey:key, ts:Date.now() };
    if (idx>=0) existing[idx]=sub; else existing.push(sub);
    const ok = await saveShared(PICKS_KEY, existing);
    setEditKey(key);
    setLoading(false);
    if (ok) setStep(STEPS); else alert("Save failed — try again.");
  }

  async function adminSave(overrides) {
    // Track the most recently entered match result for the ticker
    let lastPickId = results?.lastPickId;
    if (overrides.picks) {
      const newPick = Object.entries(overrides.picks).find(([,v]) => v !== null);
      if (newPick) lastPickId = newPick[0];
    }
    const merged = {
      ...(results||{}),
      picks:      { ...(results?.picks||{}),      ...(overrides.picks||{}) },
      bonuses:    { ...(results?.bonuses||{}),    ...(overrides.bonuses||{}) },
      endBonuses: { ...(results?.endBonuses||{}), ...(overrides.endBonuses||{}) },
      surprises:  overrides.surprises !== undefined ? overrides.surprises : (results?.surprises||[]),
      gameOver:   results?.gameOver||false,
      lastPickId,
      lastUpdated:"Admin",
    };
    // Clean out null values (toggled off)
    ["picks","bonuses","endBonuses"].forEach(key => {
      Object.keys(merged[key]||{}).forEach(k => { if (merged[key][k] === null) delete merged[key][k]; });
    });
    // If the latest pick was just toggled off, clear the lastPickId
    if (merged.lastPickId && !merged.picks[merged.lastPickId]) merged.lastPickId = null;
    const ok = await saveShared(RESULTS_KEY, merged);
    if (ok) setResults(merged);
  }

  async function handleMarkDone() {
    const updated = { ...(results||{}), gameOver:!(results?.gameOver) };
    const ok = await saveShared(RESULTS_KEY, updated);
    if (ok) setResults(updated);
  }

  async function handleClearAll() {
    if (!window.confirm("Delete ALL data? Cannot be undone.")) return;
    await saveShared(PICKS_KEY,[]); await saveShared(RESULTS_KEY,null);
    setSubs([]); setResults(null);
  }

  function loadExistingSub(existing) {
    setPicks(existing.picks || {});
    setBonusPicks(existing.bonuses || {});
    setEndPicks(existing.endBonuses || {});
    setSurprises(existing.surprises || []);
    setEditKey(existing.editKey || "");
    setStep(1);
  }

  const locked = isLocked();

  const renderPick = () => {
    if (locked) return <LockedStep />;
    if (step===0) return <NameStep name={name} setName={setName} onNewUser={()=>setStep(1)} onReturningUser={loadExistingSub} />;
    if (step===1) return <MatchStep night={1} picks={picks} setPicks={setPicks} bonusPicks={bonusPicks} setBonusPicks={setBonusPicks} onBack={()=>setStep(0)} onNext={()=>setStep(2)} />;
    if (step===2) return <MatchStep night={2} picks={picks} setPicks={setPicks} bonusPicks={bonusPicks} setBonusPicks={setBonusPicks} onBack={()=>setStep(1)} onNext={()=>setStep(3)} />;
    if (step===3) return <BonusStep endPicks={endPicks} setEndPicks={setEndPicks} surprises={surprises} setSurprises={setSurprises} onBack={()=>setStep(2)} onNext={()=>setStep(4)} />;
    if (step===4) return <ReviewStep name={name} picks={picks} bonusPicks={bonusPicks} endPicks={endPicks} surprises={surprises} loading={loading} onBack={()=>setStep(3)} onSubmit={handleSubmit} />;
    if (step===STEPS) return <DoneStep name={name} editKey={editKey} onViewBoard={()=>setTab("board")} onEdit={()=>setStep(0)} />;
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100vh", background:"radial-gradient(ellipse at 20% 10%, #1a1228 0%, #0c0b12 55%, #0f0d18 100%)", color:"#f5efe5", fontFamily:"Georgia, serif", overflow:"hidden" }}>
      {/* Header */}
      <div style={{ flexShrink:0, textAlign:"center", borderBottom:"1px solid rgba(200,160,40,0.12)", background:"rgba(0,0,0,0.3)", overflow:"hidden", position:"relative" }}>
        <img src="./guesslemania2.png" alt="Guesslemania 2026" onClick={handleHeroTap} style={{ width:"100%", objectFit:"contain", display:"block", cursor:"pointer" }} />
        <button onClick={() => fetchBoard()} aria-label="Refresh" style={{ position:"absolute", top:8, right:8, width:44, height:44, borderRadius:22, background:"rgba(0,0,0,0.55)", border:`1px solid ${GOLD}50`, color:GOLD, cursor:"pointer", fontSize:18, fontFamily:"Georgia, serif", display:"flex", alignItems:"center", justifyContent:"center", padding:0, lineHeight:1 }}>↻</button>
        <div style={{ padding:"8px 16px 10px", background:"linear-gradient(180deg, rgba(12,11,18,0.9) 0%, rgba(12,11,18,0.6) 100%)", marginTop:-1 }}>
          <div style={{ fontSize:12, letterSpacing:"0.12em", color:"#908878", textTransform:"uppercase" }}>
            {subs.length > 0
              ? `${subs.length} player${subs.length===1?"":"s"} · ${Object.values(results?.picks||{}).filter(Boolean).length}/${matches.length} results · Max ${maxScore()} pts`
              : `April 18–19 · Allegiant Stadium · Max ${maxScore()} pts`}
          </div>
        </div>
      </div>
      {/* Progress */}
      {tab==="pick" && step<STEPS && (
        <div style={{ flexShrink:0, height:3, background:"rgba(255,255,255,0.05)" }}>
          <div style={{ height:"100%", width:`${(step/(STEPS-1))*100}%`, background:`linear-gradient(90deg,${GOLD},${GOLD2})`, transition:"width 0.4s ease" }} />
        </div>
      )}
      {/* Tabs */}
      <div style={{ flexShrink:0, display:"flex", background:"rgba(0,0,0,0.35)", borderBottom:`1px solid ${BORDER}` }}>
        {[["pick","📋 Pick 'Em"],["board","📊 Live Boards"],...(adminUnlocked2?[["admin","🔐 Admin"]]:[])].map(([id,label])=>(
          <button key={id} onClick={()=>setTab(id)} style={{ flex:1, padding:"15px 4px", fontSize:12, letterSpacing:"0.1em", textTransform:"uppercase", textAlign:"center", cursor:"pointer", border:"none", background:"transparent", color:tab===id?GOLD:"#6a6060", borderBottom:tab===id?`2px solid ${GOLD}`:"2px solid transparent", fontFamily:"Georgia, serif", transition:"color 0.15s" }}>{label}</button>
        ))}
      </div>
      {/* Content */}
      <div ref={contentRef} style={{ flex:1, overflowY:"auto", WebkitOverflowScrolling:"touch", padding:"16px 16px 120px" }}>
        <div style={{ maxWidth:620, margin:"0 auto" }}>
          {tab==="pick"  && renderPick()}
          {tab==="board" && <BoardTab subs={subs} results={results} loading={loading} lastRefresh={lastRefresh} onRefresh={()=>fetchBoard()} />}
          {tab==="admin" && <AdminTab unlocked={adminUnlocked} setUnlocked={setAdminUnlocked} pass={adminPass} setPass={setAdminPass} onUpdate={adminSave} onMarkDone={handleMarkDone} onClear={handleClearAll} results={results} subs={subs} />}
        </div>
      </div>
    </div>
  );
}

// ─── NAME STEP ───────────────────────────────────────────────────────────────
function NameStep({ name, setName, onNewUser, onReturningUser }) {
  const [phase, setPhase]     = useState("name"); // "name" | "key" | "welcome"
  const [keyInput, setKeyInput] = useState("");
  const [error, setError]     = useState("");
  const [foundSub, setFoundSub] = useState(null);
  const [checking, setChecking] = useState(false);

  async function handleNameSubmit() {
    if (!name.trim()) return;
    setChecking(true);
    setError("");
    const allSubs = await loadShared(PICKS_KEY, []);
    const existing = allSubs.find(s => s.name.toLowerCase() === name.trim().toLowerCase());
    setChecking(false);
    if (existing && existing.editKey) {
      setFoundSub(existing);
      setPhase("key");
    } else {
      onNewUser();
    }
  }

  function handleKeySubmit() {
    if (keyInput.toUpperCase() === foundSub.editKey.toUpperCase()) {
      setError("");
      setPhase("welcome");
    } else {
      setError("Wrong key — try again");
    }
  }

  if (phase === "welcome") return (
    <div style={{ textAlign:"center", paddingTop:8 }}>
      <div style={{ fontSize:32, marginBottom:6 }}>👋</div>
      <h2 style={{ color:GOLD, margin:"0 0 4px", fontSize:19 }}>Welcome back, {foundSub.name}!</h2>
      <p style={{ color:"#8a8070", fontSize:12, marginBottom:16, lineHeight:1.5 }}>Your previous picks are loaded — change anything and re-submit.</p>
      <button style={S.btn(GOLD)} onClick={() => onReturningUser(foundSub)}>Edit My Picks →</button>
    </div>
  );

  if (phase === "key") return (
    <div style={{ textAlign:"center", paddingTop:8 }}>
      <div style={{ fontSize:32, marginBottom:6 }}>🔑</div>
      <h2 style={{ color:GOLD, margin:"0 0 4px", fontSize:19 }}>{name.trim()} already has picks</h2>
      <p style={{ color:"#8a8070", fontSize:12, marginBottom:16, lineHeight:1.5 }}>Enter your edit key to modify your picks</p>
      <input style={{ ...S.input, maxWidth:300, textAlign:"center", margin:"0 auto 14px", display:"block", letterSpacing:"0.15em", fontSize:18, fontWeight:700 }} placeholder="Enter your key" value={keyInput} onChange={e=>setKeyInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&keyInput&&handleKeySubmit()} maxLength={22} />
      {error && <div style={{ color:RED, fontSize:11, marginBottom:10 }}>{error}</div>}
      <div style={{ display:"flex", gap:10, justifyContent:"center" }}>
        <button style={{ background:"transparent", border:`1px solid rgba(255,255,255,0.09)`, borderRadius:8, color:"#908878", cursor:"pointer", fontSize:13, padding:"14px 20px", fontFamily:"Georgia, serif" }} onClick={()=>{ setPhase("name"); setKeyInput(""); setError(""); }}>← Back</button>
        <button style={S.btn(GOLD,!keyInput)} disabled={!keyInput} onClick={handleKeySubmit}>Verify →</button>
      </div>
    </div>
  );

  return (
    <div style={{ textAlign:"center", paddingTop:8 }}>
      <div style={{ fontSize:32, marginBottom:6 }}>🏟️</div>
      <h2 style={{ color:GOLD, margin:"0 0 4px", fontSize:19 }}>WrestleMania 42 Pick 'Em</h2>
      <p style={{ color:"#8a8070", fontSize:12, marginBottom:16, lineHeight:1.5 }}>Pick your winners · scores update live during the show</p>
      <div style={{ background:`${GOLD}10`, border:`1px solid ${GOLD}40`, borderRadius:10, padding:"12px 16px", margin:"0 auto 18px", maxWidth:340, textAlign:"center" }}>
        <div style={{ fontSize:13, color:GOLD, letterSpacing:"0.15em", textTransform:"uppercase", marginBottom:5 }}>🔒 Lockout</div>
        <div style={{ fontSize:13, color:"#f5efe5", lineHeight:1.45 }}>Edit picks anytime before the show. Picks lock at:</div>
        <div style={{ fontSize:14, fontWeight:700, color:GOLD, marginTop:5 }}>{LOCKOUT_UTC.toLocaleString([], { weekday:"long", month:"long", day:"numeric", hour:"numeric", minute:"2-digit", hour12:true, timeZoneName:"short" })}</div>
      </div>
      <input style={{ ...S.input, maxWidth:300, textAlign:"center", margin:"0 auto 14px", display:"block" }} placeholder="Your name…" value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&name.trim()&&handleNameSubmit()} />
      <button style={S.btn(GOLD,!name.trim()||checking)} disabled={!name.trim()||checking} onClick={handleNameSubmit}>{checking ? "Checking…" : "Start Picking →"}</button>
      <div style={{ display:"flex", gap:8, justifyContent:"center", marginTop:16, flexWrap:"wrap" }}>
        {[
          ["📋","Match Picks",`${MATCH_PTS} pts each`],
          ["🎯","Match Bonuses",`${BONUS_PTS} pts each`],
          ["📊","End Bonuses",`${BONUS_PTS} pts each`],
          ["🎭","Surprises",`±${SURPRISE_PTS} pts each`],
        ].map(([icon,label,sub])=>(
          <div key={label} style={{ background:BG, border:`1px solid ${BORDER}`, borderRadius:6, padding:"8px 10px", textAlign:"center", minWidth:90, flex:1 }}>
            <div style={{ fontSize:16, marginBottom:2 }}>{icon}</div>
            <div style={{ fontSize:11, color:"#f5efe5" }}>{label}</div>
            <div style={{ fontSize:11, color:"#908878", marginTop:1 }}>{sub}</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop:14, fontSize:10, color:"#5a5050" }}>Max possible score: {maxScore()} pts</div>
    </div>
  );
}

// ─── MATCH STEP ──────────────────────────────────────────────────────────────
function BonusQuestion({ bonus, value, onChange }) {
  if (bonus.type === "yesno") {
    return (
      <div style={{ display:"flex", gap:10 }}>
        {["Yes","No"].map(opt => {
          const sel = value === opt;
          return <button key={opt} onClick={() => onChange(value === opt ? undefined : opt)} style={{ flex:1, background:sel?`${PURPLE}18`:"rgba(255,255,255,0.03)", border:sel?`1px solid ${PURPLE}70`:`1px solid rgba(255,255,255,0.06)`, borderRadius:10, padding:"14px", color:sel?"#f5efe5":"#8a8070", cursor:"pointer", fontSize:15, fontFamily:"Georgia, serif" }}>{opt}{sel&&<span style={{ color:PURPLE, marginLeft:5 }}>✓</span>}</button>;
        })}
      </div>
    );
  }
  if (bonus.type === "overunder") {
    return (
      <div style={{ display:"flex", gap:12 }}>
        {["Over","Under"].map(opt => {
          const sel = value === opt;
          return <button key={opt} onClick={() => onChange(value === opt ? undefined : opt)} style={{ flex:1, background:sel?`${PURPLE}18`:"rgba(255,255,255,0.03)", border:sel?`1px solid ${PURPLE}70`:`1px solid rgba(255,255,255,0.06)`, borderRadius:10, padding:"14px", color:sel?"#f5efe5":"#8a8070", cursor:"pointer", fontSize:15, fontFamily:"Georgia, serif" }}>{opt}{sel&&<span style={{ color:PURPLE, marginLeft:5 }}>✓</span>}</button>;
        })}
      </div>
    );
  }
  if (bonus.type === "select") {
    return (
      <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
        {bonus.options.map(opt => {
          const sel = value === opt;
          return <button key={opt} onClick={() => onChange(value === opt ? undefined : opt)} style={{ flex:1, minWidth:85, background:sel?`${PURPLE}18`:"rgba(255,255,255,0.03)", border:sel?`1px solid ${PURPLE}70`:`1px solid rgba(255,255,255,0.06)`, borderRadius:10, padding:"12px 14px", color:sel?"#f5efe5":"#8a8070", cursor:"pointer", fontSize:14, fontFamily:"Georgia, serif" }}>{opt}{sel&&<span style={{ color:PURPLE, marginLeft:4 }}>✓</span>}</button>;
        })}
      </div>
    );
  }
  return null;
}

function MatchStep({ night, picks, setPicks, bonusPicks, setBonusPicks, onBack, onNext }) {
  const nightMatches = matches.filter(m=>m.night===night);
  const [warning, setWarning] = useState(null);

  function handleNext() {
    const missing = nightMatches.find(m => !picks[m.id]);
    if (missing) {
      setWarning(missing.id);
      const el = document.getElementById(`match-${missing.id}`);
      if (el) el.scrollIntoView({ behavior:"smooth", block:"center" });
      setTimeout(() => setWarning(null), 3000);
      return;
    }
    onNext();
  }

  return (
    <div>
      <NightHdr night={night} />
      {nightMatches.map(m=>(
        <div key={m.id} id={`match-${m.id}`} style={{ ...S.card, borderColor:warning===m.id?`${RED}80`:m.isMain?`${GOLD}40`:BORDER, position:"relative", overflow:"hidden", transition:"border-color 0.3s" }}>
          {m.isMain && <div style={{ position:"absolute",top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,transparent,${GOLD},transparent)` }} />}
          {m.belt && <div style={{ position:"absolute", top:-12, right:-12, width:130, opacity:0.25, pointerEvents:"none", transform:"rotate(20deg)", transformOrigin:"center center" }}><img src={m.belt} alt="" style={{ width:"100%", height:"auto", filter:"grayscale(15%) brightness(1.4)" }} /></div>}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10, gap:8 }}>
            <div style={{ fontSize:13, letterSpacing:"0.1em", color:m.isMain?GOLD:PURPLE, textTransform:"uppercase", lineHeight:1.4 }}>
              {m.title}{m.note&&<span style={{ color:"#6a6060" }}> · {m.note}</span>}
            </div>
            {m.isMain && <div style={{ fontSize:11, color:GOLD, background:`${GOLD}15`, padding:"4px 10px", borderRadius:6, whiteSpace:"nowrap" }}>★ Main Event</div>}
          </div>
          {/* Winner pick */}
          <div style={{ fontSize:12, color:"#908878", marginBottom:8, textTransform:"uppercase", letterSpacing:"0.1em" }}>Winner · {MATCH_PTS} pts</div>
          <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
            {m.competitors.map(c=>{
              const sel=picks[m.id]===c.name;
              return (
                <button key={c.name} onClick={()=>setPicks(p=>({...p,[m.id]:p[m.id]===c.name?undefined:c.name}))} style={{ flex:1, minWidth:120, background:sel?`${GOLD}15`:"rgba(255,255,255,0.03)", border:sel?`1px solid ${GOLD}70`:`1px solid rgba(255,255,255,0.06)`, borderRadius:10, padding:"14px 16px", color:sel?"#f5efe5":"#8a8070", cursor:"pointer", textAlign:"left", fontFamily:"Georgia, serif", transition:"all 0.15s", wordBreak:"break-word" }}>
                  <div style={{ fontSize:16, fontWeight:sel?700:400, lineHeight:1.3 }}>{c.name}</div>
                  {c.role && <div style={{ fontSize:12, color:sel?GOLD:"#6a6060", marginTop:4 }}>{c.role}{sel&&<span style={{ color:GOLD, marginLeft:5 }}>✓</span>}</div>}
                  {!c.role && sel && <div style={{ fontSize:12, color:GOLD, marginTop:4 }}>✓</div>}
                </button>
              );
            })}
          </div>
          {/* Inline bonuses */}
          {(m.bonuses||[]).map(b=>(
            <div key={b.id} style={{ marginTop:16, padding:"14px 16px", background:"rgba(155,89,182,0.05)", border:`1px solid ${PURPLE}25`, borderRadius:10 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                <div style={{ fontSize:14, color:"#e0d4b8" }}>{b.label}</div>
                <div style={{ ...S.ptsBadge(BONUS_PTS, PURPLE) }}>{BONUS_PTS} pts</div>
              </div>
              {b.line && <div style={{ fontSize:11, color:PURPLE, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:8 }}>{b.line}</div>}
              <BonusQuestion bonus={b} value={bonusPicks[b.id]} onChange={v => setBonusPicks(p=>({...p,[b.id]:v}))} />
            </div>
          ))}
        </div>
      ))}
      {warning && (
        <div style={{ background:`${RED}18`, border:`1px solid ${RED}40`, borderRadius:10, padding:"12px 16px", marginTop:10, textAlign:"center", fontSize:14, color:RED }}>
          Pick a winner above to continue
        </div>
      )}
      <NavRow onBack={onBack} onNext={handleNext} nextDisabled={false} nextLabel={`Night ${night} done →`} />
    </div>
  );
}

// ─── BONUS STEP (end bonuses + surprises) ────────────────────────────────────
function BonusStep({ endPicks, setEndPicks, surprises, setSurprises, onBack, onNext }) {
  return (
    <div>
      <StepHdr icon="🎯" title="Bonus Picks" sub="Longest/shortest match + surprise appearances" />

      {endBonuses.map(eb=>(
        <div key={eb.id} style={S.card}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
            <div style={{ fontSize:14, color:"#e0d4b8" }}>{eb.label}</div>
            <div style={{ ...S.ptsBadge(BONUS_PTS, PURPLE) }}>{BONUS_PTS} pts</div>
          </div>
          <select value={endPicks[eb.id]||""} onChange={e=>setEndPicks(p=>({...p,[eb.id]:e.target.value||undefined}))} style={{ ...S.input, cursor:"pointer" }}>
            <option value="">— Choose a match —</option>
            {eb.options.map(opt=><option key={opt} value={opt}>{opt}</option>)}
          </select>
        </div>
      ))}

      <div style={S.card}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
          <div style={{ fontSize:14, color:"#e0d4b8" }}>Surprise Appearances</div>
          <div style={{ ...S.ptsBadge(SURPRISE_PTS, PURPLE) }}>±{SURPRISE_PTS} pts each</div>
        </div>
        <div style={{ fontSize:12, color:"#908878", lineHeight:1.6, marginBottom:14 }}>
          <div style={{ marginBottom:8 }}><strong style={{ color:"#e0d4b8" }}>Returns:</strong> A Superstar who has been absent from regular programming for 3 or more months, or a Legend who does not regularly appear.</div>
          <div><strong style={{ color:"#e0d4b8" }}>Debuts:</strong> A Superstar from the indies, TNA, AEW, New Japan, any regular sport, any combat sport, films, television or music not otherwise advertised or part of regular programming.</div>
        </div>
        {Array.from({ length: SURPRISE_SLOTS }).map((_, i) => (
          <input key={i} style={{ ...S.input, marginBottom:8 }} placeholder={`Surprise #${i+1} (optional)`} value={surprises[i] || ""} onChange={e => {
            const updated = [...(surprises.length ? surprises : Array(SURPRISE_SLOTS).fill(""))];
            updated[i] = e.target.value;
            setSurprises(updated);
          }} />
        ))}
        <div style={{ fontSize:11, color:"#6a6060", marginTop:4 }}>+{SURPRISE_PTS} per correct, −{SURPRISE_PTS} per wrong · leave blank to skip</div>
      </div>

      <NavRow onBack={onBack} onNext={onNext} nextDisabled={false} nextLabel="Review →" />
    </div>
  );
}

// ─── REVIEW STEP ─────────────────────────────────────────────────────────────
function ReviewStep({ name, picks, bonusPicks, endPicks, surprises, loading, onBack, onSubmit }) {
  const Section = ({title, children}) => (
    <div style={{ ...S.card, borderColor:`${GOLD}30`, marginBottom:8 }}>
      <div style={S.lbl}>{title}</div>
      {children}
    </div>
  );
  const Row = ({label, value, pts, col}) => (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"6px 0", borderBottom:`1px solid rgba(255,255,255,0.04)`, fontSize:13 }}>
      <span style={{ color:"#8a8070", flex:1, paddingRight:8 }}>{label}</span>
      <span style={{ color:col||GOLD, fontWeight:700 }}>{value}</span>
      {pts && <span style={{ color:"#6a6060", fontSize:10, marginLeft:6 }}>{pts}pts</span>}
    </div>
  );
  return (
    <div>
      <StepHdr icon="✅" title="Review Picks" sub={`${name} — looks good?`} />
      <Section title={`Match Picks + Bonuses`}>
        {matches.map(m=>{
          const pick=picks[m.id];
          return (
            <div key={m.id}>
              {pick && <Row label={m.title} value={pick} pts={MATCH_PTS} />}
              {(m.bonuses||[]).map(b=>bonusPicks[b.id] && <Row key={b.id} label={`↳ ${b.label}`} value={bonusPicks[b.id]} pts={BONUS_PTS} col={PURPLE} />)}
            </div>
          );
        })}
      </Section>
      <Section title="End Bonuses">
        {endBonuses.map(eb=>endPicks[eb.id]&&<Row key={eb.id} label={eb.label} value={endPicks[eb.id]} pts={BONUS_PTS} col={PURPLE} />)}
        {surprises.filter(Boolean).length > 0 && <Row label="Surprise guesses" value={surprises.filter(Boolean).join(", ")} col={PURPLE} />}
      </Section>
      <div style={{ textAlign:"center", color:"#6a6060", fontSize:12, marginBottom:14 }}>Max {maxScore()} pts · scores update live during the show</div>
      <NavRow onBack={onBack} onNext={onSubmit} nextDisabled={loading} nextLabel={loading?"Saving…":"🔒 Lock In Picks"} />
    </div>
  );
}

// ─── DONE STEP ───────────────────────────────────────────────────────────────
function DoneStep({ name, editKey, onViewBoard, onEdit }) {
  const locked = isLocked();
  return (
    <div style={{ textAlign:"center", paddingTop:24 }}>
      <div style={{ fontSize:44, marginBottom:8 }}>🏆</div>
      <h2 style={{ color:GOLD, margin:"0 0 6px", fontSize:22 }}>{name}'s Picks Saved!</h2>
      {editKey && (
        <div style={{ background:`${GOLD}12`, border:`1px solid ${GOLD}40`, borderRadius:8, padding:"14px 18px", margin:"12px auto 18px", maxWidth:320 }}>
          <div style={{ fontSize:9, letterSpacing:"0.2em", color:GOLD, textTransform:"uppercase", marginBottom:6 }}>Your Edit Key</div>
          <div style={{ fontSize:28, fontWeight:900, letterSpacing:"0.15em", color:"#f5efe5", fontFamily:"monospace" }}>{editKey}</div>
          <div style={{ fontSize:10, color:"#908878", marginTop:6 }}>Save this! You'll need it to edit your picks.</div>
        </div>
      )}
      <p style={{ color:"#8a8070", fontSize:12, lineHeight:1.6, marginBottom:24 }}>Scores auto-update as WrestleMania results come in.<br/>Share the link — everyone joins the same live board.</p>
      <div style={{ display:"flex", gap:10, justifyContent:"center", flexWrap:"wrap" }}>
        <button style={S.btn(GOLD)} onClick={onViewBoard}>View Live Boards →</button>
        {!locked && <button style={{ background:"transparent", border:`1px solid ${GOLD}40`, borderRadius:4, color:GOLD, cursor:"pointer", fontSize:12, fontWeight:700, letterSpacing:"0.12em", padding:"11px 24px", textTransform:"uppercase", fontFamily:"Georgia, serif" }} onClick={onEdit}>✏️ Edit Picks</button>}
      </div>
      {!locked && <div style={{ marginTop:14, fontSize:10, color:"#6a6060" }}>You can edit picks until {LOCKOUT_UTC.toLocaleString([], { month:"short", day:"numeric", hour:"2-digit", minute:"2-digit", timeZoneName:"short" })}</div>}
    </div>
  );
}

// ─── LOCKED STEP ─────────────────────────────────────────────────────────────
function LockedStep() {
  return (
    <div style={{ textAlign:"center", paddingTop:32 }}>
      <div style={{ fontSize:44, marginBottom:8 }}>🔒</div>
      <h2 style={{ color:RED, margin:"0 0 6px", fontSize:22 }}>Picks Are Locked</h2>
      <p style={{ color:"#8a8070", fontSize:12, lineHeight:1.6 }}>The show has started — no more changes allowed.<br/>Head to the Live Boards to watch the scores roll in!</p>
    </div>
  );
}

// ─── BOARD TAB ───────────────────────────────────────────────────────────────
function shuffleArray(arr) {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function TriviaCards({ subs, results }) {
  const facts = useTriviaFacts(subs, results);
  // Lazy init: shuffled list is ready on the very first render
  const [shuffled, setShuffled] = useState(() => shuffleArray(facts));
  const [idx, setIdx] = useState(0);
  const timerRef = useRef(null);

  // Reshuffle when fact list length changes (new player joins, etc.)
  useEffect(() => {
    setShuffled(shuffleArray(facts));
    setIdx(0);
  }, [facts.length]);

  function goNext() {
    setIdx(i => {
      const next = i + 1;
      if (next >= shuffled.length) { setShuffled(shuffleArray(shuffled)); return 0; }
      return next;
    });
    restartTimer();
  }

  function goPrev() {
    setIdx(i => i - 1 < 0 ? shuffled.length - 1 : i - 1);
    restartTimer();
  }

  function restartTimer() {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setIdx(i => {
        const next = i + 1;
        if (next >= shuffled.length) { setShuffled(shuffleArray(shuffled)); return 0; }
        return next;
      });
    }, 6000);
  }

  useEffect(() => {
    if (shuffled.length <= 1) return;
    restartTimer();
    return () => clearInterval(timerRef.current);
  }, [shuffled.length]);

  if (!shuffled.length) return null;
  const current = shuffled[idx % shuffled.length] || "";

  const arrowBtn = (side) => ({
    position:"absolute",
    top:"50%",
    transform:"translateY(-50%)",
    [side]:10,
    background:"rgba(12,11,18,0.6)",
    backdropFilter:"blur(8px)",
    WebkitBackdropFilter:"blur(8px)",
    border:`1px solid ${PURPLE}50`,
    color:PURPLE,
    width:46, height:46, borderRadius:23,
    cursor:"pointer", fontSize:22, fontFamily:"Georgia, serif",
    display:"flex", alignItems:"center", justifyContent:"center",
    padding:0, lineHeight:1,
    zIndex:2,
  });

  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", padding:"24px 4px" }}>
      <div style={{ ...S.lbl, color:PURPLE, marginBottom:18 }}>Trivia & Stats</div>
      <div style={{ position:"relative", width:"100%", maxWidth:560 }}>
        <button onClick={goPrev} aria-label="Previous fact" style={arrowBtn("left")}>←</button>
        <button onClick={goNext} aria-label="Next fact" style={arrowBtn("right")}>→</button>
        <div key={idx} style={{
          background:"linear-gradient(135deg,rgba(155,89,182,0.1),rgba(200,160,40,0.06))",
          border:`1px solid ${PURPLE}40`,
          borderRadius:20,
          padding:"56px 68px",
          textAlign:"center",
          minHeight:240,
          display:"flex",
          alignItems:"center",
          justifyContent:"center",
          animation:"cardFlip 6s ease",
          boxShadow:`0 12px 40px rgba(155,89,182,0.12)`,
        }}>
          <div style={{ fontSize:20, color:"#f5efe5", lineHeight:1.55, fontFamily:"Georgia, serif" }}>{current}</div>
        </div>
      </div>
      <div style={{ display:"flex", gap:6, marginTop:20 }}>
        {facts.slice(0, Math.min(facts.length, 12)).map((_, i) => (
          <div key={i} style={{ width: i === (idx % facts.length) ? 20 : 6, height:6, borderRadius:3, background: i === (idx % facts.length) ? GOLD : "rgba(255,255,255,0.15)", transition:"all 0.4s" }} />
        ))}
      </div>
      <div style={{ fontSize:12, color:"#6a6060", marginTop:14 }}>{facts.length} facts in rotation · tap arrows or wait</div>
      <style>{`@keyframes cardFlip { 0% { opacity:0; transform:translateY(12px) scale(0.96); } 12% { opacity:1; transform:translateY(0) scale(1); } 88% { opacity:1; transform:translateY(0) scale(1); } 100% { opacity:0; transform:translateY(-12px) scale(0.96); } }`}</style>
    </div>
  );
}

function useTriviaFacts(subs, results) {
  return (() => {
    const items = [];
    items.push("🎤 Pete Rose was attacked by Kane at three different WrestleManias (XIV, XV, X-Seven)");
    items.push("🦣 Bob Uecker nearly got choked out by Andre the Giant at WrestleMania III as a guest ring announcer");
    items.push("🎹 Liberace was the guest timekeeper at WrestleMania I, performing a high-kick routine with the Rockettes");
    items.push("🌐 WrestleMania 2 was held in three different cities on the same night: New York, Chicago, and Los Angeles");
    items.push("🪜 The first ladder match in WWF history was at WrestleMania X: Razor Ramon vs Shawn Michaels for the IC title");
    items.push("🇨🇦 WrestleMania VI was the first WM held outside the United States, at Toronto's SkyDome in 1990");
    items.push("🎭 Owen Hart pinning his brother Bret Hart in the WrestleMania X opener is one of the greatest opening matches ever");
    items.push("🎶 Aretha Franklin sang America the Beautiful at WrestleMania III; the claimed 93,173 attendance is closer to 78,000");
    items.push("⏱️ The shortest WrestleMania main event ever: Brock Lesnar vs Goldberg at WM33, just 4 minutes 45 seconds");
    items.push("📐 Steamboat and Savage rehearsed their WrestleMania III match move-for-move for weeks; it became the modern blueprint");
    items.push("💻 Built with ~1,200 lines of code in one session");
    items.push("🚀 From zero to launch in under 12 hours");
    items.push("🦆 A group of ducks is called a paddling");
    items.push("🦆 Ducks can sleep with one eye open");
    items.push("🦆 Ducks have a transparent third eyelid that works like swim goggles underwater");
    items.push("🦆 The myth that a duck's quack doesn't echo was debunked by acousticians at the University of Salford");
    items.push("🦆 Ducks have no nerves or blood vessels in their feet, which is why they can stand on ice without freezing");
    items.push("🦆 Ducklings imprint on the first moving thing they see — sometimes a human, sometimes another animal entirely");
    items.push("🦆 Some duck species can fly over 6,000 feet high and migrate more than 800 miles non-stop");
    items.push("❤️ Thanks for playing, you're the real main event");

    if (!subs.length) return items;

    const sorted = [...subs].sort((a,b) => a.ts - b.ts);
    if (sorted.length) {
      const fastest = sorted[0];
      const d = new Date(fastest.ts);
      const time = d.toLocaleTimeString([],{hour:"numeric",minute:"2-digit",hour12:true});
      const date = d.toLocaleDateString([],{month:"long",day:"numeric"});
      items.push(`🏃 Fastest submission: ${fastest.name} at ${time} on ${date}`);
      items.push(`⚡ First to lock in: ${sorted[0].name}`);
    }
    if (sorted.length > 1) items.push(`🐢 Last to finish their card: ${sorted[sorted.length-1].name}`);

    if (sorted.length > 1) {
      const span = sorted[sorted.length-1].ts - sorted[0].ts;
      const hours = Math.floor(span / 3600000);
      const mins = Math.floor((span % 3600000) / 60000);
      if (hours > 0) items.push(`⏳ First and last submissions were ${hours}h ${mins}m apart`);
      else if (mins > 0) items.push(`⏳ First and last submissions were ${mins} minutes apart`);
    }

    const recent = subs.filter(s => s.ts > Date.now() - 3600000).length;
    if (recent > 0) items.push(`📅 ${recent} player${recent===1?"":"s"} submitted in the last hour`);

    const byRecent = [...subs].sort((a,b) => b.ts - a.ts);
    if (byRecent.length > 1 && byRecent[0].ts !== sorted[sorted.length-1].ts) {
      items.push(`✏️ Most recent edit: ${byRecent[0].name}`);
    }

    const mostSurprises = [...subs].sort((a,b) => (b.surprises||[]).filter(Boolean).length - (a.surprises||[]).filter(Boolean).length);
    if (mostSurprises[0] && (mostSurprises[0].surprises||[]).filter(Boolean).length > 0) {
      items.push(`🔮 Most surprise guesses: ${mostSurprises[0].name} (${(mostSurprises[0].surprises||[]).filter(Boolean).length})`);
    }

    const maxed = subs.filter(s => (s.surprises||[]).filter(Boolean).length === SURPRISE_SLOTS).length;
    if (maxed > 0) items.push(`🔮 ${maxed} player${maxed===1?"":"s"} filled all ${SURPRISE_SLOTS} surprise slots`);

    const allBonusIds = allBonuses.map(b => b.id);
    const fullCard = subs.filter(s => allBonusIds.every(bid => s.bonuses?.[bid])).length;
    if (fullCard > 0) items.push(`✅ ${fullCard} of ${subs.length} player${subs.length===1?"":"s"} answered every bonus question`);

    if (subs.length >= 3) {
      const conformity = subs.map(sub => {
        let agrees = 0;
        matches.forEach(m => {
          const pick = sub.picks?.[m.id];
          if (!pick) return;
          const counts = {};
          subs.forEach(s => { const p = s.picks?.[m.id]; if (p) counts[p] = (counts[p]||0)+1; });
          const majority = Object.entries(counts).sort((a,b)=>b[1]-a[1])[0]?.[0];
          if (pick === majority) agrees++;
        });
        return { name: sub.name, agrees };
      });
      const rebel = [...conformity].sort((a,b) => a.agrees - b.agrees)[0];
      const sheep = [...conformity].sort((a,b) => b.agrees - a.agrees)[0];
      if (rebel) items.push(`🐺 Most against the grain: ${rebel.name}`);
      if (sheep) items.push(`🐑 Most aligned with the group: ${sheep.name}`);

      const underdog = subs.map(sub => {
        let underdogPicks = 0;
        matches.forEach(m => {
          const pick = sub.picks?.[m.id];
          if (!pick) return;
          const counts = {};
          subs.forEach(s => { const p = s.picks?.[m.id]; if (p) counts[p] = (counts[p]||0)+1; });
          const lowest = Object.entries(counts).sort((a,b) => a[1] - b[1])[0]?.[0];
          if (pick === lowest && counts[lowest] === 1) underdogPicks++;
        });
        return { name: sub.name, underdogPicks };
      }).sort((a,b) => b.underdogPicks - a.underdogPicks)[0];
      if (underdog && underdog.underdogPicks > 0) items.push(`🐕 Underdog whisperer: ${underdog.name}`);

      const matchConsensus = matches.map(m => {
        const counts = {};
        subs.forEach(s => { const p = s.picks?.[m.id]; if (p) counts[p] = (counts[p]||0)+1; });
        const top = Object.entries(counts).sort((a,b)=>b[1]-a[1])[0];
        if (!top) return null;
        const total = Object.values(counts).reduce((a,b)=>a+b,0);
        return { match: matchShorthands[m.id] || m.title, name: top[0], count: top[1], total, pct: total ? top[1]/total : 0 };
      }).filter(Boolean);
      const mostAgreed = [...matchConsensus].sort((a,b) => b.pct - a.pct)[0];
      if (mostAgreed && mostAgreed.pct > 0.5) {
        items.push(`🎯 ${mostAgreed.count}/${mostAgreed.total} players have ${mostAgreed.name} winning ${mostAgreed.match}`);
      }
      const mostDivisive = [...matchConsensus].sort((a,b) => a.pct - b.pct)[0];
      if (mostDivisive && mostDivisive.pct < 0.7) {
        items.push(`⚖️ ${mostDivisive.match} is the most divisive pick of the weekend`);
      }
    }

    const surpriseCounts = {};
    subs.forEach(s => (s.surprises||[]).filter(Boolean).forEach(g => {
      const key = g.trim();
      if (key) surpriseCounts[key] = (surpriseCounts[key]||0) + 1;
    }));
    const topSurprise = Object.entries(surpriseCounts).sort((a,b) => b[1]-a[1])[0];
    if (topSurprise && topSurprise[1] > 1) {
      items.push(`🎤 ${topSurprise[0]} has been picked as a possible surprise by ${topSurprise[1]} players`);
    }

    if (subs.length >= 3) items.push(`🏟️ ${subs.length} competitors entered the ring`);

    const nameSet = new Set();
    subs.forEach(s => (s.surprises||[]).filter(Boolean).forEach(g => nameSet.add(g.trim())));
    nameSet.forEach(name => items.push(`🎤 ${name} was selected as a surprise return / debut`));

    if (results?.picks && Object.values(results.picks).filter(Boolean).length > 0) {
      if (results.lastPickId && results.picks[results.lastPickId]) {
        const m = matches.find(mm => mm.id === results.lastPickId);
        if (m) {
          const shorthand = matchShorthands[m.id] || m.title;
          items.push(`📣 Latest result: ${shorthand} — ${results.picks[m.id]} wins!`);
        }
      }

      const scores = subs.map(s => calcScore(s, results)).filter(s => s !== null);
      if (scores.length) {
        const avg = Math.round(scores.reduce((a,b)=>a+b,0) / scores.length);
        items.push(`📊 Average score so far: ${avg} / ${maxScore()}`);
      }

      const upsets = matches.map(m => {
        const winner = results.picks[m.id];
        if (!winner) return null;
        const counts = {};
        subs.forEach(s => { const p = s.picks?.[m.id]; if (p) counts[p] = (counts[p]||0)+1; });
        const total = Object.values(counts).reduce((a,b)=>a+b,0);
        if (!total) return null;
        const winnerCount = counts[winner] || 0;
        return { match: matchShorthands[m.id] || m.title, winner, pct: winnerCount/total };
      }).filter(Boolean).sort((a,b) => a.pct - b.pct);
      if (upsets[0] && upsets[0].pct < 0.5) {
        items.push(`🎢 Biggest upset so far: ${upsets[0].winner} winning ${upsets[0].match}`);
      }

      const streaks = subs.map(sub => {
        let longest = 0, current = 0;
        matches.forEach(m => {
          const winner = results.picks[m.id];
          if (!winner) { current = 0; return; }
          if (sub.picks?.[m.id] === winner) {
            current++;
            if (current > longest) longest = current;
          } else current = 0;
        });
        return { name: sub.name, streak: longest };
      }).sort((a,b) => b.streak - a.streak);
      if (streaks[0] && streaks[0].streak >= 3) {
        items.push(`🔥 Hot streak: ${streaks[0].name} on ${streaks[0].streak} correct picks in a row`);
      }
    }

    return items;
  })();
}

function TriviaTicker({ subs, results }) {
  const allFacts = useTriviaFacts(subs, results);
  const facts = allFacts.filter(f => f.length <= 70);
  const [shuffled, setShuffled] = useState(() => shuffleArray(facts));
  const [idx, setIdx] = useState(0);
  const shuffledRef = useRef(shuffled);
  shuffledRef.current = shuffled;

  // Reshuffle when fact list length changes
  useEffect(() => {
    setShuffled(shuffleArray(facts));
    setIdx(0);
  }, [facts.length]);

  useEffect(() => {
    if (shuffled.length <= 1) return;
    const timer = setInterval(() => {
      setIdx(i => {
        const next = i + 1;
        if (next >= shuffledRef.current.length) {
          setShuffled(shuffleArray(shuffledRef.current));
          return 0;
        }
        return next;
      });
    }, 5000);
    return () => clearInterval(timer);
  }, [shuffled.length]);

  if (!shuffled.length) return null;
  const current = shuffled[idx % shuffled.length] || "";

  return (
    <div style={{ overflow:"hidden", height:28, marginBottom:14, position:"relative" }}>
      <div key={idx} style={{
        fontSize:13, color:GOLD, textAlign:"center", fontFamily:"Georgia, serif",
        animation:"tickerFade 5s ease",
      }}>{current}</div>
      <style>{`@keyframes tickerFade { 0% { opacity:0; transform:translateY(6px); } 8% { opacity:1; transform:translateY(0); } 85% { opacity:1; transform:translateY(0); } 100% { opacity:0; transform:translateY(-6px); } }`}</style>
    </div>
  );
}

function PlayerDetail({ sub, results, onBack }) {
  const score = calcScore(sub, results);
  const variants = (results?.surprises || []).flatMap(parseActualVariants);
  const resolvedAny = !!results?.picks && Object.values(results.picks).some(Boolean);

  const PickRow = ({ label, value, actual, col=GOLD, indent=false, bonusId=null }) => {
    if (!value) return null;
    const correct = actual && (bonusId ? bonusAnswersMatch(bonusId, actual, value) : value === actual);
    const wrong = actual && !correct;
    return (
      <div style={{ display:"flex", justifyContent:"space-between", padding: indent ? "6px 0 6px 14px" : "8px 0", borderBottom:`1px solid rgba(255,255,255,0.04)`, fontSize: indent ? 12 : 13, gap:8 }}>
        <span style={{ color: indent ? "#6a6060" : "#8a8070", flex:1, minWidth:0 }}>{indent && "↳ "}{label}</span>
        <span style={{ color: correct ? "#6aff6a" : wrong ? RED : col, fontWeight:700, textAlign:"right" }}>
          {correct && "✓ "}{wrong && "✗ "}{value}
        </span>
      </div>
    );
  };

  return (
    <div>
      <button onClick={onBack} style={{ background:"transparent", border:`1px solid ${GOLD}40`, borderRadius:6, color:GOLD, cursor:"pointer", fontSize:12, letterSpacing:"0.1em", padding:"10px 16px", textTransform:"uppercase", fontFamily:"Georgia, serif", marginBottom:14 }}>← Back to Leaders</button>

      <div style={{ ...S.card, borderColor:`${GOLD}40`, textAlign:"center" }}>
        <div style={{ fontSize:10, letterSpacing:"0.2em", color:GOLD, textTransform:"uppercase", marginBottom:6 }}>Locked Card</div>
        <div style={{ fontSize:Math.max(16, 24 - Math.max(0, sub.name.length - 12) * 0.5), fontWeight:900, color:"#f5efe5" }}>{sub.name}</div>
        <div style={{ fontSize:11, color:"#6a6060", marginTop:6 }}>Locked in {new Date(sub.ts).toLocaleString([],{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}</div>
        {score !== null && (
          <div style={{ marginTop:12 }}>
            <div style={{ fontSize:32, fontWeight:900, color:"#e0d4b8", lineHeight:1 }}>{score}</div>
            <div style={{ fontSize:11, color:"#6a6060" }}>/ {maxScore()} pts</div>
          </div>
        )}
      </div>

      <div style={S.card}>
        <div style={S.lbl}>Match Picks + Bonuses</div>
        {matches.map(m => {
          const pick = sub.picks?.[m.id];
          const bonuses = (m.bonuses || []).filter(b => sub.bonuses?.[b.id]);
          if (!pick && !bonuses.length) return null;
          return (
            <div key={m.id}>
              <PickRow label={m.title} value={pick} actual={results?.picks?.[m.id]} />
              {bonuses.map(b => (
                <PickRow key={b.id} label={b.label} value={sub.bonuses?.[b.id]} actual={results?.bonuses?.[b.id]} col={PURPLE} indent bonusId={b.id} />
              ))}
            </div>
          );
        })}
      </div>

      {endBonuses.some(eb => sub.endBonuses?.[eb.id]) && (
        <div style={S.card}>
          <div style={S.lbl}>End Bonuses</div>
          {endBonuses.map(eb => (
            <PickRow key={eb.id} label={eb.label} value={sub.endBonuses?.[eb.id]} actual={results?.endBonuses?.[eb.id]} col={PURPLE} />
          ))}
        </div>
      )}

      {(sub.surprises || []).filter(Boolean).length > 0 && (
        <div style={S.card}>
          <div style={S.lbl}>Surprise Guesses</div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
            {sub.surprises.filter(Boolean).map((g, i) => {
              const correct = variants.length > 0 && matchesSurprise(g, variants);
              const showCorrect = resolvedAny && correct;
              return (
                <div key={i} style={{ background: showCorrect ? "rgba(106,255,106,0.1)" : `${PURPLE}15`, border:`1px solid ${showCorrect ? "rgba(106,255,106,0.3)" : PURPLE+"40"}`, borderRadius:6, padding:"6px 10px", fontSize:13, color: showCorrect ? "#6aff6a" : "#e0d4b8" }}>
                  {showCorrect && "✓ "}{g}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function BoardTab({ subs, results, loading, lastRefresh, onRefresh }) {
  const [view, setView] = useState("leaders");
  const [viewingPlayer, setViewingPlayer] = useState(null);
  const locked = isLocked();
  const gameOver = results?.gameOver || false;
  const resolvedCount = Object.values(results?.picks||{}).filter(Boolean).length;
  const scored = [...subs].map(s=>({ ...s, score:calcScore(s,results) })).sort((a,b)=>(b.score??-1)-(a.score??-1));
  const topScore = scored[0]?.score ?? 0;
  const topPlayers = scored.filter(s=>s.score===topScore && topScore>0);

  // Slammy Award calculations
  const slammys = (() => {
    if (!results?.picks || !subs.length) return null;
    const variants = (results.surprises || []).flatMap(parseActualVariants);

    const stats = subs.map(sub => {
      const matchCorrect = matches.filter(m => results.picks[m.id] && sub.picks?.[m.id] === results.picks[m.id]).length;
      const bonusCorrect = allBonuses.filter(b => bonusAnswersMatch(b.id, results.bonuses?.[b.id], sub.bonuses?.[b.id])).length;
      const surpriseCorrect = variants.length > 0 ? (sub.surprises||[]).filter(g => g && matchesSurprise(g, variants)).length : 0;
      return { name: sub.name, matchCorrect, bonusCorrect, surpriseCorrect };
    });

    const best = (key, order="desc") => {
      const sorted = [...stats].sort((a,b) => order==="desc" ? b[key]-a[key] : a[key]-b[key]);
      if (!sorted.length) return null;
      const topVal = sorted[0][key];
      return sorted.filter(s => s[key] === topVal).map(s => s.name);
    };

    return [
      { emoji:"📖", title:"Booker Man", sub:"Most correct match picks", winners: best("matchCorrect") },
      { emoji:"👑", title:"Draft King", sub:"Most bonus questions correct", winners: best("bonusCorrect") },
      { emoji:"📺", title:"Doesn't Watch the Product", sub:"Fewest correct match picks", winners: best("matchCorrect","asc") },
      { emoji:"🔮", title:"Fantasy Booker", sub:"Most surprise guesses correct", winners: variants.length > 0 ? best("surpriseCorrect") : null },
    ];
  })();

  function pct(matchId, name) {
    const t=subs.filter(s=>s.picks?.[matchId]).length; if(!t) return 0;
    return Math.round(subs.filter(s=>s.picks?.[matchId]===name).length/t*100);
  }

  const Bar = ({pct, col, isWinner}) => (
    <div style={{ height:5, background:"rgba(255,255,255,0.05)", borderRadius:3, overflow:"hidden" }}>
      <div style={{ height:"100%", width:`${pct}%`, background:isWinner?`linear-gradient(90deg,#3a8a3a,#6aff6a)`:`linear-gradient(90deg,${col}70,${col})`, borderRadius:3, transition:"width 0.5s ease" }} />
    </div>
  );

  if (viewingPlayer && locked) {
    const fresh = subs.find(s => s.name === viewingPlayer.name && s.ts === viewingPlayer.ts) || viewingPlayer;
    return <PlayerDetail sub={fresh} results={results} onBack={() => setViewingPlayer(null)} />;
  }

  return (
    <div>
      {/* Trophy Banner */}
      {gameOver && topScore>0 && (
        <div style={{ background:"linear-gradient(135deg,rgba(200,160,40,0.12),rgba(200,160,40,0.03))", border:`1px solid ${GOLD}50`, borderRadius:14, padding:"28px 16px 22px", textAlign:"center", marginBottom:18, position:"relative" }}>
          <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:`linear-gradient(90deg,transparent,${GOLD},transparent)` }} />
          <img src={topPlayers.length > 1 ? "./trophy/tag-team-trophy.png" : "./trophy/trophy.png"} alt={topPlayers.length > 1 ? "World Guessing Tag Team Champions 2026" : "World Guessing Champion 2026"} style={{ width:180, height:180, objectFit:"contain", margin:"0 auto 14px", display:"block", animation:"trophyRock 6s ease-in-out infinite" }} />
          <style>{`@keyframes trophyRock { 0%, 100% { transform: rotate(-2deg) scale(1); } 25% { transform: rotate(2deg) scale(1.02); } 50% { transform: rotate(-1.5deg) scale(1); } 75% { transform: rotate(2.5deg) scale(1.01); } }`}</style>
          {topPlayers.map(p=>(
            <div key={p.name} style={{ fontSize:28, fontWeight:900, color:GOLD2, lineHeight:1.1 }}>{p.name}</div>
          ))}
          <div style={{ fontSize:14, color:GOLD, marginTop:8, opacity:0.8 }}>{topScore} / {maxScore()} pts</div>
        </div>
      )}

      {/* Shadowed trophy teaser when results exist but game not over */}
      {!gameOver && resolvedCount>0 && scored[0]?.score!==null && (
        <div style={{ background:"rgba(0,0,0,0.3)", border:`1px solid rgba(255,255,255,0.06)`, borderRadius:8, padding:"14px 16px", textAlign:"center", marginBottom:14 }}>
          <div style={{ fontSize:36, marginBottom:4, filter:"brightness(0.3) blur(1px)" }}>🏆</div>
          <div style={{ fontSize:10, letterSpacing:"0.2em", color:"#6a6060", textTransform:"uppercase", marginBottom:4 }}>Currently Leading</div>
          <div style={{ fontSize:Math.max(13, 18 - Math.max(0, (scored[0]?.name||"").length - 12) * 0.4), fontWeight:700, color:"#e0d4b8", filter:"blur(10px)", userSelect:"none", WebkitUserSelect:"none" }}>{scored[0]?.name}</div>
          <div style={{ fontSize:11, color:"#6a6060", marginTop:4 }}>Trophy revealed when Admin marks the show complete</div>
        </div>
      )}

      {/* Sub-tabs */}
      <div style={{ display:"flex", border:`1px solid ${BORDER}`, borderRadius:8, overflow:"hidden", marginBottom:18 }}>
        {[["leaders","🏅 Leaders"],["breakdown","📊 Stats"],["trivia","🎯 Trivia"]].map(([id,label],i,arr)=>(
          <button key={id} onClick={()=>setView(id)} style={{ flex:1, padding:"14px 4px", fontSize:13, letterSpacing:"0.08em", textTransform:"uppercase", border:"none", cursor:"pointer", fontFamily:"Georgia, serif", background:view===id?`${GOLD}18`:"transparent", color:view===id?GOLD:"#6a6060", borderRight:i<arr.length-1?`1px solid rgba(255,255,255,0.06)`:"none" }}>{label}</button>
        ))}
      </div>

      {view !== "trivia" && <TriviaTicker subs={subs} results={results} />}

      {subs.length===0&&!loading&&view!=="trivia"&&(
        <div style={{ textAlign:"center", padding:"40px 0", color:"#5a5050", fontSize:16 }}>No submissions yet 🎤</div>
      )}

      {view === "trivia" && <TriviaCards subs={subs} results={results} />}

      {/* Slammy Awards — show on both views when results exist */}
      {slammys && resolvedCount > 0 && (
        <div style={{ marginBottom:18 }}>
          <div style={{ ...S.lbl, textAlign:"center", marginBottom:14 }}>Slammy Awards</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            {slammys.map(s => (
              <div key={s.title} style={{ ...S.card, textAlign:"center", padding:"14px 12px", marginBottom:0 }}>
                <div style={{ fontSize:28, marginBottom:4 }}>{s.emoji}</div>
                <div style={{ fontSize:13, fontWeight:700, color:GOLD, marginBottom:2 }}>{s.title}</div>
                <div style={{ fontSize:11, color:"#908878", marginBottom:6 }}>{s.sub}</div>
                {s.winners ? s.winners.map(w => (
                  <div key={w} style={{ fontSize:15, fontWeight:700, color:"#f5efe5" }}>{w}</div>
                )) : <div style={{ fontSize:12, color:"#6a6060" }}>TBD</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Leaderboard */}
      {view==="leaders" && scored.length>0 && scored.map((s,i)=>{
        const isFirst = i===0 && s.score!==null && s.score>0;
        const medals = ["🥇","🥈","🥉"];
        return (
          <div
            key={s.name+s.ts}
            onClick={locked ? () => setViewingPlayer(s) : undefined}
            role={locked ? "button" : undefined}
            tabIndex={locked ? 0 : undefined}
            onKeyDown={locked ? (e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setViewingPlayer(s); } }) : undefined}
            style={{ ...S.card, borderColor:isFirst&&gameOver?`${GOLD}70`:BORDER, display:"flex", alignItems:"center", gap:14, padding:"18px 16px", cursor: locked ? "pointer" : "default" }}
          >
            <div style={{ fontSize:i<3?28:16, minWidth:34, textAlign:"center", color:i>=3?"#6a6060":undefined }}>{i<3?medals[i]:`#${i+1}`}</div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:Math.max(13, 18 - Math.max(0, s.name.length - 12) * 0.4), fontWeight:700, color:isFirst&&gameOver?GOLD:"#f5efe5" }}>{s.name}</div>
              <div style={{ fontSize:11, color:"#6a6060", marginTop:3 }}>{new Date(s.ts).toLocaleString([],{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}</div>
            </div>
            {s.score!==null ? (
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:30, fontWeight:900, color:isFirst&&gameOver?GOLD:"#e0d4b8", lineHeight:1 }}>{s.score}</div>
                <div style={{ fontSize:11, color:"#6a6060" }}>/ {maxScore()}</div>
              </div>
            ) : <div style={{ fontSize:13, color:"#6a6060" }}>Pending</div>}
            {locked && <div style={{ fontSize:18, color:"#6a6060", marginLeft:4 }}>›</div>}
          </div>
        );
      })}

      {/* Breakdown */}
      {view==="breakdown" && subs.length>0 && (
        <div>
          {/* Confirmed appearances (if admin has entered them) */}
          {(results?.surprises||[]).filter(Boolean).length > 0 && (
            <div style={{ ...S.card, borderColor:`${GREEN}30`, marginBottom:18 }}>
              <div style={{ fontSize:12, color:"#6aff6a", letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:6 }}>Confirmed Appearances</div>
              <div style={{ fontSize:17, fontWeight:700, color:"#f5efe5" }}>{(results.surprises||[]).filter(Boolean).join(", ")}</div>
            </div>
          )}

          {/* Matches + Bonuses */}
          {matches.map(m=>(
            <div key={m.id} style={{ ...S.card, marginBottom:10, position:"relative", overflow:"hidden" }}>
              {m.belt && <div style={{ position:"absolute", top:-12, right:-12, width:130, opacity:0.25, pointerEvents:"none", transform:"rotate(20deg)" }}><img src={m.belt} alt="" style={{ width:"100%", height:"auto", filter:"grayscale(15%) brightness(1.4)" }} /></div>}
              <div style={{ fontSize:12, letterSpacing:"0.12em", color:PURPLE, textTransform:"uppercase", marginBottom:10, position:"relative" }}>{m.title}</div>
              {m.competitors.map(c=>{
                const p=pct(m.id,c.name); const isW=results?.picks?.[m.id]===c.name;
                const pickers = locked ? subs.filter(s => s.picks?.[m.id] === c.name).map(s => s.name) : [];
                return (
                  <div key={c.name} style={{ marginBottom:10 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3, gap:6 }}>
                      <span style={{ fontSize:14, color:isW?"#6aff6a":"#d4c8ac", flex:1 }}>{c.name}{isW&&" ✓"}</span>
                      <span style={{ fontSize:14, fontWeight:700, color:GOLD }}>{p}%</span>
                    </div>
                    <Bar pct={p} col={GOLD} isWinner={isW} />
                    {pickers.length > 0 && (
                      <div style={{ fontSize:11, color:"#8a8070", fontStyle:"italic", marginTop:5, lineHeight:1.45, wordBreak:"break-word" }}>
                        {pickers.join(", ")}
                      </div>
                    )}
                  </div>
                );
              })}
              {/* Inline bonus results */}
              {(m.bonuses||[]).map(b => {
                const actual = results?.bonuses?.[b.id];
                return (
                  <div key={b.id} style={{ marginTop:8, padding:"8px 12px", background:`${PURPLE}08`, borderRadius:6 }}>
                    <div style={{ fontSize:12, color:"#d4c8ac" }}>{b.label}{b.line&&` (${b.line})`}</div>
                    {actual && <div style={{ fontSize:13, color:"#6aff6a", fontWeight:700, marginTop:3 }}>✓ {actual}</div>}
                    {!actual && <div style={{ fontSize:12, color:"#6a6060", marginTop:3 }}>Pending</div>}
                  </div>
                );
              })}
            </div>
          ))}

          {/* End Bonuses */}
          <div style={S.card}>
            <div style={{ ...S.lbl, marginBottom:12 }}>End Bonuses</div>
            {endBonuses.map(eb => {
              const actual = results?.endBonuses?.[eb.id];
              return (
                <div key={eb.id} style={{ marginBottom:12 }}>
                  <div style={{ fontSize:14, color:"#d4c8ac", marginBottom:4 }}>{eb.label}</div>
                  {actual && <div style={{ fontSize:13, color:"#6aff6a", fontWeight:700 }}>✓ {actual}</div>}
                  {!actual && <div style={{ fontSize:12, color:"#6a6060" }}>Pending</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function AdminSurpriseInput({ index, remoteValue, onCommit }) {
  const [val, setVal] = useState(remoteValue);
  const editingRef = useRef(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!editingRef.current) setVal(remoteValue);
  }, [remoteValue]);

  function handleChange(e) {
    const next = e.target.value;
    editingRef.current = true;
    setVal(next);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onCommit(index, next);
      editingRef.current = false;
    }, 500);
  }

  function handleBlur() {
    clearTimeout(timerRef.current);
    if (editingRef.current) {
      onCommit(index, val);
      editingRef.current = false;
    }
  }

  return (
    <input
      style={{ ...S.input, marginBottom:8, fontSize:16 }}
      placeholder={`Surprise #${index+1}`}
      value={val}
      onChange={handleChange}
      onBlur={handleBlur}
    />
  );
}

// ─── ADMIN TAB ───────────────────────────────────────────────────────────────
function AdminTab({ unlocked, setUnlocked, pass, setPass, onUpdate, onMarkDone, onClear, results, subs }) {
  if (!unlocked) return (
    <div style={{ textAlign:"center", paddingTop:32 }}>
      <div style={{ fontSize:36, marginBottom:8 }}>🔐</div>
      <h2 style={{ color:GOLD, margin:"0 0 4px", fontSize:18 }}>Admin Panel</h2>
      <p style={{ color:"#908878", fontSize:11, marginBottom:18, lineHeight:1.5 }}>Enter match winners, bonus results, and surprise appearances live.<br/>Mark the show done to reveal the winner.</p>
      <input type="password" style={{ ...S.input, maxWidth:240, textAlign:"center", margin:"0 auto 14px", display:"block" }} placeholder="Password…" value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==="Enter"&&(pass===ADMIN_PASS?setUnlocked(true):alert("Wrong password"))} />
      <button style={S.btn(GOLD,!pass)} disabled={!pass} onClick={()=>pass===ADMIN_PASS?setUnlocked(true):alert("Wrong password")}>Unlock</button>
    </div>
  );

  const curPicks   = results?.picks || {};
  const curBonuses = results?.bonuses || {};
  const curEnd     = results?.endBonuses || {};
  const curSurp    = results?.surprises || [];

  function togglePick(matchId, name) {
    onUpdate({ picks: { [matchId]: curPicks[matchId] === name ? null : name } });
  }
  function toggleBonus(bonusId, opt) {
    onUpdate({ bonuses: { [bonusId]: curBonuses[bonusId] === opt ? null : opt } });
  }
  function toggleEnd(ebId, val) {
    onUpdate({ endBonuses: { [ebId]: curEnd[ebId] === val ? null : val } });
  }
  const curSurpRef = useRef(curSurp);
  curSurpRef.current = curSurp;
  function commitSurprise(index, value) {
    const base = curSurpRef.current;
    const updated = [...(base.length ? base : Array(ADMIN_SURPRISE_SLOTS).fill(""))];
    while (updated.length < ADMIN_SURPRISE_SLOTS) updated.push("");
    updated[index] = value;
    onUpdate({ surprises: updated });
  }

  return (
    <div>
      {/* Mark Done — toggleable */}
      <div style={{ ...S.card, borderColor: results?.gameOver?`${GREEN}60`:`${GOLD}30`, marginBottom:16, textAlign:"center" }}>
        <div style={{ fontSize:13, color:results?.gameOver?GREEN:GOLD, marginBottom:10 }}>🏆 Show Status</div>
        <div style={{ fontSize:14, color:"#a09888", marginBottom:14 }}>{results?.gameOver ? "Trophy is revealed on Live Board" : "Reveal the trophy and winner on the Live Board"}</div>
        <button onClick={onMarkDone} style={S.btn(results?.gameOver?GREEN:GOLD)}>{results?.gameOver?"✓ Show Complete — Tap to Undo":"🏆 Mark Show Complete"}</button>
      </div>

      {/* Match Winners + Bonuses */}
      <div style={S.card}>
        <div style={{ fontSize:14, letterSpacing:"0.18em", color:GOLD, textTransform:"uppercase", marginBottom:14 }}>Match Results</div>
        <div style={{ fontSize:13, color:"#8a8070", marginBottom:14 }}>Tap to select · tap again to deselect · saves instantly</div>
        {matches.map(m=>(
          <div key={m.id} style={{ marginBottom:18, position:"relative", overflow:"hidden", padding:"12px", background:"rgba(255,255,255,0.015)", borderRadius:10 }}>
            {m.belt && <div style={{ position:"absolute", top:-10, right:-10, width:110, opacity:0.2, pointerEvents:"none", transform:"rotate(20deg)" }}><img src={m.belt} alt="" style={{ width:"100%", height:"auto", filter:"grayscale(15%) brightness(1.4)" }} /></div>}
            <div style={{ fontSize:13, color:PURPLE, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:7, position:"relative" }}>{m.title}</div>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:5 }}>
              {m.competitors.map(c=>{
                const sel = curPicks[m.id]===c.name;
                return (
                  <button key={c.name} onClick={()=>togglePick(m.id,c.name)} style={{ flex:1, minWidth:75, background:sel?`${GREEN}20`:"rgba(255,255,255,0.03)", border:sel?`1px solid ${GREEN}70`:`1px solid rgba(255,255,255,0.08)`, borderRadius:8, padding:"10px 10px", color:sel?"#6aff6a":"#8a8070", cursor:"pointer", fontSize:13, fontFamily:"Georgia, serif" }}>
                    {c.name}{sel&&" ✓"}
                  </button>
                );
              })}
            </div>
            {/* Inline bonus admin */}
            {(m.bonuses||[]).map(b=>(
              <div key={b.id} style={{ marginTop:8, padding:"10px 12px", background:`${PURPLE}08`, borderRadius:8 }}>
                <div style={{ fontSize:13, color:"#e0d4b8", marginBottom:7 }}>{b.label}{b.line&&` (${b.line})`}</div>
                <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                  {(b.type==="yesno"?["Yes","No"]:b.type==="overunder"?["Over","Under"]:b.options).map(opt=>{
                    const sel = curBonuses[b.id]===opt;
                    return (
                      <button key={opt} onClick={()=>toggleBonus(b.id,opt)} style={{ flex:1, minWidth:65, background:sel?`${GREEN}20`:"rgba(255,255,255,0.03)", border:sel?`1px solid ${GREEN}70`:`1px solid rgba(255,255,255,0.08)`, borderRadius:6, padding:"9px 10px", color:sel?"#6aff6a":"#8a8070", cursor:"pointer", fontSize:12, fontFamily:"Georgia, serif" }}>
                        {opt}{sel&&" ✓"}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* End Bonuses */}
      <div style={S.card}>
        <div style={{ fontSize:14, letterSpacing:"0.18em", color:GOLD, textTransform:"uppercase", marginBottom:14 }}>End Bonuses</div>
        {endBonuses.map(eb=>(
          <div key={eb.id} style={{ marginBottom:14 }}>
            <div style={{ fontSize:14, color:"#e0d4b8", marginBottom:8 }}>{eb.label}</div>
            <select value={curEnd[eb.id]||""} onChange={e=>toggleEnd(eb.id,e.target.value||null)} style={{ ...S.input, cursor:"pointer", fontSize:16 }}>
              <option value="">— Choose —</option>
              {eb.options.map(opt=><option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
        ))}
      </div>

      {/* Surprise Appearances */}
      <div style={S.card}>
        <div style={{ fontSize:14, letterSpacing:"0.18em", color:GOLD, textTransform:"uppercase", marginBottom:14 }}>Confirmed Surprise Appearances</div>
        {Array.from({ length: ADMIN_SURPRISE_SLOTS }).map((_, i) => (
          <AdminSurpriseInput key={i} index={i} remoteValue={curSurp[i] || ""} onCommit={commitSurprise} />
        ))}
        <div style={{ fontSize:12, color:"#8a8070", marginTop:4 }}>Auto-saves after typing · up to {ADMIN_SURPRISE_SLOTS} entries</div>
        <div style={{ fontSize:11, color:"#6a6060", marginTop:6, lineHeight:1.5 }}>Separate aliases with <code style={{ color:GOLD }}>|</code> — e.g. <code style={{ color:"#b8a888" }}>Kevin Owens|KO</code>. Typos and capitalization are auto-forgiven.</div>
      </div>

      <div style={{ marginTop:10, textAlign:"center" }}>
        <button onClick={onClear} style={{ background:"transparent", border:`1px solid ${RED}50`, borderRadius:8, color:RED, cursor:"pointer", fontSize:14, padding:"14px 20px", fontFamily:"Georgia, serif" }}>Clear All Results</button>
      </div>
    </div>
  );
}

// ─── UTILS ───────────────────────────────────────────────────────────────────
function NightHdr({ night }) {
  const col=night===1?GOLD:RED;
  return (
    <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
      <div style={{ height:1, flex:1, background:`linear-gradient(90deg,transparent,${col}40)` }} />
      <div style={{ fontSize:12, letterSpacing:"0.18em", color:col, textTransform:"uppercase", whiteSpace:"nowrap" }}>{night===1?"Night 1 · Saturday, April 18":"Night 2 · Sunday, April 19"}</div>
      <div style={{ height:1, flex:1, background:`linear-gradient(90deg,${col}40,transparent)` }} />
    </div>
  );
}
function StepHdr({ icon, title, sub }) {
  return (
    <div style={{ textAlign:"center", marginBottom:22 }}>
      <div style={{ fontSize:34, marginBottom:8 }}>{icon}</div>
      <h2 style={{ color:GOLD, margin:"0 0 5px", fontSize:24 }}>{title}</h2>
      <div style={{ fontSize:14, color:"#908878" }}>{sub}</div>
    </div>
  );
}
function NavRow({ onBack, onNext, nextDisabled, nextLabel }) {
  return (
    <div style={{ display:"flex", gap:12, marginTop:24, justifyContent:"space-between" }}>
      <button onClick={onBack} style={{ background:"transparent", border:`1px solid rgba(255,255,255,0.1)`, borderRadius:10, color:"#8a8070", cursor:"pointer", fontSize:15, padding:"15px 24px", fontFamily:"Georgia, serif" }}>← Back</button>
      <button style={S.btn(GOLD,nextDisabled)} disabled={nextDisabled} onClick={onNext}>{nextLabel}</button>
    </div>
  );
}
