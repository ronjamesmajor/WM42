import { useState, useEffect, useCallback, useRef } from "react";
import { loadShared, saveShared, subscribeToKey } from "./storage";

// ─── MATCHES (odds-based points from BetOnline.ag) ───────────────────────────
// pts = points awarded if YOU pick this competitor correctly
// Favorite (likely winner) = fewer pts · Underdog = more pts
const MATCH_PTS = 5;
const matches = [
  // ── NIGHT 1 (Saturday, April 18) ─────────────────────────────────────────
  // ESPN2 First Hour
  { id:"m11", night:1, title:"Six-Man Tag", note:"ESPN2 First Hour", competitors:[
    { name:"Logan Paul, Austin Theory & iShowSpeed", role:"" },
    { name:"LA Knight & The Usos",                   role:"" },
  ]},
  { id:"m8",  night:1, title:"Unsanctioned Match", note:"ESPN2 First Hour", competitors:[
    { name:"Drew McIntyre", role:"" },
    { name:"Jacob Fatu",    role:"" },
  ]},
  // Main Card
  { id:"m10", night:1, title:"WWE Women's Tag Team Championship", note:"Fatal 4-Way", competitors:[
    { name:"Bayley & Lyra Valkyrie",        role:"" },
    { name:"The Bella Twins",               role:"" },
    { name:"Nia Jax & Lash Legend",         role:"Champions" },
    { name:"Alexa Bliss & Charlotte Flair", role:"" },
  ]},
  { id:"m6",  night:1, title:"WWE Women's Intercontinental Championship", competitors:[
    { name:"Becky Lynch", role:"Challenger" },
    { name:"AJ Lee",      role:"Champion"   },
  ]},
  { id:"m12", night:1, title:"Singles Match", competitors:[
    { name:"Gunther",      role:"" },
    { name:"Seth Rollins", role:"" },
  ]},
  { id:"m3",  night:1, title:"WWE Women's World Championship", competitors:[
    { name:"Stephanie Vaquer", role:"Champion"   },
    { name:"Liv Morgan",       role:"Challenger" },
  ]},
  { id:"m1",  night:1, isMain:true, title:"Undisputed WWE Championship", competitors:[
    { name:"Cody Rhodes",  role:"Champion"   },
    { name:"Randy Orton",  role:"Challenger · w/ Pat MAGAFee" },
  ]},
  // ── NIGHT 2 (Sunday, April 19) ───────────────────────────────────────────
  // ESPN2 First Hour
  { id:"m4",  night:2, title:"IC Championship — Ladder Match", note:"6-Way Ladder · ESPN2 First Hour", competitors:[
    { name:"JD McDonagh",  role:""         },
    { name:"Dragon Lee",   role:""         },
    { name:"Penta",        role:"Champion" },
    { name:"Je'Von Evans", role:""         },
    { name:"Rey Mysterio", role:""         },
    { name:"Rusev",        role:""         },
  ]},
  { id:"m9",  night:2, title:"Brock Lesnar vs. Oba Femi", note:"ESPN2 First Hour", competitors:[
    { name:"Brock Lesnar", role:"" },
    { name:"Oba Femi",     role:"" },
  ]},
  // Main Card
  { id:"m7",  night:2, title:"Undisputed United States Championship", competitors:[
    { name:"Sami Zayn",       role:"Champion"   },
    { name:"Trick Williams", role:"Challenger" },
  ]},
  { id:"m2",  night:2, title:"WWE Women's Championship", competitors:[
    { name:"Jade Cargill", role:"Champion"   },
    { name:"Rhea Ripley",  role:"Challenger" },
  ]},
  { id:"m13", night:2, title:"Singles Match", competitors:[
    { name:"Demon Finn Bálor",  role:"" },
    { name:"Dominik Mysterio",  role:"" },
  ]},
  { id:"m5",  night:2, isMain:true, title:"WWE World Heavyweight Championship", competitors:[
    { name:"CM Punk",      role:"Champion"   },
    { name:"Roman Reigns", role:"Challenger" },
  ]},
];

// ─── OVER/UNDERS (2 pts each) ────────────────────────────────────────────────
const OU_PTS = 2;
const overUnders = [
  { id:"ou1", label:"CM Punk vs Roman Reigns — match length", line:"O/U 25 minutes",  options:["Over 25 mins","Under 25 mins"] },
  { id:"ou2", label:"Total title changes across both nights",  line:"O/U 3.5 changes", options:["Over (4+)","Under (3 or fewer)"] },
  { id:"ou3", label:"Surprise appearance / unannounced return", line:"Yes or No",      options:["Yes","No"] },
  { id:"ou4", label:"Danhausen appearances across both nights",  line:"O/U 3",           options:["Over (4+)","Under (3 or fewer)"] },
];

// ─── WILD CARD PROPS (2 pts each) ────────────────────────────────────────────
const WC_PTS = 2;
const wildCards = [
  { id:"w2", label:"Does Stardust (Cody's old character) make an appearance?", options:["Yes","No"] },
  { id:"w3", label:"Does Giulia vs. Tiffany Stratton (Women's US Championship) happen at WM?", options:["Yes","No"] },
  { id:"w4", label:"Which Bella Twin gets injured? (voids if neither)", options:["Nikki Bella","Brie Bella","Neither / No injury"], voidOption:"Neither / No injury" },
  { id:"w5", label:"The voices... what do they say?", options:["Vince McMahon","A McMahon (not Vince)","Nope / None"] },
];

// ─── THEORY BONUSES ───────────────────────────────────────────────────────────
const SURPRISE_SLOTS = 6;
const SURPRISE_PTS   = 2; // +2 per correct, −2 per wrong
const theories = [
  { id:"t1", label:"Will a Hall of Famer interfere in any match?",          options:["Yes","No"], pts:2 },
  { id:"t2", label:"Will there be a brand-new surprise debut or return?",   options:["Yes","No"], pts:2 },
  { id:"t3", label:"Match of the Night — group consensus picks the winner", type:"select", options:matches.map(m=>m.title), pts:5, consensus:true },
  { id:"t4", label:"Name up to 6 surprise appearances — +2 per correct, −2 per wrong", type:"surprises", pts:SURPRISE_PTS },
];

const PICKS_KEY    = "wm42_v4_picks";
const RESULTS_KEY  = "wm42_v4_results";
const ADMIN_PASS   = "vegaswm42";
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
const STEPS  = 7; // 0-name 1-night1 2-night2 3-o/u 4-wildcards 5-theories 6-review → 7=done

function maxScore() {
  const matchMax = matches.length * MATCH_PTS;
  const ouMax    = overUnders.length * OU_PTS;
  const wcMax    = wildCards.length * WC_PTS;
  const theoMax  = theories.filter(t=>t.type!=="surprises").reduce((a,t) => a + t.pts, 0);
  const surpriseMax = SURPRISE_SLOTS * SURPRISE_PTS;
  return matchMax + ouMax + wcMax + theoMax + surpriseMax;
}

