import { useState, useEffect, useRef, createContext, useContext } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, setDoc } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";

// ── Firebase config ───────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyDBac2ULsigtWE9aREVV9PLKeBOnHgPHiA",
  authDomain: "ray-of-hope-9c785.firebaseapp.com",
  databaseURL: "https://ray-of-hope-9c785-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "ray-of-hope-9c785",
  storageBucket: "ray-of-hope-9c785.firebasestorage.app",
  messagingSenderId: "937999094378",
  appId: "1:937999094378:web:0ba003e949cacd23453013"
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);
const auth = getAuth(firebaseApp);

// ── Firestore helpers ─────────────────────────────────────────────────────────
// Subscribe to a collection, returns unsub function
const subscribe = (col, setter) =>
  onSnapshot(collection(db, col), snap => {
    setter(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });

const fsAdd = (col, data) => {
  const { id, ...rest } = data;
  return addDoc(collection(db, col), rest);
};

const fsUpdate = (col, id, data) => {
  const { id: _id, ...rest } = data;
  return updateDoc(doc(db, col, id), rest);
};

const fsDel = (col, id) => deleteDoc(doc(db, col, id));

// Save (add or update)
const fsSave = async (col, data) => {
  if (data.id && !data.id.startsWith("_")) {
    await fsUpdate(col, data.id, data);
  } else {
    await fsAdd(col, data);
  }
};

// ── Global confirm dialog context ─────────────────────────────────────────────
const ConfirmCtx = createContext(null);
function useConfirm() { return useContext(ConfirmCtx); }

function ConfirmProvider({ children }) {
  const [state, setState] = useState(null);
  const ask = (msg, onOk) => setState({ msg, onOk });
  const close = () => setState(null);
  return (
    <ConfirmCtx.Provider value={ask}>
      {children}
      {state && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:9999 }}>
          <div style={{ background:"white", borderRadius:14, padding:"28px 32px", minWidth:300, boxShadow:"0 8px 32px rgba(0,0,0,0.25)", textAlign:"center" }}>
            <div style={{ fontSize:36, marginBottom:12 }}>{state.onOk ? "⚠️" : "ℹ️"}</div>
            <div style={{ fontSize:15, fontFamily:"Georgia,serif", color:"#333", marginBottom:22 }}>{state.msg}</div>
            <div style={{ display:"flex", gap:10, justifyContent:"center" }}>
              {state.onOk && <button onClick={() => { state.onOk(); close(); }} style={{ background:"#D32F2F", color:"white", border:"none", padding:"9px 22px", borderRadius:8, cursor:"pointer", fontFamily:"Georgia,serif", fontWeight:"bold", fontSize:14 }}>Delete</button>}
              <button onClick={close} style={{ background:"#e3f2fd", color:"#1565C0", border:"1px solid #90caf9", padding:"9px 22px", borderRadius:8, cursor:"pointer", fontFamily:"Georgia,serif", fontSize:14 }}>{state.onOk ? "Cancel" : "OK"}</button>
            </div>
          </div>
        </div>
      )}
    </ConfirmCtx.Provider>
  );
}


// ── helpers ───────────────────────────────────────────────────────────────────
const fmt = (n) => "Rs. " + Number(n || 0).toLocaleString("en-PK", { minimumFractionDigits: 2 });
const today = () => new Date().toISOString().split("T")[0];
const uid = () => Math.random().toString(36).slice(2, 9);

// ── Shared Serial/Case No registry ────────────────────────────────────────────
// Serial Numbers, Cases, and Work Plan entries all key off the SAME code
// (e.g. "26/1", "Um01"). This helper looks the code up across all three so
// each page can warn about duplicates and auto-fill the title from wherever
// it was first registered. Expenses intentionally has its own separate
// serialNo field and is not part of this registry.
function findCodeOwners(code, { serials = [], cases = [], workPlanEntries = [] } = {}) {
  if (!code) return [];
  const hits = [];
  serials.forEach(s => { if (s.code === code) hits.push({ source: "Serial Numbers", title: s.title }); });
  cases.forEach(c => { if (c.caseNo === code) hits.push({ source: "Cases", title: c.titleOfCase || c.name }); });
  workPlanEntries.forEach(e => { if (e.caseNo === code) hits.push({ source: "Work Plan", title: e.description || e.name }); });
  return hits;
}

const CATS = ["Education", "Medical", "Food", "Shelter", "Clothing", "Emergency", "Other"];
const EXP_CATS = ["Salaries", "Utilities", "Transport", "Stationery", "Medical Aid", "Food Aid", "Other"];

// ── Logo SVG ──────────────────────────────────────────────────────────────────
function Logo({ size = 48 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none">
      <circle cx="100" cy="85" r="70" stroke="#1565C0" strokeWidth="8" fill="white" />
      <text x="100" y="95" textAnchor="middle" fontSize="38" fontFamily="serif" fill="#D32F2F" fontWeight="bold">امید</text>
      <path d="M45 145 Q70 120 100 130 Q130 120 155 145" stroke="#1565C0" strokeWidth="7" fill="none" />
      <path d="M45 145 Q35 165 55 168 Q75 172 100 160 Q125 172 145 168 Q165 165 155 145" fill="#1565C0" />
      <text x="100" y="198" textAnchor="middle" fontSize="18" fontFamily="serif" fill="#D32F2F" fontWeight="bold">RAY OF HOPE</text>
    </svg>
  );
}

