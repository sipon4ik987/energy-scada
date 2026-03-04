// shared.jsx — Shared constants, utilities and components for Energy SCADA

// ═══ COLORS ═══
export const ON = "#00e676", OFF = "#ff1744", BUS = "#ffd600", BUSOFF = "#3a2800";
export const WC = "#00bcd4", WO = "#1c2830", PNL = "#0e1822", DK = "#0a0f16", BG = "#1a2332";
export const TXT = "#b0bec5", TD = "#546e7a", TM = "#37474f", KR = "#ce93d8", LRC = "#ff9800";
export const PH_OK = "#00e676", PH_WARN = "#ffd600", PH_ERR = "#ff1744", PH_OFF = "#37474f";
export const FN = `'Share Tech Mono','JetBrains Mono',monospace`;

// ═══ UID ═══
export const uid = () => "n" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

// ═══ ORTHOGONAL ROUTING ═══
export const STUB = 20;

export function orthoPath(x1, y1, dir1, x2, y2, dir2, waypoints) {
  const pts = [[x1, y1]];
  let sx1 = x1, sy1 = y1;
  if (dir1 === "d") sy1 += STUB;
  else if (dir1 === "u") sy1 -= STUB;
  else if (dir1 === "l") sx1 -= STUB;
  else if (dir1 === "r") sx1 += STUB;
  pts.push([sx1, sy1]);

  if (waypoints && waypoints.length > 0) {
    let px = sx1, py = sy1, lastVert = (dir1 === "d" || dir1 === "u");
    for (const wp of waypoints) {
      if (lastVert) {
        pts.push([wp.x, py]);
        pts.push([wp.x, wp.y]);
        lastVert = true;
      } else {
        pts.push([px, wp.y]);
        pts.push([wp.x, wp.y]);
        lastVert = false;
      }
      px = wp.x; py = wp.y;
    }
    let ex2 = x2, ey2 = y2;
    if (dir2 === "d") ey2 += STUB;
    else if (dir2 === "u") ey2 -= STUB;
    else if (dir2 === "l") ex2 -= STUB;
    else if (dir2 === "r") ex2 += STUB;
    if (lastVert) { pts.push([ex2, py]); pts.push([ex2, ey2]); }
    else { pts.push([px, ey2]); pts.push([ex2, ey2]); }
    pts.push([x2, y2]);
  } else {
    let ex2 = x2, ey2 = y2;
    if (dir2 === "d") ey2 += STUB;
    else if (dir2 === "u") ey2 -= STUB;
    else if (dir2 === "l") ex2 -= STUB;
    else if (dir2 === "r") ex2 += STUB;
    const isV1 = dir1 === "d" || dir1 === "u";
    const isV2 = dir2 === "d" || dir2 === "u";
    if (isV1 && isV2) { const my = (sy1 + ey2) / 2; pts.push([sx1, my], [ex2, my]); }
    else if (!isV1 && !isV2) { const mx = (sx1 + ex2) / 2; pts.push([mx, sy1], [mx, ey2]); }
    else if (isV1) pts.push([sx1, ey2]);
    else pts.push([ex2, sy1]);
    pts.push([ex2, ey2]);
    pts.push([x2, y2]);
  }
  return pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0]},${p[1]}`).join(" ");
}

export function findWpInsertIdx(fp, tp, waypoints, clickX, clickY) {
  const allPts = [fp, ...(waypoints || []).map(w => ({ x: w.x, y: w.y })), tp];
  let bestIdx = 0, bestDist = Infinity;
  for (let i = 0; i < allPts.length - 1; i++) {
    const ax = allPts[i].x, ay = allPts[i].y, bx = allPts[i + 1].x, by = allPts[i + 1].y;
    const mx = (ax + bx) / 2, my = (ay + by) / 2;
    const dist = Math.hypot(clickX - mx, clickY - my);
    if (dist < bestDist) { bestDist = dist; bestIdx = i; }
  }
  return bestIdx;
}

// ═══ SWITCH COMPONENT ═══
export const Sw = ({ x, y, on, onClick, sz = 10 }) => (
  <g onMouseDown={e => { e.stopPropagation(); e.preventDefault(); onClick(); }} style={{ cursor: "pointer" }}>
    <rect x={x - sz / 2} y={y - sz / 2} width={sz} height={sz} rx={2} fill={on ? "#1b5e20" : "#6b1515"} stroke={on ? ON : OFF} strokeWidth={.8} />
    {on ? <line x1={x} y1={y - sz / 2 + 2} x2={x} y2={y + sz / 2 - 2} stroke={ON} strokeWidth={1.5} /> :
      <><line x1={x - 2.5} y1={y - 2.5} x2={x + 2.5} y2={y + 2.5} stroke={OFF} strokeWidth={1} />
        <line x1={x + 2.5} y1={y - 2.5} x2={x - 2.5} y2={y + 2.5} stroke={OFF} strokeWidth={1} /></>}
  </g>
);

// ═══ PORT COMPONENT ═══
export const Port = ({ x, y, on, label, isActive, onMouseDown: omd, cursor = "pointer" }) => (
  <g onMouseDown={omd} style={{ cursor }}>
    <circle cx={x} cy={y} r={12} fill="transparent" />
    <circle cx={x} cy={y} r={6} fill={isActive ? "#ff0" : on ? WC : "#1a2a30"}
      stroke={isActive ? "#ff0" : on ? WC : "#2a3a40"} strokeWidth={isActive ? 2.5 : 1.5}
      style={isActive ? { filter: "drop-shadow(0 0 6px #ff0)" } : on ? { filter: `drop-shadow(0 0 4px ${WC}60)` } : {}} />
    <circle cx={x} cy={y} r={2.5} fill={isActive ? "#000" : on ? "#fff" : "#444"} />
    {label && <text x={x} y={y - 10} textAnchor="middle" fill={on ? WC : TM} fontSize={6} fontWeight="bold" fontFamily={FN}>{label}</text>}
  </g>
);

// ═══ FORM HELPERS ═══
export const inpS = { width: "100%", padding: 6, background: DK, border: "1px solid #263238", borderRadius: 4, color: TXT, fontFamily: FN, fontSize: 10, outline: "none", boxSizing: "border-box" };
export const lblS = { color: TD, fontSize: 8, display: "block", marginBottom: 2 };

export const fld = (label, value, onChange, type = "text", ph = "") => (
  <div style={{ marginBottom: 8 }}>
    <label style={lblS}>{label}</label>
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={ph} style={inpS} />
  </div>
);

export const sel = (label, value, onChange, opts) => (
  <div style={{ marginBottom: 8 }}>
    <label style={lblS}>{label}</label>
    <select value={value} onChange={e => onChange(e.target.value)} style={inpS}>
      {opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
    </select>
  </div>
);

export const dangerBtn = (text, onClick) => (
  <button onClick={onClick} style={{ padding: "4px 10px", background: "#4a1515", border: "1px solid #ff174440", borderRadius: 4, color: OFF, fontFamily: FN, fontSize: 8, cursor: "pointer", marginTop: 6 }}>
    {text}
  </button>
);