function calcScore(sub, results, allSubs=[]) {
  if (!results?.picks) return null;
  let s = 0;
  // Match picks — flat 5 pts each
  matches.forEach(m => {
    const winner = results.picks[m.id];
    if (winner && sub.picks?.[m.id] === winner) s += MATCH_PTS;
  });
  // Over/Unders — flat 2 pts each
  overUnders.forEach(o => {
    if (results.overUnders?.[o.id] && sub.overUnders?.[o.id] === results.overUnders[o.id]) s += OU_PTS;
  });
  // Wild Cards — flat 2 pts each
  wildCards.forEach(w => {
    const actual = results.wildCards?.[w.id];
    const guess  = sub.wildCards?.[w.id];
    if (!actual || !guess) return;
    if (w.voidOption && actual === w.voidOption) return;
    if (guess === actual) s += WC_PTS;
  });
  // Theories
  theories.forEach(t => {
    if (t.type === "surprises") {
      // Surprise guesses: +2 per correct, −2 per wrong
      const actuals = (results.theories?.[t.id] || []).map(n => n.trim().toLowerCase()).filter(Boolean);
      const guesses = (sub.theories?.[t.id] || []).filter(Boolean);
      if (actuals.length > 0) {
        guesses.forEach(g => {
          if (actuals.includes(g.trim().toLowerCase())) s += SURPRISE_PTS;
          else s -= SURPRISE_PTS;
        });
      }
    } else if (t.consensus) {
      const counts = {};
      allSubs.forEach(s2 => { const v = s2.theories?.[t.id]; if (v) counts[v]=(counts[v]||0)+1; });
      const max = Math.max(0, ...Object.values(counts));
      if (max > 0) {
        const winners = Object.entries(counts).filter(([,v])=>v===max).map(([k])=>k);
        if (winners.includes(sub.theories?.[t.id])) s += t.pts;
      }
    } else {
      if (results.theories?.[t.id] && sub.theories?.[t.id] === results.theories[t.id]) s += t.pts;
    }
  });
  return s;
}

// ─── SHARED STYLES ───────────────────────────────────────────────────────────
const S = {
  input: { width:"100%", boxSizing:"border-box", background:"rgba(255,255,255,0.06)", border:`1px solid ${GOLD}40`, borderRadius:8, color:"#f0e6d3", fontSize:16, padding:"14px 16px", outline:"none", fontFamily:"Georgia, serif" },
  btn: (color=GOLD, disabled=false) => ({ background:disabled?"rgba(255,255,255,0.04)":`linear-gradient(135deg,${color}cc,${color})`, border:"none", borderRadius:8, color:disabled?"#4a4040":(color===GOLD?"#0c0b12":"#fff"), cursor:disabled?"not-allowed":"pointer", fontSize:14, fontWeight:700, letterSpacing:"0.1em", padding:"14px 28px", textTransform:"uppercase", fontFamily:"Georgia, serif", transition:"all 0.15s" }),
  card: { background:BG, border:`1px solid ${BORDER}`, borderRadius:12, padding:"16px 16px", marginBottom:14 },
  lbl:  { fontSize:12, letterSpacing:"0.2em", color:GOLD, textTransform:"uppercase", marginBottom:10 },
  ptsBadge: (pts, color) => ({ fontSize:11, letterSpacing:"0.06em", color:color||GOLD, background:`${color||GOLD}18`, padding:"3px 9px", borderRadius:4, fontWeight:700, whiteSpace:"nowrap" }),
};

