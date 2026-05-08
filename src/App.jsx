import { useState, useEffect, useCallback } from "react";

// ─── Firebase SDK (v8 compat via CDN já no index.html) ───────────────────────
// Assumindo que firebase está disponível globalmente via CDN
// Adicione no seu index.html:
// <script src="https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js"></script>
// <script src="https://www.gstatic.com/firebasejs/8.10.0/firebase-auth.js"></script>

const firebaseConfig = {
  apiKey: "AIzaSyCV-F0BDO5RmXj3C40LqQYu7GyPz_BRX9Y",
  authDomain: "unilivro.firebaseapp.com",
  projectId: "unilivro",
};

// Inicializa firebase apenas uma vez
let auth;
try {
  if (!window.firebase?.apps?.length) {
    window.firebase.initializeApp(firebaseConfig);
  }
  auth = window.firebase.auth();
} catch (e) {
  console.warn("Firebase não inicializado:", e);
}

// ─── Design Tokens ────────────────────────────────────────────────────────────
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,700&family=DM+Sans:wght@300;400;500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --ink:        #0D0D0D;
    --ink-soft:   #1A1A1A;
    --ink-ui:     #252525;
    --paper:      #F8F5F0;
    --paper-warm: #EFEBE4;
    --cream:      #FDFAF6;
    --red:        #B82828;
    --red-deep:   #8F1E1E;
    --red-glow:   rgba(184,40,40,0.15);
    --red-light:  #D94040;
    --sage:       #2E6B4F;
    --sage-bg:    #EAF3ED;
    --blue-soft:  #1E4FA0;
    --blue-bg:    #EAF0FB;
    --amber:      #9A6B00;
    --amber-bg:   #FFF7E0;
    --orange:     #B84A00;
    --orange-bg:  #FFF0E5;
    --border:     #E0D9D0;
    --muted:      #9A9080;
    --secondary:  #5A5248;
    --shadow-sm:  0 1px 4px rgba(0,0,0,0.07);
    --shadow:     0 4px 20px rgba(0,0,0,0.09);
    --shadow-lg:  0 16px 48px rgba(0,0,0,0.13);
    --r:          14px;
    --r-sm:       8px;
  }

  html { scroll-behavior: smooth; }

  body {
    font-family: 'DM Sans', sans-serif;
    background: var(--paper);
    color: var(--ink);
    min-height: 100vh;
    font-size: 15px;
    line-height: 1.6;
  }

  /* ── Navbar ── */
  .navbar {
    background: var(--ink);
    height: 64px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 2rem;
    position: sticky;
    top: 0;
    z-index: 300;
    border-bottom: 2.5px solid var(--red);
  }
  .nav-brand {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    text-decoration: none;
    cursor: pointer;
  }
  .nav-wordmark {
    font-family: 'Cormorant Garamond', serif;
    font-size: 1.45rem;
    font-weight: 700;
    color: #fff;
    letter-spacing: -0.01em;
  }
  .nav-wordmark em { color: var(--red-light); font-style: italic; }
  .nav-links { display: flex; align-items: center; gap: 0.4rem; }
  .nav-link {
    color: #888;
    text-decoration: none;
    font-size: 0.875rem;
    font-weight: 500;
    padding: 0.4rem 0.9rem;
    border-radius: 6px;
    transition: all 0.15s;
    background: none;
    border: none;
    cursor: pointer;
    font-family: 'DM Sans', sans-serif;
  }
  .nav-link:hover { color: #fff; background: var(--ink-ui); }
  .nav-link.add { color: var(--red-light); border: 1px solid rgba(184,40,40,0.35); }
  .nav-link.add:hover { background: var(--red); color: #fff; border-color: var(--red); }
  .nav-sep { width: 1px; height: 20px; background: #2a2a2a; margin: 0 0.4rem; }
  .nav-user { color: #666; font-size: 0.82rem; font-weight: 500; }
  .btn-logout {
    color: #555;
    font-size: 0.8rem;
    padding: 0.3rem 0.65rem;
    border-radius: 6px;
    border: none;
    background: none;
    cursor: pointer;
    font-family: 'DM Sans', sans-serif;
    transition: color 0.15s;
  }
  .btn-logout:hover { color: var(--red-light); }

  /* ── Flash ── */
  .flash {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.8rem 1.75rem;
    font-size: 0.875rem;
    font-weight: 500;
    animation: slideDown 0.3s ease;
  }
  .flash.success { background: var(--sage-bg); color: var(--sage); border-bottom: 2px solid var(--sage); }
  .flash.error   { background: #FEF0F0; color: var(--red); border-bottom: 2px solid var(--red); }
  .flash-close {
    background: none; border: none; cursor: pointer;
    font-size: 1.2rem; opacity: 0.5; color: inherit;
    transition: opacity 0.15s;
  }
  .flash-close:hover { opacity: 1; }

  /* ── Auth Layout ── */
  .auth-page {
    min-height: 100vh;
    display: grid;
    grid-template-columns: 1fr 480px;
  }

  .auth-left {
    background: var(--ink);
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }
  .auth-left-bg {
    position: absolute; inset: 0;
    background:
      radial-gradient(ellipse at 10% 80%, rgba(184,40,40,0.22) 0%, transparent 55%),
      radial-gradient(ellipse at 85% 15%, rgba(184,40,40,0.10) 0%, transparent 50%);
    pointer-events: none;
  }
  .auth-left-line {
    position: absolute; top: 0; right: 0;
    width: 3px; height: 100%;
    background: linear-gradient(to bottom, var(--red), var(--red-deep));
  }
  .auth-left-inner {
    position: relative; z-index: 2;
    padding: 3rem 3.5rem;
    max-width: 520px;
    animation: fadeUp 0.6s ease both;
  }
  .hero-monogram {
    font-family: 'Cormorant Garamond', serif;
    font-size: 3rem;
    font-weight: 700;
    color: var(--red-light);
    margin-bottom: 2rem;
    display: block;
    letter-spacing: -0.02em;
  }
  .hero-tagline {
    font-family: 'Cormorant Garamond', serif;
    font-size: clamp(2.4rem, 3.8vw, 3.4rem);
    font-weight: 700;
    color: #fff;
    line-height: 1.08;
    margin-bottom: 1.25rem;
  }
  .hero-tagline em { color: var(--red-light); font-style: italic; }
  .hero-desc { color: #777; font-size: 0.975rem; line-height: 1.75; margin-bottom: 2rem; }
  .hero-rule { width: 40px; height: 2px; background: var(--red); margin-bottom: 1.75rem; }
  .hero-pills { display: flex; flex-wrap: wrap; gap: 0.45rem; }
  .pill {
    background: #1a1a1a; color: #777;
    border: 1px solid #2a2a2a;
    padding: 0.28rem 0.8rem;
    border-radius: 100px;
    font-size: 0.8rem; font-weight: 500;
  }
  .hero-list { list-style: none; display: flex; flex-direction: column; gap: 0.6rem; color: #777; font-size: 0.925rem; }
  .hero-list li::before { content: '→ '; color: var(--red-light); }

  .auth-right {
    background: var(--cream);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2.5rem 2rem;
    border-left: 1px solid var(--border);
  }
  .auth-card {
    width: 100%;
    max-width: 370px;
    animation: fadeUp 0.5s ease 0.15s both;
  }
  .card-eyebrow {
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--red);
    margin-bottom: 0.5rem;
  }
  .card-title {
    font-family: 'Cormorant Garamond', serif;
    font-size: 2.1rem;
    font-weight: 700;
    color: var(--ink);
    margin-bottom: 0.3rem;
    line-height: 1.1;
  }
  .card-sub { color: var(--muted); font-size: 0.875rem; margin-bottom: 2rem; }

  /* ── Forms ── */
  .auth-form, .book-form { display: flex; flex-direction: column; gap: 1.1rem; }
  .field-group { display: flex; flex-direction: column; gap: 0.35rem; flex: 1; }
  .field-row { display: flex; gap: 0.9rem; }
  label {
    font-size: 0.72rem;
    font-weight: 700;
    color: var(--ink);
    text-transform: uppercase;
    letter-spacing: 0.07em;
  }
  .opt { font-weight: 400; text-transform: none; color: var(--muted); letter-spacing: 0; }

  input[type="text"],
  input[type="email"],
  input[type="password"],
  select,
  textarea {
    width: 100%;
    padding: 0.72rem 0.95rem;
    border: 1.5px solid var(--border);
    border-radius: var(--r-sm);
    background: #fff;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.95rem;
    color: var(--ink);
    transition: all 0.15s;
    outline: none;
    -webkit-appearance: none;
  }
  input:focus, select:focus, textarea:focus {
    border-color: var(--red);
    box-shadow: 0 0 0 3px var(--red-glow);
  }
  input::placeholder, textarea::placeholder { color: var(--muted); }
  select { cursor: pointer; }
  textarea { resize: vertical; min-height: 80px; }

  .radio-group { display: flex; gap: 0.45rem; flex-wrap: wrap; padding-top: 0.15rem; }
  .radio-chip { cursor: pointer; }
  .radio-chip input { display: none; }
  .radio-chip span {
    display: block;
    padding: 0.38rem 0.85rem;
    border: 1.5px solid var(--border);
    border-radius: 100px;
    font-size: 0.82rem; font-weight: 500;
    color: var(--secondary);
    transition: all 0.15s;
    background: #fff;
    user-select: none;
  }
  .radio-chip input:checked + span {
    border-color: var(--red);
    background: var(--red);
    color: #fff;
    font-weight: 600;
  }

  /* ── Buttons ── */
  .btn-primary {
    background: var(--red);
    color: #fff;
    border: none;
    padding: 0.8rem 1.5rem;
    border-radius: var(--r-sm);
    font-family: 'DM Sans', sans-serif;
    font-size: 0.95rem; font-weight: 600;
    cursor: pointer;
    display: inline-flex; align-items: center; justify-content: center;
    gap: 0.4rem;
    transition: all 0.18s;
    white-space: nowrap;
    text-decoration: none;
    letter-spacing: 0.01em;
  }
  .btn-primary:hover:not(:disabled) {
    background: var(--red-deep);
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(184,40,40,0.28);
  }
  .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

  .btn-ghost {
    background: transparent; color: var(--secondary);
    border: 1.5px solid var(--border);
    padding: 0.72rem 1.2rem; border-radius: var(--r-sm);
    font-family: 'DM Sans', sans-serif; font-size: 0.9rem; font-weight: 500;
    cursor: pointer; text-decoration: none; transition: all 0.15s; white-space: nowrap;
    display: inline-flex; align-items: center;
  }
  .btn-ghost:hover { border-color: #aaa; color: var(--ink); }

  .switch-link {
    text-align: center; margin-top: 1.5rem;
    color: var(--muted); font-size: 0.875rem;
  }
  .switch-link button {
    color: var(--red); background: none; border: none;
    font-weight: 600; cursor: pointer; font-size: 0.875rem;
    font-family: 'DM Sans', sans-serif;
  }
  .switch-link button:hover { text-decoration: underline; }

  /* ── Page Layout ── */
  .page-container { max-width: 1100px; margin: 0 auto; padding: 2.5rem 1.5rem 5rem; }
  .page-header {
    display: flex; align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 2rem; gap: 1rem; flex-wrap: wrap;
  }
  .page-eyebrow {
    font-size: 0.68rem; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.12em;
    color: var(--red); margin-bottom: 0.3rem;
  }
  .page-title {
    font-family: 'Cormorant Garamond', serif;
    font-size: 2.2rem; font-weight: 700;
    color: var(--ink); line-height: 1.1;
  }
  .page-sub { color: var(--muted); font-size: 0.875rem; margin-top: 0.25rem; }

  /* ── Stats bar ── */
  .stats-bar {
    display: flex; align-items: center; gap: 1rem;
    margin-bottom: 1.75rem; padding: 0.9rem 1.25rem;
    background: #fff; border-radius: var(--r-sm);
    border: 1px solid var(--border); box-shadow: var(--shadow-sm);
  }
  .stat-item { display: flex; align-items: center; gap: 0.35rem; font-size: 0.875rem; color: var(--secondary); }
  .stat-item strong { color: var(--ink); font-weight: 700; }
  .stat-item.avail strong { color: var(--sage); }
  .stat-sep { color: var(--border); font-size: 1.1rem; }

  /* ── Books Grid ── */
  .books-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
    gap: 1.2rem;
  }

  .book-card {
    background: #fff;
    border-radius: var(--r);
    border: 1px solid var(--border);
    box-shadow: var(--shadow-sm);
    overflow: hidden;
    display: flex; flex-direction: column;
    transition: transform 0.2s, box-shadow 0.2s;
    animation: fadeUp 0.4s ease both;
  }
  .book-card:hover { transform: translateY(-3px); box-shadow: var(--shadow-lg); }
  .book-card.paused { opacity: 0.5; }

  .book-stripe { height: 3px; background: var(--red); flex-shrink: 0; }
  .book-card.paused .book-stripe { background: var(--border); }

  .book-body { padding: 1.1rem 1.2rem 0.9rem; display: flex; flex-direction: column; gap: 0.5rem; flex: 1; }
  .book-meta { display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap; }

  .badge {
    font-size: 0.68rem; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.05em;
    padding: 0.15rem 0.55rem; border-radius: 4px;
  }
  .badge.cat   { color: var(--muted); background: var(--paper-warm); }
  .badge.on    { color: var(--sage);  background: var(--sage-bg); }
  .badge.off   { color: var(--muted); background: var(--paper-warm); }
  .badge.novo  { color: var(--sage);  background: var(--sage-bg); }
  .badge.otimo { color: var(--blue-soft); background: var(--blue-bg); }
  .badge.bom   { color: var(--amber); background: var(--amber-bg); }
  .badge.reg   { color: var(--orange); background: var(--orange-bg); }

  .book-title {
    font-family: 'Cormorant Garamond', serif;
    font-size: 1.15rem; font-weight: 700;
    color: var(--ink); line-height: 1.2;
  }
  .book-author { font-size: 0.855rem; color: var(--secondary); }
  .book-isbn   { font-size: 0.74rem; color: var(--muted); }
  .book-desc   {
    font-size: 0.82rem; color: var(--muted); line-height: 1.5;
    display: -webkit-box; -webkit-line-clamp: 2;
    -webkit-box-orient: vertical; overflow: hidden;
  }

  .book-actions {
    display: flex; gap: 0.5rem;
    margin-top: auto; padding: 0.75rem 1.2rem;
    border-top: 1px solid var(--border);
  }
  .btn-card {
    flex: 1; text-align: center;
    padding: 0.45rem 0.5rem;
    border-radius: var(--r-sm);
    font-size: 0.8rem; font-weight: 600;
    transition: all 0.15s; cursor: pointer;
    border: 1.5px solid; background: none;
    font-family: 'DM Sans', sans-serif;
  }
  .btn-card.toggle { color: var(--ink); border-color: var(--border); background: var(--paper); }
  .btn-card.toggle:hover { border-color: var(--ink); background: var(--ink); color: #fff; }
  .btn-card.del { color: var(--red); border-color: rgba(184,40,40,0.22); }
  .btn-card.del:hover { background: var(--red); color: #fff; border-color: var(--red); }

  /* ── Form Card ── */
  .form-card {
    background: #fff; border-radius: var(--r);
    box-shadow: var(--shadow); padding: 2rem 2.25rem;
    border: 1px solid var(--border);
  }
  .form-section { padding-bottom: 1.75rem; margin-bottom: 1.75rem; border-bottom: 1px solid var(--border); }
  .form-section.last { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
  .section-label {
    display: block; font-size: 0.7rem; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.11em;
    color: var(--red); margin-bottom: 1rem;
  }
  .form-actions {
    display: flex; justify-content: flex-end; gap: 0.75rem;
    margin-top: 2rem; padding-top: 1.5rem;
    border-top: 1px solid var(--border);
  }

  /* ── Empty state ── */
  .empty-state {
    text-align: center; padding: 6rem 2rem;
    color: var(--muted);
    animation: fadeUp 0.4s ease both;
  }
  .empty-icon { font-size: 3.5rem; margin-bottom: 1.25rem; opacity: 0.25; }
  .empty-state h2 {
    font-family: 'Cormorant Garamond', serif;
    font-size: 1.8rem; color: var(--ink);
    margin-bottom: 0.6rem; font-weight: 700;
  }
  .empty-state p { font-size: 0.95rem; margin-bottom: 2rem; }

  /* ── Loading ── */
  .loading {
    display: flex; align-items: center; justify-content: center;
    height: 60vh; gap: 0.5rem; color: var(--muted);
    font-size: 0.9rem; letter-spacing: 0.05em;
  }
  .spinner {
    width: 18px; height: 18px;
    border: 2px solid var(--border);
    border-top-color: var(--red);
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }

  /* ── Animations ── */
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(14px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes slideDown {
    from { transform: translateY(-100%); opacity: 0; }
    to   { transform: translateY(0); opacity: 1; }
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  /* ── Responsive ── */
  @media (max-width: 900px) {
    .auth-page { grid-template-columns: 1fr; }
    .auth-left { min-height: 260px; }
    .auth-left-inner { padding: 2rem 1.5rem; }
    .hero-tagline { font-size: 2.2rem; }
    .auth-right { padding: 2rem 1.25rem; }
    .field-row { flex-direction: column; }
  }
  @media (max-width: 600px) {
    .navbar { padding: 0 1rem; }
    .nav-user { display: none; }
    .page-container { padding: 1.5rem 1rem 4rem; }
    .page-header { flex-direction: column; align-items: flex-start; }
    .books-grid { grid-template-columns: 1fr; }
    .form-card { padding: 1.25rem; }
    .form-actions { flex-direction: column-reverse; }
    .btn-primary, .btn-ghost { width: 100%; justify-content: center; }
  }
`;

// ─── Helpers ─────────────────────────────────────────────────────────────────
function condClass(cond) {
  const map = { Novo: "novo", Ótimo: "otimo", Bom: "bom", Regular: "reg" };
  return map[cond] || "bom";
}

async function apiCall(path, options = {}) {
  const user = auth?.currentUser;
  const token = user ? await user.getIdToken() : localStorage.getItem("token");
  return fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: token,
      ...(options.headers || {}),
    },
  });
}

// ─── Flash ────────────────────────────────────────────────────────────────────
function Flash({ msg, type, onClose }) {
  if (!msg) return null;
  return (
    <div className={`flash ${type}`}>
      <span>{msg}</span>
      <button className="flash-close" onClick={onClose}>×</button>
    </div>
  );
}

// ─── Navbar ───────────────────────────────────────────────────────────────────
function Navbar({ user, navigate }) {
  const nome = user?.email?.split("@")[0];

  function logout() {
    auth?.signOut();
    localStorage.removeItem("token");
    navigate("login");
  }

  if (!user) return null;
  return (
    <nav className="navbar">
      <div className="nav-brand" onClick={() => navigate("meus-livros")}>
        <span className="nav-wordmark">Uni<em>Livro</em></span>
      </div>
      <div className="nav-links">
        <button className="nav-link" onClick={() => navigate("meus-livros")}>Meus Livros</button>
        <button className="nav-link add" onClick={() => navigate("cadastrar-livro")}>+ Adicionar</button>
        <div className="nav-sep" />
        <span className="nav-user">{nome}</span>
        <button className="btn-logout" onClick={logout}>Sair</button>
      </div>
    </nav>
  );
}

// ─── Login Page ───────────────────────────────────────────────────────────────
function LoginPage({ navigate, setFlash }) {
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.target);
    try {
      const cred = await auth.signInWithEmailAndPassword(fd.get("email"), fd.get("password"));
      const token = await cred.user.getIdToken();
      localStorage.setItem("token", token);
      navigate("meus-livros");
    } catch (err) {
      setFlash({ msg: "E-mail ou senha incorretos.", type: "error" });
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-left">
        <div className="auth-left-bg" />
        <div className="auth-left-line" />
        <div className="auth-left-inner">
          <span className="hero-monogram">UL</span>
          <h1 className="hero-tagline">
            Troque livros.<br /><em>Multiplique</em><br />conhecimento.
          </h1>
          <p className="hero-desc">
            A plataforma de troca de livros da sua universidade. Conecte-se com
            colegas e dê uma nova vida aos seus livros.
          </p>
          <div className="hero-rule" />
          <div className="hero-pills">
            {["📚 Acadêmicos", "🗡 Ficção", "💭 Romance", "✨ Auto-ajuda"].map(p => (
              <span className="pill" key={p}>{p}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-card">
          <p className="card-eyebrow">Bem-vindo de volta</p>
          <h2 className="card-title">Entrar na conta</h2>
          <p className="card-sub">Acesse sua conta UniLivro</p>
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="field-group">
              <label htmlFor="email">E-mail</label>
              <input type="email" id="email" name="email" placeholder="seu@email.com" required />
            </div>
            <div className="field-group">
              <label htmlFor="password">Senha</label>
              <input type="password" id="password" name="password" placeholder="••••••••" required />
            </div>
            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? "Entrando…" : "Entrar"}
            </button>
          </form>
          <p className="switch-link">
            Não tem conta?{" "}
            <button onClick={() => navigate("cadastro")}>Cadastre-se</button>
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Cadastro Page ────────────────────────────────────────────────────────────
function CadastroPage({ navigate, setFlash }) {
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.target);
    const data = Object.fromEntries(fd);
    try {
      const cred = await auth.createUserWithEmailAndPassword(data.email, data.password);
      const token = await cred.user.getIdToken();
      localStorage.setItem("token", token);
      await apiCall("/api/usuarios", {
        method: "POST",
        body: JSON.stringify({ name: data.name, curso: data.curso, email: data.email }),
      });
      navigate("meus-livros");
    } catch (err) {
      setFlash({ msg: err.message, type: "error" });
      setLoading(false);
    }
  }

  const cursos = [
    "Administração", "Ciência de Dados", "Engenharia de Computação",
    "Engenharia de Produção", "Inteligência Artificial", "Letras",
    "Matemática", "Pedagogia", "Tecnologia da Informação",
    "Tecnologia em Processos Gerenciais",
  ];

  return (
    <div className="auth-page">
      <div className="auth-left">
        <div className="auth-left-bg" />
        <div className="auth-left-line" />
        <div className="auth-left-inner">
          <span className="hero-monogram">UL</span>
          <h1 className="hero-tagline">
            Bem-vindo à<br /><em>comunidade</em><br />UniLivro.
          </h1>
          <p className="hero-desc">
            Crie sua conta gratuitamente e comece a trocar livros com estudantes do seu campus.
          </p>
          <div className="hero-rule" />
          <ul className="hero-list">
            <li>Cadastro rápido e gratuito</li>
            <li>Troque livros acadêmicos e pessoais</li>
            <li>Conecte-se com colegas do seu curso</li>
          </ul>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-card">
          <p className="card-eyebrow">Crie sua conta</p>
          <h2 className="card-title">Criar conta</h2>
          <p className="card-sub">Preencha seus dados para começar</p>
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="field-group">
              <label htmlFor="name">Nome completo</label>
              <input type="text" id="name" name="name" placeholder="Seu nome completo" required />
            </div>
            <div className="field-group">
              <label htmlFor="email">E-mail</label>
              <input type="email" id="email" name="email" placeholder="seu@email.com" required />
            </div>
            <div className="field-group">
              <label htmlFor="curso">Curso</label>
              <select id="curso" name="curso" required defaultValue="">
                <option value="" disabled>Selecione seu curso</option>
                {cursos.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="field-group">
              <label htmlFor="password">Senha</label>
              <input type="password" id="password" name="password" placeholder="Mínimo 6 caracteres" minLength={6} required />
            </div>
            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? "Criando conta…" : "Criar minha conta"}
            </button>
          </form>
          <p className="switch-link">
            Já tem conta?{" "}
            <button onClick={() => navigate("login")}>Fazer login</button>
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Meus Livros Page ─────────────────────────────────────────────────────────
function MeusLivrosPage({ user, navigate, setFlash }) {
  const [livros, setLivros] = useState([]);
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiCall("/api/livros");
      const data = await res.json();
      setLivros(data);
    } catch {
      setFlash({ msg: "Erro ao carregar livros.", type: "error" });
    } finally {
      setLoading(false);
    }
  }, [setFlash]);

  useEffect(() => { carregar(); }, [carregar]);

  async function deletar(id) {
    if (!confirm("Remover este livro?")) return;
    await apiCall(`/api/livros/${id}`, { method: "DELETE" });
    carregar();
  }

  async function toggle(id) {
    await apiCall(`/api/livros/${id}/toggle`, { method: "PATCH" });
    carregar();
  }

  const total = livros.length;
  const disponiveis = livros.filter(l => l.disponivel).length;
  const nome = user?.email?.split("@")[0];

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <p className="page-eyebrow">Seu acervo</p>
          <h1 className="page-title">Meus Livros</h1>
          {nome && <p className="page-sub">{nome}</p>}
        </div>
        <button className="btn-primary" onClick={() => navigate("cadastrar-livro")}>
          + Adicionar Livro
        </button>
      </div>

      {!loading && total > 0 && (
        <div className="stats-bar">
          <div className="stat-item">
            <strong>{total}</strong> livro{total !== 1 ? "s" : ""}
          </div>
          <div className="stat-sep">·</div>
          <div className="stat-item avail">
            <strong>{disponiveis}</strong> disponíve{disponiveis !== 1 ? "is" : "l"}
          </div>
          <div className="stat-sep">·</div>
          <div className="stat-item">
            <strong>{total - disponiveis}</strong> pausado{total - disponiveis !== 1 ? "s" : ""}
          </div>
        </div>
      )}

      {loading ? (
        <div className="loading">
          <div className="spinner" /> Carregando livros…
        </div>
      ) : total === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📚</div>
          <h2>Nenhum livro cadastrado</h2>
          <p>Adicione seus primeiros livros e comece a fazer trocas!</p>
          <button className="btn-primary" onClick={() => navigate("cadastrar-livro")}>
            + Cadastrar meu primeiro livro
          </button>
        </div>
      ) : (
        <div className="books-grid">
          {livros.map((book, i) => (
            <div
              className={`book-card ${!book.disponivel ? "paused" : ""}`}
              key={book.id}
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <div className="book-stripe" />
              <div className="book-body">
                <div className="book-meta">
                  {book.categoria && <span className="badge cat">{book.categoria}</span>}
                  <span className={`badge ${book.disponivel ? "on" : "off"}`}>
                    {book.disponivel ? "Disponível" : "Pausado"}
                  </span>
                </div>
                <div className="book-title">{book.title}</div>
                <div className="book-author">{book.author}</div>
                {book.isbn && <div className="book-isbn">ISBN {book.isbn}</div>}
                {book.condicao && (
                  <span className={`badge ${condClass(book.condicao)}`}>{book.condicao}</span>
                )}
                {book.descricao && <div className="book-desc">{book.descricao}</div>}
              </div>
              <div className="book-actions">
                <button className="btn-card toggle" onClick={() => toggle(book.id)}>
                  {book.disponivel ? "Pausar" : "Ativar"}
                </button>
                <button className="btn-card del" onClick={() => deletar(book.id)}>
                  Remover
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Cadastrar Livro Page ─────────────────────────────────────────────────────
function CadastrarLivroPage({ navigate, setFlash }) {
  const [loading, setLoading] = useState(false);
  const [condicao, setCondicao] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    const data = Object.fromEntries(new FormData(e.target));
    try {
      const res = await apiCall("/api/livros", {
        method: "POST",
        body: JSON.stringify(data),
      });
      if (res.ok) {
        setFlash({ msg: "Livro cadastrado com sucesso!", type: "success" });
        navigate("meus-livros");
      } else {
        throw new Error();
      }
    } catch {
      setFlash({ msg: "Erro ao cadastrar livro. Tente novamente.", type: "error" });
      setLoading(false);
    }
  }

  const categorias = {
    "Acadêmicos": ["Ciências Exatas e Tecnologia", "Ciências Biológicas e Saúde", "Ciências Humanas", "Ciências Sociais Aplicadas", "Direito", "Linguagens e Artes", "Didático / Vestibular"],
    "Literatura":  ["Ficção Científica", "Fantasia / Aventura", "Romance", "Terror / Suspense", "Literatura Brasileira", "Literatura Internacional"],
    "Outros":      ["Auto-ajuda / Desenvolvimento Pessoal", "Biografia / Memórias", "História / Política", "Filosofia", "Outro"],
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <p className="page-eyebrow">Novo registro</p>
          <h1 className="page-title">Cadastrar Livro</h1>
          <p className="page-sub">Adicione um livro ao seu acervo para troca</p>
        </div>
        <button className="btn-ghost" onClick={() => navigate("meus-livros")}>← Voltar</button>
      </div>

      <div className="form-card">
        <form onSubmit={handleSubmit} className="book-form">
          <div className="form-section">
            <span className="section-label">Informações</span>
            <div className="field-group">
              <label htmlFor="title">Título *</label>
              <input type="text" id="title" name="title" placeholder="Ex: O Senhor dos Anéis" required />
            </div>
            <div className="field-row" style={{ marginTop: "0.9rem" }}>
              <div className="field-group">
                <label htmlFor="author">Autor *</label>
                <input type="text" id="author" name="author" placeholder="Ex: J.R.R. Tolkien" required />
              </div>
              <div className="field-group">
                <label htmlFor="isbn">ISBN <span className="opt">opcional</span></label>
                <input type="text" id="isbn" name="isbn" placeholder="978-85-…" />
              </div>
            </div>
          </div>

          <div className="form-section">
            <span className="section-label">Classificação</span>
            <div className="field-row">
              <div className="field-group">
                <label htmlFor="categoria">Categoria *</label>
                <select id="categoria" name="categoria" required defaultValue="">
                  <option value="" disabled>Selecione</option>
                  {Object.entries(categorias).map(([group, opts]) => (
                    <optgroup key={group} label={`── ${group} ──`}>
                      {opts.map(o => <option key={o}>{o}</option>)}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div className="field-group">
                <label>Condição *</label>
                <div className="radio-group">
                  {["Novo", "Ótimo", "Bom", "Regular"].map(c => (
                    <label className="radio-chip" key={c}>
                      <input
                        type="radio" name="condicao" value={c}
                        required
                        checked={condicao === c}
                        onChange={() => setCondicao(c)}
                      />
                      <span>{c}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="form-section last">
            <span className="section-label">Observações</span>
            <div className="field-group">
              <label htmlFor="descricao">Descrição <span className="opt">opcional</span></label>
              <textarea
                id="descricao" name="descricao" rows={3}
                placeholder="Ex: Anotações a lápis, edição especial, capa levemente amassada…"
              />
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn-ghost" onClick={() => navigate("meus-livros")}>
              Cancelar
            </button>
            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? "Salvando…" : "Cadastrar Livro"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── App Root ─────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState("loading");
  const [user, setUser] = useState(null);
  const [flash, setFlash] = useState(null);

  useEffect(() => {
    if (!auth) { setPage("login"); return; }
    const unsub = auth.onAuthStateChanged(u => {
      setUser(u);
      if (!u) {
        setPage("login");
      } else if (page === "loading" || page === "login" || page === "cadastro") {
        setPage("meus-livros");
      }
    });
    return unsub;
  }, []); // eslint-disable-line

  function navigate(p) {
    setFlash(null);
    setPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const publicPages = ["login", "cadastro"];
  const isPublic = publicPages.includes(page);

  if (page === "loading") {
    return (
      <>
        <style>{styles}</style>
        <div className="loading"><div className="spinner" /> Carregando…</div>
      </>
    );
  }

  return (
    <>
      <style>{styles}</style>
      {!isPublic && <Navbar user={user} navigate={navigate} />}
      {flash && (
        <Flash msg={flash.msg} type={flash.type} onClose={() => setFlash(null)} />
      )}
      {page === "login"           && <LoginPage navigate={navigate} setFlash={setFlash} />}
      {page === "cadastro"        && <CadastroPage navigate={navigate} setFlash={setFlash} />}
      {page === "meus-livros"     && <MeusLivrosPage user={user} navigate={navigate} setFlash={setFlash} />}
      {page === "cadastrar-livro" && <CadastrarLivroPage navigate={navigate} setFlash={setFlash} />}
    </>
  );
}
