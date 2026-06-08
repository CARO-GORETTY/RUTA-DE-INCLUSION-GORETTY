import { useState, useEffect, useRef } from "react";

// ─── PALETA ───────────────────────────────────────────────────────────────
const C = {
  navy:    "#1A3A5C",
  blue:    "#2E6DA4",
  sky:     "#5B9BD5",
  light:   "#BDD7EE",
  pale:    "#EEF5FB",
  white:   "#FFFFFF",
  red:     "#C00000",
  redBg:   "#FFC7CE",
  amber:   "#FF8C00",
  amberBg: "#FFEB9C",
  green:   "#375623",
  greenBg: "#E2EFDA",
  gray:    "#6B7280",
  grayL:   "#F3F4F6",
  border:  "#D1E3F0",
};

// ─── CATEGORÍAS Y OPCIONES ────────────────────────────────────────────────
const CATEGORIAS = ["Cognitiva","Psicológica","Médica","Mixta","En observación"];
const PROCESOS   = ["DUA","PIAR","En definición"];
const PRIORIDADES= ["Alta","Media","Baja"];
const GRADOS     = ["Jardín","Transición","1","2","3","4A","4B","5A","5B","6","7","8","9","10","11"];

// ─── VISTAS ───────────────────────────────────────────────────────────────
const VIEWS = { INICIO: "inicio", NUEVO: "nuevo", PANEL: "panel", CONFIG: "config" };

// ─── ESTILOS GLOBALES ─────────────────────────────────────────────────────
const globalStyle = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'DM Sans', sans-serif; background: ${C.pale}; color: #1e293b; }
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: ${C.pale}; }
  ::-webkit-scrollbar-thumb { background: ${C.light}; border-radius: 3px; }
  @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
  @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:.5; } }
  @keyframes spin { to { transform: rotate(360deg); } }
  .fade-up { animation: fadeUp .45s ease both; }
  .fade-up-2 { animation: fadeUp .45s .1s ease both; }
  .fade-up-3 { animation: fadeUp .45s .2s ease both; }
`;

// ─── HELPERS ──────────────────────────────────────────────────────────────
function semaforo(hx, prioridad) {
  if (hx === "Sí") return { icon: "🟢", label: "Al día",   bg: C.greenBg, color: C.green };
  if (prioridad === "Alta") return { icon: "🔴", label: "Urgente", bg: C.redBg,   color: C.red   };
  return { icon: "🟡", label: "Revisar", bg: C.amberBg, color: C.amber  };
}

function catColor(cat) {
  const m = { Cognitiva: C.blue, Psicológica: "#7C3AED", Médica: C.red, Mixta: "#0891B2", "En observación": C.gray };
  return m[cat] || C.gray;
}

// ─── LLAMADA A LA API DE ANTHROPIC ───────────────────────────────────────
async function analizarCasoIA(descripcion) {
  const prompt = `Eres un psicólogo escolar experto en inclusión educativa en Colombia. Analiza la siguiente descripción de un caso escolar y responde ÚNICAMENTE en JSON válido, sin texto adicional, sin markdown, sin explicaciones.

Descripción del docente: "${descripcion}"