// ─── ROOT ────────────────────────────────────────────────────────────────────
export default function WM42() {
  const [tab,       setTab]       = useState("pick");
  const [step,      setStep]      = useState(0);
  const [name,      setName]      = useState("");
  const [picks,     setPicks]     = useState({});
  const [ouPicks,   setOuPicks]   = useState({});
  const [wcPicks,   setWcPicks]   = useState({});
  const [theoPicks, setTheoPicks] = useState({});
  const [subs,      setSubs]      = useState([]);
  const [results,   setResults]   = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [lastRefresh,setLastRefresh] = useState(null);
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [adminPass,     setAdminPass]     = useState("");
  const [editKey,       setEditKey]       = useState("");

  const fetchBoard = useCallback(async (triggerAI=false) => {
    setLoading(true);
    const [fetchedSubs, fetchedRes] = await Promise.all([
      loadShared(PICKS_KEY, []),
      loadShared(RESULTS_KEY, null),
    ]);
    setSubs(fetchedSubs);
    setResults(fetchedRes);
    setLastRefresh(new Date());
    setLoading(false);
  }, []);

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
    setLoading(true);
    let existing = await loadShared(PICKS_KEY, []);
    const idx = existing.findIndex(s=>s.name.toLowerCase()===name.trim().toLowerCase());
    const key = idx >= 0 ? existing[idx].editKey : generateKey(name.trim());
    const sub = { name:name.trim(), picks, overUnders:ouPicks, wildCards:wcPicks, theories:theoPicks, editKey:key, ts:Date.now() };
    if (idx>=0) existing[idx]=sub; else existing.push(sub);
    const ok = await saveShared(PICKS_KEY, existing);
    setEditKey(key);
    setLoading(false);
    if (ok) setStep(STEPS); else alert("Save failed — try again.");
  }

  async function adminSave(overrides) {
    const merged = {
      ...(results||{}),
      picks:      { ...(results?.picks||{}),      ...(overrides.picks||{}) },
      overUnders: { ...(results?.overUnders||{}), ...(overrides.overUnders||{}) },
      wildCards:  { ...(results?.wildCards||{}),  ...(overrides.wildCards||{}) },
      theories:   overrides.theories !== undefined ? overrides.theories : (results?.theories||{}),
      gameOver:   results?.gameOver||false,
      lastUpdated:"Admin",
    };
    // Clean out null picks (toggled off)
    Object.keys(merged.picks).forEach(k => { if (merged.picks[k] === null) delete merged.picks[k]; });
    Object.keys(merged.overUnders).forEach(k => { if (merged.overUnders[k] === null) delete merged.overUnders[k]; });
    Object.keys(merged.wildCards).forEach(k => { if (merged.wildCards[k] === null) delete merged.wildCards[k]; });
    const ok = await saveShared(RESULTS_KEY, merged);
    if (ok) setResults(merged);
  }

  async function handleMarkDone() {
    const updated = { ...(results||{}), gameOver:true };
    const ok = await saveShared(RESULTS_KEY, updated);
    if (ok) setResults(updated);
  }

  async function handleClearAll() {
    if (!window.confirm("Delete ALL data? Cannot be undone.")) return;
    await saveShared(PICKS_KEY,[]); await saveShared(RESULTS_KEY,null);
    setSubs([]); setResults(null); setAiStatus(null);
  }

  function loadExistingSub(existing) {
    setPicks(existing.picks || {});
    setOuPicks(existing.overUnders || {});
    setWcPicks(existing.wildCards || {});
    setTheoPicks(existing.theories || {});
    setEditKey(existing.editKey || "");
    setStep(1);
  }

  const locked = isLocked();

  const renderPick = () => {
    if (locked) return <LockedStep />;
    if (step===0) return <NameStep name={name} setName={setName} onNewUser={()=>setStep(1)} onReturningUser={loadExistingSub} />;
    if (step===1) return <MatchStep night={1} picks={picks} setPicks={setPicks} onBack={()=>setStep(0)} onNext={()=>setStep(2)} />;
    if (step===2) return <MatchStep night={2} picks={picks} setPicks={setPicks} onBack={()=>setStep(1)} onNext={()=>setStep(3)} />;
    if (step===3) return <OUStep ouPicks={ouPicks} setOuPicks={setOuPicks} onBack={()=>setStep(2)} onNext={()=>setStep(4)} />;
    if (step===4) return <WildCardStep wcPicks={wcPicks} setWcPicks={setWcPicks} onBack={()=>setStep(3)} onNext={()=>setStep(5)} />;
    if (step===5) return <TheoryStep theoPicks={theoPicks} setTheoPicks={setTheoPicks} onBack={()=>setStep(4)} onNext={()=>setStep(6)} />;
    if (step===6) return <ReviewStep name={name} picks={picks} ouPicks={ouPicks} wcPicks={wcPicks} theoPicks={theoPicks} loading={loading} onBack={()=>setStep(5)} onSubmit={handleSubmit} />;
    if (step===STEPS) return <DoneStep name={name} editKey={editKey} onViewBoard={()=>setTab("board")} onEdit={()=>setStep(0)} />;
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100vh", background:"radial-gradient(ellipse at 20% 10%, #1a1228 0%, #0c0b12 55%, #0f0d18 100%)", color:"#f0e6d3", fontFamily:"Georgia, serif", overflow:"hidden" }}>
      {/* Header */}
      <div style={{ flexShrink:0, textAlign:"center", padding:"16px 16px 12px", borderBottom:"1px solid rgba(200,160,40,0.15)", background:"rgba(0,0,0,0.25)" }}>
        <div style={{ fontSize:10, letterSpacing:"0.3em", color:"#6a5f50", textTransform:"uppercase", marginBottom:4 }}>April 18–19 · Las Vegas · Allegiant Stadium</div>
        <h1 style={{ fontSize:"clamp(24px,6vw,38px)", fontWeight:900, background:`linear-gradient(135deg,#f5e06a,${GOLD},#e8d060)`, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", margin:0, lineHeight:1, textTransform:"uppercase", letterSpacing:"-0.02em" }}>WrestleMania 42</h1>
        <div style={{ fontSize:11, letterSpacing:"0.15em", color:"#4a4030", textTransform:"uppercase", marginTop:5 }}>Pick 'Em · Max {maxScore()} pts</div>
      </div>
      {/* Progress */}
      {tab==="pick" && step<STEPS && (
        <div style={{ flexShrink:0, height:3, background:"rgba(255,255,255,0.05)" }}>
          <div style={{ height:"100%", width:`${(step/(STEPS-1))*100}%`, background:`linear-gradient(90deg,${GOLD},${GOLD2})`, transition:"width 0.4s ease" }} />
        </div>
      )}
      {/* Tabs */}
      <div style={{ flexShrink:0, display:"flex", background:"rgba(0,0,0,0.35)", borderBottom:`1px solid ${BORDER}` }}>
        {[["pick","📋 Pick 'Em"],["board","📊 Live Board"],["admin","🔐 Admin"]].map(([id,label])=>(
          <button key={id} onClick={()=>setTab(id)} style={{ flex:1, padding:"14px 4px", fontSize:11, letterSpacing:"0.12em", textTransform:"uppercase", textAlign:"center", cursor:"pointer", border:"none", background:"transparent", color:tab===id?GOLD:"#4a4040", borderBottom:tab===id?`2px solid ${GOLD}`:"2px solid transparent", fontFamily:"Georgia, serif", transition:"color 0.15s" }}>{label}</button>
        ))}
      </div>
      {/* Content */}
      <div style={{ flex:1, overflowY:"auto", WebkitOverflowScrolling:"touch", padding:"16px 16px 60px" }}>
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
      <p style={{ color:"#6a6050", fontSize:12, marginBottom:16, lineHeight:1.5 }}>Your previous picks are loaded — change anything and re-submit.</p>
      <button style={S.btn(GOLD)} onClick={() => onReturningUser(foundSub)}>Edit My Picks →</button>
    </div>
  );

  if (phase === "key") return (
    <div style={{ textAlign:"center", paddingTop:8 }}>
      <div style={{ fontSize:32, marginBottom:6 }}>🔑</div>
      <h2 style={{ color:GOLD, margin:"0 0 4px", fontSize:19 }}>{name.trim()} already has picks</h2>
      <p style={{ color:"#6a6050", fontSize:12, marginBottom:16, lineHeight:1.5 }}>Enter your edit key to modify your picks</p>
      <input style={{ ...S.input, maxWidth:200, textAlign:"center", margin:"0 auto 14px", display:"block", letterSpacing:"0.2em", fontSize:18, fontWeight:700 }} placeholder="e.g. MTT420" value={keyInput} onChange={e=>setKeyInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&keyInput&&handleKeySubmit()} maxLength={6} />
      {error && <div style={{ color:RED, fontSize:11, marginBottom:10 }}>{error}</div>}
      <div style={{ display:"flex", gap:10, justifyContent:"center" }}>
        <button style={{ background:"transparent", border:`1px solid rgba(255,255,255,0.09)`, borderRadius:4, color:"#5a5040", cursor:"pointer", fontSize:11, padding:"10px 18px", fontFamily:"Georgia, serif" }} onClick={()=>{ setPhase("name"); setKeyInput(""); setError(""); }}>← Back</button>
        <button style={S.btn(GOLD,!keyInput)} disabled={!keyInput} onClick={handleKeySubmit}>Verify →</button>
      </div>
    </div>
  );

  return (
    <div style={{ textAlign:"center", paddingTop:8 }}>
      <div style={{ fontSize:32, marginBottom:6 }}>🏟️</div>
      <h2 style={{ color:GOLD, margin:"0 0 4px", fontSize:19 }}>WrestleMania 42 Pick 'Em</h2>
      <p style={{ color:"#6a6050", fontSize:12, marginBottom:16, lineHeight:1.5 }}>Pick your winners · scores update live during the show<br/>Edit your picks anytime before the show starts</p>
      <input style={{ ...S.input, maxWidth:300, textAlign:"center", margin:"0 auto 14px", display:"block" }} placeholder="Your name…" value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&name.trim()&&handleNameSubmit()} />
      <button style={S.btn(GOLD,!name.trim()||checking)} disabled={!name.trim()||checking} onClick={handleNameSubmit}>{checking ? "Checking…" : "Start Picking →"}</button>
      <div style={{ display:"flex", gap:8, justifyContent:"center", marginTop:16, flexWrap:"wrap" }}>
        {[
          ["📋","Match Picks",`${MATCH_PTS} pts each`],
          ["📈","Over/Unders",`${OU_PTS} pts each`],
          ["🎰","Wild Cards",`${WC_PTS} pts each`],
          ["🎲","Theories + Surprises","±2 pts per guess"],
        ].map(([icon,label,sub])=>(
          <div key={label} style={{ background:BG, border:`1px solid ${BORDER}`, borderRadius:6, padding:"8px 10px", textAlign:"center", minWidth:90, flex:1 }}>
            <div style={{ fontSize:16, marginBottom:2 }}>{icon}</div>
            <div style={{ fontSize:11, color:"#f0e6d3" }}>{label}</div>
            <div style={{ fontSize:9, color:"#5a5040", marginTop:1 }}>{sub}</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop:14, fontSize:10, color:"#3a3030" }}>Max possible score: {maxScore()} pts</div>
    </div>
  );
}

// ─── MATCH STEP ──────────────────────────────────────────────────────────────
function MatchStep({ night, picks, setPicks, onBack, onNext }) {
  const nightMatches = matches.filter(m=>m.night===night);
  const allPicked = nightMatches.every(m=>picks[m.id]);
  return (
    <div>
      <NightHdr night={night} />
      {nightMatches.map(m=>(
        <div key={m.id} style={{ ...S.card, borderColor:m.isMain?`${GOLD}40`:BORDER, position:"relative", overflow:"hidden" }}>
          {m.isMain && <div style={{ position:"absolute",top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,transparent,${GOLD},transparent)` }} />}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10, gap:8 }}>
            <div style={{ fontSize:12, letterSpacing:"0.12em", color:m.isMain?GOLD:PURPLE, textTransform:"uppercase", lineHeight:1.4 }}>
              {m.title}{m.note&&<span style={{ color:"#4a4040" }}> · {m.note}</span>}
            </div>
            {m.isMain && <div style={{ fontSize:10, color:GOLD, background:`${GOLD}18`, padding:"3px 9px", borderRadius:4, whiteSpace:"nowrap" }}>★ Main Event</div>}
          </div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            {m.competitors.map(c=>{
              const sel=picks[m.id]===c.name;
              return (
                <button key={c.name} onClick={()=>setPicks(p=>({...p,[m.id]:p[m.id]===c.name?undefined:c.name}))} style={{ flex:1, minWidth:120, background:sel?`${GOLD}18`:"rgba(255,255,255,0.03)", border:sel?`1px solid ${GOLD}80`:`1px solid ${BORDER}`, borderRadius:8, padding:"12px 14px", color:sel?"#f0e6d3":"#6a6050", cursor:"pointer", textAlign:"left", fontFamily:"Georgia, serif", transition:"all 0.15s", position:"relative" }}>
                  <div style={{ fontSize:15, fontWeight:sel?700:400, lineHeight:1.3 }}>{c.name}</div>
                  {c.role && <div style={{ fontSize:11, color:sel?GOLD:"#4a4040", marginTop:4 }}>{c.role}{sel&&<span style={{ color:GOLD, marginLeft:5 }}>✓</span>}</div>}
                  {!c.role && sel && <div style={{ fontSize:11, color:GOLD, marginTop:4 }}>✓</div>}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <div style={{ fontSize:10, color:"#3a3030", textAlign:"center", marginTop:8, marginBottom:4 }}>
        {MATCH_PTS} pts per correct pick
      </div>
      <NavRow onBack={onBack} onNext={onNext} nextDisabled={!allPicked} nextLabel={`Night ${night} done →`} />
    </div>
  );
}

// ─── O/U STEP ────────────────────────────────────────────────────────────────
function OUStep({ ouPicks, setOuPicks, onBack, onNext }) {
  const allPicked = overUnders.every(o=>ouPicks[o.id]);
  return (
    <div>
      <StepHdr icon="📈" title="Over / Unders" sub={`${OU_PTS} pts each`} />
      {overUnders.map(o=>(
        <div key={o.id} style={S.card}>
          <div style={{ fontSize:14, color:"#d0c4a8", marginBottom:5 }}>{o.label}</div>
          <div style={{ fontSize:11, letterSpacing:"0.12em", color:GOLD, textTransform:"uppercase", marginBottom:12 }}>{o.line} · {OU_PTS} pts</div>
          <div style={{ display:"flex", gap:10 }}>
            {o.options.map(opt=>{
              const sel=ouPicks[o.id]===opt;
              return <button key={opt} onClick={()=>setOuPicks(p=>({...p,[o.id]:p[o.id]===opt?undefined:opt}))} style={{ flex:1, background:sel?`${GOLD}20`:"rgba(255,255,255,0.03)", border:sel?`1px solid ${GOLD}80`:`1px solid ${BORDER}`, borderRadius:8, padding:"14px 12px", color:sel?"#f0e6d3":"#6a6050", cursor:"pointer", fontSize:14, fontFamily:"Georgia, serif" }}>{opt}{sel&&<span style={{ color:GOLD, marginLeft:5 }}>✓</span>}</button>;
            })}
          </div>
        </div>
      ))}
      <NavRow onBack={onBack} onNext={onNext} nextDisabled={!allPicked} nextLabel="Wild Card Props →" />
    </div>
  );
}

// ─── WILD CARD STEP ───────────────────────────────────────────────────────────
function WildCardStep({ wcPicks, setWcPicks, onBack, onNext }) {
  const allPicked = wildCards.every(w=>wcPicks[w.id]);
  return (
    <div>
      <StepHdr icon="🎰" title="Wild Card Props" sub={`${WC_PTS} pts each`} />
      {wildCards.map(w=>(
        <div key={w.id} style={S.card}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8, marginBottom:12 }}>
            <div style={{ fontSize:14, color:"#d0c4a8", flex:1, lineHeight:1.4 }}>{w.label}</div>
            <div style={{ ...S.ptsBadge(WC_PTS) }}>{WC_PTS} pts{w.voidOption&&" · voids if neither"}</div>
          </div>
          <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
            {w.options.map(opt=>{
              const sel=wcPicks[w.id]===opt;
              const isVoid = opt===w?.voidOption;
              return (
                <button key={opt} onClick={()=>setWcPicks(p=>({...p,[w.id]:p[w.id]===opt?undefined:opt}))} style={{ flex:1, minWidth:90, background:sel?(isVoid?"rgba(255,255,255,0.08)":`${GOLD}18`):"rgba(255,255,255,0.03)", border:sel?(isVoid?`1px solid rgba(255,255,255,0.2)`:`1px solid ${GOLD}80`):`1px solid ${BORDER}`, borderRadius:8, padding:"14px 12px", color:sel?"#f0e6d3":"#6a6050", cursor:"pointer", fontSize:14, fontFamily:"Georgia, serif" }}>
                  {opt}{sel&&<span style={{ color:isVoid?"#888":GOLD, marginLeft:5 }}>✓</span>}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <NavRow onBack={onBack} onNext={onNext} nextDisabled={!allPicked} nextLabel="Theory Bonuses →" />
    </div>
  );
}

// ─── THEORY STEP ─────────────────────────────────────────────────────────────
function TheoryStep({ theoPicks, setTheoPicks, onBack, onNext }) {
  const required = theories.filter(t=>t.type!=="surprises" && t.type!=="select");
  const allPicked = required.every(t=>theoPicks[t.id]);
  return (
    <div>
      <StepHdr icon="🎲" title="Theory Bonuses" sub="MOTN consensus · Surprise guesses (±2 pts each)" />
      {theories.map(t=>{
        const subLabel = t.consensus ? `${t.pts} pts · group consensus` : t.type==="surprises" ? `+${t.pts} correct / −${t.pts} wrong` : `${t.pts} pts`;
        return (
          <div key={t.id} style={S.card}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8, marginBottom:10 }}>
              <div style={{ fontSize:12, color:"#d0c4a8", flex:1, lineHeight:1.4 }}>{t.label}</div>
              <div style={{ ...S.ptsBadge(t.pts) }}>{subLabel}</div>
            </div>
            {t.type==="select" ? (
              <select value={theoPicks[t.id]||""} onChange={e=>setTheoPicks(p=>({...p,[t.id]:e.target.value||undefined}))} style={{ ...S.input, cursor:"pointer" }}>
                <option value="">— Choose a match —</option>
                {t.options.map(opt=><option key={opt} value={opt}>{opt}</option>)}
              </select>
            ) : t.type==="surprises" ? (
              <div>
                {Array.from({ length: SURPRISE_SLOTS }).map((_, i) => {
                  const guesses = theoPicks[t.id] || [];
                  return (
                    <input key={i} style={{ ...S.input, marginBottom:6 }} placeholder={`Surprise #${i+1} (optional)`} value={guesses[i] || ""} onChange={e => {
                      const updated = [...(theoPicks[t.id] || Array(SURPRISE_SLOTS).fill(""))];
                      updated[i] = e.target.value;
                      setTheoPicks(p => ({ ...p, [t.id]: updated }));
                    }} />
                  );
                })}
                <div style={{ fontSize:9, color:"#4a4040", marginTop:4 }}>Optional · exact name match · +{SURPRISE_PTS} per correct, −{SURPRISE_PTS} per wrong · leave blank to skip</div>
              </div>
            ) : (
              <div style={{ display:"flex", gap:8 }}>
                {t.options.map(opt=>{
                  const sel=theoPicks[t.id]===opt;
                  return <button key={opt} onClick={()=>setTheoPicks(p=>({...p,[t.id]:p[t.id]===opt?undefined:opt}))} style={{ flex:1, background:sel?`${GOLD}20`:"rgba(255,255,255,0.03)", border:sel?`1px solid ${GOLD}80`:`1px solid ${BORDER}`, borderRadius:8, padding:"14px 12px", color:sel?"#f0e6d3":"#6a6050", cursor:"pointer", fontSize:14, fontFamily:"Georgia, serif" }}>{opt}{sel&&<span style={{ color:GOLD, marginLeft:5 }}>✓</span>}</button>;
                })}
              </div>
            )}
          </div>
        );
      })}
      <NavRow onBack={onBack} onNext={onNext} nextDisabled={!allPicked} nextLabel="Review →" />
    </div>
  );
}