// ── Loading spinner ───────────────────────────────────────────────────────────
function Spinner() {
  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"linear-gradient(135deg,#1565C0,#0d47a1)" }}>
      <div style={{ textAlign:"center", color:"white" }}>
        <Logo size={72} />
        <div style={{ marginTop:20, fontSize:16, fontFamily:"Georgia,serif" }}>Loading Ray of Hope...</div>
        <div style={{ marginTop:12, width:48, height:48, border:"4px solid rgba(255,255,255,0.3)", borderTop:"4px solid white", borderRadius:"50%", animation:"spin 1s linear infinite", margin:"12px auto 0" }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState("dashboard");
  const [globalYear, setGlobalYear] = useState(new Date().getFullYear().toString());
  const [authUser, setAuthUser] = useState(null);   // Firebase auth user
  const [authLoading, setAuthLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null); // { role, displayName }

  // live Firestore data
  const [serials,   setSerials]   = useState([]);
  const [receivings,setReceivings]= useState([]);
  const [expenses,  setExpenses]  = useState([]);
  const [cases,     setCases]     = useState([]);
  const [loans,     setLoans]     = useState([]);
  const [donations, setDonations] = useState([]);
  const [workPlanEntries, setWorkPlanEntries] = useState([]);
  const [users,     setUsers]     = useState([]);
  const [syncing,   setSyncing]   = useState(false);

  // ── Auth listener ─────────────────────────────────────────────────────────
  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setAuthUser(u);
      if (u) {
        // load user profile from Firestore users collection
        const unsub = onSnapshot(doc(db, "users", u.uid), snap => {
          if (snap.exists()) setUserProfile(snap.data());
          else setUserProfile({ displayName: u.email, role: "Viewer" });
        });
        setAuthLoading(false);
        return unsub;
      } else {
        setUserProfile(null);
        setAuthLoading(false);
      }
    });
  }, []);

  // ── Firestore listeners (only when logged in) ─────────────────────────────
  useEffect(() => {
    if (!authUser) return;
    const unsubs = [
      subscribe("serials",    setSerials),
      subscribe("receivings", setReceivings),
      subscribe("expenses",   setExpenses),
      subscribe("cases",      setCases),
      subscribe("loans",      setLoans),
      subscribe("donations",  setDonations),
      subscribe("workplan",   setWorkPlanEntries),
      subscribe("users",      setUsers),
    ];
    return () => unsubs.forEach(u => u());
  }, [authUser]);

  // ── CRUD wrappers passed to pages ─────────────────────────────────────────
  // Each collection gets: add, update, remove
  const mkCRUD = (col) => ({
    add:    (data) => { const { id, ...rest } = data; return addDoc(collection(db, col), { ...rest, createdAt: new Date().toISOString() }); },
    update: (data) => { const { id, ...rest } = data; return updateDoc(doc(db, col, id), rest); },
    remove: (id)   => deleteDoc(doc(db, col, id)),
    save:   (data) => {
      if (data.id) { const { id, ...rest } = data; return updateDoc(doc(db, col, id), rest); }
      else { const { id, ...rest } = data; return addDoc(collection(db, col), { ...rest, createdAt: new Date().toISOString() }); }
    },
  });

  const crud = {
    serials:    mkCRUD("serials"),
    receivings: mkCRUD("receivings"),
    expenses:   mkCRUD("expenses"),
    cases:      mkCRUD("cases"),
    loans:      mkCRUD("loans"),
    donations:  mkCRUD("donations"),
    workplan:   mkCRUD("workplan"),
    users:      mkCRUD("users"),
  };

  if (authLoading) return <Spinner />;
  if (!authUser)   return <ConfirmProvider><PrintProvider><LoginPage /></PrintProvider></ConfirmProvider>;

  const nav = [
    { id: "dashboard", label: "Dashboard",      icon: "🏠" },
    { id: "workplan",  label: "Work Plan",      icon: "📅" },
    { id: "serials",   label: "Serial Numbers", icon: "🔢" },
    { id: "receivings",label: "Receivings",     icon: "📥" },
    { id: "expenses",  label: "Expenses",       icon: "📤" },
    { id: "cases",     label: "Cases",          icon: "📋" },
    { id: "loans",     label: "Loans",          icon: "🏦" },
    { id: "donations", label: "Donations",      icon: "💝" },
    { id: "summary",   label: "Summary",        icon: "📊" },
    { id: "users",     label: "Users",          icon: "👥" },
  ];

  const props = { serials, receivings, expenses, cases, loans, donations, workPlanEntries, users, crud, user: { ...userProfile, email: authUser.email, uid: authUser.uid }, globalYear, setGlobalYear };

  const handleLogout = () => signOut(auth);

  return (
    <ConfirmProvider>
    <PrintProvider>
    <div style={{ display:"flex", minHeight:"100vh", fontFamily:"'Georgia',serif", background:"#f0f4f8" }}>
      {/* Sidebar */}
      <div style={{ width:220, background:"#1565C0", color:"white", display:"flex", flexDirection:"column", position:"fixed", top:0, left:0, height:"100vh", zIndex:100 }}>
        <div style={{ padding:"20px 16px", borderBottom:"1px solid rgba(255,255,255,0.2)", display:"flex", alignItems:"center", gap:10 }}>
          <Logo size={42} />
          <div>
            <div style={{ fontWeight:"bold", fontSize:13, lineHeight:1.2 }}>Ray of Hope</div>
            <div style={{ fontSize:11, opacity:0.7 }}>NGO Management</div>
          </div>
        </div>
        {/* Live sync indicator */}
        <div style={{ padding:"6px 16px", background:"rgba(0,255,0,0.1)", borderBottom:"1px solid rgba(255,255,255,0.1)", fontSize:10, display:"flex", alignItems:"center", gap:5 }}>
          <span style={{ width:7, height:7, borderRadius:"50%", background:"#4caf50", display:"inline-block", boxShadow:"0 0 6px #4caf50" }} />
          Live Sync Active
        </div>
        <nav style={{ flex:1, padding:"12px 8px", overflowY:"auto" }}>
          {nav.map((n) => (
            <button key={n.id} onClick={() => setPage(n.id)} style={{
              display:"flex", alignItems:"center", gap:10, width:"100%", padding:"10px 12px",
              background: page===n.id ? "rgba(255,255,255,0.2)" : "transparent",
              border:"none", borderRadius:8, color:"white", cursor:"pointer",
              fontSize:13, fontFamily:"Georgia,serif", marginBottom:2, textAlign:"left",
              borderLeft: page===n.id ? "3px solid #D32F2F" : "3px solid transparent",
            }}>
              <span>{n.icon}</span> {n.label}
            </button>
          ))}
        </nav>
        <div style={{ padding:"12px 16px", borderTop:"1px solid rgba(255,255,255,0.2)", fontSize:12 }}>
          <div style={{ opacity:0.7, fontSize:10 }}>Logged in as</div>
          <div style={{ fontWeight:"bold", fontSize:12, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{userProfile?.displayName || authUser.email}</div>
          <div style={{ opacity:0.6, fontSize:10, marginBottom:6 }}>{userProfile?.role || "Viewer"}</div>
          <button onClick={handleLogout} style={{ background:"#D32F2F", border:"none", color:"white", padding:"6px 12px", borderRadius:6, cursor:"pointer", fontSize:12, fontFamily:"Georgia,serif", width:"100%" }}>Logout</button>
        </div>
      </div>
      {/* Main content */}
      <div style={{ marginLeft:220, flex:1, padding:24 }}>
        <div style={{ maxWidth:1200, margin:"0 auto" }}>
          {page==="dashboard"  && <Dashboard {...props} />}
          {page==="workplan"   && <WorkPlanPage {...props} />}
          {page==="serials"    && <SerialsPage {...props} />}
          {page==="receivings" && <ReceivingsPage {...props} />}
          {page==="expenses"   && <ExpensesPage {...props} />}
          {page==="cases"      && <CasesPage {...props} />}
          {page==="loans"      && <LoansPage {...props} />}
          {page==="donations"  && <DonationsPage {...props} />}
          {page==="summary"    && <SummaryPage {...props} />}
          {page==="users"      && <UsersPage {...props} />}
        </div>
      </div>
    </div>
    </PrintProvider>
    </ConfirmProvider>
  );
}

// ── Login Page (Firebase Auth) ────────────────────────────────────────────────
function LoginPage() {
  const [email, setEmail] = useState("");
  const [pass,  setPass]  = useState("");
  const [err,   setErr]   = useState("");
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    if (!email || !pass) return setErr("Please enter email and password");
    setLoading(true); setErr("");
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (e) {
      setErr(e.code === "auth/invalid-credential" || e.code === "auth/wrong-password" || e.code === "auth/user-not-found"
        ? "Wrong email or password" : "Login failed: " + e.message);
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#1565C0 0%,#0d47a1 50%,#1a237e 100%)", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ background:"white", borderRadius:16, padding:40, width:360, boxShadow:"0 20px 60px rgba(0,0,0,0.3)" }}>
        <div style={{ textAlign:"center", marginBottom:28 }}>
          <Logo size={72} />
          <h2 style={{ margin:"12px 0 4px", color:"#1565C0", fontFamily:"Georgia,serif" }}>Ray of Hope</h2>
          <p style={{ color:"#666", margin:0, fontSize:13 }}>NGO Management System</p>
        </div>
        {err && <div style={{ background:"#ffebee", color:"#c62828", padding:"8px 12px", borderRadius:8, marginBottom:12, fontSize:13 }}>{err}</div>}
        <input placeholder="Email address" type="email" value={email} onChange={e=>setEmail(e.target.value)} style={inp} />
        <input placeholder="Password" type="password" value={pass} onChange={e=>setPass(e.target.value)} style={{ ...inp, marginTop:8 }} onKeyDown={e=>e.key==="Enter"&&handle()} />
        <button onClick={handle} disabled={loading} style={{ width:"100%", marginTop:16, padding:"12px", background: loading?"#90caf9":"#1565C0", color:"white", border:"none", borderRadius:8, fontFamily:"Georgia,serif", fontSize:15, fontWeight:"bold", cursor: loading?"not-allowed":"pointer" }}>
          {loading ? "Signing in..." : "Login"}
        </button>
        <p style={{ textAlign:"center", fontSize:11, color:"#999", marginTop:16 }}>Contact your administrator for login credentials</p>
      </div>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function Dashboard({ receivings, expenses, cases, loans, donations, serials }) {
  const totalRec = receivings.reduce((a, b) => a + Number(b.amount || 0), 0);
  const totalExp = expenses.reduce((a, b) => a + Number(b.amount || 0), 0);
  const balance = totalRec - totalExp;
  const totalLoans = loans.reduce((a, b) => a + Number(b.amount || 0), 0);
  const totalDon = donations ? donations.reduce((a, b) => a + Number(b.amount || 0), 0) : 0;
  const paidLoans = loans.reduce((a, b) => a + b.installments.filter((i) => i.paid).reduce((x, y) => x + Number(y.amount || 0), 0), 0);

  const cards = [
    { label: "Total Receivings", val: fmt(totalRec), color: "#2e7d32", icon: "📥" },
    { label: "Total Expenses", val: fmt(totalExp), color: "#c62828", icon: "📤" },
    { label: "Balance", val: fmt(balance), color: balance >= 0 ? "#1565C0" : "#b71c1c", icon: "💰" },
    { label: "Active Cases", val: cases.filter((c) => c.status !== "Closed").length, color: "#e65100", icon: "📋" },
    { label: "Total Donations", val: fmt(totalDon), color: "#c2185b", icon: "💝" },
    { label: "Total Loans", val: fmt(totalLoans), color: "#6a1b9a", icon: "🏦" },
    { label: "Loan Recovered", val: fmt(paidLoans), color: "#00695c", icon: "✅" },
    { label: "Serial Numbers", val: serials.length, color: "#37474f", icon: "🔢" },
    { label: "Total Records", val: receivings.length + expenses.length + cases.length + loans.length, color: "#1565C0", icon: "📁" },
  ];

  return (
    <div>
      <PageHeader title="Dashboard" sub="Welcome to Ray of Hope NGO Management" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 16, marginBottom: 28 }}>
        {cards.map((c, i) => (
          <div key={i} style={{ background: "white", borderRadius: 12, padding: "20px 16px", boxShadow: "0 2px 8px rgba(0,0,0,0.08)", borderTop: `4px solid ${c.color}` }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>{c.icon}</div>
            <div style={{ fontSize: 20, fontWeight: "bold", color: c.color }}>{c.val}</div>
            <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>{c.label}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <RecentTable title="Recent Receivings" data={receivings.slice(-5).reverse()} cols={["date", "serialNo", "source", "amount"]} fmt={{ amount: fmt }} />
        <RecentTable title="Recent Expenses" data={expenses.slice(-5).reverse()} cols={["date", "serialNo", "description", "amount"]} fmt={{ amount: fmt }} />
      </div>
    </div>
  );
}

function RecentTable({ title, data, cols, fmt: fmtMap = {} }) {
  return (
    <div style={{ background: "white", borderRadius: 12, padding: 20, boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
      <h3 style={{ margin: "0 0 14px", fontSize: 15, color: "#1565C0" }}>{title}</h3>
      <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
        <thead><tr style={{ background: "#e3f2fd" }}>
          {cols.map((c) => <th key={c} style={{ padding: "6px 8px", textAlign: "left", textTransform: "capitalize", fontFamily: "Georgia,serif", color: "#1565C0" }}>{c.replace(/([A-Z])/g, " $1")}</th>)}
        </tr></thead>
        <tbody>{data.length ? data.map((row, i) => (
          <tr key={i} style={{ borderBottom: "1px solid #eee" }}>
            {cols.map((c) => <td key={c} style={{ padding: "6px 8px" }}>{fmtMap[c] ? fmtMap[c](row[c]) : row[c]}</td>)}
          </tr>
        )) : <tr><td colSpan={cols.length} style={{ padding: "12px 8px", textAlign: "center", color: "#aaa" }}>No records</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

// ── Serials Page ──────────────────────────────────────────────────────────────
function SerialsPage({ serials, crud, cases, workPlanEntries }) {
  const [form, setForm] = useState({ id: "", code: "", title: "", description: "", category: "General" });
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState("");
  const confirm = useConfirm();

  const cats = ["General", "Education", "Medical", "Food Aid", "Shelter", "Loan", "Emergency", "Other"];
  const save = async () => {
    if (!form.code || !form.title) return confirm("Code and title are required.", null);
    if (!editing) {
      if (serials.find((s) => s.code === form.code)) return confirm("This Serial No already exists in Serial Numbers.", null);
      const otherOwners = findCodeOwners(form.code, { serials: [], cases, workPlanEntries });
      if (otherOwners.length) {
        confirm(`"${form.code}" is already used in ${otherOwners.map(o=>o.source).join(" and ")} (${otherOwners.map(o=>o.title||"untitled").join(", ")}). Each Case/Serial No should be used once across Serials, Cases and Work Plan. Please use a different code, or open that record to edit it instead.`, null);
        return;
      }
    }
    await crud.serials.save(form);
    setForm({ id: "", code: "", title: "", description: "", category: "General" });
    setEditing(null);
  };
  const del = (id) => { confirm("Delete this serial?", () => crud.serials.remove(id)); };
  const edit = (s) => { setForm({ ...s }); setEditing(s.id); };
  const filtered = serials.filter((s) => s.code.toLowerCase().includes(search.toLowerCase()) || s.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <PageHeader title="Serial Numbers" sub="Manage custom serial numbers used across all modules" />
      <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 20 }}>
        <div style={{ background: "white", borderRadius: 12, padding: 20, boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
          <h3 style={{ margin: "0 0 16px", color: "#1565C0", fontSize: 15 }}>{editing ? "Edit Serial" : "Add New Serial"}</h3>
          <label style={lbl}>Serial Code (e.g. 26/1, Um01)</label>
          <input style={inp} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. 26/1 or Um01" />
          <label style={lbl}>Title</label>
          <input style={inp} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Case/Project title" />
          <label style={lbl}>Category</label>
          <select style={inp} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {cats.map((c) => <option key={c}>{c}</option>)}
          </select>
          <label style={lbl}>Description</label>
          <textarea style={{ ...inp, height: 70, resize: "vertical" }} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional notes..." />
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <button onClick={save} style={btnPrimary}>{editing ? "Update" : "Add Serial"}</button>
            {editing && <button onClick={() => { setForm({ id: "", code: "", title: "", description: "", category: "General" }); setEditing(null); }} style={btnSec}>Cancel</button>}
          </div>
        </div>
        <div style={{ background: "white", borderRadius: 12, padding: 20, boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
          <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
            <input style={{ ...inp, flex: 1, margin: 0 }} placeholder="Search serials..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
            <thead><tr style={{ background: "#e3f2fd" }}>
              {["Code", "Title", "Category", "Used In", "Description", "Actions"].map((h) => <th key={h} style={th}>{h}</th>)}
            </tr></thead>
            <tbody>{filtered.map((s) => {
              const inCase = cases.some(c => c.caseNo === s.code);
              const inWorkPlan = workPlanEntries.some(e => e.caseNo === s.code);
              return (
              <tr key={s.id} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ ...td, fontWeight: "bold", color: "#1565C0" }}>{s.code}</td>
                <td style={td}>{s.title}</td>
                <td style={td}><span style={{ ...badge, background: "#e3f2fd", color: "#1565C0" }}>{s.category}</span></td>
                <td style={td}>
                  {inCase && <span style={{ ...badge, background:"#fff3e0", color:"#e65100", marginRight:4 }}>📋 Case</span>}
                  {inWorkPlan && <span style={{ ...badge, background:"#e8f5e9", color:"#2e7d32" }}>📅 Work Plan</span>}
                  {!inCase && !inWorkPlan && <span style={{ color:"#aaa", fontSize:11 }}>Not used yet</span>}
                </td>
                <td style={td}>{s.description || "—"}</td>
                <td style={td}>
                  <button onClick={() => edit(s)} style={btnSm}>Edit</button>
                  <button onClick={() => del(s.id)} style={{ ...btnSm, background: "#ffebee", color: "#c62828" }}>Del</button>
                </td>
              </tr>
            );})}{!filtered.length && <tr><td colSpan={6} style={{ textAlign: "center", padding: 20, color: "#aaa" }}>No serials found</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Receivings Page ───────────────────────────────────────────────────────────
const PAYMENT_METHODS = ["By Hand / Cash", "Easypaisa", "JazzCash", "Bank Transfer", "Sadapay", "Nayapay", "Cheque", "Other"];
const REC_CATS = ["General Fund", "Zakat", "Sadqah", "Grant", "Government Aid", "Corporate", "Individual", "Emergency Fund", "Other"];

function ReceivingsPage({ receivings, crud }) {
  const BLANK = { id: "", date: today(), source: "", method: "By Hand / Cash", accountRef: "", category: "General Fund", amount: "", receivedBy: "", description: "" };
  const [form, setForm] = useState(BLANK);
  const showPreview = usePrint();
  const confirm = useConfirm();
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState("");
  const [filterMethod, setFilterMethod] = useState("");
  const [filterCat, setFilterCat] = useState("");

  const save = async () => {
    if (!form.date || !form.amount || !form.source) return confirm("Date, source and amount are required.", null);
    await crud.receivings.save(form);
    setForm(BLANK); setEditing(null);
  };
  const del = (id) => confirm("Delete this receiving entry?", () => crud.receivings.remove(id));
  const edit = (r) => { setForm({ ...BLANK, ...r }); setEditing(r.id); };

  const filtered = receivings.filter((r) => {
    const s = search.toLowerCase();
    const m = !s || r.source?.toLowerCase().includes(s) || r.description?.toLowerCase().includes(s) || r.accountRef?.toLowerCase().includes(s) || r.receivedBy?.toLowerCase().includes(s);
    const mm = !filterMethod || r.method === filterMethod;
    const mc = !filterCat || r.category === filterCat;
    return m && mm && mc;
  });
  const total = filtered.reduce((a, b) => a + Number(b.amount || 0), 0);

  // Method colour map
  const methodColor = { "By Hand / Cash": "#2e7d32", "Easypaisa": "#00695c", "JazzCash": "#e65100", "Bank Transfer": "#1565C0", "Sadapay": "#6a1b9a", "Nayapay": "#0277bd", "Cheque": "#37474f", "Other": "#555" };
  const mc = (m) => methodColor[m] || "#555";

  const printPerforma = (r) => {
    const rows = [
      ["Date", r.date],
      ["Source / Donor", r.source],
      ["Payment Method", r.method],
    ];
    if (r.method !== "By Hand / Cash") rows.push(["Transaction / Receipt No.", r.accountRef || "—"]);
    rows.push(
      ["Category", r.category],
      ["Amount", fmt(r.amount)],
      ["Received By", r.receivedBy || "—"],
      ["Description", r.description || "—"],
    );
    showPreview(performaHTML("Receiving Record", rows));
  };

  // Breakdown by method
  const byMethod = {};
  filtered.forEach(r => {
    byMethod[r.method] = (byMethod[r.method] || 0) + Number(r.amount || 0);
  });

  return (
    <div>
      <PageHeader title="Receivings" sub="Track all incoming funds by payment method" />

      {/* Method summary pills */}
      {Object.keys(byMethod).length > 0 && (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
          {Object.entries(byMethod).map(([m, amt]) => (
            <div key={m} style={{ background: "white", borderRadius: 20, padding: "6px 14px", fontSize: 12, borderLeft: `4px solid ${mc(m)}`, boxShadow: "0 1px 4px rgba(0,0,0,0.08)", display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontWeight: "bold", color: mc(m) }}>{m}</span>
              <span style={{ color: "#2e7d32", fontWeight: "bold" }}>{fmt(amt)}</span>
            </div>
          ))}
          <div style={{ background: "#1565C0", borderRadius: 20, padding: "6px 16px", fontSize: 12, color: "white", fontWeight: "bold", marginLeft: "auto" }}>
            Total: {fmt(total)}
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 20 }}>
        {/* Form */}
        <div style={{ background: "white", borderRadius: 12, padding: 20, boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
          <h3 style={{ margin: "0 0 16px", color: "#1565C0", fontSize: 15 }}>{editing ? "Edit Entry" : "Add Receiving"}</h3>
          <label style={lbl}>Date *</label>
          <input type="date" style={inp} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          <label style={lbl}>Source / Donor Name *</label>
          <input style={inp} value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} placeholder="Who sent the money?" />
          <label style={lbl}>Payment Method *</label>
          <select style={{ ...inp, borderLeft: `4px solid ${mc(form.method)}` }} value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
            {PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}
          </select>
          {form.method !== "By Hand / Cash" && (
            <>
              <label style={lbl}>Transaction / Account Reference No.</label>
              <input style={inp} value={form.accountRef} onChange={(e) => setForm({ ...form, accountRef: e.target.value })} placeholder="e.g. TXN123456 or 03xx-xxxxxxx" />
            </>
          )}
          <label style={lbl}>Category</label>
          <select style={inp} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {REC_CATS.map((c) => <option key={c}>{c}</option>)}
          </select>
          <label style={lbl}>Amount (Rs.) *</label>
          <input type="number" style={inp} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0.00" />
          <label style={lbl}>Received By</label>
          <input style={inp} value={form.receivedBy} onChange={(e) => setForm({ ...form, receivedBy: e.target.value })} placeholder="Staff name" />
          <label style={lbl}>Description / Notes</label>
          <textarea style={{ ...inp, height: 55, resize: "vertical" }} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <button onClick={save} style={btnPrimary}>{editing ? "Update" : "Add"}</button>
            {editing && <button onClick={() => { setForm(BLANK); setEditing(null); }} style={btnSec}>Cancel</button>}
          </div>
        </div>

        {/* Table */}
        <div style={{ background: "white", borderRadius: 12, padding: 20, boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
            <input style={{ ...inp, flex: 1, margin: 0, minWidth: 130 }} placeholder="Search donor, ref, notes..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <select style={{ ...inp, margin: 0, minWidth: 130 }} value={filterMethod} onChange={(e) => setFilterMethod(e.target.value)}>
              <option value="">All Methods</option>
              {PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}
            </select>
            <select style={{ ...inp, margin: 0, minWidth: 120 }} value={filterCat} onChange={(e) => setFilterCat(e.target.value)}>
              <option value="">All Categories</option>
              {REC_CATS.map((c) => <option key={c}>{c}</option>)}
            </select>
            <button onClick={() => downloadCSV([["Date","Source","Method","Ref No","Category","Amount","Received By","Description"],...filtered.map(r=>[r.date,r.source,r.method,r.accountRef||"",r.category,r.amount,r.receivedBy||"",r.description||""])], "receivings.csv")} style={{ ...btnSec, margin: 0 }}>📊 CSV</button>
            <button onClick={() => showPreview(tableHTML("Receivings Report", ["Date","Source","Method","Ref No","Category","Amount","Received By"], filtered.map(r=>[r.date,r.source,r.method,r.accountRef||"—",r.category,fmt(r.amount),r.receivedBy||"—"])))} style={{ ...btnSec, margin: 0 }}>🖨 Print</button>
          </div>
          <div style={{ background: "#e8f5e9", borderRadius: 8, padding: "7px 14px", marginBottom: 10, fontSize: 13 }}>
            {filtered.length} records — Total: <strong>{fmt(total)}</strong>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
              <thead><tr style={{ background: "#e3f2fd" }}>
                {["Date","Source / Donor","Method","Ref No.","Category","Amount","Received By","Actions"].map((h) => <th key={h} style={th}>{h}</th>)}
              </tr></thead>
              <tbody>{filtered.slice().reverse().map((r) => (
                <tr key={r.id} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={td}>{r.date}</td>
                  <td style={{ ...td, fontWeight: "bold" }}>{r.source}</td>
                  <td style={td}>
                    <span style={{ ...badge, background: mc(r.method) + "22", color: mc(r.method), border: `1px solid ${mc(r.method)}44` }}>{r.method}</span>
                  </td>
                  <td style={{ ...td, fontSize: 11, color: "#666" }}>{r.accountRef || "—"}</td>
                  <td style={td}><span style={{ ...badge, background: "#e8f5e9", color: "#2e7d32" }}>{r.category}</span></td>
                  <td style={{ ...td, color: "#2e7d32", fontWeight: "bold" }}>{fmt(r.amount)}</td>
                  <td style={td}>{r.receivedBy || "—"}</td>
                  <td style={td}>
                    <button onClick={() => edit(r)} style={btnSm}>Edit</button>
                    <button onClick={() => printPerforma(r)} style={{ ...btnSm, background: "#e3f2fd", color: "#1565C0" }}>🖨</button>
                    <button onClick={() => del(r.id)} style={{ ...btnSm, background: "#ffebee", color: "#c62828" }}>Del</button>
                  </td>
                </tr>
              ))}{!filtered.length && <tr><td colSpan={8} style={{ textAlign: "center", padding: 20, color: "#aaa" }}>No records found</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Expenses Page ─────────────────────────────────────────────────────────────
function ExpensesPage({ expenses, crud, receivings, serials }) {
  const [form, setForm] = useState({ id: "", date: today(), serialNo: "", description: "", category: "Other", amount: "", paidTo: "", approvedBy: "", notes: "" });
  const showPreview = usePrint();
  const confirm = useConfirm();
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState("");
  const [filterSerial, setFilterSerial] = useState("");

  const totalRec = receivings.reduce((a, b) => a + Number(b.amount || 0), 0);
  const totalExp = expenses.reduce((a, b) => a + Number(b.amount || 0), 0);
  const balance = totalRec - totalExp;

  const save = async () => {
    if (!form.date || !form.amount || !form.description) return confirm("Date, description and amount are required.", null);
    await crud.expenses.save(form);
    setForm({ id: "", date: today(), serialNo: "", description: "", category: "Other", amount: "", paidTo: "", approvedBy: "", notes: "" });
    setEditing(null);
  };
  const del = (id) => { confirm("Delete this expense entry?", () => crud.expenses.remove(id)); };
  const edit = (e) => { setForm({ ...e }); setEditing(e.id); };

  const filtered = expenses.filter((e) => {
    const s = search.toLowerCase();
    const m = !s || e.description?.toLowerCase().includes(s) || e.serialNo?.toLowerCase().includes(s) || e.paidTo?.toLowerCase().includes(s);
    const ms = !filterSerial || e.serialNo === filterSerial;
    return m && ms;
  });

  const printPerforma = (e) => {
    showPreview(performaHTML("Expense Voucher", [
      ["Date", e.date], ["Serial No", e.serialNo || "—"], ["Description", e.description],
      ["Category", e.category], ["Amount", fmt(e.amount)], ["Paid To", e.paidTo || "—"],
      ["Approved By", e.approvedBy || "—"], ["Notes", e.notes || "—"],
    ]));
  };

  return (
    <div>
      <PageHeader title="Expenses" sub="Track all expenditures and disbursements" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 20 }}>
        {[{ l: "Total Received", v: fmt(totalRec), c: "#2e7d32" }, { l: "Total Expenses", v: fmt(totalExp), c: "#c62828" }, { l: "Balance", v: fmt(balance), c: balance >= 0 ? "#1565C0" : "#b71c1c" }].map((x, i) => (
          <div key={i} style={{ background: "white", borderRadius: 10, padding: 16, textAlign: "center", borderTop: `3px solid ${x.c}` }}>
            <div style={{ fontSize: 20, fontWeight: "bold", color: x.c }}>{x.v}</div>
            <div style={{ fontSize: 12, color: "#666" }}>{x.l}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 20 }}>
        <div style={{ background: "white", borderRadius: 12, padding: 20, boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
          <h3 style={{ margin: "0 0 16px", color: "#1565C0", fontSize: 15 }}>{editing ? "Edit Entry" : "Add Expense"}</h3>
          <label style={lbl}>Date</label>
          <input type="date" style={inp} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          <label style={lbl}>Serial No</label>
          <select style={inp} value={form.serialNo} onChange={(e) => setForm({ ...form, serialNo: e.target.value })}>
            <option value="">— None —</option>
            {serials.map((s) => <option key={s.id} value={s.code}>{s.code} — {s.title}</option>)}
          </select>
          <label style={lbl}>Description</label>
          <input style={inp} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What was this expense for?" />
          <label style={lbl}>Category</label>
          <select style={inp} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {EXP_CATS.map((c) => <option key={c}>{c}</option>)}
          </select>
          <label style={lbl}>Amount (Rs.)</label>
          <input type="number" style={inp} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          <label style={lbl}>Paid To</label>
          <input style={inp} value={form.paidTo} onChange={(e) => setForm({ ...form, paidTo: e.target.value })} />
          <label style={lbl}>Approved By</label>
          <input style={inp} value={form.approvedBy} onChange={(e) => setForm({ ...form, approvedBy: e.target.value })} />
          <label style={lbl}>Notes</label>
          <textarea style={{ ...inp, height: 50, resize: "vertical" }} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <button onClick={save} style={btnPrimary}>{editing ? "Update" : "Add"}</button>
            {editing && <button onClick={() => { setForm({ id: "", date: today(), serialNo: "", description: "", category: "Other", amount: "", paidTo: "", approvedBy: "", notes: "" }); setEditing(null); }} style={btnSec}>Cancel</button>}
          </div>
        </div>
        <div style={{ background: "white", borderRadius: 12, padding: 20, boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
            <input style={{ ...inp, flex: 1, margin: 0, minWidth: 140 }} placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <select style={{ ...inp, margin: 0, minWidth: 140 }} value={filterSerial} onChange={(e) => setFilterSerial(e.target.value)}>
              <option value="">All Serials</option>
              {serials.map((s) => <option key={s.id} value={s.code}>{s.code}</option>)}
            </select>
            <button onClick={() => downloadCSV([["Date", "Serial", "Description", "Category", "Amount", "Paid To", "Approved By"], ...filtered.map((e) => [e.date, e.serialNo, e.description, e.category, e.amount, e.paidTo, e.approvedBy])], "expenses.csv")} style={{ ...btnSec, margin: 0 }}>📊 CSV</button>
            <button onClick={() => showPreview(tableHTML("Expenses Report", ["Date", "Serial", "Description", "Category", "Amount", "Paid To"], filtered.map((e) => [e.date, e.serialNo, e.description, e.category, fmt(e.amount), e.paidTo])))} style={{ ...btnSec, margin: 0 }}>🖨 Print</button>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
              <thead><tr style={{ background: "#ffebee" }}>
                {["Date", "Serial", "Description", "Category", "Amount", "Paid To", "Actions"].map((h) => <th key={h} style={th}>{h}</th>)}
              </tr></thead>
              <tbody>{filtered.slice().reverse().map((e) => (
                <tr key={e.id} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={td}>{e.date}</td>
                  <td style={{ ...td, color: "#1565C0", fontWeight: "bold" }}>{e.serialNo || "—"}</td>
                  <td style={td}>{e.description}</td>
                  <td style={td}><span style={{ ...badge, background: "#ffebee", color: "#c62828" }}>{e.category}</span></td>
                  <td style={{ ...td, color: "#c62828", fontWeight: "bold" }}>{fmt(e.amount)}</td>
                  <td style={td}>{e.paidTo || "—"}</td>
                  <td style={td}>
                    <button onClick={() => edit(e)} style={btnSm}>Edit</button>
                    <button onClick={() => printPerforma(e)} style={{ ...btnSm, background: "#e3f2fd", color: "#1565C0" }}>🖨</button>
                    <button onClick={() => del(e.id)} style={{ ...btnSm, background: "#ffebee", color: "#c62828" }}>Del</button>
                  </td>
                </tr>
              ))}{!filtered.length && <tr><td colSpan={7} style={{ textAlign: "center", padding: 20, color: "#aaa" }}>No records</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Cases Page ────────────────────────────────────────────────────────────────
function CasesPage({ cases, crud, serials, workPlanEntries }) {
  const BLANK = {
    id:"", date:today(), caseNo:"",
    titleOfCase:"", whatDone:"", category:"", name:"", mobile:"",
    dateOfCompletion:"", loan:"N/A", sponsoredAmount:"N/A",
    focalPersonName:"", focalPersonMobile:"",
    verifiedBy:"", sponsoredBy:"",
    facts:["","","","","","","",""],
    totalAmount:"",
    cnicCopy:false, purchasing:false, videosPics:false, posted:false,
    status:"Active", assignedTo:"",
    photo:"", cnicFront:"", cnicBack:""
  };
  const [form, setForm]       = useState(BLANK);
  const showPreview            = usePrint();
  const confirm                = useConfirm();
  const [editing, setEditing]  = useState(null);
  const [search, setSearch]    = useState("");
  const [view, setView]        = useState(null);

  const toBase64 = (file) => new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.onerror=rej; r.readAsDataURL(file); });
  const handleImg = async (field, file) => {
    if (!file) return;
    if (file.size > 600000) return confirm("Image too large. Please use a photo under 600KB.", null);
    const b64 = await toBase64(file);
    setForm(f=>({...f,[field]:b64}));
  };
  const setFact = (i, val) => setForm(f=>{ const facts=[...f.facts]; facts[i]=val; return {...f,facts}; });

  // When a Case No is typed that already exists as a Serial, auto-fill the title
  // so staff don't have to retype something already registered.
  const handleCaseNoChange = (val) => {
    setForm(f => {
      const matchingSerial = serials.find(s => s.code === val);
      if (matchingSerial && !f.titleOfCase) {
        return { ...f, caseNo: val, titleOfCase: matchingSerial.title };
      }
      return { ...f, caseNo: val };
    });
  };

  const save = async () => {
    if (!form.caseNo) return confirm("Case No / Serial No is required.", null);
    if (!editing) {
      const dup = cases.find(c => c.caseNo === form.caseNo);
      if (dup) return confirm(`Case No "${form.caseNo}" is already used in Cases (${dup.titleOfCase||dup.name||"untitled"}). Each Case/Serial No should be used once. Edit that case instead, or choose a different number.`, null);
      const wpOwner = workPlanEntries.find(e => e.caseNo === form.caseNo);
      if (wpOwner && wpOwner.verification !== "Accepted") {
        confirm(`Note: "${form.caseNo}" exists in Work Plan but hasn't been marked Accepted yet (current: ${wpOwner.verification}). Saving here is fine, but consider accepting it in Work Plan too so both stay in sync.`, null);
      }
    }
    await crud.cases.save(form);
    setForm(BLANK); setEditing(null);
  };
  const del  = (id) => confirm("Delete this case?", ()=>crud.cases.remove(id));
  const edit = (c)  => { setForm({...BLANK,...c, facts:c.facts||["","","","","","","",""]}); setEditing(c.id); setView(null); };

  const filtered = cases.filter(c=>{
    const s=search.toLowerCase();
    return !s||c.caseNo?.toLowerCase().includes(s)||c.name?.toLowerCase().includes(s)||c.titleOfCase?.toLowerCase().includes(s)||c.focalPersonName?.toLowerCase().includes(s);
  });

  const printCase = (c) => showPreview(initialFormHTML(c));

  if (view) return <CaseDetail c={view} onBack={()=>setView(null)} onEdit={()=>edit(view)} onPrint={printCase} />;

  const ImgUpload = ({ field, label, value }) => (
    <div style={{ marginBottom:8 }}>
      <label style={lbl}>{label}</label>
      {value
        ? <div style={{ position:"relative" }}>
            <img src={value} alt={label} style={{ width:"100%", maxHeight:90, objectFit:"cover", borderRadius:6, border:"1px solid #ddd" }} />
            <button onClick={()=>setForm(f=>({...f,[field]:""}))} style={{ position:"absolute",top:2,right:2,background:"#D32F2F",color:"white",border:"none",borderRadius:4,cursor:"pointer",fontSize:10,padding:"1px 5px" }}>✕</button>
          </div>
        : <label style={{ display:"block",border:"2px dashed #ccc",borderRadius:8,padding:"8px",textAlign:"center",cursor:"pointer",fontSize:11,color:"#888",background:"#fafafa" }}>
            📷 {label}
            <input type="file" accept="image/*" capture="environment" style={{ display:"none" }} onChange={e=>handleImg(field,e.target.files[0])} />
          </label>
      }
    </div>
  );

  return (
    <div>
      <PageHeader title="Cases" sub="Ray of Hope Initial Form" />
      <div style={{ display:"grid", gridTemplateColumns:"360px 1fr", gap:20 }}>

        {/* ── Form (matches your paper form) ── */}
        <div style={{ background:"white", borderRadius:12, padding:20, boxShadow:"0 2px 8px rgba(0,0,0,0.08)", maxHeight:"90vh", overflowY:"auto" }}>
          <h3 style={{ margin:"0 0 12px", color:"#1565C0", fontSize:14, borderBottom:"2px solid #1565C0", paddingBottom:8 }}>
            {editing?"Edit Case":"New Case — Initial Form"}
          </h3>

          {/* Case No (same as Serial No) */}
          <label style={lbl}>Case No / Serial No</label>
          <input style={inp} value={form.caseNo} onChange={e=>handleCaseNoChange(e.target.value)} placeholder="e.g. 25/109 or UM01" />
          {form.caseNo && !editing && (() => {
            const matchSerial = serials.find(s => s.code === form.caseNo);
            const matchWP = workPlanEntries.find(e => e.caseNo === form.caseNo);
            const matchCase = cases.find(c => c.caseNo === form.caseNo);
            if (matchCase) return <div style={{ fontSize:11, color:"#c62828", marginTop:-4, marginBottom:8 }}>⚠ Already used in Cases — choose another number or edit that case</div>;
            if (matchSerial) return <div style={{ fontSize:11, color:"#2e7d32", marginTop:-4, marginBottom:8 }}>✓ Matches Serial "{matchSerial.title}" — title auto-filled</div>;
            if (matchWP) return <div style={{ fontSize:11, color:"#1565C0", marginTop:-4, marginBottom:8 }}>📅 Also exists in Work Plan ({matchWP.verification})</div>;
            return null;
          })()}

          {/* Checkboxes */}
          <div style={{ display:"flex", gap:14, marginBottom:10, flexWrap:"wrap" }}>
            {[["cnicCopy","CNIC Copy"],["purchasing","Purchasing"],["videosPics","Videos/Pics"],["posted","Posted"]].map(([k,l])=>(
              <label key={k} style={{ display:"flex", alignItems:"center", gap:5, fontSize:12, cursor:"pointer" }}>
                <input type="checkbox" checked={form[k]} onChange={e=>setForm({...form,[k]:e.target.checked})} />
                {l}
              </label>
            ))}
          </div>

          <label style={lbl}>Title of the Case</label>
          <input style={inp} value={form.titleOfCase} onChange={e=>setForm({...form,titleOfCase:e.target.value})} placeholder="Main title" />

          <label style={lbl}>What Has Been Done?</label>
          <textarea style={{ ...inp, height:55, resize:"vertical" }} value={form.whatDone} onChange={e=>setForm({...form,whatDone:e.target.value})} />

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            <div><label style={lbl}>Category</label><input style={inp} value={form.category} onChange={e=>setForm({...form,category:e.target.value})} /></div>
            <div><label style={lbl}>Name</label><input style={inp} value={form.name} onChange={e=>setForm({...form,name:e.target.value})} /></div>
            <div><label style={lbl}>Date of Completion</label><input type="date" style={inp} value={form.dateOfCompletion} onChange={e=>setForm({...form,dateOfCompletion:e.target.value})} /></div>
            <div><label style={lbl}>Mobile No</label><input style={inp} value={form.mobile} onChange={e=>setForm({...form,mobile:e.target.value})} placeholder="03xx-xxxxxxx" /></div>
            <div><label style={lbl}>Loan</label><input style={inp} value={form.loan} onChange={e=>setForm({...form,loan:e.target.value})} /></div>
            <div><label style={lbl}>Sponsored Amount</label><input style={inp} value={form.sponsoredAmount} onChange={e=>setForm({...form,sponsoredAmount:e.target.value})} /></div>
          </div>

          <div style={{ borderTop:"1px solid #eee", marginTop:4, paddingTop:8 }}>
            <div style={{ fontSize:11, fontWeight:"bold", color:"#555", marginBottom:6 }}>Focal Person</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
              <div><label style={lbl}>Name</label><input style={inp} value={form.focalPersonName} onChange={e=>setForm({...form,focalPersonName:e.target.value})} /></div>
              <div><label style={lbl}>Mobile</label><input style={inp} value={form.focalPersonMobile} onChange={e=>setForm({...form,focalPersonMobile:e.target.value})} /></div>
            </div>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginTop:4 }}>
            <div><label style={lbl}>Verified By</label><input style={inp} value={form.verifiedBy} onChange={e=>setForm({...form,verifiedBy:e.target.value})} /></div>
            <div><label style={lbl}>Sponsored By</label><input style={inp} value={form.sponsoredBy} onChange={e=>setForm({...form,sponsoredBy:e.target.value})} /></div>
          </div>

          {/* Important Facts */}
          <div style={{ borderTop:"1px solid #eee", marginTop:8, paddingTop:8 }}>
            <div style={{ fontSize:11, fontWeight:"bold", color:"#555", marginBottom:6 }}>Important Facts</div>
            {form.facts.map((f,i)=>(
              <div key={i} style={{ display:"flex", alignItems:"center", gap:6, marginBottom:5 }}>
                <span style={{ fontSize:11, color:"#888", minWidth:14 }}>{i+1}.</span>
                <input style={{ ...inp, margin:0, flex:1 }} value={f} onChange={e=>setFact(i,e.target.value)} placeholder={`Fact ${i+1}`} />
              </div>
            ))}
          </div>

          <div style={{ marginTop:8 }}>
            <label style={lbl}>Total Amount Used (Rs.)</label>
            <input type="number" style={inp} value={form.totalAmount} onChange={e=>setForm({...form,totalAmount:e.target.value})} />
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            <div><label style={lbl}>Status</label>
              <select style={inp} value={form.status} onChange={e=>setForm({...form,status:e.target.value})}>
                {["Active","In Progress","Closed","On Hold"].map(s=><option key={s}>{s}</option>)}
              </select>
            </div>
            <div><label style={lbl}>Assigned To</label><input style={inp} value={form.assignedTo} onChange={e=>setForm({...form,assignedTo:e.target.value})} /></div>
          </div>

          {/* Photos */}
          <div style={{ borderTop:"1px solid #eee", marginTop:8, paddingTop:8 }}>
            <div style={{ fontSize:11, fontWeight:"bold", color:"#1565C0", marginBottom:6 }}>📸 Photos</div>
            <ImgUpload field="photo"     label="Person Photo"  value={form.photo} />
            <ImgUpload field="cnicFront" label="CNIC Front"    value={form.cnicFront} />
            <ImgUpload field="cnicBack"  label="CNIC Back"     value={form.cnicBack} />
          </div>

          <div style={{ display:"flex", gap:8, marginTop:10 }}>
            <button onClick={save} style={btnPrimary}>{editing?"Update":"Save Case"}</button>
            {editing && <button onClick={()=>{setForm(BLANK);setEditing(null);}} style={btnSec}>Cancel</button>}
          </div>
        </div>

        {/* ── Table ── */}
        <div style={{ background:"white", borderRadius:12, padding:20, boxShadow:"0 2px 8px rgba(0,0,0,0.08)" }}>
          <div style={{ display:"flex", gap:8, marginBottom:12, flexWrap:"wrap" }}>
            <input style={{ ...inp, flex:1, margin:0 }} placeholder="Search case no, name, title..." value={search} onChange={e=>setSearch(e.target.value)} />
            <button onClick={()=>showPreview(tableHTML("Cases Report",["Case No","Title","Focal Person","Category","Status","Total Amount"],filtered.map(c=>[c.caseNo,c.titleOfCase,c.focalPersonName,c.category,c.status,c.totalAmount?fmt(c.totalAmount):"—"])))} style={{ ...btnSec, margin:0 }}>🖨 Print List</button>
            <button onClick={()=>downloadCSV([["Case No","Title","What Done","Category","Name","Mobile","Focal Person","Status","Total Amount"],...filtered.map(c=>[c.caseNo,c.titleOfCase,c.whatDone,c.category,c.name,c.mobile,c.focalPersonName,c.status,c.totalAmount])],"cases.csv")} style={{ ...btnSec, margin:0 }}>📊 CSV</button>
          </div>
          <table style={{ width:"100%", fontSize:12, borderCollapse:"collapse" }}>
            <thead><tr style={{ background:"#fff3e0" }}>
              {["Photo","Case No","Title of Case","Focal Person","Category","Status","Actions"].map(h=><th key={h} style={th}>{h}</th>)}
            </tr></thead>
            <tbody>{filtered.slice().reverse().map(c=>(
              <tr key={c.id} style={{ borderBottom:"1px solid #eee" }}>
                <td style={td}>
                  {c.photo
                    ? <img src={c.photo} alt="photo" style={{ width:32,height:32,borderRadius:"50%",objectFit:"cover",border:"2px solid #1565C0" }} />
                    : <div style={{ width:32,height:32,borderRadius:"50%",background:"#e3f2fd",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14 }}>👤</div>}
                </td>
                <td style={{ ...td, fontWeight:"bold", color:"#D32F2F" }}>{c.caseNo||"—"} {c.workPlanLinked && <span title="Auto-synced from Work Plan" style={{ fontSize:11 }}>📅</span>}</td>
                <td style={td}><button onClick={()=>setView(c)} style={{ background:"none",border:"none",cursor:"pointer",color:"#1565C0",fontFamily:"Georgia,serif",fontSize:12,textDecoration:"underline",padding:0 }}>{c.titleOfCase||"—"}</button></td>
                <td style={td}>{c.focalPersonName||"—"}</td>
                <td style={td}><span style={{ ...badge, background:"#fff3e0", color:"#e65100" }}>{c.category||"—"}</span></td>
                <td style={td}><span style={{ ...badge, background:c.status==="Closed"?"#eee":"#e8f5e9", color:c.status==="Closed"?"#666":"#2e7d32" }}>{c.status}</span></td>
                <td style={td}>
                  <button onClick={()=>edit(c)} style={btnSm}>Edit</button>
                  <button onClick={()=>printCase(c)} style={{ ...btnSm,background:"#e3f2fd",color:"#1565C0" }}>🖨</button>
                  <button onClick={()=>del(c.id)} style={{ ...btnSm,background:"#ffebee",color:"#c62828" }}>Del</button>
                </td>
              </tr>
            ))}{!filtered.length&&<tr><td colSpan={7} style={{ textAlign:"center",padding:20,color:"#aaa" }}>No cases found</td></tr>}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Case Detail view ──────────────────────────────────────────────────────────
function CaseDetail({ c, onBack, onEdit, onPrint }) {
  return (
    <div>
      <div style={{ display:"flex", gap:10, marginBottom:20, alignItems:"center" }}>
        <button onClick={onBack} style={btnSec}>← Back</button>
        <button onClick={onEdit} style={btnPrimary}>Edit</button>
        <button onClick={()=>onPrint(c)} style={btnSec}>🖨 Print Initial Form</button>
        <h2 style={{ margin:0, color:"#1565C0", flex:1, fontSize:18 }}>Case Detail</h2>
      </div>
      <div style={{ background:"white", borderRadius:12, padding:28, boxShadow:"0 2px 8px rgba(0,0,0,0.08)", maxWidth:780 }}>
        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", borderBottom:"2px solid #1565C0", paddingBottom:14, marginBottom:18 }}>
          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
            <Logo size={48} />
            <div>
              <div style={{ fontWeight:"bold", fontSize:17, color:"#1565C0" }}>Ray of Hope</div>
              <div style={{ fontSize:12, color:"#666" }}>Initial Form</div>
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            {c.photo && <img src={c.photo} alt="photo" style={{ width:58,height:58,borderRadius:"50%",objectFit:"cover",border:"3px solid #1565C0" }} />}
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:22, fontWeight:"bold", color:"#D32F2F" }}>{c.caseNo||"—"}</div>
              <div style={{ display:"flex", gap:6, marginTop:4, flexWrap:"wrap", justifyContent:"flex-end" }}>
                {[["cnicCopy","CNIC"],["purchasing","Purchasing"],["videosPics","Videos/Pics"],["posted","Posted"]].map(([k,l])=>(
                  <span key={k} style={{ ...badge, background:c[k]?"#e8f5e9":"#eee", color:c[k]?"#2e7d32":"#aaa", fontSize:10 }}>{c[k]?"✓":""} {l}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Main fields grid */}
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13, marginBottom:14 }}>
          <tbody>
            {[
              ["Title of the Case", c.titleOfCase, "What Has Been Done?", c.whatDone],
              ["Category", c.category, "Name", c.name],
              ["Date of Completion", c.dateOfCompletion, "Mobile No", c.mobile],
              ["Loan", c.loan||"N/A", "Sponsored Amount", c.sponsoredAmount||"N/A"],
            ].map((row,i)=>(
              <tr key={i} style={{ borderBottom:"1px solid #eee" }}>
                <td style={{ padding:"7px 10px", color:"#888", fontSize:11, width:"18%", background:"#fafafa" }}>{row[0]}</td>
                <td style={{ padding:"7px 10px", fontWeight:"bold", width:"32%" }}>{row[1]||"—"}</td>
                <td style={{ padding:"7px 10px", color:"#888", fontSize:11, width:"18%", background:"#fafafa" }}>{row[2]}</td>
                <td style={{ padding:"7px 10px", fontWeight:"bold", width:"32%" }}>{row[3]||"—"}</td>
              </tr>
            ))}
            <tr style={{ borderBottom:"1px solid #eee" }}>
              <td style={{ padding:"7px 10px", color:"#888", fontSize:11, background:"#fafafa" }}>Focal Person</td>
              <td style={{ padding:"7px 10px", fontWeight:"bold" }}>{c.focalPersonName||"—"}</td>
              <td style={{ padding:"7px 10px", color:"#888", fontSize:11, background:"#fafafa" }}>Mobile</td>
              <td style={{ padding:"7px 10px", fontWeight:"bold" }}>{c.focalPersonMobile||"—"}</td>
            </tr>
            <tr style={{ borderBottom:"1px solid #eee" }}>
              <td style={{ padding:"7px 10px", color:"#888", fontSize:11, background:"#fafafa" }}>Verified By</td>
              <td style={{ padding:"7px 10px", fontWeight:"bold" }}>{c.verifiedBy||"—"}</td>
              <td style={{ padding:"7px 10px", color:"#888", fontSize:11, background:"#fafafa" }}>Sponsored By</td>
              <td style={{ padding:"7px 10px", fontWeight:"bold" }}>{c.sponsoredBy||"—"}</td>
            </tr>
          </tbody>
        </table>

        {/* Important Facts */}
        {c.facts?.some(f=>f) && (
          <div style={{ marginBottom:14 }}>
            <div style={{ fontWeight:"bold", fontSize:13, marginBottom:8, color:"#333" }}>Important Facts:</div>
            <table style={{ width:"100%", borderCollapse:"collapse", border:"1px solid #ddd" }}>
              <tbody>{(c.facts||[]).map((f,i)=>(
                <tr key={i} style={{ borderBottom:"1px solid #eee" }}>
                  <td style={{ padding:"6px 10px", color:"#888", fontSize:11, width:28, textAlign:"right", background:"#fafafa", borderRight:"1px solid #eee" }}>{i+1}</td>
                  <td style={{ padding:"6px 10px", fontSize:13 }}>{f||""}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}

        {/* Totals + signatures */}
        <div style={{ marginBottom:20 }}>
          <div style={{ background:"#f9f9f9", borderRadius:8, padding:12 }}>
            <div style={{ fontSize:11, color:"#888" }}>Total Amount Used</div>
            <div style={{ fontWeight:"bold", fontSize:18, color:"#c62828", marginTop:4 }}>{c.totalAmount ? fmt(c.totalAmount) : "—"}</div>
          </div>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
          <div style={{ borderTop:"2px solid #333", paddingTop:6, fontSize:12, color:"#555" }}>Assistant Director<br/>Ray of Hope Foundation</div>
          <div style={{ borderTop:"2px solid #333", paddingTop:6, fontSize:12, color:"#555", textAlign:"right" }}>Deputy Director<br/>Ray of Hope Foundation</div>
        </div>

        {/* CNIC photos */}
        {(c.cnicFront||c.cnicBack) && (
          <div style={{ borderTop:"1px solid #eee", marginTop:16, paddingTop:14 }}>
            <div style={{ fontSize:12, fontWeight:"bold", color:"#555", marginBottom:10 }}>🪪 CNIC / ID Card</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              {c.cnicFront && <div><div style={{ fontSize:11, color:"#888", marginBottom:4 }}>Front</div><img src={c.cnicFront} style={{ width:"100%", borderRadius:8, border:"1px solid #ddd" }} /></div>}
              {c.cnicBack  && <div><div style={{ fontSize:11, color:"#888", marginBottom:4 }}>Back</div><img src={c.cnicBack}  style={{ width:"100%", borderRadius:8, border:"1px solid #ddd" }} /></div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Initial Form Print HTML (matches your paper form exactly) ────────────────
function initialFormHTML(c) {
  const facts = (c.facts||[]);
  const chk = (v) => v ? "☑" : "☐";
  const imgTag = (src,label) => src?`<div style="margin:8px 0"><div style="font-size:10px;color:#888;margin-bottom:3px">${label}</div><img src="${src}" style="max-width:100%;border:1px solid #ccc;border-radius:4px"/></div>`:"";
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Initial Form — ${c.caseNo||c.titleOfCase}</title><style>
*{box-sizing:border-box}
body{font-family:Arial,sans-serif;margin:18px;color:#111;font-size:12px}
.outer{border:2px solid #111;padding:0}
.header{display:flex;align-items:center;gap:14px;padding:10px 14px;border-bottom:2px solid #111}
.logo-circle{width:52px;height:52px;border:3px solid #1565C0;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:20px;color:#D32F2F;font-weight:bold;flex-shrink:0}
.title{font-size:20px;font-weight:bold;color:#111}
table{width:100%;border-collapse:collapse}
td,th{border:1px solid #bbb;padding:5px 8px;font-size:11px;vertical-align:top}
.label{background:#f5f5f5;font-weight:bold;width:22%}
.facts td{padding:4px 8px}
.sig{border-top:2px solid #111;padding-top:5px;font-size:11px;font-weight:bold;margin-top:4px}
.chk{font-size:13px}
.section-title{font-weight:bold;font-size:11px;padding:4px 8px;background:#eee;border-bottom:1px solid #bbb}
@media print{body{margin:8px}}
</style></head><body>
<div class="outer">
  <div class="header">
    <div class="logo-circle">امید</div>
    <div>
      <div style="font-size:10px;color:#666">RAY OF HOPE</div>
      <div class="title">Ray Of Hope Initial Form</div>
    </div>
    ${c.photo?`<img src="${c.photo}" style="width:60px;height:60px;border-radius:50%;object-fit:cover;border:2px solid #1565C0;margin-left:auto"/>`:""}
  </div>

  <table>
    <tr>
      <td class="label">Case No</td>
      <td style="font-weight:bold;color:#c00;font-size:14px">${c.caseNo||"—"}</td>
      <td colspan="2" style="font-size:12px">
        <span class="chk">${chk(c.cnicCopy)}</span> CNIC Copy &nbsp;&nbsp;
        <span class="chk">${chk(c.purchasing)}</span> Purchasing &nbsp;&nbsp;
        <span class="chk">${chk(c.videosPics)}</span> Videos/Pics &nbsp;&nbsp;
        <span class="chk">${chk(c.posted)}</span> Posted
      </td>
    </tr>
    <tr><td class="label">Title Of The Case</td><td colspan="3">${c.titleOfCase||"—"}</td></tr>
    <tr><td class="label">What Has Been Done?</td><td colspan="3">${c.whatDone||"—"}</td></tr>
    <tr>
      <td class="label">Category</td><td>${c.category||"—"}</td>
      <td class="label">Name</td><td>${c.name||"—"}</td>
    </tr>
    <tr>
      <td class="label">Date Of Completion</td><td>${c.dateOfCompletion||"—"}</td>
      <td class="label">Mobile No</td><td>${c.mobile||"—"}</td>
    </tr>
    <tr>
      <td class="label">Loan</td><td>${c.loan||"N/A"}</td>
      <td class="label">Sponsored Amount</td><td>${c.sponsoredAmount||"N/A"}</td>
    </tr>
    <tr>
      <td class="label">Focal Person</td>
      <td>${c.focalPersonName||"—"}</td>
      <td class="label">Mobile</td>
      <td>${c.focalPersonMobile||"—"}</td>
    </tr>
    <tr>
      <td class="label">Verified By</td><td>${c.verifiedBy||"—"}</td>
      <td class="label">Sponsored By</td><td>${c.sponsoredBy||"—"}</td>
    </tr>
  </table>

  <div class="section-title">Important facts are:</div>
  <table class="facts">
    ${facts.map((f,i)=>`<tr><td style="width:24px;text-align:right;color:#888;border:none;border-bottom:1px solid #eee">${i+1}</td><td style="border:none;border-bottom:1px solid #eee;min-height:20px">${f||""}</td></tr>`).join("")}
  </table>

  <table style="margin-top:0;border-top:none">
    <tr>
      <td class="label">Total Amount Used</td>
      <td colspan="3" style="font-weight:bold;color:#c00;font-size:14px">${c.totalAmount?Number(c.totalAmount).toLocaleString()+" Rs.":""}</td>
    </tr>
  </table>

  ${(c.cnicFront||c.cnicBack)?`
  <div class="section-title">CNIC / ID Card</div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:10px">
    ${imgTag(c.cnicFront,"Front")}${imgTag(c.cnicBack,"Back")}
  </div>`:""}

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:30px;padding:20px 16px 12px">
    <div><div style="height:30px"></div><div class="sig">Assistant Director<br/>Ray Of Hope Foundation</div></div>
    <div><div style="height:30px"></div><div class="sig" style="text-align:right">Deputy Director<br/>Ray Of Hope Foundation</div></div>
  </div>
</div>
<div style="margin-top:10px;font-size:9px;color:#aaa;text-align:center">Ray of Hope NGO Management — Printed: ${new Date().toLocaleDateString("en-PK")}</div>
</body></html>`;
}

// ── Loans Page ────────────────────────────────────────────────────────────────
function LoansPage({ loans, crud, serials }) {
  const [form, setForm] = useState({ id: "", date: today(), serialNo: "", borrowerName: "", cnic: "", phone: "", amount: "", months: 12, purpose: "", status: "Active", installments: [] });
  const showPreview = usePrint();
  const confirm = useConfirm();
  const [editing, setEditing] = useState(null);
  const [view, setView] = useState(null);
  const [tab, setTab] = useState("list"); // list | monthly

  const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  const genInstallments = (amount, months, startDate) => {
    const monthly = (Number(amount) / Number(months)).toFixed(2);
    return Array.from({ length: Number(months) }, (_, i) => {
      const d = new Date(startDate);
      d.setMonth(d.getMonth() + i + 1);
      return { id: uid(), dueDate: d.toISOString().split("T")[0], amount: monthly, paid: false, paidDate: "", paidAmount: "" };
    });
  };

  const save = async () => {
    if (!form.borrowerName || !form.amount) return confirm("Borrower name and amount are required.", null);
    const installments = form.installments.length ? form.installments : genInstallments(form.amount, form.months, form.date);
    const record = { ...form, installments };
    await crud.loans.save(record);
    setForm({ id: "", date: today(), serialNo: "", borrowerName: "", cnic: "", phone: "", amount: "", months: 12, purpose: "", status: "Active", installments: [] });
    setEditing(null);
  };
  const del = (id) => { confirm("Delete this loan?", () => crud.loans.remove(id)); };
  const edit = (l) => { setForm({ ...l }); setEditing(l.id); setView(null); };

  const updateInstallment = (loanId, instId, changes) => {
    const loan = loans.find(l => l.id === loanId);
    if (!loan) return;
    const updated = { ...loan, installments: loan.installments.map(i => i.id === instId ? { ...i, ...changes } : i) };
    crud.loans.update(updated);
    if (view?.id === loanId) setView(v => ({ ...v, installments: v.installments.map(i => i.id === instId ? { ...i, ...changes } : i) }));
  };

  const toggleInstallment = (loanId, instId, currentInst) => {
    const nowPaid = !currentInst.paid;
    updateInstallment(loanId, instId, {
      paid: nowPaid,
      paidDate: nowPaid ? today() : "",
      paidAmount: nowPaid ? currentInst.amount : ""
    });
  };

  // ── Monthly Overview tab ──
  if (tab === "monthly") {
    // Collect all months that appear in any loan's installments
    const allMonths = new Set();
    loans.forEach(l => l.installments.forEach(i => {
      if (i.dueDate) allMonths.add(i.dueDate.slice(0, 7));
    }));
    const sortedMonths = Array.from(allMonths).sort().reverse();

    const todayStr = today();

    return (
      <div>
        <PageHeader title="Loans — Monthly Tracker" sub="See all installment activity month by month" />
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          <button onClick={() => setTab("list")} style={btnSec}>← Back to Loans List</button>
          <button onClick={() => {
            const rows = [["Month","Borrower","Serial","Due Amount","Received","Remaining","Status","Due Date","Paid Date"]];
            sortedMonths.forEach(ym => {
              loans.forEach(l => {
                const inst = l.installments.find(i => i.dueDate?.slice(0,7) === ym);
                if (!inst) return;
                const rec = Number(inst.paidAmount || (inst.paid ? inst.amount : 0));
                const rem = Number(inst.amount) - rec;
                rows.push([ym, l.borrowerName, l.serialNo, inst.amount, rec, rem, inst.paid?"Paid":"Pending", inst.dueDate, inst.paidDate||"—"]);
              });
            });
            downloadCSV(rows, "loan_monthly_tracker.csv");
          }} style={{ ...btnSec, marginLeft: "auto" }}>📊 Export CSV</button>
          <button onClick={() => {
            const rows = [];
            sortedMonths.forEach(ym => {
              loans.forEach(l => {
                const inst = l.installments.find(i => i.dueDate?.slice(0,7) === ym);
                if (!inst) return;
                const rec = Number(inst.paidAmount || (inst.paid ? inst.amount : 0));
                rows.push([ym, l.borrowerName, l.serialNo||"—", fmt(inst.amount), fmt(rec), fmt(Number(inst.amount)-rec), inst.paid?"✅ Paid":"⏳ Pending"]);
              });
            });
            showPreview(tableHTML("Monthly Loan Tracker", ["Month","Borrower","Serial","Due","Received","Remaining","Status"], rows));
          }} style={btnSec}>🖨 Print</button>
        </div>

        {sortedMonths.length === 0 && (
          <div style={{ background: "white", borderRadius: 12, padding: 40, textAlign: "center", color: "#aaa" }}>No installment data yet. Create loans first.</div>
        )}

        {sortedMonths.map(ym => {
          const [yr, mo] = ym.split("-");
          const monthInsts = [];
          loans.forEach(l => {
            const inst = l.installments.find(i => i.dueDate?.slice(0,7) === ym);
            if (inst) monthInsts.push({ loan: l, inst });
          });
          const totalDue = monthInsts.reduce((a, { inst }) => a + Number(inst.amount), 0);
          const totalRec = monthInsts.reduce((a, { inst }) => a + Number(inst.paidAmount || (inst.paid ? inst.amount : 0)), 0);
          const totalRem = totalDue - totalRec;
          const allPaid = monthInsts.every(({ inst }) => inst.paid);
          const now = new Date(); const mDate = new Date(yr, Number(mo)-1);
          const isPast = mDate < new Date(now.getFullYear(), now.getMonth());
          const isCurrent = mDate.getFullYear() === now.getFullYear() && mDate.getMonth() === now.getMonth();

          return (
            <div key={ym} style={{ background: "white", borderRadius: 12, marginBottom: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.08)", overflow: "hidden" }}>
              {/* Month header */}
              <div style={{ background: allPaid ? "#e8f5e9" : isPast ? "#fff3e0" : isCurrent ? "#e3f2fd" : "#f5f5f5", padding: "14px 20px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: "bold", fontSize: 16, color: allPaid ? "#2e7d32" : isPast ? "#e65100" : "#1565C0" }}>
                    {MONTH_NAMES[Number(mo)-1]} {yr}
                  </span>
                  {isCurrent && <span style={{ ...badge, background: "#1565C0", color: "white", marginLeft: 8 }}>Current Month</span>}
                  {isPast && !allPaid && <span style={{ ...badge, background: "#ff6f00", color: "white", marginLeft: 8 }}>⚠ Has Overdue</span>}
                  {allPaid && <span style={{ ...badge, background: "#2e7d32", color: "white", marginLeft: 8 }}>✓ All Paid</span>}
                </div>
                <div style={{ display: "flex", gap: 20, fontSize: 13, flexWrap: "wrap" }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontWeight: "bold", color: "#1565C0" }}>{fmt(totalDue)}</div>
                    <div style={{ fontSize: 10, color: "#666" }}>Total Due</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontWeight: "bold", color: "#2e7d32" }}>{fmt(totalRec)}</div>
                    <div style={{ fontSize: 10, color: "#666" }}>Received</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontWeight: "bold", color: totalRem > 0 ? "#c62828" : "#2e7d32" }}>{fmt(totalRem)}</div>
                    <div style={{ fontSize: 10, color: "#666" }}>Remaining</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontWeight: "bold", color: "#555" }}>{monthInsts.filter(({inst}) => inst.paid).length}/{monthInsts.length}</div>
                    <div style={{ fontSize: 10, color: "#666" }}>Paid/Total</div>
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div style={{ height: 6, background: "#eee" }}>
                <div style={{ height: "100%", background: allPaid ? "#2e7d32" : "#1565C0", width: `${totalDue > 0 ? Math.round((totalRec/totalDue)*100) : 0}%`, transition: "width 0.3s" }} />
              </div>

              {/* Installments table */}
              <div style={{ padding: "0 0 4px" }}>
                <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
                  <thead><tr style={{ background: "#fafafa", borderBottom: "1px solid #eee" }}>
                    {["Borrower","Serial","Due Date","Installment Due","Amount Received","Remaining","Status","Paid Date","Action"].map(h => <th key={h} style={{ ...th, fontSize: 11 }}>{h}</th>)}
                  </tr></thead>
                  <tbody>{monthInsts.map(({ loan, inst }) => {
                    const rec = Number(inst.paidAmount || (inst.paid ? inst.amount : 0));
                    const rem = Number(inst.amount) - rec;
                    const isOverdue = !inst.paid && isPast;
                    return (
                      <tr key={inst.id} style={{ borderBottom: "1px solid #f0f0f0", background: inst.paid ? "#f9fff9" : isOverdue ? "#fff8f0" : "white" }}>
                        <td style={{ ...td, fontWeight: "bold" }}>
                          <button onClick={() => { setView(loan); setTab("list"); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#1565C0", fontFamily: "Georgia,serif", fontSize: 12, textDecoration: "underline", padding: 0 }}>{loan.borrowerName}</button>
                        </td>
                        <td style={{ ...td, color: "#1565C0", fontWeight: "bold", fontSize: 11 }}>{loan.serialNo || "—"}</td>
                        <td style={td}>{inst.dueDate}</td>
                        <td style={{ ...td, fontWeight: "bold" }}>{fmt(inst.amount)}</td>
                        <td style={td}>
                          <input
                            type="number"
                            value={inst.paidAmount !== undefined && inst.paidAmount !== "" ? inst.paidAmount : (inst.paid ? inst.amount : "")}
                            placeholder="Enter amount"
                            onChange={e => {
                              const val = e.target.value;
                              const isPaid = Number(val) >= Number(inst.amount);
                              updateInstallment(loan.id, inst.id, {
                                paidAmount: val,
                                paid: isPaid,
                                paidDate: isPaid && !inst.paidDate ? today() : inst.paidDate
                              });
                            }}
                            style={{ width: 100, padding: "4px 6px", border: "1px solid #ddd", borderRadius: 5, fontFamily: "Georgia,serif", fontSize: 12 }}
                          />
                        </td>
                        <td style={{ ...td, fontWeight: "bold", color: rem > 0 ? "#c62828" : "#2e7d32" }}>{fmt(rem)}</td>
                        <td style={td}>
                          <span style={{ ...badge, background: inst.paid ? "#c8e6c9" : isOverdue ? "#ffe0b2" : "#fff9c4", color: inst.paid ? "#2e7d32" : isOverdue ? "#e65100" : "#f57f17", fontSize: 10 }}>
                            {inst.paid ? "✅ Paid" : isOverdue ? "⚠ Overdue" : "⏳ Pending"}
                          </span>
                        </td>
                        <td style={td}>
                          {inst.paid ? (
                            <input type="date" value={inst.paidDate || ""} onChange={e => updateInstallment(loan.id, inst.id, { paidDate: e.target.value })}
                              style={{ padding: "3px 5px", border: "1px solid #ddd", borderRadius: 5, fontSize: 11, fontFamily: "Georgia,serif" }} />
                          ) : "—"}
                        </td>
                        <td style={td}>
                          <button onClick={() => toggleInstallment(loan.id, inst.id, inst)}
                            style={{ ...btnSm, background: inst.paid ? "#ffebee" : "#e8f5e9", color: inst.paid ? "#c62828" : "#2e7d32", fontSize: 10 }}>
                            {inst.paid ? "↩ Undo" : "✓ Mark Paid"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}</tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // ── Detail view for single loan ──
  if (view) {
    const totalPaid = view.installments.reduce((a, i) => a + Number(i.paidAmount || (i.paid ? i.amount : 0)), 0);
    const remaining = Number(view.amount) - totalPaid;
    const overdueCount = view.installments.filter(i => !i.paid && i.dueDate < today()).length;
    const nextDue = view.installments.find(i => !i.paid);

    return (
      <div>
        <div style={{ display: "flex", gap: 10, marginBottom: 20, alignItems: "center", flexWrap: "wrap" }}>
          <button onClick={() => setView(null)} style={btnSec}>← Back</button>
          <button onClick={() => edit(view)} style={btnPrimary}>Edit Loan</button>
          <button onClick={() => setTab("monthly")} style={btnSec}>📅 Monthly View</button>
          <button onClick={() => showPreview(tableHTML(`Loan Statement — ${view.borrowerName}`,
            ["#","Due Date","Installment","Received","Remaining","Status","Paid Date"],
            view.installments.map((i,idx) => {
              const rec = Number(i.paidAmount||(i.paid?i.amount:0));
              return [idx+1, i.dueDate, fmt(i.amount), fmt(rec), fmt(Number(i.amount)-rec), i.paid?"Paid":"Pending", i.paidDate||"—"];
            })))} style={btnSec}>🖨 Print Statement</button>
          <button onClick={() => {
            const rows = [["#","Due Date","Installment","Received","Remaining","Status","Paid Date"],
              ...view.installments.map((i,idx) => {
                const rec = Number(i.paidAmount||(i.paid?i.amount:0));
                return [idx+1,i.dueDate,i.amount,rec,Number(i.amount)-rec,i.paid?"Paid":"Pending",i.paidDate||""];
              })];
            downloadCSV(rows, `loan_${view.borrowerName}.csv`);
          }} style={btnSec}>📊 CSV</button>
        </div>

        <div style={{ background: "white", borderRadius: 12, padding: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, borderBottom: "2px solid #1565C0", paddingBottom: 14, marginBottom: 20 }}>
            <Logo size={44} />
            <div>
              <div style={{ fontWeight: "bold", fontSize: 18, color: "#1565C0" }}>{view.borrowerName}</div>
              <div style={{ fontSize: 12, color: "#666" }}>Loan Account — Serial: {view.serialNo || "N/A"} — CNIC: {view.cnic || "N/A"} — 📞 {view.phone || "N/A"}</div>
              {view.purpose && <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>Purpose: {view.purpose}</div>}
            </div>
            <div style={{ marginLeft: "auto", textAlign: "right" }}>
              <div style={{ fontSize: 22, fontWeight: "bold", color: "#1565C0" }}>{fmt(view.amount)}</div>
              <div style={{ fontSize: 11, color: "#666" }}>Total Loan</div>
            </div>
          </div>

          {/* Summary cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 10, marginBottom: 20 }}>
            {[
              ["Total Loan", fmt(view.amount), "#1565C0"],
              ["Total Received", fmt(totalPaid), "#2e7d32"],
              ["Remaining", fmt(remaining), remaining > 0 ? "#c62828" : "#2e7d32"],
              ["Overdue", overdueCount + " inst.", overdueCount > 0 ? "#e65100" : "#aaa"],
              ["Next Due", nextDue ? nextDue.dueDate : "All Done", nextDue ? "#6a1b9a" : "#2e7d32"],
            ].map(([l,v,c]) => (
              <div key={l} style={{ textAlign: "center", background: "#f9f9f9", borderRadius: 8, padding: "10px 6px", borderTop: `3px solid ${c}` }}>
                <div style={{ fontWeight: "bold", color: c, fontSize: 13 }}>{v}</div>
                <div style={{ fontSize: 10, color: "#666", marginTop: 2 }}>{l}</div>
              </div>
            ))}
          </div>

          {/* Recovery progress bar */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
              <span style={{ color: "#2e7d32", fontWeight: "bold" }}>Recovery Progress</span>
              <span style={{ color: "#555" }}>{view.amount > 0 ? Math.round((totalPaid/Number(view.amount))*100) : 0}% recovered</span>
            </div>
            <div style={{ background: "#eee", borderRadius: 8, height: 14, overflow: "hidden" }}>
              <div style={{ height: "100%", background: "linear-gradient(90deg,#1565C0,#2e7d32)", width: `${view.amount > 0 ? Math.min(100,Math.round((totalPaid/Number(view.amount))*100)) : 0}%`, borderRadius: 8, transition: "width 0.4s" }} />
            </div>
          </div>

          {/* Installment timeline */}
          <h3 style={{ fontSize: 14, color: "#333", margin: "0 0 10px" }}>📅 Monthly Installment Timeline</h3>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
              <thead><tr style={{ background: "#e3f2fd" }}>
                {["#","Month","Due Date","Installment Due","Amount Received","Remaining","Status","Paid Date","Action"].map(h => <th key={h} style={th}>{h}</th>)}
              </tr></thead>
              <tbody>{view.installments.map((inst, idx) => {
                const rec = Number(inst.paidAmount || (inst.paid ? inst.amount : 0));
                const rem = Number(inst.amount) - rec;
                const isOverdue = !inst.paid && inst.dueDate < today();
                const [y,m] = inst.dueDate?.split("-") || [];
                return (
                  <tr key={inst.id} style={{ borderBottom: "1px solid #eee", background: inst.paid ? "#f1f8e9" : isOverdue ? "#fff3e0" : "white" }}>
                    <td style={{ ...td, color: "#999" }}>{idx+1}</td>
                    <td style={{ ...td, fontWeight: "bold" }}>{m && y ? `${MONTH_NAMES[Number(m)-1]} ${y}` : "—"}</td>
                    <td style={td}>{inst.dueDate}</td>
                    <td style={{ ...td, fontWeight: "bold", color: "#1565C0" }}>{fmt(inst.amount)}</td>
                    <td style={td}>
                      <input
                        type="number"
                        value={inst.paidAmount !== undefined && inst.paidAmount !== "" ? inst.paidAmount : (inst.paid ? inst.amount : "")}
                        placeholder="0"
                        onChange={e => {
                          const val = e.target.value;
                          const isPaid = Number(val) >= Number(inst.amount);
                          updateInstallment(view.id, inst.id, {
                            paidAmount: val,
                            paid: isPaid,
                            paidDate: isPaid && !inst.paidDate ? today() : inst.paidDate
                          });
                        }}
                        style={{ width: 90, padding: "4px 6px", border: "1px solid #ddd", borderRadius: 5, fontFamily: "Georgia,serif", fontSize: 12 }}
                      />
                    </td>
                    <td style={{ ...td, fontWeight: "bold", color: rem > 0 ? "#c62828" : "#2e7d32" }}>{fmt(rem)}</td>
                    <td style={td}>
                      <span style={{ ...badge, background: inst.paid ? "#c8e6c9" : isOverdue ? "#ffe0b2" : "#fff9c4", color: inst.paid ? "#2e7d32" : isOverdue ? "#e65100" : "#f57f17" }}>
                        {inst.paid ? "✅ Paid" : isOverdue ? "⚠ Overdue" : "⏳ Pending"}
                      </span>
                    </td>
                    <td style={td}>
                      {inst.paid
                        ? <input type="date" value={inst.paidDate||""} onChange={e => updateInstallment(view.id, inst.id, { paidDate: e.target.value })}
                            style={{ padding: "3px 5px", border: "1px solid #ddd", borderRadius: 5, fontSize: 11, fontFamily: "Georgia,serif" }} />
                        : "—"}
                    </td>
                    <td style={td}>
                      <button onClick={() => toggleInstallment(view.id, inst.id, inst)}
                        style={{ ...btnSm, background: inst.paid ? "#ffebee" : "#e8f5e9", color: inst.paid ? "#c62828" : "#2e7d32" }}>
                        {inst.paid ? "↩ Undo" : "✓ Paid"}
                      </button>
                    </td>
                  </tr>
                );
              })}</tbody>
              <tfoot>
                <tr style={{ background: "#f5f5f5", fontWeight: "bold" }}>
                  <td colSpan={3} style={{ ...td, color: "#555" }}>TOTAL</td>
                  <td style={{ ...td, color: "#1565C0" }}>{fmt(view.amount)}</td>
                  <td style={{ ...td, color: "#2e7d32" }}>{fmt(totalPaid)}</td>
                  <td style={{ ...td, color: "#c62828" }}>{fmt(remaining)}</td>
                  <td colSpan={3} style={td}>{view.installments.filter(i=>i.paid).length} of {view.installments.length} paid</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // ── Loans list ──
  return (
    <div>
      <PageHeader title="Loans" sub="Manage loans with full monthly installment tracking" />

      {/* Quick stats */}
      {loans.length > 0 && (() => {
        const totalLoaned = loans.reduce((a,l) => a+Number(l.amount||0), 0);
        const totalRecovered = loans.reduce((a,l) => a+l.installments.reduce((b,i) => b+Number(i.paidAmount||(i.paid?i.amount:0)),0), 0);
        const totalOverdue = loans.reduce((a,l) => a+l.installments.filter(i=>!i.paid&&i.dueDate<today()).length, 0);
        return (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
            {[["Total Loaned",fmt(totalLoaned),"#1565C0"],["Recovered",fmt(totalRecovered),"#2e7d32"],["Balance Due",fmt(totalLoaned-totalRecovered),"#c62828"],["Overdue Installments",totalOverdue+" inst.",totalOverdue>0?"#e65100":"#2e7d32"]].map(([l,v,c])=>(
              <div key={l} style={{ background:"white",borderRadius:10,padding:"14px 16px",textAlign:"center",borderTop:`3px solid ${c}`,boxShadow:"0 2px 6px rgba(0,0,0,0.06)" }}>
                <div style={{ fontSize:18,fontWeight:"bold",color:c }}>{v}</div>
                <div style={{ fontSize:11,color:"#666",marginTop:3 }}>{l}</div>
              </div>
            ))}
          </div>
        );
      })()}

      <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 20 }}>
        <div style={{ background: "white", borderRadius: 12, padding: 20, boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
          <h3 style={{ margin: "0 0 16px", color: "#1565C0", fontSize: 15 }}>{editing ? "Edit Loan" : "New Loan"}</h3>
          <label style={lbl}>Date</label>
          <input type="date" style={inp} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value, installments: [] })} />
          <label style={lbl}>Serial No</label>
          <select style={inp} value={form.serialNo} onChange={(e) => setForm({ ...form, serialNo: e.target.value })}>
            <option value="">— None —</option>
            {serials.map((s) => <option key={s.id} value={s.code}>{s.code} — {s.title}</option>)}
          </select>
          <label style={lbl}>Borrower Name</label>
          <input style={inp} value={form.borrowerName} onChange={(e) => setForm({ ...form, borrowerName: e.target.value })} />
          <label style={lbl}>CNIC</label>
          <input style={inp} value={form.cnic} onChange={(e) => setForm({ ...form, cnic: e.target.value })} />
          <label style={lbl}>Phone</label>
          <input style={inp} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <label style={lbl}>Loan Amount (Rs.)</label>
          <input type="number" style={inp} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value, installments: [] })} />
          <label style={lbl}>Repayment Months</label>
          <input type="number" style={inp} value={form.months} min={1} onChange={(e) => setForm({ ...form, months: e.target.value, installments: [] })} />
          <label style={lbl}>Purpose</label>
          <textarea style={{ ...inp, height: 50, resize: "vertical" }} value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} />
          <label style={lbl}>Status</label>
          <select style={inp} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            {["Active", "Completed", "Defaulted"].map((s) => <option key={s}>{s}</option>)}
          </select>
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <button onClick={save} style={btnPrimary}>{editing ? "Update" : "Create Loan"}</button>
            {editing && <button onClick={() => { setForm({ id: "", date: today(), serialNo: "", borrowerName: "", cnic: "", phone: "", amount: "", months: 12, purpose: "", status: "Active", installments: [] }); setEditing(null); }} style={btnSec}>Cancel</button>}
          </div>
        </div>

        <div style={{ background: "white", borderRadius: 12, padding: 20, boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            <button onClick={() => setTab("monthly")} style={{ ...btnPrimary, fontSize: 13 }}>📅 Monthly Tracker View</button>
          </div>
          <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
            <thead><tr style={{ background: "#ede7f6" }}>
              {["Date","Serial","Borrower","Loan Amount","Monthly","Received","Remaining","Progress","Status","Actions"].map((h) => <th key={h} style={th}>{h}</th>)}
            </tr></thead>
            <tbody>{loans.slice().reverse().map((l) => {
              const totalRec = l.installments.reduce((a,i) => a+Number(i.paidAmount||(i.paid?i.amount:0)),0);
              const rem = Number(l.amount) - totalRec;
              const paidCount = l.installments.filter((i) => i.paid).length;
              const pct = l.installments.length ? Math.round((paidCount / l.installments.length) * 100) : 0;
              const hasOverdue = l.installments.some(i => !i.paid && i.dueDate < today());
              return (
                <tr key={l.id} style={{ borderBottom: "1px solid #eee", background: hasOverdue ? "#fff8f0" : "white" }}>
                  <td style={td}>{l.date}</td>
                  <td style={{ ...td, color: "#1565C0", fontWeight: "bold" }}>{l.serialNo || "—"}</td>
                  <td style={td}>
                    <button onClick={() => setView(l)} style={{ background: "none", border: "none", cursor: "pointer", color: "#1565C0", fontFamily: "Georgia,serif", fontSize: 12, textDecoration: "underline", padding: 0 }}>{l.borrowerName}</button>
                    {hasOverdue && <span style={{ ...badge, background: "#ff6f00", color: "white", marginLeft: 4, fontSize: 9 }}>OVERDUE</span>}
                  </td>
                  <td style={{ ...td, fontWeight: "bold" }}>{fmt(l.amount)}</td>
                  <td style={td}>{l.installments.length ? fmt(l.installments[0].amount) : "—"}</td>
                  <td style={{ ...td, color: "#2e7d32", fontWeight: "bold" }}>{fmt(totalRec)}</td>
                  <td style={{ ...td, color: rem > 0 ? "#c62828" : "#2e7d32", fontWeight: "bold" }}>{fmt(rem)}</td>
                  <td style={td}>
                    <div style={{ background: "#eee", borderRadius: 4, height: 8, width: 80 }}>
                      <div style={{ background: pct === 100 ? "#2e7d32" : "#1565C0", width: `${pct}%`, height: "100%", borderRadius: 4 }} />
                    </div>
                    <div style={{ fontSize: 10, marginTop: 2 }}>{paidCount}/{l.installments.length} ({pct}%)</div>
                  </td>
                  <td style={td}><span style={{ ...badge, background: l.status === "Active" ? "#e8f5e9" : l.status === "Completed" ? "#c8e6c9" : "#ffebee", color: l.status === "Active" ? "#2e7d32" : l.status === "Completed" ? "#1b5e20" : "#c62828" }}>{l.status}</span></td>
                  <td style={td}>
                    <button onClick={() => edit(l)} style={btnSm}>Edit</button>
                    <button onClick={() => del(l.id)} style={{ ...btnSm, background: "#ffebee", color: "#c62828" }}>Del</button>
                  </td>
                </tr>
              );
            })}{!loans.length && <tr><td colSpan={10} style={{ textAlign: "center", padding: 20, color: "#aaa" }}>No loans yet. Create one using the form.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


// ── Donations Page ────────────────────────────────────────────────────────────
const DON_CATS = ["One-time", "Monthly Pledge", "Zakat", "Sadqah", "Fidya", "Kaffarah", "In-Kind", "Anonymous", "Corporate", "Government", "Other"];
const DON_METHODS = ["By Hand / Cash", "Easypaisa", "JazzCash", "Bank Transfer", "Sadapay", "Nayapay", "Cheque", "Other"];

function DonationsPage({ donations, crud }) {
  const BLANK = { id: "", date: today(), donorName: "", donorPhone: "", donorAddress: "", donorCnic: "", category: "One-time", method: "By Hand / Cash", accountRef: "", amount: "", inKindDetails: "", receivedBy: "", notes: "", anonymous: false };
  const [form, setForm] = useState(BLANK);
  const showPreview = usePrint();
  const confirm = useConfirm();
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState("");
  const [filterMethod, setFilterMethod] = useState("");
  const [filterCat, setFilterCat] = useState("");
  const [viewDonor, setViewDonor] = useState(null);

  const save = async () => {
    if (!form.date || !form.amount) return confirm("Date and amount are required.", null);
    if (!form.anonymous && !form.donorName) return confirm("Donor name is required (or tick Anonymous).", null);
    await crud.donations.save(form);
    setForm(BLANK); setEditing(null);
  };
  const del = (id) => confirm("Delete this donation record?", () => crud.donations.remove(id));
  const edit = (d) => { setForm({ ...BLANK, ...d }); setEditing(d.id); setViewDonor(null); };

  const methodColor = { "By Hand / Cash": "#2e7d32", "Easypaisa": "#00695c", "JazzCash": "#e65100", "Bank Transfer": "#1565C0", "Sadapay": "#6a1b9a", "Nayapay": "#0277bd", "Cheque": "#37474f", "Other": "#555" };
  const mc = (m) => methodColor[m] || "#555";

  const filtered = donations.filter((d) => {
    const s = search.toLowerCase();
    const m = !s || d.donorName?.toLowerCase().includes(s) || d.donorPhone?.includes(s) || d.notes?.toLowerCase().includes(s) || d.accountRef?.toLowerCase().includes(s);
    return m && (!filterMethod || d.method === filterMethod) && (!filterCat || d.category === filterCat);
  });

  const totalAmount = filtered.reduce((a, b) => a + Number(b.amount || 0), 0);
  const byMethod = {};
  filtered.forEach(d => { byMethod[d.method] = (byMethod[d.method] || 0) + Number(d.amount || 0); });
  const byCategory = {};
  filtered.forEach(d => { byCategory[d.category] = (byCategory[d.category] || 0) + Number(d.amount || 0); });

  // Donor history: group by name
  const donorHistory = {};
  donations.forEach(d => {
    const key = d.anonymous ? "Anonymous" : (d.donorName || "Unknown");
    if (!donorHistory[key]) donorHistory[key] = { name: key, total: 0, count: 0, entries: [] };
    donorHistory[key].total += Number(d.amount || 0);
    donorHistory[key].count++;
    donorHistory[key].entries.push(d);
  });
  const topDonors = Object.values(donorHistory).sort((a, b) => b.total - a.total).slice(0, 5);

  const printReceipt = (d) => {
    showPreview(performaHTML("Donation Receipt — Ray of Hope", [
      ["Receipt Date", d.date],
      ["Donor Name", d.anonymous ? "Anonymous" : (d.donorName || "—")],
      ["Donor Phone", d.donorPhone || "—"],
      ["Donor CNIC", d.donorCnic || "—"],
      ["Donor Address", d.donorAddress || "—"],
      ["Donation Type", d.category],
      ["Payment Method", d.method],
      ["Transaction Ref.", d.accountRef || "—"],
      ["Amount Donated", fmt(d.amount)],
      d.category === "In-Kind" ? ["In-Kind Details", d.inKindDetails || "—"] : null,
      ["Received By", d.receivedBy || "—"],
      ["Notes", d.notes || "—"],
    ].filter(Boolean)));
  };

  if (viewDonor) {
    const dh = donorHistory[viewDonor] || { entries: [], total: 0 };
    return (
      <div>
        <div style={{ display:"flex", gap:10, marginBottom:20, alignItems:"center" }}>
          <button onClick={() => setViewDonor(null)} style={btnSec}>← Back</button>
          <h2 style={{ margin:0, color:"#1565C0", fontFamily:"Georgia,serif" }}>Donor: {viewDonor}</h2>
          <span style={{ marginLeft:"auto", fontWeight:"bold", color:"#2e7d32", fontSize:16 }}>Total: {fmt(dh.total)}</span>
        </div>
        <div style={{ background:"white", borderRadius:12, padding:20, boxShadow:"0 2px 8px rgba(0,0,0,0.08)" }}>
          <table style={{ width:"100%", fontSize:12, borderCollapse:"collapse" }}>
            <thead><tr style={{ background:"#fce4ec" }}>
              {["Date","Category","Method","Ref No","Amount","Received By","Actions"].map(h=><th key={h} style={th}>{h}</th>)}
            </tr></thead>
            <tbody>{dh.entries.map(d=>(
              <tr key={d.id} style={{ borderBottom:"1px solid #eee" }}>
                <td style={td}>{d.date}</td>
                <td style={td}><span style={{ ...badge, background:"#fce4ec", color:"#c2185b" }}>{d.category}</span></td>
                <td style={td}><span style={{ ...badge, background:mc(d.method)+"22", color:mc(d.method) }}>{d.method}</span></td>
                <td style={{ ...td, fontSize:11, color:"#666" }}>{d.accountRef||"—"}</td>
                <td style={{ ...td, color:"#2e7d32", fontWeight:"bold" }}>{fmt(d.amount)}</td>
                <td style={td}>{d.receivedBy||"—"}</td>
                <td style={td}>
                  <button onClick={() => printReceipt(d)} style={{ ...btnSm, background:"#e3f2fd", color:"#1565C0" }}>🖨</button>
                </td>
              </tr>
            ))}</tbody>
            <tfoot><tr style={{ background:"#f5f5f5" }}>
              <td colSpan={4} style={{ ...td, fontWeight:"bold" }}>Total ({dh.count} donations)</td>
              <td style={{ ...td, fontWeight:"bold", color:"#2e7d32" }}>{fmt(dh.total)}</td>
              <td colSpan={2} style={td}></td>
            </tr></tfoot>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Donations" sub="Record and track all donations with donor details" />

      {/* Summary pills */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))", gap:12, marginBottom:20 }}>
        {[
          ["Total Donations", fmt(totalAmount), "#c2185b"],
          ["No. of Records", filtered.length, "#1565C0"],
          ["Unique Donors", Object.keys(donorHistory).length, "#2e7d32"],
          ["This Month", fmt(donations.filter(d=>d.date?.startsWith(today().slice(0,7))).reduce((a,b)=>a+Number(b.amount||0),0)), "#e65100"],
        ].map(([l,v,c])=>(
          <div key={l} style={{ background:"white", borderRadius:10, padding:"14px 16px", borderTop:`3px solid ${c}`, boxShadow:"0 2px 6px rgba(0,0,0,0.07)" }}>
            <div style={{ fontSize:18, fontWeight:"bold", color:c }}>{v}</div>
            <div style={{ fontSize:11, color:"#666", marginTop:3 }}>{l}</div>
          </div>
        ))}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"340px 1fr", gap:20 }}>
        {/* Form */}
        <div style={{ background:"white", borderRadius:12, padding:20, boxShadow:"0 2px 8px rgba(0,0,0,0.08)", maxHeight:"85vh", overflowY:"auto" }}>
          <h3 style={{ margin:"0 0 14px", color:"#c2185b", fontSize:15 }}>{editing ? "Edit Donation" : "New Donation Record"}</h3>
          <label style={lbl}>Date *</label>
          <input type="date" style={inp} value={form.date} onChange={e=>setForm({...form,date:e.target.value})} />
          <label style={{ ...lbl, display:"flex", alignItems:"center", gap:6 }}>
            <input type="checkbox" checked={form.anonymous} onChange={e=>setForm({...form,anonymous:e.target.checked,donorName:e.target.checked?"":form.donorName})} />
            Anonymous Donor
          </label>
          {!form.anonymous && (
            <>
              <label style={lbl}>Donor Name *</label>
              <input style={inp} value={form.donorName} onChange={e=>setForm({...form,donorName:e.target.value})} placeholder="Full name" />
              <label style={lbl}>Donor Phone</label>
              <input style={inp} value={form.donorPhone} onChange={e=>setForm({...form,donorPhone:e.target.value})} placeholder="03xx-xxxxxxx" />
              <label style={lbl}>Donor CNIC</label>
              <input style={inp} value={form.donorCnic} onChange={e=>setForm({...form,donorCnic:e.target.value})} placeholder="xxxxx-xxxxxxx-x" />
              <label style={lbl}>Donor Address</label>
              <input style={inp} value={form.donorAddress} onChange={e=>setForm({...form,donorAddress:e.target.value})} />
            </>
          )}
          <label style={lbl}>Donation Type</label>
          <select style={inp} value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>
            {DON_CATS.map(c=><option key={c}>{c}</option>)}
          </select>
          {form.category === "In-Kind" && (
            <>
              <label style={lbl}>In-Kind Item Details</label>
              <input style={inp} value={form.inKindDetails} onChange={e=>setForm({...form,inKindDetails:e.target.value})} placeholder="e.g. 5 bags flour, 10 blankets" />
            </>
          )}
          <label style={lbl}>Payment Method</label>
          <select style={{ ...inp, borderLeft:`4px solid ${mc(form.method)}` }} value={form.method} onChange={e=>setForm({...form,method:e.target.value})}>
            {DON_METHODS.map(m=><option key={m}>{m}</option>)}
          </select>
          {form.method !== "By Hand / Cash" && (
            <>
              <label style={lbl}>Transaction / Account Ref. No.</label>
              <input style={inp} value={form.accountRef} onChange={e=>setForm({...form,accountRef:e.target.value})} placeholder="e.g. TXN123 or 03xx-xxxxxxx" />
            </>
          )}
          <label style={lbl}>Amount (Rs.) *</label>
          <input type="number" style={inp} value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} placeholder="0.00" />
          <label style={lbl}>Received By</label>
          <input style={inp} value={form.receivedBy} onChange={e=>setForm({...form,receivedBy:e.target.value})} placeholder="Staff name" />
          <label style={lbl}>Notes</label>
          <textarea style={{ ...inp, height:50, resize:"vertical" }} value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} />
          <div style={{ display:"flex", gap:8, marginTop:4 }}>
            <button onClick={save} style={{ ...btnPrimary, background:"#c2185b" }}>{editing ? "Update" : "Save Donation"}</button>
            {editing && <button onClick={()=>{setForm(BLANK);setEditing(null);}} style={btnSec}>Cancel</button>}
          </div>
        </div>

        {/* Right panel */}
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          {/* Top donors */}
          {topDonors.length > 0 && (
            <div style={{ background:"white", borderRadius:12, padding:16, boxShadow:"0 2px 8px rgba(0,0,0,0.08)" }}>
              <h4 style={{ margin:"0 0 10px", color:"#c2185b", fontSize:13 }}>🏆 Top Donors</h4>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                {topDonors.map((d,i)=>(
                  <button key={d.name} onClick={()=>setViewDonor(d.name)} style={{ background:"#fce4ec", border:"none", borderRadius:20, padding:"5px 14px", cursor:"pointer", fontFamily:"Georgia,serif", fontSize:12, color:"#c2185b" }}>
                    {i===0?"🥇":i===1?"🥈":i===2?"🥉":"  "} {d.name} — <strong>{fmt(d.total)}</strong>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Table */}
          <div style={{ background:"white", borderRadius:12, padding:20, boxShadow:"0 2px 8px rgba(0,0,0,0.08)", flex:1 }}>
            <div style={{ display:"flex", gap:8, marginBottom:12, flexWrap:"wrap" }}>
              <input style={{ ...inp, flex:1, margin:0, minWidth:130 }} placeholder="Search donor, phone, notes..." value={search} onChange={e=>setSearch(e.target.value)} />
              <select style={{ ...inp, margin:0, minWidth:130 }} value={filterMethod} onChange={e=>setFilterMethod(e.target.value)}>
                <option value="">All Methods</option>
                {DON_METHODS.map(m=><option key={m}>{m}</option>)}
              </select>
              <select style={{ ...inp, margin:0, minWidth:120 }} value={filterCat} onChange={e=>setFilterCat(e.target.value)}>
                <option value="">All Types</option>
                {DON_CATS.map(c=><option key={c}>{c}</option>)}
              </select>
              <button onClick={()=>downloadCSV([["Date","Donor","Phone","CNIC","Type","Method","Ref","Amount","Received By"],...filtered.map(d=>[d.date,d.anonymous?"Anonymous":d.donorName,d.donorPhone||"",d.donorCnic||"",d.category,d.method,d.accountRef||"",d.amount,d.receivedBy||""])],"donations.csv")} style={{ ...btnSec, margin:0 }}>📊 CSV</button>
              <button onClick={()=>showPreview(tableHTML("Donations Report",["Date","Donor","Type","Method","Amount","Received By"],filtered.map(d=>[d.date,d.anonymous?"Anonymous":d.donorName,d.category,d.method,fmt(d.amount),d.receivedBy||"—"])))} style={{ ...btnSec, margin:0 }}>🖨 Print</button>
            </div>
            <div style={{ background:"#fce4ec", borderRadius:8, padding:"7px 14px", marginBottom:10, fontSize:13 }}>
              {filtered.length} records — Total: <strong style={{ color:"#c2185b" }}>{fmt(totalAmount)}</strong>
            </div>
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", fontSize:12, borderCollapse:"collapse" }}>
                <thead><tr style={{ background:"#fce4ec" }}>
                  {["Date","Donor","Type","Method","Ref No","Amount","Received By","Actions"].map(h=><th key={h} style={th}>{h}</th>)}
                </tr></thead>
                <tbody>{filtered.slice().reverse().map(d=>(
                  <tr key={d.id} style={{ borderBottom:"1px solid #eee" }}>
                    <td style={td}>{d.date}</td>
                    <td style={td}>
                      <button onClick={()=>setViewDonor(d.anonymous?"Anonymous":d.donorName)} style={{ background:"none", border:"none", cursor:"pointer", color:"#c2185b", fontFamily:"Georgia,serif", fontSize:12, textDecoration:"underline", padding:0 }}>
                        {d.anonymous ? "🔒 Anonymous" : d.donorName}
                      </button>
                      {d.donorPhone && <div style={{ fontSize:10, color:"#888" }}>{d.donorPhone}</div>}
                    </td>
                    <td style={td}><span style={{ ...badge, background:"#fce4ec", color:"#c2185b" }}>{d.category}</span></td>
                    <td style={td}><span style={{ ...badge, background:mc(d.method)+"22", color:mc(d.method), border:`1px solid ${mc(d.method)}44` }}>{d.method}</span></td>
                    <td style={{ ...td, fontSize:11, color:"#666" }}>{d.accountRef||"—"}</td>
                    <td style={{ ...td, color:"#2e7d32", fontWeight:"bold" }}>{fmt(d.amount)}</td>
                    <td style={td}>{d.receivedBy||"—"}</td>
                    <td style={td}>
                      <button onClick={()=>edit(d)} style={btnSm}>Edit</button>
                      <button onClick={()=>printReceipt(d)} style={{ ...btnSm, background:"#e3f2fd", color:"#1565C0" }}>🖨</button>
                      <button onClick={()=>del(d.id)} style={{ ...btnSm, background:"#ffebee", color:"#c62828" }}>Del</button>
                    </td>
                  </tr>
                ))}{!filtered.length&&<tr><td colSpan={8} style={{ textAlign:"center", padding:20, color:"#aaa" }}>No donation records found</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Work Plan Page ───────────────────────────────────────────────────────────
function WorkPlanPage({ globalYear, setGlobalYear, cases, crud, serials, workPlanEntries }) {
  const entries = workPlanEntries;

  const showPreview = usePrint();
  const confirm     = useConfirm();
  const years = Array.from({length:8},(_,i)=>(new Date().getFullYear()+1-i).toString());

  const BLANK = {
    id:"", year:globalYear,
    // Green — basic info
    srNo:"", name:"", mobile:"", address:"", reference:"", description:"", problemIssue:"",
    verification:"Pending", caseStatus:"Pending",
    // Orange — Documentation
    caseNo:"", cnicDone:false, initialFormDone:false, estamp:false,
    purchasing:false, dataEntry:false, fileMaintained:false,
    // Yellow — Social Media — Post Preparation
    photosVideos:false, videoEditor:false, storyWriter:false,
    // Sharing on FB Id
    fbIdId:false, fbIdTagging:false, fbIdPage1:false, fbIdPage2:false,
    // Sharing on FB Pages
    fbPageScene:false, fbPagePermission:false, fbPageLists:false,
    // Sharing on WhatsApp
    waId:false, waPage1:false, waPage2:false,
    // Replying to Comments
    replyId:false, replyPage1:false, replyPage2:false,
    // Links
    fbLink:"", caseNotes:""
  };

  const [form, setForm]       = useState({...BLANK, year:globalYear});
  const [editing, setEditing]  = useState(null);
  const [search, setSearch]    = useState("");
  const [filterYear, setFilterYear] = useState(globalYear);
  const [expandRow, setExpandRow]   = useState(null);
  const [viewMode, setViewMode]     = useState("table"); // table | cards

  useEffect(()=>{ setFilterYear(globalYear); setForm(f=>({...f,year:globalYear})); },[globalYear]);

  // ── Sync a work-plan entry into the Cases section (Firestore) ──────────────
  // Runs whenever Verification = Accepted. Creates the case if missing,
  // or refreshes it with the latest Work Plan data if it already exists —
  // so editing either page keeps both in sync and nothing has to be retyped.
  const promoteToCase = async (e, { silent } = {}) => {
    if (!crud?.cases || !cases) return;
    if (!e.caseNo) { if(!silent) confirm("Add a Case No before accepting — it's needed to create the case record.", null); return; }

    const existing = cases.find(c => c.caseNo === e.caseNo);
    if (existing) {
      await crud.cases.save({
        ...existing,
        name: existing.name || e.name || "",
        mobile: existing.mobile || e.mobile || "",
        titleOfCase: existing.titleOfCase || e.description || e.name || e.caseNo,
        whatDone: existing.whatDone || e.problemIssue || "",
        focalPersonName: existing.focalPersonName || e.reference || "",
        cnicCopy: existing.cnicCopy || !!e.cnicDone,
        purchasing: existing.purchasing || !!e.purchasing,
        videosPics: existing.videosPics || !!e.photosVideos,
        posted: existing.posted || !!(e.fbIdId || e.fbPageScene || e.waId),
        workPlanLinked: true,
      });
      if (!silent) confirm(`Case ${e.caseNo} already exists in Cases — synced the latest details into it.`, null);
    } else {
      await crud.cases.save({
        date: today(),
        caseNo: e.caseNo,
        titleOfCase: e.description || e.name || e.caseNo,
        whatDone: e.problemIssue || "",
        category: "",
        name: e.name || "",
        mobile: e.mobile || "",
        dateOfCompletion: e.dateOfCompletion || "",
        loan: "N/A",
        sponsoredAmount: "N/A",
        focalPersonName: e.reference || "",
        focalPersonMobile: "",
        verifiedBy: "",
        sponsoredBy: "",
        facts: ["","","","","","","",""],
        totalAmount: "",
        cnicCopy: !!e.cnicDone,
        purchasing: !!e.purchasing,
        videosPics: !!e.photosVideos,
        posted: !!(e.fbIdId || e.fbPageScene || e.waId),
        status: "Active",
        assignedTo: "",
        photo: "", cnicFront: "", cnicBack: "",
        workPlanLinked: true,
      });
      if (!silent) confirm(`✅ Case ${e.caseNo} accepted and added to the Cases section.`, null);
    }
  };

  const save = async () => {
    if (!form.name && !form.caseNo) return confirm("Name or Case No is required.", null);
    if (!editing && form.caseNo) {
      const dupEntry = entries.find(x => x.caseNo === form.caseNo);
      if (dupEntry) return confirm(`Case No "${form.caseNo}" is already used in Work Plan (${dupEntry.name||dupEntry.description||"untitled"}). Each Case/Serial No should be used once. Edit that entry instead.`, null);
      const caseOwner = cases.find(c => c.caseNo === form.caseNo);
      if (caseOwner) return confirm(`Case No "${form.caseNo}" is already used in Cases (${caseOwner.titleOfCase||caseOwner.name||"untitled"}). Choose a different number, or this entry will conflict.`, null);
    }
    const prevEntry = editing ? entries.find(x=>x.id===editing) : null;
    const justAccepted = form.verification==="Accepted" && (!prevEntry || prevEntry.verification!=="Accepted");

    if (editing) await crud.workplan.save(form);
    else await crud.workplan.save({...form, id: undefined});

    if (justAccepted) promoteToCase(form);

    setForm({...BLANK,year:globalYear}); setEditing(null);
  };
  const del  = (id) => confirm("Delete this entry?",()=>crud.workplan.remove(id));
  const edit = (e)  => { setForm({...BLANK,...e}); setEditing(e.id); window.scrollTo(0,0); };
  const toggle = (field) => setForm(f=>({...f,[field]:!f[field]}));
  // Auto-fill description from a matching Serial title when a known code is typed
  const handleWPCaseNoChange = (val) => {
    setForm(f => {
      const matchingSerial = serials.find(s => s.code === val);
      if (matchingSerial && !f.description) {
        return { ...f, caseNo: val, description: matchingSerial.title };
      }
      return { ...f, caseNo: val };
    });
  };

  const setVerificationInline = (entryId, newVal) => {
    const e = entries.find(x => x.id === entryId);
    if (!e) return;
    const updated = {...e, verification:newVal};
    crud.workplan.save(updated);
    if (newVal==="Accepted" && e.verification!=="Accepted") promoteToCase(updated);
  };

  const setStatusInline = (entryId, newVal) => {
    const e = entries.find(x => x.id === entryId);
    if (!e) return;
    crud.workplan.save({...e, caseStatus:newVal});
  };

  const syncAllAccepted = () => {
    const accepted = filtered.filter(e=>e.verification==="Accepted" && e.caseNo);
    if (!accepted.length) return confirm("No Accepted entries with a Case No found to sync.", null);
    accepted.forEach(e=>promoteToCase(e,{silent:true}));
    confirm(`Synced ${accepted.length} accepted case(s) into the Cases section.`, null);
  };

  const [quickFilter, setQuickFilter] = useState("all"); // all | incomplete | done | pending-verify

  const filtered = entries.filter(e=>(e.year||globalYear)===filterYear &&
    (!search || [e.srNo,e.name,e.caseNo,e.description,e.reference].some(v=>v?.toLowerCase().includes(search.toLowerCase())))
  ).filter(e=>{
    if (quickFilter==="all") return true;
    if (quickFilter==="done") return e.caseStatus==="Closed";
    if (quickFilter==="incomplete") return e.caseStatus!=="Closed";
    if (quickFilter==="pending-verify") return e.verification==="Pending";
    return true;
  });

  // Verification = the decision on whether the case is approved (separate track)
  const verBg  = { Pending:"#fff9c4", Accepted:"#c8e6c9", Rejected:"#ffcdd2" };
  const verCol = { Pending:"#f57f17", Accepted:"#1b5e20", Rejected:"#b71c1c" };
  // Status = where the case currently is in the workflow (separate track, blue/grey family)
  const stBg   = { Pending:"#e1f5fe", "In Progress":"#bbdefb", Closed:"#cfd8dc" };
  const stCol  = { Pending:"#0277bd", "In Progress":"#0d47a1", Closed:"#37474f" };

  // ── Checkbox helper for form ──
  const FB = ({f,l}) => (
    <label style={{ display:"flex",alignItems:"center",gap:5,fontSize:12,cursor:"pointer",padding:"3px 0" }}>
      <input type="checkbox" checked={!!form[f]} onChange={()=>toggle(f)}
        style={{ width:15,height:15,accentColor:"#1565C0",cursor:"pointer" }} />
      {l}
    </label>
  );
  // ── Inline toggle cell for table ──
  const TC = ({entry,field}) => (
    <td style={{ textAlign:"center", padding:"4px 3px", borderBottom:"1px solid #eee" }}>
      <button onClick={()=>crud.workplan.save({...entry,[field]:!entry[field]})}
        style={{ background:"none",border:"none",cursor:"pointer",fontSize:15,padding:0,lineHeight:1 }}>
        {entry[field]?"✅":"⬜"}
      </button>
    </td>
  );

  // ── Progress calculator — a smarter view than raw checkboxes ──
  const ALL_STEPS = ["cnicDone","initialFormDone","estamp","purchasing","dataEntry","fileMaintained",
    "photosVideos","videoEditor","storyWriter","fbIdId","fbIdTagging","fbIdPage1","fbIdPage2",
    "fbPageScene","fbPagePermission","fbPageLists","waId","waPage1","waPage2","replyId","replyPage1","replyPage2"];
  const getProgress = (e) => {
    const done = ALL_STEPS.filter(s=>e[s]).length;
    return Math.round((done/ALL_STEPS.length)*100);
  };
  const progressColor = (p) => p===100?"#2e7d32":p>=60?"#1565C0":p>=30?"#f57f17":"#c62828";

  // ── Print full work plan HTML ──
  const printWorkPlan = () => {
    const rows = filtered.map((e,i)=>[
      i+1, e.srNo||"", e.name||"", e.mobile||"", e.address||"", e.reference||"",
      e.description||"", e.problemIssue||"", e.verification,
      e.caseNo||"",
      e.cnicDone?"✓":"", e.initialFormDone?"✓":"", e.estamp?"✓":"",
      e.purchasing?"✓":"", e.dataEntry?"✓":"", e.fileMaintained?"✓":"",
      e.photosVideos?"✓":"", e.videoEditor?"✓":"", e.storyWriter?"✓":"",
      e.fbIdId?"✓":"", e.fbIdTagging?"✓":"", e.fbIdPage1?"✓":"", e.fbIdPage2?"✓":"",
      e.fbPageScene?"✓":"", e.fbPagePermission?"✓":"", e.fbPageLists?"✓":"",
      e.waId?"✓":"", e.waPage1?"✓":"", e.waPage2?"✓":"",
      e.replyId?"✓":"", e.replyPage1?"✓":"", e.replyPage2?"✓":"",
      e.caseStatus
    ]);
    showPreview(workPlanPrintHTML(filterYear, rows));
  };

  return (
    <div>
      <PageHeader title={`Work Plan ${filterYear}`} sub="Case tracking — Documentation — Social Media" />

      {/* ── FORM ── */}
      <div style={{ background:"white", borderRadius:12, padding:18, boxShadow:"0 2px 8px rgba(0,0,0,0.08)", marginBottom:20 }}>
        <h3 style={{ margin:"0 0 14px", color:"#1565C0", fontSize:14, borderBottom:"2px solid #1565C0", paddingBottom:8 }}>
          {editing ? "✏️ Edit Entry" : "➕ Add New Entry"}
        </h3>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))", gap:10 }}>
          <div>
            <label style={lbl}>Year</label>
            <select style={inp} value={form.year} onChange={e=>setForm({...form,year:e.target.value})}>
              {years.map(y=><option key={y}>{y}</option>)}
            </select>
          </div>
          <div><label style={lbl}>Sr. No.</label><input style={inp} value={form.srNo} onChange={e=>setForm({...form,srNo:e.target.value})} placeholder="Row number" /></div>
          <div><label style={lbl}>Name *</label><input style={inp} value={form.name} onChange={e=>setForm({...form,name:e.target.value})} /></div>
          <div><label style={lbl}>Mobile No.</label><input style={inp} value={form.mobile} onChange={e=>setForm({...form,mobile:e.target.value})} /></div>
          <div><label style={lbl}>Address</label><input style={inp} value={form.address} onChange={e=>setForm({...form,address:e.target.value})} /></div>
          <div><label style={lbl}>Reference</label><input style={inp} value={form.reference} onChange={e=>setForm({...form,reference:e.target.value})} /></div>
          <div>
            <label style={lbl}>✅ Verification <span style={{ color:"#aaa", fontWeight:"normal" }}>(Accept / Reject decision)</span></label>
            <select style={{ ...inp, background:verBg[form.verification], color:verCol[form.verification], fontWeight:"bold" }}
              value={form.verification} onChange={e=>setForm({...form,verification:e.target.value})}>
              {["Pending","Accepted","Rejected"].map(v=><option key={v}>{v}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>🔄 Case Status <span style={{ color:"#aaa", fontWeight:"normal" }}>(Workflow progress)</span></label>
            <select style={{ ...inp, background:stBg[form.caseStatus]||"white", color:stCol[form.caseStatus]||"#333", fontWeight:"bold" }}
              value={form.caseStatus} onChange={e=>setForm({...form,caseStatus:e.target.value})}>
              {["Pending","In Progress","Closed"].map(v=><option key={v}>{v}</option>)}
            </select>
          </div>
        </div>
        {form.verification==="Accepted" && (
          <div style={{ background:"#e8f5e9", border:"1px solid #a5d6a7", borderRadius:8, padding:"8px 12px", marginTop:8, fontSize:11, color:"#2e7d32" }}>
            ✓ Accepted cases are automatically added to the Cases section using the Case No, name, mobile, description and documentation info entered here.
          </div>
        )}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginTop:8 }}>
          <div>
            <label style={lbl}>Description</label>
            <textarea style={{ ...inp, height:55, resize:"vertical" }} value={form.description} onChange={e=>setForm({...form,description:e.target.value})} />
          </div>
          <div>
            <label style={lbl}>Problem / Issue</label>
            <textarea style={{ ...inp, height:55, resize:"vertical" }} value={form.problemIssue} onChange={e=>setForm({...form,problemIssue:e.target.value})} />
          </div>
        </div>

        {/* Three coloured sections side by side */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:10, marginTop:12 }}>

          {/* Orange — Documentation */}
          <div style={{ background:"#fff8e1", border:"1px solid #ffcc80", borderRadius:10, padding:"12px 14px" }}>
            <div style={{ fontWeight:"bold", fontSize:12, color:"#e65100", marginBottom:10, display:"flex", alignItems:"center", gap:6 }}>
              <span style={{ background:"#ff9800", color:"white", borderRadius:4, padding:"1px 6px", fontSize:10 }}>ORANGE</span>
              Documentation / Purchasing
            </div>
            <div><label style={lbl}>Case No</label><input style={inp} value={form.caseNo} onChange={e=>handleWPCaseNoChange(e.target.value)} placeholder="e.g. 26/1" /></div>
            {form.caseNo && !editing && (() => {
              const matchSerial = serials.find(s => s.code === form.caseNo);
              const matchEntry = entries.find(x => x.caseNo === form.caseNo);
              const matchCase = cases.find(c => c.caseNo === form.caseNo);
              if (matchEntry || matchCase) return <div style={{ fontSize:10, color:"#c62828", marginTop:-4, marginBottom:6 }}>⚠ Already used {matchEntry?"in Work Plan":"in Cases"} — pick a different number</div>;
              if (matchSerial) return <div style={{ fontSize:10, color:"#2e7d32", marginTop:-4, marginBottom:6 }}>✓ Matches Serial "{matchSerial.title}"</div>;
              return null;
            })()}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:4 }}>
              <FB f="cnicDone"        l="CNIC" />
              <FB f="initialFormDone" l="Initial Form" />
              <FB f="estamp"          l="E-stamp" />
              <FB f="purchasing"      l="Purchasing" />
              <FB f="dataEntry"       l="Data Entry" />
              <FB f="fileMaintained"  l="File Maintained" />
            </div>
          </div>

          {/* Yellow — Post Prep + Sharing FB Id */}
          <div style={{ background:"#fffde7", border:"1px solid #fff176", borderRadius:10, padding:"12px 14px" }}>
            <div style={{ fontWeight:"bold", fontSize:12, color:"#f57f17", marginBottom:10, display:"flex", alignItems:"center", gap:6 }}>
              <span style={{ background:"#fdd835", color:"#333", borderRadius:4, padding:"1px 6px", fontSize:10 }}>YELLOW</span>
              Social Media
            </div>
            <div style={{ fontSize:10, fontWeight:"bold", color:"#555", marginBottom:4 }}>Post Preparation</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:3, marginBottom:8 }}>
              <FB f="photosVideos" l="Photos/Videos" />
              <FB f="videoEditor"  l="Video Editor" />
              <FB f="storyWriter"  l="Story Writer" />
            </div>
            <div style={{ fontSize:10, fontWeight:"bold", color:"#555", marginBottom:4 }}>Sharing on FB Id</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:3, marginBottom:8 }}>
              <FB f="fbIdId"      l="ID" />
              <FB f="fbIdTagging" l="Tagging" />
              <FB f="fbIdPage1"   l="Page 1" />
              <FB f="fbIdPage2"   l="Page 2" />
            </div>
            <div style={{ fontSize:10, fontWeight:"bold", color:"#555", marginBottom:4 }}>Sharing on FB Pages</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:3 }}>
              <FB f="fbPageScene"      l="Scenes" />
              <FB f="fbPagePermission" l="Permission" />
              <FB f="fbPageLists"      l="Lists" />
            </div>
          </div>

          {/* Yellow 2 — WhatsApp + Replies + Links */}
          <div style={{ background:"#f9fbe7", border:"1px solid #dce775", borderRadius:10, padding:"12px 14px" }}>
            <div style={{ fontWeight:"bold", fontSize:12, color:"#558b2f", marginBottom:10, display:"flex", alignItems:"center", gap:6 }}>
              <span style={{ background:"#8bc34a", color:"white", borderRadius:4, padding:"1px 6px", fontSize:10 }}>YELLOW</span>
              WhatsApp + Replies
            </div>
            <div style={{ fontSize:10, fontWeight:"bold", color:"#555", marginBottom:4 }}>Sharing on WhatsApp</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:3, marginBottom:8 }}>
              <FB f="waId"    l="ID" />
              <FB f="waPage1" l="Page 1" />
              <FB f="waPage2" l="Page 2" />
            </div>
            <div style={{ fontSize:10, fontWeight:"bold", color:"#555", marginBottom:4 }}>Replying to Comments</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:3, marginBottom:10 }}>
              <FB f="replyId"    l="Id" />
              <FB f="replyPage1" l="Page 1" />
              <FB f="replyPage2" l="Page 2" />
            </div>
            <label style={lbl}>Facebook Link</label>
            <input style={inp} value={form.fbLink} onChange={e=>setForm({...form,fbLink:e.target.value})} placeholder="https://facebook.com/..." />
            <label style={lbl}>Notes</label>
            <textarea style={{ ...inp, height:40, resize:"vertical" }} value={form.caseNotes} onChange={e=>setForm({...form,caseNotes:e.target.value})} />
          </div>
        </div>

        <div style={{ display:"flex", gap:8, marginTop:14 }}>
          <button onClick={save} style={btnPrimary}>{editing?"💾 Update Entry":"➕ Add Entry"}</button>
          {editing && <button onClick={()=>{setForm({...BLANK,year:globalYear});setEditing(null);}} style={btnSec}>Cancel</button>}
        </div>
      </div>

      {/* ── TABLE ── */}
      <div style={{ background:"white", borderRadius:12, padding:18, boxShadow:"0 2px 8px rgba(0,0,0,0.08)" }}>
        {/* Toolbar */}
        <div style={{ display:"flex", gap:8, marginBottom:14, flexWrap:"wrap", alignItems:"center" }}>
          <input style={{ ...inp, flex:1, margin:0, minWidth:140 }} placeholder="Search name, case no, description..." value={search} onChange={e=>setSearch(e.target.value)} />
          <select style={{ ...inp, margin:0, width:90 }} value={filterYear} onChange={e=>setFilterYear(e.target.value)}>
            {years.map(y=><option key={y}>{y}</option>)}
          </select>
          <div style={{ display:"flex", gap:4 }}>
            <button onClick={()=>setViewMode("table")} style={{ ...btnSm, background:viewMode==="table"?"#1565C0":"#e3f2fd", color:viewMode==="table"?"white":"#1565C0", padding:"6px 10px" }}>📊 Table</button>
            <button onClick={()=>setViewMode("cards")} style={{ ...btnSm, background:viewMode==="cards"?"#1565C0":"#e3f2fd", color:viewMode==="cards"?"white":"#1565C0", padding:"6px 10px" }}>📱 Cards</button>
          </div>
          <select value={quickFilter} onChange={e=>setQuickFilter(e.target.value)} style={{ ...inp, margin:0, width:150, fontWeight:"bold" }}>
            <option value="all">Show: All Cases</option>
            <option value="incomplete">Show: Incomplete Only</option>
            <option value="done">Show: Closed Only</option>
            <option value="pending-verify">Show: Pending Verification</option>
          </select>
          <button onClick={syncAllAccepted} style={{ ...btnSec, margin:0, background:"#e8f5e9", color:"#2e7d32", border:"1px solid #a5d6a7" }}>🔄 Sync Accepted → Cases</button>
          <button onClick={printWorkPlan} style={{ ...btnSec, margin:0 }}>🖨 Print</button>
          <button onClick={()=>downloadCSV([
            ["Year","Sr","Name","Mobile","Address","Reference","Description","Problem","Verification","Case No","CNIC","Init Form","E-stamp","Purchase","Data Entry","File","Photos","Video Editor","Story","FB Id-ID","FB Id-Tag","FB Id-P1","FB Id-P2","FB Pg-Scene","FB Pg-Perm","FB Pg-List","WA-ID","WA-P1","WA-P2","Reply Id","Reply P1","Reply P2","FB Link","Notes","Status"],
            ...filtered.map(e=>[e.year,e.srNo,e.name,e.mobile,e.address,e.reference,e.description,e.problemIssue,e.verification,
              e.caseNo,e.cnicDone?"Yes":"",e.initialFormDone?"Yes":"",e.estamp?"Yes":"",e.purchasing?"Yes":"",e.dataEntry?"Yes":"",e.fileMaintained?"Yes":"",
              e.photosVideos?"Yes":"",e.videoEditor?"Yes":"",e.storyWriter?"Yes":"",
              e.fbIdId?"Yes":"",e.fbIdTagging?"Yes":"",e.fbIdPage1?"Yes":"",e.fbIdPage2?"Yes":"",
              e.fbPageScene?"Yes":"",e.fbPagePermission?"Yes":"",e.fbPageLists?"Yes":"",
              e.waId?"Yes":"",e.waPage1?"Yes":"",e.waPage2?"Yes":"",
              e.replyId?"Yes":"",e.replyPage1?"Yes":"",e.replyPage2?"Yes":"",
              e.fbLink,e.caseNotes,e.caseStatus])
          ],"workplan.csv")} style={{ ...btnSec, margin:0 }}>📊 CSV</button>
        </div>

        <div style={{ fontSize:12, color:"#888", marginBottom:10, display:"flex", gap:14, flexWrap:"wrap", alignItems:"center" }}>
          <span>{filtered.length} entries — {filterYear}</span>
          <span style={{ borderLeft:"1px solid #ddd", paddingLeft:14 }}>
            <span style={{ color:"#888", fontSize:10 }}>VERIFICATION:</span>{" "}
            Accepted <strong style={{ color:"#1b5e20" }}>{filtered.filter(e=>e.verification==="Accepted").length}</strong>{" "}
            Pending <strong style={{ color:"#f57f17" }}>{filtered.filter(e=>e.verification==="Pending").length}</strong>{" "}
            Rejected <strong style={{ color:"#b71c1c" }}>{filtered.filter(e=>e.verification==="Rejected").length}</strong>
          </span>
          <span style={{ borderLeft:"1px solid #ddd", paddingLeft:14 }}>
            <span style={{ color:"#888", fontSize:10 }}>STATUS:</span>{" "}
            In Progress <strong style={{ color:"#0d47a1" }}>{filtered.filter(e=>e.caseStatus==="In Progress").length}</strong>{" "}
            Closed <strong style={{ color:"#37474f" }}>{filtered.filter(e=>e.caseStatus==="Closed").length}</strong>
          </span>
        </div>

        {/* ── CARDS VIEW (mobile friendly) ── */}
        {viewMode==="cards" && (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:14 }}>
            {filtered.length===0 && <div style={{ textAlign:"center", padding:40, color:"#aaa", gridColumn:"1/-1" }}>No entries for {filterYear}</div>}
            {filtered.map((e,i)=>(
              <div key={e.id} style={{ border:"1px solid #eee", borderRadius:10, overflow:"hidden", boxShadow:"0 1px 4px rgba(0,0,0,0.07)" }}>
                {/* Card header — green */}
                <div style={{ background:"#4caf50", color:"white", padding:"8px 12px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div>
                    <div style={{ fontWeight:"bold", fontSize:14 }}>{e.name||"—"} {cases?.some(c=>c.caseNo===e.caseNo) && <span title="Already in Cases" style={{ fontSize:11 }}>📋</span>}</div>
                    <div style={{ fontSize:11, opacity:0.85 }}>{e.mobile||""} {e.address?("• "+e.address):""}</div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontSize:11, background:"rgba(0,0,0,0.2)", borderRadius:10, padding:"2px 8px", marginBottom:3 }}>#{e.srNo||i+1}</div>
                    <select value={e.verification} onChange={ev=>setVerificationInline(e.id, ev.target.value)}
                      style={{ background:verBg[e.verification], color:verCol[e.verification], fontSize:10, border:"none", borderRadius:10, padding:"2px 6px", fontWeight:"bold", cursor:"pointer" }}>
                      {["Pending","Accepted","Rejected"].map(v=><option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                </div>
                {/* Progress bar — quick visual of how complete the case is */}
                <div style={{ padding:"8px 12px 0" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, color:"#888", marginBottom:3 }}>
                    <span>Progress</span><span style={{ fontWeight:"bold", color:progressColor(getProgress(e)) }}>{getProgress(e)}%</span>
                  </div>
                  <div style={{ background:"#eee", borderRadius:6, height:7, overflow:"hidden" }}>
                    <div style={{ height:"100%", width:`${getProgress(e)}%`, background:progressColor(getProgress(e)), borderRadius:6, transition:"width 0.3s" }} />
                  </div>
                </div>
                {/* Card body */}
                <div style={{ padding:"10px 12px" }}>
                  {e.description && <div style={{ fontSize:12, marginBottom:6 }}><span style={{ color:"#888", fontSize:10 }}>Description: </span>{e.description}</div>}
                  {e.problemIssue && <div style={{ fontSize:12, marginBottom:8 }}><span style={{ color:"#888", fontSize:10 }}>Problem: </span>{e.problemIssue}</div>}

                  {/* Orange strip */}
                  <div style={{ background:"#fff8e1", borderRadius:6, padding:"7px 10px", marginBottom:8 }}>
                    <div style={{ fontSize:10, fontWeight:"bold", color:"#e65100", marginBottom:5 }}>📁 Documentation — Case: {e.caseNo||"—"}</div>
                    <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                      {[["cnicDone","CNIC"],["initialFormDone","Form"],["estamp","E-stamp"],["purchasing","Purchase"],["dataEntry","Data"],["fileMaintained","File"]].map(([f,l])=>(
                        <span key={f} style={{ fontSize:10, background:e[f]?"#c8e6c9":"#ffebee", color:e[f]?"#1b5e20":"#c62828", borderRadius:10, padding:"2px 7px" }}>{e[f]?"✓":""} {l}</span>
                      ))}
                    </div>
                  </div>
                  {/* Yellow strip */}
                  <div style={{ background:"#fffde7", borderRadius:6, padding:"7px 10px" }}>
                    <div style={{ fontSize:10, fontWeight:"bold", color:"#f57f17", marginBottom:5 }}>📱 Social Media</div>
                    <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
                      {[["photosVideos","📷"],["videoEditor","🎬"],["storyWriter","✍"],["fbIdId","FB-ID"],["fbIdTagging","Tag"],["fbIdPage1","P1"],["fbIdPage2","P2"],["fbPageScene","Scene"],["fbPagePermission","Perm"],["sharingFbId","FB"],["waId","WA"],["replyId","Reply"]].map(([f,l])=>(
                        e[f]?<span key={f} style={{ fontSize:10, background:"#e8f5e9", color:"#1b5e20", borderRadius:10, padding:"2px 7px" }}>✓ {l}</span>:null
                      ))}
                    </div>
                    {e.fbLink && <div style={{ marginTop:5 }}><a href={e.fbLink} target="_blank" style={{ fontSize:10, color:"#1565C0" }}>🔗 FB Link</a></div>}
                  </div>

                  <div style={{ display:"flex", gap:6, marginTop:10, justifyContent:"space-between", alignItems:"center" }}>
                    <select value={e.caseStatus||"Pending"} onChange={ev=>setStatusInline(e.id, ev.target.value)}
                      style={{ background:stBg[e.caseStatus]||"#eee", color:stCol[e.caseStatus]||"#333", fontSize:11, border:"none", borderRadius:8, padding:"3px 8px", fontWeight:"bold", cursor:"pointer" }}>
                      {["Pending","In Progress","Closed"].map(v=><option key={v} value={v}>{v}</option>)}
                    </select>
                    <div>
                      <button onClick={()=>edit(e)} style={btnSm}>Edit</button>
                      <button onClick={()=>del(e.id)} style={{ ...btnSm, background:"#ffebee", color:"#c62828" }}>Del</button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── TABLE VIEW (Excel-like, desktop) ── */}
        {viewMode==="table" && (
          <div style={{ overflowX:"auto" }}>
            <table style={{ borderCollapse:"collapse", fontSize:10, minWidth:1400 }}>
              <thead>
                {/* Row 1 — colour group headers */}
                <tr>
                  <th colSpan={10}  style={{ background:"#388e3c", color:"white", padding:"6px 8px", textAlign:"center", border:"1px solid #2e7d32", fontSize:11, fontWeight:"bold" }}>Work Plan {filterYear}</th>
                  <th colSpan={7}  style={{ background:"#f57c00", color:"white", padding:"6px 8px", textAlign:"center", border:"1px solid #e65100", fontSize:11, fontWeight:"bold" }}>Documentation / Purchasing</th>
                  <th colSpan={3}  style={{ background:"#fbc02d", color:"#333", padding:"6px 8px", textAlign:"center", border:"1px solid #f9a825", fontSize:11, fontWeight:"bold" }}>Post Preparation</th>
                  <th colSpan={4}  style={{ background:"#fdd835", color:"#333", padding:"6px 8px", textAlign:"center", border:"1px solid #f9a825", fontSize:11, fontWeight:"bold" }}>Sharing on FB Id</th>
                  <th colSpan={3}  style={{ background:"#fff176", color:"#333", padding:"6px 8px", textAlign:"center", border:"1px solid #f9a825", fontSize:11, fontWeight:"bold" }}>Sharing on FB Pages</th>
                  <th colSpan={3}  style={{ background:"#e6ee9c", color:"#333", padding:"6px 8px", textAlign:"center", border:"1px solid #dce775", fontSize:11, fontWeight:"bold" }}>Sharing on WhatsApp</th>
                  <th colSpan={3}  style={{ background:"#dce775", color:"#333", padding:"6px 8px", textAlign:"center", border:"1px solid #cddc39", fontSize:11, fontWeight:"bold" }}>Replying to Comments</th>
                  <th colSpan={3}  style={{ background:"#f5f5f5", color:"#333", padding:"6px 8px", textAlign:"center", border:"1px solid #eee", fontSize:11 }}>Links / Actions</th>
                </tr>
                {/* Row 2 — column headers */}
                <tr style={{ background:"#f9f9f9" }}>
                  {[
                    // Green
                    ["#","30px"],["Name","120px"],["Mobile","90px"],["Address","100px"],["Reference","80px"],["Description","120px"],["Problem/Issue","110px"],["Verification","80px"],["Status","70px"],["Progress","70px"],
                    // Orange
                    ["Case No","70px"],["CNIC","45px"],["Init Form","55px"],["E-stamp","45px"],["Purchase","50px"],["Data Entry","55px"],["File","40px"],
                    // Yellow — Post Prep
                    ["Photos","45px"],["Video Ed.","50px"],["Story","40px"],
                    // FB Id
                    ["ID","35px"],["Tagging","45px"],["Pg 1","35px"],["Pg 2","35px"],
                    // FB Pages
                    ["Scenes","45px"],["Perm","40px"],["Lists","35px"],
                    // WA
                    ["ID","35px"],["Pg 1","35px"],["Pg 2","35px"],
                    // Reply
                    ["Id","35px"],["Pg 1","35px"],["Pg 2","35px"],
                    // Links
                    ["FB Link","80px"],["Notes","70px"],["Actions","70px"],
                  ].map(([h,w],i)=>(
                    <th key={i} style={{ border:"1px solid #ddd", padding:"5px 4px", textAlign:"center", fontSize:9, whiteSpace:"nowrap", minWidth:w, fontWeight:"bold", color:"#333" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length===0 && (
                  <tr><td colSpan={35} style={{ textAlign:"center", padding:28, color:"#aaa", fontSize:13 }}>No entries for {filterYear}. Add one above.</td></tr>
                )}
                {filtered.map((e,i)=>(
                  <tr key={e.id} style={{ background:i%2===0?"white":"#fafafa" }}
                    onMouseEnter={ev=>ev.currentTarget.style.background="#e3f2fd"}
                    onMouseLeave={ev=>ev.currentTarget.style.background=i%2===0?"white":"#fafafa"}>
                    {/* Green cells */}
                    <td style={{ border:"1px solid #eee", padding:"4px 5px", textAlign:"center", color:"#aaa", fontSize:10 }}>{e.srNo||i+1}</td>
                    <td style={{ border:"1px solid #eee", padding:"4px 5px", fontWeight:"bold", fontSize:11 }}>
                      <button onClick={()=>setExpandRow(expandRow===e.id?null:e.id)} style={{ background:"none",border:"none",cursor:"pointer",color:"#1565C0",fontFamily:"Georgia,serif",fontSize:11,padding:0,textAlign:"left" }}>{e.name||"—"}</button>
                    </td>
                    <td style={{ border:"1px solid #eee", padding:"4px 5px", fontSize:10 }}>{e.mobile||"—"}</td>
                    <td style={{ border:"1px solid #eee", padding:"4px 5px", fontSize:10, maxWidth:100, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{e.address||"—"}</td>
                    <td style={{ border:"1px solid #eee", padding:"4px 5px", fontSize:10 }}>{e.reference||"—"}</td>
                    <td style={{ border:"1px solid #eee", padding:"4px 5px", fontSize:10, maxWidth:120, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{e.description||"—"}</td>
                    <td style={{ border:"1px solid #eee", padding:"4px 5px", fontSize:10, maxWidth:110, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{e.problemIssue||"—"}</td>
                    <td style={{ border:"1px solid #eee", padding:"3px 4px", textAlign:"center" }}>
                      <select value={e.verification} onChange={ev=>setVerificationInline(e.id, ev.target.value)}
                        style={{ background:verBg[e.verification]||"#eee", color:verCol[e.verification]||"#333", borderRadius:8, padding:"2px 4px", fontSize:9, fontWeight:"bold", border:"none", cursor:"pointer" }}>
                        {["Pending","Accepted","Rejected"].map(v=><option key={v} value={v}>{v}</option>)}
                      </select>
                    </td>
                    <td style={{ border:"1px solid #eee", padding:"3px 4px", textAlign:"center" }}>
                      <select value={e.caseStatus||"Pending"} onChange={ev=>setStatusInline(e.id, ev.target.value)}
                        style={{ background:stBg[e.caseStatus]||"#eee", color:stCol[e.caseStatus]||"#333", borderRadius:8, padding:"2px 4px", fontSize:9, fontWeight:"bold", border:"none", cursor:"pointer" }}>
                        {["Pending","In Progress","Closed"].map(v=><option key={v} value={v}>{v}</option>)}
                      </select>
                    </td>
                    <td style={{ border:"1px solid #eee", padding:"4px 5px" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                        <div style={{ background:"#eee", borderRadius:5, height:6, width:36, overflow:"hidden" }}>
                          <div style={{ height:"100%", width:`${getProgress(e)}%`, background:progressColor(getProgress(e)) }} />
                        </div>
                        <span style={{ fontSize:9, color:progressColor(getProgress(e)), fontWeight:"bold" }}>{getProgress(e)}%</span>
                      </div>
                    </td>
                    {/* Orange cells */}
                    <td style={{ border:"1px solid #ffe082", padding:"4px 5px", textAlign:"center", background:"#fffde7", fontWeight:"bold", fontSize:10, color:"#D32F2F" }}>{e.caseNo||"—"}</td>
                    {["cnicDone","initialFormDone","estamp","purchasing","dataEntry","fileMaintained"].map(f=><TC key={f} entry={e} field={f} />)}
                    {/* Yellow — Post Prep */}
                    {["photosVideos","videoEditor","storyWriter"].map(f=><TC key={f} entry={e} field={f} />)}
                    {/* FB Id */}
                    {["fbIdId","fbIdTagging","fbIdPage1","fbIdPage2"].map(f=><TC key={f} entry={e} field={f} />)}
                    {/* FB Pages */}
                    {["fbPageScene","fbPagePermission","fbPageLists"].map(f=><TC key={f} entry={e} field={f} />)}
                    {/* WA */}
                    {["waId","waPage1","waPage2"].map(f=><TC key={f} entry={e} field={f} />)}
                    {/* Reply */}
                    {["replyId","replyPage1","replyPage2"].map(f=><TC key={f} entry={e} field={f} />)}
                    {/* Links */}
                    <td style={{ border:"1px solid #eee", padding:"4px 5px" }}>
                      {e.fbLink ? <a href={e.fbLink} target="_blank" style={{ color:"#1565C0", fontSize:9 }}>🔗 Link</a> : <span style={{ color:"#ccc", fontSize:9 }}>—</span>}
                    </td>
                    <td style={{ border:"1px solid #eee", padding:"4px 5px", fontSize:9, color:"#888" }}>{e.caseNotes||"—"}</td>
                    <td style={{ border:"1px solid #eee", padding:"4px 3px", textAlign:"center" }}>
                      <button onClick={()=>edit(e)} style={{ ...btnSm, padding:"3px 6px", fontSize:9, marginRight:2 }}>Edit</button>
                      <button onClick={()=>del(e.id)} style={{ ...btnSm, background:"#ffebee", color:"#c62828", padding:"3px 6px", fontSize:9 }}>Del</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Expanded row detail */}
        {expandRow && (() => { const e = filtered.find(x=>x.id===expandRow); return e ? (
          <div style={{ background:"#f0f7ff", borderRadius:10, padding:"14px 18px", marginTop:12, border:"1px solid #bbdefb" }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
              <strong style={{ color:"#1565C0" }}>{e.name} — Details</strong>
              <button onClick={()=>setExpandRow(null)} style={{ background:"none",border:"none",color:"#888",cursor:"pointer",fontSize:16 }}>✕</button>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:8, fontSize:12 }}>
              {[["Address",e.address],["Reference",e.reference],["Description",e.description],["Problem/Issue",e.problemIssue],["Notes",e.caseNotes],["FB Link",e.fbLink],["Case No",e.caseNo]].map(([l,v])=>
                v?<div key={l}><span style={{ color:"#888",fontSize:10 }}>{l}: </span><strong>{v}</strong></div>:null
              )}
            </div>
          </div>
        ) : null; })()}
      </div>
    </div>
  );
}

// ── Work Plan Print HTML ──────────────────────────────────────────────────────
function workPlanPrintHTML(year, rows) {
  const hdrs = ["#","Name","Mobile","Address","Ref","Description","Problem","Verification","Status","Case No","CNIC","Form","E-stamp","Purchase","Data","File","Photos","Video","Story","FB-ID","Tag","P1","P2","Scene","Perm","List","WA-ID","WA-P1","WA-P2","Rep-Id","Rep-P1","Rep-P2","FB Link","Notes"];
  const colColors = ["#c8e6c9","#c8e6c9","#c8e6c9","#c8e6c9","#c8e6c9","#c8e6c9","#c8e6c9","#c8e6c9","#c8e6c9",
    "#ffe082","#ffe082","#ffe082","#ffe082","#ffe082","#ffe082","#ffe082",
    "#fff176","#fff176","#fff176","#fff176","#fff176","#fff176","#fff176","#fff176","#fff176","#fff176","#fff176","#fff176","#fff176","#fff176","#fff176","#fff176","#fff9c4","#fff9c4"];
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Work Plan ${year}</title><style>
*{box-sizing:border-box}body{font-family:Arial,sans-serif;margin:10px;font-size:8px}
.title{font-size:14px;font-weight:bold;text-align:center;margin-bottom:8px;color:#1565C0}
table{border-collapse:collapse;width:100%}
th,td{border:1px solid #ccc;padding:3px 4px;text-align:center;white-space:nowrap}
th{font-weight:bold;font-size:7px}
.grp-green{background:#388e3c;color:white;font-size:9px}
.grp-orange{background:#f57c00;color:white;font-size:9px}
.grp-yellow{background:#fbc02d;color:#333;font-size:9px}
@media print{body{margin:5px}@page{size:A4 landscape;margin:8mm}}
</style></head><body>
<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
  <div style="width:36px;height:36px;border:3px solid #1565C0;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;color:#D32F2F;font-weight:bold">امید</div>
  <div class="title">Ray of Hope — Work Plan ${year}</div>
</div>
<table>
<thead>
<tr>
  <th colspan="9" class="grp-green">Work Plan ${year}</th>
  <th colspan="7" class="grp-orange">Documentation / Purchasing</th>
  <th colspan="3" class="grp-yellow">Post Prep</th>
  <th colspan="4" class="grp-yellow">Sharing FB Id</th>
  <th colspan="3" class="grp-yellow">FB Pages</th>
  <th colspan="3" class="grp-yellow">WhatsApp</th>
  <th colspan="3" class="grp-yellow">Replies</th>
  <th colspan="2" style="background:#f5f5f5">Links</th>
</tr>
<tr>${hdrs.map((h,i)=>`<th style="background:${colColors[i]||"#f5f5f5"}">${h}</th>`).join("")}</tr>
</thead>
<tbody>
${rows.map((r,i)=>`<tr style="background:${i%2===0?"white":"#f9f9f9"}">${r.map(c=>`<td>${c||""}</td>`).join("")}</tr>`).join("")}
</tbody>
</table>
<div style="margin-top:8px;font-size:7px;color:#aaa;text-align:right">Ray of Hope NGO — Printed: ${new Date().toLocaleDateString("en-PK")}</div>
</body></html>`;
}

// ── Summary Page ──────────────────────────────────────────────────────────────
const MONTH_NAMES_FULL = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const MONTH_NAMES_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function SummaryPage({ receivings, expenses, serials }) {
  const [mode, setMode] = useState("monthly");
  const showPreview = usePrint();
  const now = new Date();
  const [year,  setYear]  = useState(now.getFullYear().toString());
  const [month, setMonth] = useState(String(now.getMonth()+1).padStart(2,"0"));
  const [detail, setDetail] = useState(false); // brief vs detailed view

  const years = Array.from(new Set([...receivings,...expenses].map(r=>r.date?.split("-")[0]).filter(Boolean))).sort().reverse();
  if (!years.includes(year) && years.length) years.unshift(year);

  // ── Filter by period ──
  const periodMatch = (d) => mode==="monthly" ? d?.startsWith(`${year}-${month}`) : d?.startsWith(year);
  const recAll  = receivings.filter(r => periodMatch(r.date));
  const expAll  = expenses.filter(e => periodMatch(e.date));

  // ── Receivings breakdown by method ──
  const byMethod = {};
  recAll.forEach(r => { byMethod[r.method||"Cash"] = (byMethod[r.method||"Cash"]||0) + Number(r.amount||0); });
  const totalRec    = recAll.reduce((a,b)=>a+Number(b.amount||0),0);
  const easyJazz    = (byMethod["Easypaisa"]||0) + (byMethod["JazzCash"]||0);
  const totalRecNet = totalRec; // previous balance would need to be tracked separately

  // ── Expenses grouped by serial number ──
  // Each serial = one "case" row like in your photo
  const bySerial = {};
  expAll.forEach(e => {
    const code  = e.serialNo || "General";
    const title = serials.find(s=>s.code===e.serialNo)?.title || (e.serialNo ? "" : "General Expenses");
    if (!bySerial[code]) bySerial[code] = { code, title, entries:[], total:0 };
    bySerial[code].entries.push(e);
    bySerial[code].total += Number(e.amount||0);
  });
  const serialRows = Object.values(bySerial).sort((a,b) => a.code.localeCompare(b.code));
  const totalExp = expAll.reduce((a,b)=>a+Number(b.amount||0),0);
  const remaining = totalRec - totalExp;

  const periodLabel = mode==="monthly"
    ? `${MONTH_NAMES_FULL[Number(month)-1]} ${year}`
    : `Year ${year}`;

  // ── Print Brief Summary (like your Image 1) ──
  const printBrief = () => {
    const rows = serialRows.map(s=>[s.code, s.title, s.total]);
    showPreview(briefSummaryHTML(periodLabel, totalRec, easyJazz, totalExp, remaining, byMethod, serialRows));
  };

  // ── Print Detailed Summary (like your Image 2) ──
  const printDetailed = () => {
    showPreview(detailedSummaryHTML(periodLabel, totalRec, easyJazz, totalExp, remaining, byMethod, serialRows));
  };

  return (
    <div>
      <PageHeader title="Monthly / Yearly Summary" sub="Exactly like your printed records" />

      {/* Controls */}
      <div style={{ background:"white", borderRadius:12, padding:16, boxShadow:"0 2px 8px rgba(0,0,0,0.08)", marginBottom:18, display:"flex", gap:10, flexWrap:"wrap", alignItems:"center" }}>
        <div style={{ display:"flex", gap:4 }}>
          {["monthly","yearly"].map(m=>(
            <button key={m} onClick={()=>setMode(m)} style={{ padding:"8px 16px", borderRadius:8, border:"none", cursor:"pointer", background:mode===m?"#1565C0":"#e3f2fd", color:mode===m?"white":"#1565C0", fontFamily:"Georgia,serif", fontWeight:"bold", textTransform:"capitalize" }}>{m}</button>
          ))}
        </div>
        <select style={{ ...inp, margin:0, width:90 }} value={year} onChange={e=>setYear(e.target.value)}>
          {(years.length?years:[now.getFullYear().toString()]).map(y=><option key={y}>{y}</option>)}
        </select>
        {mode==="monthly" && (
          <select style={{ ...inp, margin:0, width:110 }} value={month} onChange={e=>setMonth(e.target.value)}>
            {["01","02","03","04","05","06","07","08","09","10","11","12"].map((m,i)=><option key={m} value={m}>{MONTH_NAMES_SHORT[i]}</option>)}
          </select>
        )}
        <div style={{ marginLeft:"auto", display:"flex", gap:8 }}>
          <button onClick={printBrief}    style={{ ...btnSec, margin:0 }}>🖨 Brief Summary</button>
          <button onClick={printDetailed} style={{ ...btnPrimary, margin:0 }}>🖨 Detailed Summary</button>
          <button onClick={()=>downloadCSV([["Case No","Description","Amount"],...serialRows.map(s=>[s.code,s.title,s.total]),["","TOTAL",totalExp]],"summary.csv")} style={{ ...btnSec, margin:0 }}>📊 CSV</button>
        </div>
      </div>

      {/* Top financial bar — exactly like Image 2 header */}
      <div style={{ background:"white", borderRadius:12, padding:20, boxShadow:"0 2px 8px rgba(0,0,0,0.08)", marginBottom:18 }}>
        <div style={{ fontWeight:"bold", fontSize:16, color:"#1565C0", borderBottom:"2px solid #1565C0", paddingBottom:8, marginBottom:14 }}>
          Monthly Expenditure — {periodLabel}
        </div>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
          <tbody>
            {[
              ["Total Amount Received", fmt(totalRec), "#2e7d32", true],
              ["Easypaisa / JazzCash",  fmt(easyJazz), "#00695c", false],
              ["Net Balance",           fmt(totalRec), "#1565C0", true],
              ["Total Amount Used",     fmt(totalExp), "#c62828", true],
              ["Remaining Balance",     fmt(remaining), remaining>=0?"#2e7d32":"#c62828", true],
            ].map(([l,v,c,bold])=>(
              <tr key={l} style={{ borderBottom:"1px solid #eee" }}>
                <td style={{ padding:"7px 12px", color:"#555", fontSize:13 }}>{l}</td>
                <td style={{ padding:"7px 12px", textAlign:"right", fontWeight:bold?"bold":"normal", color:c, fontSize:bold?15:13 }}>{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {/* Method breakdown pills */}
        {Object.keys(byMethod).length>0 && (
          <div style={{ marginTop:12, display:"flex", gap:8, flexWrap:"wrap" }}>
            {Object.entries(byMethod).map(([m,a])=>(
              <div key={m} style={{ background:"#f5f5f5", borderRadius:20, padding:"4px 12px", fontSize:11 }}>
                <span style={{ color:"#555" }}>{m}:</span> <span style={{ fontWeight:"bold", color:"#2e7d32" }}>{fmt(a)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Brief Summary Table — like Image 1 */}
      <div style={{ background:"white", borderRadius:12, padding:20, boxShadow:"0 2px 8px rgba(0,0,0,0.08)", marginBottom:18 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
          <h3 style={{ margin:0, fontSize:15, color:"#333" }}>📋 Brief Summary</h3>
          <span style={{ fontSize:12, color:"#888" }}>(Like your first picture)</span>
        </div>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
          <thead>
            <tr style={{ background:"#f5f5f5", borderBottom:"2px solid #ddd" }}>
              <th style={{ ...th, width:80 }}>Case No</th>
              <th style={th}>Description</th>
              <th style={{ ...th, textAlign:"right", width:120 }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {serialRows.map(s=>(
              <tr key={s.code} style={{ borderBottom:"1px solid #eee" }}>
                <td style={{ ...td, fontWeight:"bold", color:"#1565C0" }}>{s.code}</td>
                <td style={td}>
                  <div style={{ fontWeight:"bold" }}>{s.title}</div>
                </td>
                <td style={{ ...td, textAlign:"right", fontWeight:"bold", color:"#c62828" }}>{s.total.toLocaleString()}</td>
              </tr>
            ))}
            {!serialRows.length && <tr><td colSpan={3} style={{ textAlign:"center", padding:24, color:"#aaa" }}>No expense records for this period</td></tr>}
          </tbody>
          {serialRows.length>0 && (
            <tfoot>
              <tr style={{ background:"#fff3e0", borderTop:"2px solid #ddd" }}>
                <td colSpan={2} style={{ ...td, fontWeight:"bold", textAlign:"right" }}>Total Amount Used</td>
                <td style={{ ...td, textAlign:"right", fontWeight:"bold", fontSize:15, color:"#c62828" }}>{totalExp.toLocaleString()}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Detailed Table — like Image 2 */}
      <div style={{ background:"white", borderRadius:12, padding:20, boxShadow:"0 2px 8px rgba(0,0,0,0.08)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
          <h3 style={{ margin:0, fontSize:15, color:"#333" }}>📄 Detailed Summary</h3>
          <span style={{ fontSize:12, color:"#888" }}>(Like your second picture)</span>
        </div>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
          <thead>
            <tr style={{ background:"#f5f5f5", borderBottom:"2px solid #ddd" }}>
              <th style={{ ...th, width:70 }}>Case No</th>
              <th style={{ ...th, width:90 }}>Date</th>
              <th style={th}>Description</th>
              <th style={{ ...th, textAlign:"right", width:100 }}>Amount</th>
              <th style={{ ...th, textAlign:"right", width:110 }}>Case Total</th>
            </tr>
          </thead>
          <tbody>
            {serialRows.map(s=>(
              s.entries.map((e,i)=>(
                <tr key={e.id} style={{ borderBottom:"1px solid #f0f0f0", background:i%2===0?"white":"#fafafa" }}>
                  {i===0 && <td rowSpan={s.entries.length} style={{ ...td, fontWeight:"bold", color:"#1565C0", verticalAlign:"top", borderRight:"1px solid #eee", paddingTop:10 }}>{s.code}</td>}
                  <td style={{ ...td, fontSize:11, color:"#666" }}>{e.date}</td>
                  <td style={td}>{e.description}</td>
                  <td style={{ ...td, textAlign:"right" }}>{Number(e.amount||0).toLocaleString()}</td>
                  {i===0 && <td rowSpan={s.entries.length} style={{ ...td, textAlign:"right", fontWeight:"bold", color:"#c62828", verticalAlign:"top", borderLeft:"1px solid #eee", paddingTop:10, fontSize:13 }}>{s.total.toLocaleString()}</td>}
                </tr>
              ))
            ))}
            {!serialRows.length && <tr><td colSpan={5} style={{ textAlign:"center", padding:24, color:"#aaa" }}>No records</td></tr>}
          </tbody>
          {serialRows.length>0 && (
            <tfoot>
              <tr style={{ background:"#fff3e0", borderTop:"2px solid #ddd" }}>
                <td colSpan={4} style={{ ...td, fontWeight:"bold", textAlign:"right" }}>Total Amount Used</td>
                <td style={{ ...td, textAlign:"right", fontWeight:"bold", fontSize:14, color:"#c62828" }}>{totalExp.toLocaleString()}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

// ── Brief Summary Print HTML (Image 1 style) ──────────────────────────────────
function briefSummaryHTML(period, totalRec, easyJazz, totalExp, remaining, byMethod, serialRows) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Summary ${period}</title><style>
*{box-sizing:border-box}body{font-family:Georgia,serif;margin:20px;color:#222;font-size:12px}
h2{text-align:center;border:2px solid #000;padding:8px;margin-bottom:0;font-size:15px}
table{width:100%;border-collapse:collapse}
th,td{border:1px solid #ccc;padding:6px 10px}
th{background:#f5f5f5;font-weight:bold}
.right{text-align:right}.bold{font-weight:bold}.total-row{background:#f0f0f0;font-weight:bold}
.header{display:flex;align-items:center;justify-content:center;gap:12px;margin-bottom:10px}
.org{font-size:16px;font-weight:bold;color:#1565C0}
@media print{body{margin:10px}}
</style></head><body>
<div class="header"><div class="org">🌟 Ray of Hope</div></div>
<h2>Monthly Expenditure ${period}</h2>
<table style="margin-bottom:12px;border:none">
  <tr><td style="border:none">Total Amount Received</td><td class="right bold" style="border:none">${totalRec.toLocaleString()}</td></tr>
  <tr><td style="border:none">EASY PAISA / JAZZ CASH</td><td class="right bold" style="border:none">${easyJazz.toLocaleString()}</td></tr>
  <tr><td style="border:none;font-weight:bold">NET BALANCE</td><td class="right bold" style="border:none">${totalRec.toLocaleString()}</td></tr>
  <tr><td style="border:none;font-weight:bold">Total Amount Used</td><td class="right bold" style="border:none">${totalExp.toLocaleString()}</td></tr>
  <tr><td style="border:none;font-weight:bold">Remaining Balance</td><td class="right bold" style="border:none">${remaining.toLocaleString()}</td></tr>
</table>
<table>
  <thead><tr><th style="width:80px">Case No</th><th>Description</th><th style="width:110px" class="right">Amount</th></tr></thead>
  <tbody>
    ${serialRows.map(s=>`<tr><td class="bold" style="color:#1565C0">${s.code}</td><td>${s.title}</td><td class="right bold">${s.total.toLocaleString()}</td></tr>`).join("")}
  </tbody>
  <tfoot><tr class="total-row"><td colspan="2" class="right">Total amount used</td><td class="right">${totalExp.toLocaleString()}</td></tr></tfoot>
</table>
<div style="margin-top:20px;font-size:10px;color:#aaa;text-align:center">Ray of Hope NGO — Printed: ${new Date().toLocaleDateString("en-PK")}</div>
</body></html>`;
}

// ── Detailed Summary Print HTML (Image 2 style) ───────────────────────────────
function detailedSummaryHTML(period, totalRec, easyJazz, totalExp, remaining, byMethod, serialRows) {
  const entryRows = serialRows.map(s => {
    const rows = s.entries.map((e,i) => `
      <tr>
        ${i===0 ? `<td rowspan="${s.entries.length}" style="font-weight:bold;color:#1565C0;vertical-align:top;border:1px solid #ccc;padding:5px 8px">${s.code}</td>` : ""}
        <td style="border:1px solid #eee;padding:5px 8px;font-size:11px;color:#555">${e.date}</td>
        <td style="border:1px solid #eee;padding:5px 8px">${e.description||""}</td>
        <td style="border:1px solid #eee;padding:5px 8px;text-align:right">${Number(e.amount||0).toLocaleString()}</td>
        ${i===0 ? `<td rowspan="${s.entries.length}" style="font-weight:bold;color:#c00;vertical-align:top;border:1px solid #ccc;padding:5px 8px;text-align:right">${s.total.toLocaleString()}</td>` : ""}
      </tr>`).join("");
    return rows;
  }).join("");

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Detailed Summary ${period}</title><style>
*{box-sizing:border-box}body{font-family:Georgia,serif;margin:20px;color:#222;font-size:12px}
h2{text-align:center;border:2px solid #000;padding:8px;margin-bottom:12px;font-size:14px}
table{width:100%;border-collapse:collapse}th{background:#f5f5f5;border:1px solid #ccc;padding:6px 8px;font-size:11px}
.header{text-align:center;font-size:15px;font-weight:bold;color:#1565C0;margin-bottom:8px}
.summary-table td{padding:5px 10px;border-bottom:1px solid #eee}.right{text-align:right}.bold{font-weight:bold}
@media print{body{margin:10px}}
</style></head><body>
<div class="header">🌟 Ray of Hope</div>
<h2>Monthly Expenditure ${period}</h2>
<table class="summary-table" style="margin-bottom:14px">
  <tr><td>Total Amount Received</td><td class="right bold">${totalRec.toLocaleString()}</td></tr>
  <tr><td>EASY PAISA / JAZZ CASH</td><td class="right bold">${easyJazz.toLocaleString()}</td></tr>
  <tr><td class="bold">NET BALANCE</td><td class="right bold">${totalRec.toLocaleString()}</td></tr>
  <tr><td class="bold">Total Amount Used</td><td class="right bold">${totalExp.toLocaleString()}</td></tr>
  <tr><td class="bold">Remaining Balance</td><td class="right bold">${remaining.toLocaleString()}</td></tr>
</table>
<table>
  <thead><tr><th style="width:70px">Case No</th><th style="width:90px">Date</th><th>Description</th><th style="width:90px;text-align:right">Amount</th><th style="width:100px;text-align:right">Case Total</th></tr></thead>
  <tbody>${entryRows}</tbody>
  <tfoot><tr style="background:#f0f0f0;font-weight:bold"><td colspan="4" style="text-align:right;padding:6px 8px;border:1px solid #ccc">Total Amount Used</td><td style="text-align:right;padding:6px 8px;border:1px solid #ccc">${totalExp.toLocaleString()}</td></tr></tfoot>
</table>
<div style="margin-top:16px;font-size:9px;color:#aaa;text-align:center">Ray of Hope NGO Management — ${new Date().toLocaleDateString("en-PK")}</div>
</body></html>`;
}

// ── Users Page ────────────────────────────────────────────────────────────────
function UsersPage({ users, crud, user }) {
  const [form, setForm] = useState({ id: "", email: "", displayName: "", role: "Viewer" });
  const confirm = useConfirm();
  const [editing, setEditing] = useState(null);
  const save = async () => {
    if (!form.email || !form.displayName) return confirm("Email and name are required.", null);
    await crud.users.save(form);
    setForm({ id: "", email: "", displayName: "", role: "Viewer" }); setEditing(null);
  };
  const del = (id) => { if (id === user.uid) return confirm("You cannot delete your own account.", null); confirm("Delete this user?", () => crud.users.remove(id)); };
  return (
    <div>
      <PageHeader title="Users" sub="Manage system users and access" />
      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 20 }}>
        <div style={{ background: "white", borderRadius: 12, padding: 20, boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
          <h3 style={{ margin: "0 0 16px", color: "#1565C0", fontSize: 15 }}>{editing ? "Edit User" : "Add User"}</h3>
          <div style={{ background:"#fff3e0", borderRadius:8, padding:"8px 12px", marginBottom:10, fontSize:12, color:"#e65100" }}>
            ⚠️ After adding a user here, also create their account in Firebase Console → Authentication → Add user with the same email.
          </div>
          <label style={lbl}>Display Name</label>
          <input style={inp} value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} placeholder="e.g. Ahmed (Staff)" />
          <label style={lbl}>Email (must match Firebase Auth)</label>
          <input type="email" style={inp} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="staff@rayofhope.com" />
          <label style={lbl}>Role</label>
          <select style={inp} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            {["Admin", "Manager", "Viewer"].map((r) => <option key={r}>{r}</option>)}
          </select>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={save} style={btnPrimary}>{editing ? "Update" : "Add User"}</button>
            {editing && <button onClick={() => { setForm({ id: "", email: "", displayName: "", role: "Viewer" }); setEditing(null); }} style={btnSec}>Cancel</button>}
          </div>
        </div>
        <div style={{ background: "white", borderRadius: 12, padding: 20, boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
          <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
            <thead><tr style={{ background: "#e3f2fd" }}>
              {["Name", "Email", "Role", "Actions"].map((h) => <th key={h} style={th}>{h}</th>)}
            </tr></thead>
            <tbody>{users.map((u) => (
              <tr key={u.id} style={{ borderBottom: "1px solid #eee" }}>
                <td style={td}>{u.displayName || "—"} {u.email === user.email && <span style={{ ...badge, background: "#e3f2fd", color: "#1565C0" }}>You</span>}</td>
                <td style={td}><span style={{ fontSize:11, color:"#666" }}>{u.email}</span></td>
                <td style={td}><span style={{ ...badge, background: "#e8f5e9", color: "#2e7d32" }}>{u.role}</span></td>
                <td style={td}>
                  <button onClick={() => { setForm({ id: u.id, email: u.email||"", displayName: u.displayName||"", role: u.role||"Viewer" }); setEditing(u.id); }} style={btnSm}>Edit</button>
                  <button onClick={() => del(u.id)} style={{ ...btnSm, background: "#ffebee", color: "#c62828" }}>Del</button>
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Shared helpers ────────────────────────────────────────────────────────────
function PageHeader({ title, sub }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h1 style={{ margin: 0, color: "#1565C0", fontSize: 24, fontFamily: "Georgia,serif" }}>{title}</h1>
      {sub && <p style={{ margin: "4px 0 0", color: "#888", fontSize: 13 }}>{sub}</p>}
    </div>
  );
}

const inp = { display: "block", width: "100%", padding: "8px 10px", borderRadius: 7, border: "1px solid #ddd", fontFamily: "Georgia,serif", fontSize: 13, boxSizing: "border-box", marginBottom: 8, outline: "none" };
const lbl = { fontSize: 11, color: "#555", display: "block", marginBottom: 3, fontWeight: "bold" };
const btnPrimary = { background: "#1565C0", color: "white", border: "none", padding: "9px 18px", borderRadius: 8, cursor: "pointer", fontFamily: "Georgia,serif", fontSize: 13 };
const btnSec = { background: "#e3f2fd", color: "#1565C0", border: "1px solid #90caf9", padding: "8px 14px", borderRadius: 8, cursor: "pointer", fontFamily: "Georgia,serif", fontSize: 13 };
const btnSm = { background: "#e3f2fd", color: "#1565C0", border: "none", padding: "3px 8px", borderRadius: 5, cursor: "pointer", fontFamily: "Georgia,serif", fontSize: 11, marginRight: 3 };
const th = { padding: "8px 10px", textAlign: "left", fontFamily: "Georgia,serif", fontSize: 12, color: "#333", fontWeight: "bold" };
const td = { padding: "7px 10px", fontSize: 12, verticalAlign: "middle" };
const badge = { display: "inline-block", padding: "2px 8px", borderRadius: 12, fontSize: 11, fontWeight: "bold" };

// ── Print Preview Context ─────────────────────────────────────────────────────
const PrintCtx = createContext(null);
function usePrint() { return useContext(PrintCtx); }

function PrintProvider({ children }) {
  const [preview, setPreview] = useState(null); // { html }

  const showPreview = (html) => setPreview(html);
  const close = () => setPreview(null);

  const doPrint = () => {
    const iframe = document.getElementById("roh-print-iframe");
    if (!iframe) return;
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
  };

  return (
    <PrintCtx.Provider value={showPreview}>
      {children}
      {preview && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:99999, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"flex-start", paddingTop:20 }}>
          {/* Toolbar */}
          <div style={{ background:"white", borderRadius:"12px 12px 0 0", padding:"10px 20px", display:"flex", gap:10, alignItems:"center", width:"80%", maxWidth:900, boxSizing:"border-box", borderBottom:"2px solid #1565C0" }}>
            <span style={{ fontWeight:"bold", color:"#1565C0", fontFamily:"Georgia,serif", flex:1 }}>🖨 Print Preview — Ray of Hope</span>
            <button onClick={doPrint} style={{ background:"#1565C0", color:"white", border:"none", padding:"8px 20px", borderRadius:7, cursor:"pointer", fontFamily:"Georgia,serif", fontWeight:"bold", fontSize:13 }}>🖨 Print / Save as PDF</button>
            <button onClick={close} style={{ background:"#ffebee", color:"#c62828", border:"none", padding:"8px 16px", borderRadius:7, cursor:"pointer", fontFamily:"Georgia,serif", fontSize:13 }}>✕ Close</button>
          </div>
          {/* iframe preview */}
          <iframe
            id="roh-print-iframe"
            srcDoc={preview}
            style={{ width:"80%", maxWidth:900, flex:1, maxHeight:"80vh", border:"none", background:"white", borderRadius:"0 0 12px 12px", boxShadow:"0 8px 32px rgba(0,0,0,0.3)" }}
            title="Print Preview"
          />
        </div>
      )}
    </PrintCtx.Provider>
  );
}

// ── Print helpers (use preview, not window.open) ──────────────────────────────
function performaHTML(title, rows) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title><style>
*{box-sizing:border-box}
body{font-family:Georgia,serif;margin:30px;color:#222;font-size:13px}
.header{display:flex;align-items:center;gap:16px;border-bottom:2px solid #1565C0;padding-bottom:14px;margin-bottom:20px}
.logo-circle{width:52px;height:52px;border:4px solid #1565C0;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:22px;color:#D32F2F;font-weight:bold}
.org{font-size:20px;font-weight:bold;color:#1565C0;line-height:1.2}
.sub{font-size:12px;color:#666;margin-top:2px}
table{width:100%;border-collapse:collapse}
tr td:first-child{font-weight:bold;color:#555;width:170px;background:#f5f5f5;padding:8px 12px;border-bottom:1px solid #e0e0e0}
tr td:last-child{padding:8px 12px;border-bottom:1px solid #e0e0e0}
.footer{margin-top:28px;border-top:1px solid #eee;padding-top:10px;font-size:10px;color:#999;display:flex;justify-content:space-between}
@media print{body{margin:15px}.no-print{display:none}}
</style></head><body>
<div class="header">
  <div class="logo-circle">امید</div>
  <div><div class="org">Ray of Hope</div><div class="sub">${title}</div></div>
  <div style="margin-left:auto;text-align:right;font-size:11px;color:#888">Date: ${new Date().toLocaleDateString("en-PK")}</div>
</div>
<table>${rows.map(([k,v])=>`<tr><td>${k}</td><td>${v||"—"}</td></tr>`).join("")}</table>
<div class="footer"><span>Ray of Hope NGO Management System</span><span>Printed: ${new Date().toLocaleDateString("en-PK")}</span></div>
</body></html>`;
}

function tableHTML(title, headers, rows) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title><style>
*{box-sizing:border-box}
body{font-family:Georgia,serif;margin:24px;color:#222;font-size:12px}
.header{display:flex;align-items:center;gap:12px;border-bottom:2px solid #1565C0;padding-bottom:12px;margin-bottom:16px}
.logo-circle{width:44px;height:44px;border:3px solid #1565C0;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;color:#D32F2F;font-weight:bold}
.org{font-size:17px;font-weight:bold;color:#1565C0}
.sub{font-size:11px;color:#666}
table{width:100%;border-collapse:collapse;margin-top:4px}
th{background:#1565C0;color:white;padding:8px 10px;text-align:left;font-size:11px}
td{padding:7px 10px;border-bottom:1px solid #e0e0e0;font-size:11px}
tr:nth-child(even) td{background:#f7f9fc}
tfoot td{background:#e3f2fd;font-weight:bold;font-size:11px;padding:8px 10px}
.footer{margin-top:16px;font-size:9px;color:#aaa;display:flex;justify-content:space-between;border-top:1px solid #eee;padding-top:8px}
@media print{body{margin:12px}}
</style></head><body>
<div class="header">
  <div class="logo-circle">امید</div>
  <div><div class="org">Ray of Hope</div><div class="sub">${title}</div></div>
  <div style="margin-left:auto;text-align:right;font-size:10px;color:#888">Generated: ${new Date().toLocaleDateString("en-PK")}</div>
</div>
<table>
<thead><tr>${headers.map(h=>`<th>${h}</th>`).join("")}</tr></thead>
<tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${c??""}</td>`).join("")}</tr>`).join("")}</tbody>
</table>
<div class="footer"><span>Ray of Hope NGO Management System</span><span>Total records: ${rows.length}</span></div>
</body></html>`;
}

function downloadCSV(rows, filename) {
  const csv = rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
  a.download = filename; document.body.appendChild(a); a.click(); document.body.removeChild(a);
}