Responde con este JSON exacto:
{
  "dx_estandarizado": "nombre del diagnóstico estandarizado más probable (ej: TDAH / dificultades de atención e hiperactividad)",
  "categoria": "una de: Cognitiva, Psicológica, Médica, Mixta, En observación",
  "prioridad": "una de: Alta, Media, Baja",
  "proceso_sugerido": "una de: DUA, PIAR, En definición",
  "recomendaciones": "3 recomendaciones cortas para el docente, separadas por •",
  "senales": "2-3 señales observables, separadas por •",
  "seguimiento": "una acción de seguimiento concreta"
}`;

  const response = await fetch("/api/analizar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ descripcion }),
  });
  const data = await response.json();
  if (data.error) throw new Error(data.error);
  return data;
}

// ─── ENVIAR A GOOGLE SHEETS ───────────────────────────────────────────────
async function enviarASheets(sheetsUrl, caso) {
  // Usa Apps Script Web App URL
  const params = new URLSearchParams({
    estudiante: caso.estudiante,
    grado: caso.grado,
    docente: caso.docente,
    dx_original: caso.dx_original,
    dx_estandarizado: caso.dx_estandarizado,
    categoria: caso.categoria,
    proceso: caso.proceso,
    hx_clinica: caso.hx_clinica,
    prioridad: caso.prioridad,
    semaforo: semaforo(caso.hx_clinica, caso.prioridad).label,
    recomendaciones: caso.recomendaciones,
    seguimiento: caso.seguimiento,
    fecha: new Date().toLocaleDateString("es-CO"),
  });
  await fetch(`${sheetsUrl}?${params}`, { method: "GET", mode: "no-cors" });
}

// ─── COMPONENTES UI ───────────────────────────────────────────────────────
function Badge({ children, bg, color }) {
  return (
    <span style={{
      background: bg, color, fontSize: 11, fontWeight: 600,
      padding: "2px 10px", borderRadius: 20, display: "inline-block"
    }}>{children}</span>
  );
}

function Card({ children, style = {} }) {
  return (
    <div style={{
      background: C.white, borderRadius: 16, border: `1px solid ${C.border}`,
      padding: 24, boxShadow: "0 2px 12px rgba(26,58,92,.07)", ...style
    }}>{children}</div>
  );
}

function Input({ label, value, onChange, type = "text", placeholder, required }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: C.navy, textTransform: "uppercase", letterSpacing: .5 }}>
        {label}{required && <span style={{ color: C.red }}> *</span>}
      </label>
      <input
        type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "10px 14px",
          fontSize: 14, outline: "none", transition: "border .2s",
          fontFamily: "DM Sans, sans-serif",
          background: C.white,
        }}
        onFocus={e => e.target.style.borderColor = C.blue}
        onBlur={e => e.target.style.borderColor = C.border}
      />
    </div>
  );
}

function Select({ label, value, onChange, options, required }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: C.navy, textTransform: "uppercase", letterSpacing: .5 }}>
        {label}{required && <span style={{ color: C.red }}> *</span>}
      </label>
      <select
        value={value} onChange={e => onChange(e.target.value)}
        style={{
          border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "10px 14px",
          fontSize: 14, outline: "none", background: C.white,
          fontFamily: "DM Sans, sans-serif", cursor: "pointer",
        }}
      >
        <option value="">Seleccionar...</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function Btn({ children, onClick, variant = "primary", disabled, style = {} }) {
  const base = {
    padding: "11px 22px", borderRadius: 10, fontWeight: 600, fontSize: 14,
    cursor: disabled ? "not-allowed" : "pointer", border: "none",
    transition: "all .2s", fontFamily: "DM Sans, sans-serif",
    opacity: disabled ? .6 : 1, ...style
  };
  const variants = {
    primary: { background: C.navy, color: C.white },
    secondary: { background: C.pale, color: C.navy, border: `1.5px solid ${C.border}` },
    success: { background: C.green, color: C.white },
    danger: { background: C.red, color: C.white },
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{ ...base, ...variants[variant] }}>
      {children}
    </button>
  );
}

// ─── APP PRINCIPAL ────────────────────────────────────────────────────────
export default function RutaInclusionApp() {
  const [view, setView]         = useState(VIEWS.INICIO);
  const [casos, setCasos]       = useState([]);
  const [sheetsUrl, setSheetsUrl] = useState("");
  const [sheetsOk, setSheetsOk] = useState(false);
  const [filtro, setFiltro]     = useState("");
  const [filtroCat, setFiltroCat] = useState("");

  // Formulario
  const emptyForm = {
    estudiante: "", grado: "", docente: "", dx_original: "",
    descripcion_libre: "", hx_clinica: "No",
    // IA rellena:
    dx_estandarizado: "", categoria: "", prioridad: "Media",
    proceso: "DUA", recomendaciones: "", senales: "", seguimiento: "",
  };
  const [form, setForm]         = useState(emptyForm);
  const [iaLoading, setIaLoading] = useState(false);
  const [iaResult, setIaResult] = useState(null);
  const [iaError, setIaError]   = useState("");
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [step, setStep]         = useState(1); // 1=datos básicos, 2=IA análisis, 3=confirmar

  function setF(k) { return v => setForm(f => ({ ...f, [k]: v })); }

  // ─── PASO 2: Analizar con IA ─────────────────────────────────────────
  async function handleAnalizar() {
    if (!form.descripcion_libre.trim()) { setIaError("Escribe la descripción del caso antes de analizar."); return; }
    setIaError(""); setIaLoading(true); setIaResult(null);
    try {
      const res = await analizarCasoIA(form.descripcion_libre);
      setIaResult(res);
      setForm(f => ({
        ...f,
        dx_estandarizado: res.dx_estandarizado || f.dx_estandarizado,
        categoria:        res.categoria        || f.categoria,
        prioridad:        res.prioridad        || f.prioridad,
        proceso:          res.proceso_sugerido || f.proceso,
        recomendaciones:  res.recomendaciones  || f.recomendaciones,
        senales:          res.senales          || f.senales,
        seguimiento:      res.seguimiento      || f.seguimiento,
      }));
      setStep(3);
    } catch(e) {
      setIaError("No se pudo analizar. Revisa la descripción e intenta de nuevo.");
    } finally { setIaLoading(false); }
  }

  // ─── PASO 3: Guardar caso ────────────────────────────────────────────
  async function handleGuardar() {
    if (!form.estudiante || !form.grado || !form.docente) {
      setIaError("Completa los datos básicos del estudiante."); return;
    }
    setSaving(true);
    const nuevo = { ...form, id: Date.now(), fecha: new Date().toLocaleDateString("es-CO") };
    setCasos(c => [nuevo, ...c]);
    if (sheetsOk && sheetsUrl) {
      try { await enviarASheets(sheetsUrl, nuevo); } catch(e) {}
    }
    setSaving(false); setSaved(true);
    setTimeout(() => {
      setSaved(false); setForm(emptyForm); setIaResult(null);
      setStep(1); setView(VIEWS.PANEL);
    }, 1800);
  }

  // ─── FILTROS PANEL ───────────────────────────────────────────────────
  const casosFiltrados = casos.filter(c => {
    const q = filtro.toLowerCase();
    const matchQ = !q || c.estudiante.toLowerCase().includes(q) || c.docente.toLowerCase().includes(q) || c.grado.toLowerCase().includes(q);
    const matchCat = !filtroCat || c.categoria === filtroCat;
    return matchQ && matchCat;
  });

  // ─── STATS ───────────────────────────────────────────────────────────
  const urgentes = casos.filter(c => c.hx_clinica === "No" && c.prioridad === "Alta").length;
  const conHx    = casos.filter(c => c.hx_clinica === "Sí").length;
  const conPiar  = casos.filter(c => c.proceso === "PIAR").length;

  // ─── RENDER ──────────────────────────────────────────────────────────
  return (
    <>
      <style>{globalStyle}</style>
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>

        {/* NAV */}
        <nav style={{
          background: C.navy, padding: "0 28px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          height: 60, position: "sticky", top: 0, zIndex: 100,
          boxShadow: "0 2px 16px rgba(26,58,92,.25)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 22 }}>🏫</span>
            <div>
              <div style={{ color: C.white, fontFamily: "DM Serif Display", fontSize: 16, lineHeight: 1.1 }}>
                Ruta de Inclusión
              </div>
              <div style={{ color: C.light, fontSize: 11, letterSpacing: .5 }}>SANTA MARÍA GORETTY</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            {[
              { v: VIEWS.INICIO, label: "Inicio", icon: "🏠" },
              { v: VIEWS.NUEVO,  label: "Nuevo caso", icon: "➕" },
              { v: VIEWS.PANEL,  label: `Panel (${casos.length})`, icon: "📋" },
              { v: VIEWS.CONFIG, label: "Sheets", icon: "🔗" },
            ].map(({ v, label, icon }) => (
              <button key={v} onClick={() => setView(v)} style={{
                background: view === v ? C.sky : "transparent",
                color: view === v ? C.white : C.light,
                border: "none", borderRadius: 8, padding: "7px 13px",
                fontSize: 13, fontWeight: view === v ? 600 : 400,
                cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
                fontFamily: "DM Sans, sans-serif",
              }}>
                <span>{icon}</span><span style={{ display: window.innerWidth < 600 ? "none" : "inline" }}>{label}</span>
              </button>
            ))}
          </div>
        </nav>

        {/* CONTENIDO */}
        <main style={{ flex: 1, padding: "32px 24px", maxWidth: 960, margin: "0 auto", width: "100%" }}>

          {/* ─── INICIO ─── */}
          {view === VIEWS.INICIO && (
            <div>
              <div className="fade-up" style={{ marginBottom: 32 }}>
                <h1 style={{ fontFamily: "DM Serif Display", fontSize: 34, color: C.navy, lineHeight: 1.2 }}>
                  Bienvenido 👋
                </h1>
                <p style={{ color: C.gray, marginTop: 8, fontSize: 15 }}>
                  Sistema de gestión de la Ruta de Inclusión · 3 Periodos · 2026
                </p>
              </div>

              <div className="fade-up-2" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 16, marginBottom: 32 }}>
                {[
                  { icon: "👥", val: casos.length, label: "Casos registrados", bg: C.pale, color: C.navy },
                  { icon: "🔴", val: urgentes,     label: "Alertas urgentes",  bg: C.redBg,   color: C.red   },
                  { icon: "📁", val: conHx,        label: "Con Hx clínica",    bg: C.greenBg, color: C.green },
                  { icon: "📌", val: conPiar,       label: "Con PIAR activo",   bg: C.amberBg, color: C.amber },
                ].map(({ icon, val, label, bg, color }) => (
                  <Card key={label} style={{ background: bg, border: `1.5px solid ${color}22`, textAlign: "center", padding: 20 }}>
                    <div style={{ fontSize: 28, marginBottom: 4 }}>{icon}</div>
                    <div style={{ fontSize: 32, fontFamily: "DM Serif Display", color }}>{val}</div>
                    <div style={{ fontSize: 12, color, fontWeight: 600, textTransform: "uppercase", letterSpacing: .5 }}>{label}</div>
                  </Card>
                ))}
              </div>

              <div className="fade-up-3" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 20 }}>
                <Card style={{ borderLeft: `4px solid ${C.blue}`, cursor: "pointer" }} >
                  <div onClick={() => { setView(VIEWS.NUEVO); setStep(1); }} style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                    <span style={{ fontSize: 36 }}>➕</span>
                    <div>
                      <div style={{ fontWeight: 700, color: C.navy, fontSize: 16 }}>Registrar nuevo caso</div>
                      <div style={{ color: C.gray, fontSize: 13, marginTop: 4 }}>
                        El docente describe la situación y la IA sugiere el diagnóstico automáticamente.
                      </div>
                    </div>
                  </div>
                </Card>
                <Card style={{ borderLeft: `4px solid ${C.green}`, cursor: "pointer" }}>
                  <div onClick={() => setView(VIEWS.PANEL)} style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                    <span style={{ fontSize: 36 }}>📋</span>
                    <div>
                      <div style={{ fontWeight: 700, color: C.navy, fontSize: 16 }}>Ver panel de casos</div>
                      <div style={{ color: C.gray, fontSize: 13, marginTop: 4 }}>
                        Filtra por categoría, docente o semáforo. Accede al detalle de cada estudiante.
                      </div>
                    </div>
                  </div>
                </Card>
                <Card style={{ borderLeft: `4px solid ${sheetsOk ? C.green : C.amber}`, cursor: "pointer" }}>
                  <div onClick={() => setView(VIEWS.CONFIG)} style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                    <span style={{ fontSize: 36 }}>{sheetsOk ? "✅" : "🔗"}</span>
                    <div>
                      <div style={{ fontWeight: 700, color: C.navy, fontSize: 16 }}>
                        {sheetsOk ? "Google Sheets conectado" : "Conectar Google Sheets"}
                      </div>
                      <div style={{ color: C.gray, fontSize: 13, marginTop: 4 }}>
                        {sheetsOk ? "Los casos se guardan automáticamente en tu hoja." : "Configura el link para guardar en la nube."}
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* ─── NUEVO CASO ─── */}
          {view === VIEWS.NUEVO && (
            <div className="fade-up">
              <div style={{ marginBottom: 24 }}>
                <h2 style={{ fontFamily: "DM Serif Display", fontSize: 26, color: C.navy }}>Registrar nuevo caso</h2>
                <p style={{ color: C.gray, fontSize: 14, marginTop: 4 }}>
                  Completa los datos básicos, describe la situación y la IA sugerirá el diagnóstico.
                </p>
              </div>

              {/* Indicador de pasos */}
              <div style={{ display: "flex", gap: 0, marginBottom: 28, alignItems: "center" }}>
                {["Datos básicos","Análisis IA","Confirmar y guardar"].map((s, i) => (
                  <div key={s} style={{ display: "flex", alignItems: "center" }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: "50%", display: "flex",
                      alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700,
                      background: step > i+1 ? C.green : step === i+1 ? C.blue : C.light,
                      color: step >= i+1 ? C.white : C.gray,
                    }}>{step > i+1 ? "✓" : i+1}</div>
                    <span style={{ marginLeft: 8, fontSize: 13, color: step === i+1 ? C.navy : C.gray, fontWeight: step === i+1 ? 600 : 400 }}>{s}</span>
                    {i < 2 && <div style={{ width: 32, height: 2, background: step > i+1 ? C.green : C.light, margin: "0 10px" }} />}
                  </div>
                ))}
              </div>

              {/* PASO 1: Datos básicos */}
              {step === 1 && (
                <Card>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 18, marginBottom: 20 }}>
                    <Input label="Nombre del estudiante" value={form.estudiante} onChange={setF("estudiante")} required placeholder="Nombre completo" />
                    <Select label="Grado" value={form.grado} onChange={setF("grado")} options={GRADOS} required />
                    <Input label="Docente titular" value={form.docente} onChange={setF("docente")} required placeholder="Nombre del docente" />
                  </div>
                  <div style={{ marginBottom: 20 }}>
                    <Input label="Diagnóstico original (si existe)" value={form.dx_original} onChange={setF("dx_original")} placeholder="Ej: TDAH, Dislexia, Pendiente..." />
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: C.navy, textTransform: "uppercase", letterSpacing: .5, display: "block", marginBottom: 6 }}>
                      Historia clínica actualizada <span style={{ color: C.red }}>*</span>
                    </label>
                    <div style={{ display: "flex", gap: 10 }}>
                      {["Sí","No"].map(v => (
                        <button key={v} onClick={() => setF("hx_clinica")(v)} style={{
                          padding: "9px 22px", borderRadius: 10, border: "1.5px solid",
                          borderColor: form.hx_clinica === v ? C.blue : C.border,
                          background: form.hx_clinica === v ? C.pale : C.white,
                          color: form.hx_clinica === v ? C.navy : C.gray,
                          fontWeight: form.hx_clinica === v ? 700 : 400,
                          cursor: "pointer", fontFamily: "DM Sans, sans-serif", fontSize: 14,
                        }}>{v}</button>
                      ))}
                    </div>
                  </div>
                  <div style={{ marginTop: 24 }}>
                    <Btn onClick={() => setStep(2)} disabled={!form.estudiante || !form.grado || !form.docente}>
                      Continuar →
                    </Btn>
                  </div>
                </Card>
              )}

              {/* PASO 2: Descripción + IA */}
              {step === 2 && (
                <Card>
                  <div style={{ marginBottom: 6 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: C.navy, textTransform: "uppercase", letterSpacing: .5, display: "block", marginBottom: 6 }}>
                      Descripción del caso (texto libre) <span style={{ color: C.red }}>*</span>
                    </label>
                    <p style={{ fontSize: 12, color: C.gray, marginBottom: 10 }}>
                      Describe lo que observas del estudiante. Puedes escribir como hablarías normalmente — la IA analiza el texto.
                    </p>
                    <textarea
                      value={form.descripcion_libre}
                      onChange={e => setF("descripcion_libre")(e.target.value)}
                      placeholder="Ej: El estudiante no logra mantener la atención más de 5 minutos, se levanta constantemente, no termina las tareas..."
                      rows={5}
                      style={{
                        width: "100%", border: `1.5px solid ${C.border}`, borderRadius: 10,
                        padding: "12px 14px", fontSize: 14, fontFamily: "DM Sans, sans-serif",
                        resize: "vertical", outline: "none", lineHeight: 1.6,
                      }}
                      onFocus={e => e.target.style.borderColor = C.blue}
                      onBlur={e => e.target.style.borderColor = C.border}
                    />
                  </div>
                  {iaError && (
                    <div style={{ background: C.redBg, color: C.red, borderRadius: 8, padding: "10px 14px", fontSize: 13, marginTop: 12 }}>
                      {iaError}
                    </div>
                  )}
                  <div style={{ marginTop: 20, display: "flex", gap: 12, alignItems: "center" }}>
                    <Btn variant="secondary" onClick={() => setStep(1)}>← Volver</Btn>
                    <Btn onClick={handleAnalizar} disabled={iaLoading || !form.descripcion_libre.trim()}>
                      {iaLoading
                        ? <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ width: 14, height: 14, border: "2px solid #fff", borderTopColor: "transparent", borderRadius: "50%", display: "inline-block", animation: "spin 1s linear infinite" }} />
                            Analizando...
                          </span>
                        : "✨ Analizar con IA"}
                    </Btn>
                  </div>
                </Card>
              )}

              {/* PASO 3: Confirmar resultado IA */}
              {step === 3 && iaResult && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <Card style={{ borderLeft: `4px solid ${C.green}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                      <span style={{ fontSize: 22 }}>✨</span>
                      <div>
                        <div style={{ fontWeight: 700, color: C.navy }}>Análisis completado por IA</div>
                        <div style={{ fontSize: 12, color: C.gray }}>Revisa y ajusta si es necesario antes de guardar</div>
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14 }}>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: C.gray, textTransform: "uppercase", marginBottom: 4 }}>Dx Estandarizado</div>
                        <input
                          value={form.dx_estandarizado}
                          onChange={e => setF("dx_estandarizado")(e.target.value)}
                          style={{ width: "100%", border: `1.5px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", fontSize: 13, fontFamily: "DM Sans, sans-serif" }}
                        />
                      </div>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: C.gray, textTransform: "uppercase", marginBottom: 4 }}>Categoría</div>
                        <select value={form.categoria} onChange={e => setF("categoria")(e.target.value)}
                          style={{ width: "100%", border: `1.5px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", fontSize: 13, fontFamily: "DM Sans, sans-serif" }}>
                          {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
                        </select>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: C.gray, textTransform: "uppercase", marginBottom: 4 }}>Prioridad</div>
                        <select value={form.prioridad} onChange={e => setF("prioridad")(e.target.value)}
                          style={{ width: "100%", border: `1.5px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", fontSize: 13, fontFamily: "DM Sans, sans-serif" }}>
                          {PRIORIDADES.map(p => <option key={p}>{p}</option>)}
                        </select>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: C.gray, textTransform: "uppercase", marginBottom: 4 }}>Proceso</div>
                        <select value={form.proceso} onChange={e => setF("proceso")(e.target.value)}
                          style={{ width: "100%", border: `1.5px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", fontSize: 13, fontFamily: "DM Sans, sans-serif" }}>
                          {PROCESOS.map(p => <option key={p}>{p}</option>)}
                        </select>
                      </div>
                    </div>
                  </Card>

                  {form.recomendaciones && (
                    <Card style={{ background: C.pale }}>
                      <div style={{ fontWeight: 700, color: C.navy, marginBottom: 8, fontSize: 14 }}>💡 Recomendaciones para el docente</div>
                      {form.recomendaciones.split("•").filter(Boolean).map((r, i) => (
                        <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                          <span style={{ color: C.blue, fontWeight: 700 }}>•</span>
                          <span style={{ fontSize: 13, color: C.navy }}>{r.trim()}</span>
                        </div>
                      ))}
                    </Card>
                  )}

                  {form.seguimiento && (
                    <Card style={{ background: C.greenBg, border: `1.5px solid ${C.green}33` }}>
                      <div style={{ fontWeight: 700, color: C.green, marginBottom: 4, fontSize: 14 }}>📌 Seguimiento sugerido</div>
                      <div style={{ fontSize: 13, color: C.navy }}>{form.seguimiento}</div>
                    </Card>
                  )}

                  {iaError && (
                    <div style={{ background: C.redBg, color: C.red, borderRadius: 8, padding: "10px 14px", fontSize: 13 }}>{iaError}</div>
                  )}

                  {saved && (
                    <div style={{ background: C.greenBg, color: C.green, borderRadius: 10, padding: "14px 18px", fontWeight: 700, textAlign: "center", fontSize: 15 }}>
                      ✅ ¡Caso guardado exitosamente!{sheetsOk ? " · Enviado a Google Sheets" : ""}
                    </div>
                  )}

                  <div style={{ display: "flex", gap: 12 }}>
                    <Btn variant="secondary" onClick={() => setStep(2)}>← Ajustar descripción</Btn>
                    <Btn variant="success" onClick={handleGuardar} disabled={saving || saved}>
                      {saving ? "Guardando..." : "✅ Guardar caso"}
                    </Btn>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─── PANEL ─── */}
          {view === VIEWS.PANEL && (
            <div className="fade-up">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
                <div>
                  <h2 style={{ fontFamily: "DM Serif Display", fontSize: 26, color: C.navy }}>Panel de casos</h2>
                  <p style={{ color: C.gray, fontSize: 13 }}>{casos.length} estudiantes registrados</p>
                </div>
                <Btn onClick={() => { setView(VIEWS.NUEVO); setStep(1); }}>➕ Nuevo caso</Btn>
              </div>

              {/* Filtros */}
              <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
                <input
                  value={filtro} onChange={e => setFiltro(e.target.value)}
                  placeholder="🔍  Buscar por nombre, docente o grado..."
                  style={{
                    flex: 1, minWidth: 200, border: `1.5px solid ${C.border}`, borderRadius: 10,
                    padding: "10px 14px", fontSize: 14, fontFamily: "DM Sans, sans-serif", outline: "none",
                  }}
                />
                <select value={filtroCat} onChange={e => setFiltroCat(e.target.value)}
                  style={{ border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "10px 14px", fontSize: 14, fontFamily: "DM Sans, sans-serif" }}>
                  <option value="">Todas las categorías</option>
                  {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>

              {casos.length === 0 ? (
                <Card style={{ textAlign: "center", padding: 48 }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>📂</div>
                  <div style={{ fontFamily: "DM Serif Display", fontSize: 20, color: C.navy, marginBottom: 8 }}>
                    Aún no hay casos registrados
                  </div>
                  <div style={{ color: C.gray, fontSize: 14, marginBottom: 20 }}>
                    Registra el primer caso usando el botón de arriba.
                  </div>
                  <Btn onClick={() => { setView(VIEWS.NUEVO); setStep(1); }}>➕ Registrar primer caso</Btn>
                </Card>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {casosFiltrados.map(c => {
                    const sem = semaforo(c.hx_clinica, c.prioridad);
                    return (
                      <Card key={c.id} style={{ padding: 16 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                          <div style={{ flex: 1, minWidth: 200 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                              <span style={{ fontWeight: 700, fontSize: 15, color: C.navy }}>{c.estudiante}</span>
                              <Badge bg={C.pale} color={C.blue}>Grado {c.grado}</Badge>
                            </div>
                            <div style={{ fontSize: 13, color: C.gray, marginBottom: 6 }}>👤 {c.docente} · 📅 {c.fecha}</div>
                            <div style={{ fontSize: 13, color: C.navy }}>{c.dx_estandarizado || c.dx_original}</div>
                          </div>
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                            {c.categoria && (
                              <Badge bg={catColor(c.categoria)+"22"} color={catColor(c.categoria)}>{c.categoria}</Badge>
                            )}
                            <Badge bg={sem.bg} color={sem.color}>{sem.icon} {sem.label}</Badge>
                            {c.proceso && <Badge bg={C.pale} color={C.navy}>{c.proceso}</Badge>}
                          </div>
                        </div>
                        {c.recomendaciones && (
                          <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.border}`, fontSize: 12, color: C.gray }}>
                            💡 {c.recomendaciones.split("•").filter(Boolean)[0]?.trim()}...
                          </div>
                        )}
                      </Card>
                    );
                  })}
                  {casosFiltrados.length === 0 && filtro && (
                    <div style={{ textAlign: "center", padding: 32, color: C.gray }}>
                      No se encontraron casos para "{filtro}"
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ─── CONFIG GOOGLE SHEETS ─── */}
          {view === VIEWS.CONFIG && (
            <div className="fade-up">
              <div style={{ marginBottom: 24 }}>
                <h2 style={{ fontFamily: "DM Serif Display", fontSize: 26, color: C.navy }}>Conectar Google Sheets</h2>
                <p style={{ color: C.gray, fontSize: 14, marginTop: 4 }}>
                  Cada caso nuevo se enviará automáticamente a tu hoja de cálculo.
                </p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <Card style={{ borderLeft: `4px solid ${C.blue}` }}>
                  <div style={{ fontWeight: 700, color: C.navy, fontSize: 15, marginBottom: 14 }}>
                    📋 Pasos para configurar (una sola vez)
                  </div>
                  {[
                    { n: "1", t: "Crear la hoja en Google Sheets", d: 'Abre Google Sheets y crea una hoja nueva. Nómbrala "Ruta Inclusión".' },
                    { n: "2", t: "Abrir el editor de Apps Script", d: 'En el menú de tu hoja: Extensiones → Apps Script.' },
                    { n: "3", t: "Pegar el script", d: "Copia el script que ves abajo y pégalo en el editor. Guarda con Ctrl+S." },
                    { n: "4", t: "Publicar como aplicación web", d: 'Clic en "Implementar" → "Nueva implementación" → tipo "Aplicación web" → acceso "Cualquier usuario" → Implementar.' },
                    { n: "5", t: "Copiar la URL y pegarla aquí", d: "Google te dará una URL. Cópiala y pégala en el campo de abajo." },
                  ].map(({ n, t, d }) => (
                    <div key={n} style={{ display: "flex", gap: 14, marginBottom: 14 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: "50%", background: C.navy,
                        color: C.white, fontSize: 13, fontWeight: 700,
                        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                      }}>{n}</div>
                      <div>
                        <div style={{ fontWeight: 600, color: C.navy, fontSize: 14 }}>{t}</div>
                        <div style={{ color: C.gray, fontSize: 13, marginTop: 2 }}>{d}</div>
                      </div>
                    </div>
                  ))}
                </Card>

                <Card style={{ background: "#1e293b" }}>
                  <div style={{ color: "#94a3b8", fontSize: 11, marginBottom: 8, fontWeight: 600, textTransform: "uppercase" }}>
                    📄 Script para Apps Script — copia esto
                  </div>
                  <pre style={{ color: "#7dd3fc", fontSize: 12, lineHeight: 1.7, whiteSpace: "pre-wrap", fontFamily: "monospace" }}>
{`function doGet(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet()
               .getSheetByName("Ruta Inclusión") ||
               SpreadsheetApp.getActiveSpreadsheet()
               .getActiveSheet();
  
  // Encabezados (solo primera vez)
  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      "Fecha","Estudiante","Grado","Docente",
      "Dx Original","Dx Estandarizado","Categoría",
      "Proceso","Hx Clínica","Prioridad","Semáforo",
      "Recomendaciones","Seguimiento"
    ]);
  }
  
  var p = e.parameter;
  sheet.appendRow([
    p.fecha, p.estudiante, p.grado, p.docente,
    p.dx_original, p.dx_estandarizado, p.categoria,
    p.proceso, p.hx_clinica, p.prioridad, p.semaforo,
    p.recomendaciones, p.seguimiento
  ]);
  
  return ContentService
    .createTextOutput("OK")
    .setMimeType(ContentService.MimeType.TEXT);
}`}
                  </pre>
                </Card>

                <Card>
                  <div style={{ fontWeight: 700, color: C.navy, marginBottom: 14 }}>🔗 Pegar la URL de tu Apps Script</div>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <input
                      value={sheetsUrl}
                      onChange={e => setSheetsUrl(e.target.value)}
                      placeholder="https://script.google.com/macros/s/..."
                      style={{
                        flex: 1, minWidth: 260, border: `1.5px solid ${C.border}`,
                        borderRadius: 10, padding: "11px 14px", fontSize: 13,
                        fontFamily: "DM Sans, sans-serif", outline: "none",
                      }}
                    />
                    <Btn
                      variant={sheetsOk ? "success" : "primary"}
                      onClick={() => { if (sheetsUrl.startsWith("https://")) setSheetsOk(true); }}
                    >
                      {sheetsOk ? "✅ Conectado" : "Conectar"}
                    </Btn>
                  </div>
                  {sheetsOk && (
                    <div style={{ marginTop: 12, background: C.greenBg, color: C.green, borderRadius: 8, padding: "10px 14px", fontSize: 13, fontWeight: 600 }}>
                      ✅ ¡Listo! Los próximos casos se enviarán automáticamente a tu Google Sheets.
                    </div>
                  )}
                </Card>
              </div>
            </div>
          )}

        </main>

        {/* FOOTER */}
        <footer style={{ background: C.navy, padding: "14px 28px", textAlign: "center" }}>
          <span style={{ color: C.light, fontSize: 12 }}>
            Ruta de Inclusión · Colegio Santa María Goretty · 2026 · Uso institucional reservado
          </span>
        </footer>
      </div>
    </>
  );
}