// ─── REVIEW STEP ─────────────────────────────────────────────────────────────
function ReviewStep({ name, picks, ouPicks, wcPicks, theoPicks, loading, onBack, onSubmit }) {
  const Section = ({title, children}) => (
    <div style={{ ...S.card, borderColor:`${GOLD}30`, marginBottom:8 }}>
      <div style={S.lbl}>{title}</div>
      {children}
    </div>
  );
  const Row = ({label, value, pts, col}) => (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"5px 0", borderBottom:`1px solid rgba(255,255,255,0.04)`, fontSize:12 }}>
      <span style={{ color:"#6a6050", flex:1, paddingRight:8 }}>{label}</span>
      <span style={{ color:col||GOLD, fontWeight:700 }}>{value}</span>
      {pts && <span style={{ color:"#3a3030", fontSize:9, marginLeft:6 }}>{pts}pt{pts>1?"s":""}</span>}
    </div>
  );
  return (
    <div>
      <StepHdr icon="✅" title="Review Picks" sub={`${name} — looks good?`} />
      <Section title={`Match Picks (${MATCH_PTS} pts each)`}>
        {matches.map(m=>{
          const pick=picks[m.id]; if (!pick) return null;
          return <Row key={m.id} label={m.title} value={pick} pts={MATCH_PTS} />;
        })}
      </Section>
      <Section title={`Over / Unders (${OU_PTS} pts each)`}>
        {overUnders.map(o=>ouPicks[o.id]&&<Row key={o.id} label={o.label} value={ouPicks[o.id]} pts={OU_PTS} />)}
      </Section>
      <Section title={`Wild Cards (${WC_PTS} pts each)`}>
        {wildCards.map(w=>wcPicks[w.id]&&<Row key={w.id} label={w.label} value={wcPicks[w.id]} pts={WC_PTS} />)}
      </Section>
      <Section title="Theory Bonuses">
        {theories.map(t=>{
          if (t.type==="surprises") {
            const guesses = (theoPicks[t.id] || []).filter(Boolean);
            if (!guesses.length) return null;
            return <Row key={t.id} label="Surprise guesses" value={guesses.join(", ")} pts={null} col={PURPLE} />;
          }
          return theoPicks[t.id] ? <Row key={t.id} label={t.label} value={theoPicks[t.id]} pts={t.pts} /> : null;
        })}
      </Section>
      <div style={{ textAlign:"center", color:"#3a3030", fontSize:10, marginBottom:14 }}>Max {maxScore()} pts · scores update live during the show</div>
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
          <div style={{ fontSize:28, fontWeight:900, letterSpacing:"0.15em", color:"#f0e6d3", fontFamily:"monospace" }}>{editKey}</div>
          <div style={{ fontSize:10, color:"#5a5040", marginTop:6 }}>Save this! You'll need it to edit your picks.</div>
        </div>
      )}
      <p style={{ color:"#6a6050", fontSize:12, lineHeight:1.6, marginBottom:24 }}>Scores auto-update as WrestleMania results come in.<br/>Share the link — everyone joins the same live board.</p>
      <div style={{ display:"flex", gap:10, justifyContent:"center", flexWrap:"wrap" }}>
        <button style={S.btn(GOLD)} onClick={onViewBoard}>View Live Board →</button>
        {!locked && <button style={{ background:"transparent", border:`1px solid ${GOLD}40`, borderRadius:4, color:GOLD, cursor:"pointer", fontSize:12, fontWeight:700, letterSpacing:"0.12em", padding:"11px 24px", textTransform:"uppercase", fontFamily:"Georgia, serif" }} onClick={onEdit}>✏️ Edit Picks</button>}
      </div>
      {!locked && <div style={{ marginTop:14, fontSize:10, color:"#4a4040" }}>You can edit picks until {LOCKOUT_UTC.toLocaleString([], { month:"short", day:"numeric", hour:"2-digit", minute:"2-digit", timeZoneName:"short" })}</div>}
    </div>
  );
}

// ─── LOCKED STEP ─────────────────────────────────────────────────────────────
function LockedStep() {
  return (
    <div style={{ textAlign:"center", paddingTop:32 }}>
      <div style={{ fontSize:44, marginBottom:8 }}>🔒</div>
      <h2 style={{ color:RED, margin:"0 0 6px", fontSize:22 }}>Picks Are Locked</h2>
      <p style={{ color:"#6a6050", fontSize:12, lineHeight:1.6 }}>The show has started — no more changes allowed.<br/>Head to the Live Board to watch the scores roll in!</p>
    </div>
  );
}

// ─── BOARD TAB ───────────────────────────────────────────────────────────────
function BoardTab({ subs, results, loading, lastRefresh, onRefresh }) {
  const [view, setView] = useState("leaders");
  const gameOver = results?.gameOver || false;
  const resolvedCount = Object.values(results?.picks||{}).filter(Boolean).length;
  const scored = [...subs].map(s=>({ ...s, score:calcScore(s,results,subs) })).sort((a,b)=>(b.score??-1)-(a.score??-1));
  const topScore = scored[0]?.score ?? 0;
  const topPlayers = scored.filter(s=>s.score===topScore && topScore>0);

  function pct(matchId, name) {
    const t=subs.filter(s=>s.picks?.[matchId]).length; if(!t) return 0;
    return Math.round(subs.filter(s=>s.picks?.[matchId]===name).length/t*100);
  }
  function ouPct(ouId, opt) {
    const t=subs.filter(s=>s.overUnders?.[ouId]).length; if(!t) return 0;
    return Math.round(subs.filter(s=>s.overUnders?.[ouId]===opt).length/t*100);
  }
  function wcPct(wcId, opt) {
    const t=subs.filter(s=>s.wildCards?.[wcId]).length; if(!t) return 0;
    return Math.round(subs.filter(s=>s.wildCards?.[wcId]===opt).length/t*100);
  }

  const Bar = ({pct, col, isWinner}) => (
    <div style={{ height:5, background:"rgba(255,255,255,0.05)", borderRadius:3, overflow:"hidden" }}>
      <div style={{ height:"100%", width:`${pct}%`, background:isWinner?`linear-gradient(90deg,#3a8a3a,#6aff6a)`:`linear-gradient(90deg,${col}70,${col})`, borderRadius:3, transition:"width 0.5s ease" }} />
    </div>
  );

  return (
    <div>
      {/* Trophy Banner */}
      {gameOver && topScore>0 && (
        <div style={{ background:"linear-gradient(135deg,rgba(200,160,40,0.15),rgba(200,160,40,0.05))", border:`1px solid ${GOLD}60`, borderRadius:10, padding:"18px 16px", textAlign:"center", marginBottom:16, position:"relative", overflow:"hidden" }}>
          <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:`linear-gradient(90deg,transparent,${GOLD},transparent)` }} />
          <div style={{ fontSize:48, marginBottom:6, filter:"drop-shadow(0 0 12px gold)" }}>🏆</div>
          <div style={{ fontSize:10, letterSpacing:"0.3em", color:GOLD, textTransform:"uppercase", marginBottom:6 }}>WrestleMania 42 Pick 'Em Champion{topPlayers.length>1?"s":""}</div>
          {topPlayers.map(p=>(
            <div key={p.name} style={{ fontSize:26, fontWeight:900, color:GOLD2, lineHeight:1.1 }}>{p.name}</div>
          ))}
          <div style={{ fontSize:13, color:GOLD, marginTop:6, opacity:0.8 }}>{topScore} / {maxScore()} pts</div>
        </div>
      )}

      {/* Shadowed trophy teaser when results exist but game not over */}
      {!gameOver && resolvedCount>0 && scored[0]?.score!==null && (
        <div style={{ background:"rgba(0,0,0,0.3)", border:`1px solid rgba(255,255,255,0.06)`, borderRadius:8, padding:"14px 16px", textAlign:"center", marginBottom:14 }}>
          <div style={{ fontSize:36, marginBottom:4, filter:"brightness(0.3) blur(1px)" }}>🏆</div>
          <div style={{ fontSize:10, letterSpacing:"0.2em", color:"#4a4040", textTransform:"uppercase", marginBottom:4 }}>Currently Leading</div>
          <div style={{ fontSize:18, fontWeight:700, color:"#d0c4a8", filter:"blur(4px)", userSelect:"none" }}>{scored[0]?.name}</div>
          <div style={{ fontSize:11, color:"#4a4040", marginTop:4 }}>Trophy revealed when Admin marks the show complete</div>
        </div>
      )}

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
        <div style={{ fontSize:13, color:"#5a5040" }}>{subs.length} submission{subs.length!==1?"s":""} · {resolvedCount}/{matches.length} results{lastRefresh?` · ${lastRefresh.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}`:""}</div>
        <button onClick={onRefresh} style={{ background:"transparent", border:`1px solid ${GOLD}40`, borderRadius:8, color:GOLD, cursor:"pointer", fontSize:13, padding:"8px 16px", fontFamily:"Georgia, serif" }}>{loading?"…":"↻"}</button>
      </div>

      {/* Sub-tabs */}
      <div style={{ display:"flex", border:`1px solid ${BORDER}`, borderRadius:8, overflow:"hidden", marginBottom:18 }}>
        {[["leaders","🏅 Leaderboard"],["breakdown","📊 Breakdown"]].map(([id,label])=>(
          <button key={id} onClick={()=>setView(id)} style={{ flex:1, padding:"13px", fontSize:13, letterSpacing:"0.1em", textTransform:"uppercase", border:"none", cursor:"pointer", fontFamily:"Georgia, serif", background:view===id?`${GOLD}22`:"transparent", color:view===id?GOLD:"#4a4040", borderRight:id==="leaders"?`1px solid ${BORDER}`:"none" }}>{label}</button>
        ))}
      </div>

      {subs.length===0&&!loading&&(
        <div style={{ textAlign:"center", padding:"40px 0", color:"#3a3030", fontSize:16 }}>No submissions yet 🎤</div>
      )}

      {/* Leaderboard */}
      {view==="leaders" && scored.length>0 && scored.map((s,i)=>{
        const isFirst = i===0 && s.score!==null && s.score>0;
        const medals = ["🥇","🥈","🥉"];
        return (
          <div key={s.name+s.ts} style={{ ...S.card, borderColor:isFirst&&gameOver?`${GOLD}70`:BORDER, display:"flex", alignItems:"center", gap:14, padding:"18px 16px" }}>
            <div style={{ fontSize:i<3?28:16, minWidth:34, textAlign:"center", color:i>=3?"#4a4040":undefined }}>{i<3?medals[i]:`#${i+1}`}</div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:18, fontWeight:700, color:isFirst&&gameOver?GOLD:"#f0e6d3" }}>{s.name}</div>
              <div style={{ fontSize:11, color:"#4a4040", marginTop:3 }}>{new Date(s.ts).toLocaleString([],{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}</div>
            </div>
            {s.score!==null ? (
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:30, fontWeight:900, color:isFirst&&gameOver?GOLD:"#d0c4a8", lineHeight:1 }}>{s.score}</div>
                <div style={{ fontSize:11, color:"#4a4040" }}>/ {maxScore()}</div>
              </div>
            ) : <div style={{ fontSize:13, color:"#4a4040" }}>Pending</div>}
          </div>
        );
      })}

      {/* Breakdown */}
      {view==="breakdown" && subs.length>0 && (
        <div>
          {/* Surprise Guesses — shown first */}
          {(() => {
            const t = theories.find(t=>t.type==="surprises");
            if (!t) return null;
            const actuals = (results?.theories?.[t.id] || []).map(n=>n.trim().toLowerCase()).filter(Boolean);
            return (
              <div style={{ ...S.card, borderColor:`${PURPLE}40`, marginBottom:18 }}>
                <div style={{ ...S.lbl, color:PURPLE, marginBottom:12 }}>Surprise Guesses · ±{SURPRISE_PTS} pts</div>
                {actuals.length > 0 && (
                  <div style={{ background:"rgba(42,160,42,0.12)", border:"1px solid rgba(42,160,42,0.3)", borderRadius:8, padding:"12px 14px", marginBottom:14 }}>
                    <div style={{ fontSize:11, color:"#6aff6a", letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:5 }}>Confirmed Appearances</div>
                    <div style={{ fontSize:16, fontWeight:700, color:"#f0e6d3" }}>{(results.theories[t.id]||[]).filter(Boolean).join(", ")}</div>
                  </div>
                )}
                {subs.map(sub => {
                  const guesses = (sub.theories?.[t.id] || []).filter(Boolean);
                  if (!guesses.length) return null;
                  return (
                    <div key={sub.name} style={{ marginBottom:10, padding:"12px 14px", background:"rgba(255,255,255,0.02)", border:`1px solid ${BORDER}`, borderRadius:8 }}>
                      <div style={{ fontSize:15, fontWeight:700, color:GOLD, marginBottom:6 }}>{sub.name}</div>
                      <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                        {guesses.map((g, i) => {
                          const isCorrect = actuals.length > 0 && actuals.includes(g.trim().toLowerCase());
                          const isWrong   = actuals.length > 0 && !isCorrect;
                          return (
                            <span key={i} style={{ fontSize:14, padding:"5px 12px", borderRadius:6, background:isCorrect?`${GREEN}20`:isWrong?`${RED}20`:"rgba(255,255,255,0.05)", color:isCorrect?"#6aff6a":isWrong?RED:"#c0b498", border:`1px solid ${isCorrect?GREEN:isWrong?RED:"rgba(255,255,255,0.08)"}40` }}>
                              {g}{isCorrect&&" ✓"}{isWrong&&" ✗"}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* Matches */}
          {matches.map(m=>(
            <div key={m.id} style={{ ...S.card, marginBottom:10 }}>
              <div style={{ fontSize:12, letterSpacing:"0.12em", color:PURPLE, textTransform:"uppercase", marginBottom:10 }}>{m.title}</div>
              {m.competitors.map(c=>{
                const p=pct(m.id,c.name); const isW=results?.picks?.[m.id]===c.name;
                return (
                  <div key={c.name} style={{ marginBottom:8 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3, gap:6 }}>
                      <span style={{ fontSize:14, color:isW?"#6aff6a":"#c0b498", flex:1 }}>{c.name}{isW&&" ✓"}</span>
                      <span style={{ fontSize:14, fontWeight:700, color:GOLD }}>{p}%</span>
                    </div>
                    <Bar pct={p} col={GOLD} isWinner={isW} />
                  </div>
                );
              })}
            </div>
          ))}

          {/* O/U */}
          <div style={S.card}>
            <div style={{ ...S.lbl, marginBottom:12 }}>Over / Unders</div>
            {overUnders.map(o=>(
              <div key={o.id} style={{ marginBottom:16 }}>
                <div style={{ fontSize:14, color:"#c0b498", marginBottom:8 }}>{o.label} <span style={{ color:GOLD, fontSize:11 }}>· {OU_PTS}pts</span></div>
                {o.options.map(opt=>{ const p=ouPct(o.id,opt); const isW=results?.overUnders?.[o.id]===opt; return (
                  <div key={opt} style={{ marginBottom:6 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                      <span style={{ fontSize:14, color:isW?"#6aff6a":"#7a7060" }}>{opt}{isW&&" ✓"}</span>
                      <span style={{ fontSize:14, color:GOLD }}>{p}%</span>
                    </div>
                    <Bar pct={p} col={GOLD} isWinner={isW} />
                  </div>
                );})}
              </div>
            ))}
          </div>

          {/* Wild Cards */}
          <div style={S.card}>
            <div style={{ ...S.lbl, marginBottom:12 }}>Wild Card Props</div>
            {wildCards.map(w=>{
              const actual=results?.wildCards?.[w.id];
              const voided=actual&&actual===w.voidOption;
              return (
                <div key={w.id} style={{ marginBottom:16 }}>
                  <div style={{ fontSize:14, color:"#c0b498", marginBottom:8 }}>{w.label} <span style={{ color:GOLD, fontSize:11 }}>· {WC_PTS}pts{w.voidOption&&" · voids if neither"}</span></div>
                  {voided && <div style={{ fontSize:12, color:"#5a5040", marginBottom:4 }}>⚡ Voided — no injury occurred</div>}
                  {w.options.map(opt=>{ const p=wcPct(w.id,opt); const isW=!voided&&results?.wildCards?.[w.id]===opt;
                    return (
                    <div key={opt} style={{ marginBottom:6 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3, gap:4 }}>
                        <span style={{ fontSize:14, color:isW?"#6aff6a":"#7a7060", flex:1 }}>{opt}{isW&&" ✓"}</span>
                        <span style={{ fontSize:14, color:GOLD }}>{p}%</span>
                      </div>
                      <Bar pct={p} col={GOLD} isWinner={isW} />
                    </div>
                  );})}
                </div>
              );
            })}
          </div>

          {/* Theories (non-surprise) */}
          <div style={S.card}>
            <div style={{ ...S.lbl, marginBottom:12 }}>Theory Bonuses</div>
            {theories.filter(t=>t.type!=="surprises").map(t=>{
              if (t.consensus) {
                const counts={};
                subs.forEach(s=>{const v=s.theories?.[t.id];if(v)counts[v]=(counts[v]||0)+1;});
                const topC=Math.max(0,...Object.values(counts));
                const leaders=Object.entries(counts).filter(([,v])=>v===topC).map(([k])=>k);
                const total=subs.filter(s=>s.theories?.[t.id]).length;
                return (
                  <div key={t.id} style={{ marginBottom:18 }}>
                    <div style={{ fontSize:14, color:"#c0b498", marginBottom:8 }}>{t.label} <span style={{ color:GOLD, fontSize:11 }}>· {t.pts}pts consensus 👑</span></div>
                    {Object.entries(counts).sort((a,b)=>b[1]-a[1]).map(([title,count])=>{
                      const p=total?Math.round(count/total*100):0; const lead=leaders.includes(title);
                      return (
                        <div key={title} style={{ marginBottom:6 }}>
                          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                            <span style={{ fontSize:13, color:lead?"#f5e06a":"#7a7060", flex:1, paddingRight:6 }}>{title}{lead&&" 👑"}</span>
                            <span style={{ fontSize:13, color:GOLD }}>{count} ({p}%)</span>
                          </div>
                          <Bar pct={p} col={GOLD} isWinner={false} />
                        </div>
                      );
                    })}
                    <div style={{ fontSize:11, color:"#3a3030", marginTop:5 }}>👑 = current leader · {t.pts}pts go to whoever matches the top vote after show</div>
                  </div>
                );
              }
              return (
                <div key={t.id} style={{ marginBottom:16 }}>
                  <div style={{ fontSize:14, color:"#c0b498", marginBottom:8 }}>{t.label} <span style={{ color:GOLD, fontSize:11 }}>· {t.pts}pts</span></div>
                  {t.options.map(opt=>{const count=subs.filter(s=>s.theories?.[t.id]===opt).length;const p=subs.length?Math.round(count/subs.length*100):0;const isW=results?.theories?.[t.id]===opt;return(
                    <div key={opt} style={{ marginBottom:6 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                        <span style={{ fontSize:14, color:isW?"#6aff6a":"#7a7060" }}>{opt}{isW&&" ✓"}</span>
                        <span style={{ fontSize:14, color:GOLD }}>{p}%</span>
                      </div>
                      <Bar pct={p} col={PURPLE} isWinner={isW} />
                    </div>
                  );})}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ADMIN TAB ───────────────────────────────────────────────────────────────
function AdminTab({ unlocked, setUnlocked, pass, setPass, onUpdate, onMarkDone, onClear, results, subs }) {
  if (!unlocked) return (
    <div style={{ textAlign:"center", paddingTop:32 }}>
      <div style={{ fontSize:36, marginBottom:8 }}>🔐</div>
      <h2 style={{ color:GOLD, margin:"0 0 4px", fontSize:18 }}>Admin Panel</h2>
      <p style={{ color:"#5a5040", fontSize:11, marginBottom:18, lineHeight:1.5 }}>Enter match results, wild card outcomes, and theory results live.<br/>Mark the show done to reveal the winner.</p>
      <input type="password" style={{ ...S.input, maxWidth:240, textAlign:"center", margin:"0 auto 14px", display:"block" }} placeholder="Password…" value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==="Enter"&&(pass===ADMIN_PASS?setUnlocked(true):alert("Wrong password"))} />
      <button style={S.btn(GOLD,!pass)} disabled={!pass} onClick={()=>pass===ADMIN_PASS?setUnlocked(true):alert("Wrong password")}>Unlock</button>
      <div style={{ marginTop:16, fontSize:10, color:"#3a3030" }}>Hint: vegaswm42</div>
    </div>
  );

  const curPicks = results?.picks || {};
  const curWc    = results?.wildCards || {};
  const curTheo  = results?.theories || {};

  function togglePick(matchId, name) {
    const val = curPicks[matchId] === name ? null : name;
    onUpdate({ picks: { [matchId]: val } });
  }
  function toggleWc(wcId, opt) {
    const val = curWc[wcId] === opt ? null : opt;
    onUpdate({ wildCards: { [wcId]: val } });
  }
  function toggleTheo(theoId, opt) {
    const val = curTheo[theoId] === opt ? null : opt;
    onUpdate({ theories: { ...curTheo, [theoId]: val } });
  }
  const surpriseTimer = useRef(null);
  function updateSurprise(theoId, index, value) {
    const updated = [...(curTheo[theoId] || Array(SURPRISE_SLOTS).fill(""))];
    updated[index] = value;
    const newTheo = { ...curTheo, [theoId]: updated };
    // Debounce text input saves
    clearTimeout(surpriseTimer.current);
    surpriseTimer.current = setTimeout(() => onUpdate({ theories: newTheo }), 500);
  }

  return (
    <div>
      {/* Mark Done */}
      <div style={{ ...S.card, borderColor: results?.gameOver?`${GREEN}60`:`${GOLD}30`, marginBottom:14 }}>
        <div style={{ fontSize:10, color:results?.gameOver?GREEN:GOLD, marginBottom:8 }}>🏆 Show Status</div>
        {results?.gameOver ? (
          <div style={{ fontSize:12, color:"#6aff6a" }}>✓ Marked complete — trophy is revealed on Live Board</div>
        ) : (
          <div>
            <div style={{ fontSize:11, color:"#5a5040", marginBottom:10 }}>Mark the show as done to reveal the gold trophy and winner name on the Live Board.</div>
            <button onClick={onMarkDone} style={S.btn(GOLD)}>🏆 Mark Show Complete</button>
          </div>
        )}
      </div>

      {/* Match Winners */}
      <div style={S.card}>
        <div style={S.lbl}>Match Winners</div>
        <div style={{ fontSize:10, color:"#4a4040", marginBottom:12 }}>Tap to select · tap again to deselect · saves instantly</div>
        {matches.map(m=>(
          <div key={m.id} style={{ marginBottom:12 }}>
            <div style={{ fontSize:9, color:PURPLE, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:5 }}>{m.title}</div>
            <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
              {m.competitors.map(c=>{
                const sel = curPicks[m.id]===c.name;
                return (
                  <button key={c.name} onClick={()=>togglePick(m.id,c.name)} style={{ flex:1, minWidth:70, background:sel?`${GREEN}20`:"rgba(255,255,255,0.02)", border:sel?`1px solid ${GREEN}80`:`1px solid ${BORDER}`, borderRadius:4, padding:"6px 8px", color:sel?"#6aff6a":"#4a4040", cursor:"pointer", fontSize:10, fontFamily:"Georgia, serif" }}>
                    {c.name}{sel&&" ✓"}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Wild Cards */}
      <div style={S.card}>
        <div style={S.lbl}>Wild Card Results</div>
        {wildCards.map(w=>(
          <div key={w.id} style={{ marginBottom:14 }}>
            <div style={{ fontSize:11, color:"#d0c4a8", marginBottom:6 }}>{w.label}</div>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              {w.options.map(opt=>{
                const sel = curWc[w.id]===opt;
                return (
                  <button key={opt} onClick={()=>toggleWc(w.id,opt)} style={{ flex:1, minWidth:80, background:sel?`${GREEN}20`:"rgba(255,255,255,0.02)", border:sel?`1px solid ${GREEN}80`:`1px solid ${BORDER}`, borderRadius:4, padding:"7px 8px", color:sel?"#6aff6a":"#4a4040", cursor:"pointer", fontSize:11, fontFamily:"Georgia, serif" }}>
                    {opt}{sel&&" ✓"}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Theories */}
      <div style={S.card}>
        <div style={S.lbl}>Theory Results</div>
        {theories.map(t=>{
          if (t.consensus) return (
            <div key={t.id} style={{ marginBottom:12, background:`${GOLD}08`, border:`1px solid ${GOLD}20`, borderRadius:6, padding:"9px 12px" }}>
              <div style={{ fontSize:10, color:GOLD, marginBottom:2 }}>{t.label}</div>
              <div style={{ fontSize:10, color:"#5a5040" }}>Auto-scored from group consensus — no input needed</div>
            </div>
          );
          if (t.type==="surprises") return (
            <div key={t.id} style={{ marginBottom:12 }}>
              <div style={{ fontSize:11, color:"#d0c4a8", marginBottom:6 }}>Confirmed Surprise Appearances <span style={{ color:PURPLE, fontSize:9 }}>· ±{SURPRISE_PTS}pts each</span></div>
              {Array.from({ length: SURPRISE_SLOTS }).map((_, i) => {
                const vals = curTheo[t.id] || [];
                return (
                  <input key={i} style={{ ...S.input, marginBottom:6 }} placeholder={`Surprise #${i+1}`} value={vals[i] || ""} onChange={e => updateSurprise(t.id, i, e.target.value)} />
                );
              })}
              <div style={{ fontSize:9, color:"#3a3030", marginTop:3 }}>Case-insensitive match · auto-saves after typing</div>
            </div>
          );
          return (
            <div key={t.id} style={{ marginBottom:12 }}>
              <div style={{ fontSize:11, color:"#d0c4a8", marginBottom:6 }}>{t.label} <span style={{ color:GOLD, fontSize:9 }}>· {t.pts}pts</span></div>
              <div style={{ display:"flex", gap:6 }}>
                {t.options.map(opt=>{
                  const sel = curTheo[t.id]===opt;
                  return (
                    <button key={opt} onClick={()=>toggleTheo(t.id,opt)} style={{ flex:1, background:sel?`${GREEN}20`:"rgba(255,255,255,0.02)", border:sel?`1px solid ${GREEN}80`:`1px solid ${BORDER}`, borderRadius:4, padding:"7px 10px", color:sel?"#6aff6a":"#4a4040", cursor:"pointer", fontSize:11, fontFamily:"Georgia, serif" }}>
                      {opt}{sel&&" ✓"}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop:8 }}>
        <button onClick={onClear} style={{ background:"transparent", border:`1px solid ${RED}50`, borderRadius:4, color:RED, cursor:"pointer", fontSize:11, padding:"10px 14px", fontFamily:"Georgia, serif" }}>Clear All Results</button>
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
      <div style={{ fontSize:11, letterSpacing:"0.2em", color:col, textTransform:"uppercase", whiteSpace:"nowrap" }}>{night===1?"Night 1 · Saturday, April 18":"Night 2 · Sunday, April 19"}</div>
      <div style={{ height:1, flex:1, background:`linear-gradient(90deg,${col}40,transparent)` }} />
    </div>
  );
}
function StepHdr({ icon, title, sub }) {
  return (
    <div style={{ textAlign:"center", marginBottom:22 }}>
      <div style={{ fontSize:32, marginBottom:6 }}>{icon}</div>
      <h2 style={{ color:GOLD, margin:"0 0 4px", fontSize:22 }}>{title}</h2>
      <div style={{ fontSize:13, color:"#5a5040" }}>{sub}</div>
    </div>
  );
}
function NavRow({ onBack, onNext, nextDisabled, nextLabel }) {
  return (
    <div style={{ display:"flex", gap:12, marginTop:24, justifyContent:"space-between" }}>
      <button onClick={onBack} style={{ background:"transparent", border:`1px solid rgba(255,255,255,0.12)`, borderRadius:8, color:"#6a6050", cursor:"pointer", fontSize:14, padding:"14px 22px", fontFamily:"Georgia, serif" }}>← Back</button>
      <button style={S.btn(GOLD,nextDisabled)} disabled={nextDisabled} onClick={onNext}>{nextLabel}</button>
    </div>
  );
}
