import { useState, useCallback, useEffect, useRef } from "react";
import Page04 from "./Page04";

const uid = () => "n" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
const ON = "#00e676", OFF = "#ff1744", BUS = "#ffd600", BUSOFF = "#3a2800";
const WC = "#00bcd4", WO = "#1c2830", PNL = "#0e1822", DK = "#0a0f16", BG = "#1a2332";
const TXT = "#b0bec5", TD = "#546e7a", TM = "#37474f", KR = "#ce93d8", LRC = "#ff9800";
const PH_OK = "#00e676", PH_WARN = "#ffd600", PH_ERR = "#ff1744", PH_OFF = "#37474f";
const FN = `'Share Tech Mono','JetBrains Mono',monospace`;

const mkTP = (id, n, pw, rm6, x, y) => ({
  id, name: n, power: pw, meterHv: "", rm6Type: rm6, x, y,
  // RM6: I(in1), I(in2), D(tr), I(out1) — 4 порта
  // vn: I(in), I(out), ВН(tr)
  sw: { in1: true, in2: true, tr: true, out1: true },
  phases: { a: "warn", b: "warn", c: "warn" }, // ok | warn | err
});
const mkKR = (id, n, secs, x, y) => ({
  id, name: n, x, y,
  sections: secs.map((s, i) => ({ id: `${id}-s${i + 1}`, name: s, closed: true })),
});
const mkLR = (id, n, x, y) => ({ id, name: n, closed: true, meter: "", x, y });
const TP2_W = 190, TP2_H = 80;
const mk2BKTP = (id, n, pw1, pw2, x, y) => ({
  id, name: n, type: "2bktp", power1: pw1, power2: pw2, meterHv1: "", meterHv2: "", cable10: "", x, y,
  sw: { in1_1: true, in2_1: true, tr_1: true, out1_1: true, in1_2: true, in2_2: true, tr_2: true, out1_2: true },
  sv10: false, sv04: false,
  phases1: { a: "warn", b: "warn", c: "warn" },
  phases2: { a: "warn", b: "warn", c: "warn" },
});

const STORAGE_KEY = "energy-scada-state";
const loadState = () => {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (!s) return null;
    const parsed = JSON.parse(s);
    console.log("[SCADA] Loaded state from localStorage, tps:", parsed.tps?.length, "kruns:", parsed.kruns?.length, "lrs:", parsed.lrs?.length, "cells:", parsed.cells?.length, "links:", parsed.links?.length);
    return parsed;
  } catch (e) { console.error("[SCADA] Failed to load state:", e); return null; }
};
const saveState = (d) => {
  try {
    const json = JSON.stringify(d);
    localStorage.setItem(STORAGE_KEY, json);
    console.log("[SCADA] Saved state, size:", json.length, "bytes");
  } catch (e) { console.error("[SCADA] Failed to save state:", e); }
};

import INIT_STATE from "./init-state.json";
const INIT = { ...INIT_STATE, switchLog: [] };

// ═══ ENERGY ═══
function busOn(bId, d) {
  const bus = d.buses.find(b => b.id === bId);
  if (bus?.inputOn) return true;
  const v = new Set(); const c = id => { if (v.has(id)) return false; v.add(id);
    if (d.inputBreakers.some(b => b.busId === id && b.closed)) return true;
    for (const s of d.sectionBreakers) if (s.closed) { if (s.fromBus === id && c(s.toBus)) return true; if (s.toBus === id && c(s.fromBus)) return true; }
    return false; }; return c(bId);
}
function pKey(p) {
  if (p.block === "cell") return `cell:${p.id}`;
  if (p.block === "bus") return p.port ? `bus-${p.port}:${p.id}` : `bus:${p.id}`;
  if (p.block === "lr") return `lr:${p.id}`;
  if (p.block === "krun") return `ks:${p.id}-${p.port}`;
  if (p.block === "tp") return `tp-${p.port}:${p.id}`;
  return "?";
}
function tryEnter(portRef, d, queue) {
  const p = portRef;
  const pk = pKey(p);
  if (p.block === "lr") { const lr = d.lrs.find(l => l.id === p.id); if (lr?.closed) queue.push(pk); }
  else if (p.block === "krun") {
    for (const kr of d.kruns) {
      const sec = kr.sections.find(s => s.id === `${p.id}-${p.port}`);
      if (sec?.closed) { queue.push(pk); kr.sections.forEach(s2 => { if (s2.id !== sec.id && s2.closed) queue.push(`ks:${s2.id}`); }); }
    }
  }
  else if (p.block === "tp") {
    const tp = d.tps.find(t => t.id === p.id);
    if (tp?.type === "2bktp") {
      const port = p.port;
      if (!tp.sw[port]) return;
      queue.push(pk);
      const side = port.endsWith("_1") ? "_1" : "_2";
      const otherSide = side === "_1" ? "_2" : "_1";
      ["in1", "in2", "out1"].forEach(b => { const pp = b + side; if (pp !== port && tp.sw[pp]) queue.push(`tp-${pp}:${tp.id}`); });
      if (tp.sv10) ["in1", "in2", "out1"].forEach(b => { const pp = b + otherSide; if (tp.sw[pp]) queue.push(`tp-${pp}:${tp.id}`); });
    } else {
      if (p.port === "in1" && tp?.sw.in1) { queue.push(pk); if (tp.sw.in2) queue.push(`tp-in2:${tp.id}`); if (tp.sw.out1) queue.push(`tp-out1:${tp.id}`); }
      else if (p.port === "in2" && tp?.sw.in2) { queue.push(pk); if (tp.sw.in1) queue.push(`tp-in1:${tp.id}`); if (tp.sw.out1) queue.push(`tp-out1:${tp.id}`); }
      else if (p.port === "out1" && tp?.sw.out1) { queue.push(pk); if (tp.sw.in1) queue.push(`tp-in1:${tp.id}`); if (tp.sw.in2) queue.push(`tp-in2:${tp.id}`); }
    }
  } else if (p.block === "bus" && p.port) {
    const bus = d.buses.find(b => b.id === p.id);
    const feeder = bus?.feeders?.find(f => f.id === p.port);
    if (feeder?.closed && busOn(p.id, d)) queue.push(pk);
  } else queue.push(pk);
}
function isEnergized(pk, d) {
  const visited = new Set(); const queue = [];
  d.cells.forEach(c => { if (c.closed && c.type !== "reserve" && busOn(c.busId, d)) queue.push(`cell:${c.id}`); });
  d.buses.forEach(b => { if (busOn(b.id, d)) {
    queue.push(`bus:${b.id}`);
    if (b.feeders) b.feeders.forEach(f => { if (f.closed) queue.push(`bus-${f.id}:${b.id}`); });
  }});
  while (queue.length > 0) {
    const cur = queue.shift(); if (visited.has(cur)) continue; visited.add(cur);
    if (cur === pk) return true;
    for (const link of d.links) {
      const fk = pKey(link.from), tk = pKey(link.to);
      // Bidirectional: from→to
      if (fk === cur && !visited.has(tk)) tryEnter(link.to, d, queue);
      // Bidirectional: to→from
      if (tk === cur && !visited.has(fk)) tryEnter(link.from, d, queue);
    }
    // TP internal propagation
    if (cur.startsWith("tp-in1:")) { const tpId = cur.slice(7); const tp = d.tps.find(t => t.id === tpId);
      if (tp?.sw.in1) { if (tp.sw.in2) queue.push(`tp-in2:${tpId}`); if (tp.sw.out1) queue.push(`tp-out1:${tpId}`); } }
    if (cur.startsWith("tp-in2:")) { const tpId = cur.slice(7); const tp = d.tps.find(t => t.id === tpId);
      if (tp?.sw.in2) { if (tp.sw.in1) queue.push(`tp-in1:${tpId}`); if (tp.sw.out1) queue.push(`tp-out1:${tpId}`); } }
    if (cur.startsWith("tp-out1:")) { const tpId = cur.slice(8); const tp = d.tps.find(t => t.id === tpId);
      if (tp?.sw.out1) { if (tp.sw.in1) queue.push(`tp-in1:${tpId}`); if (tp.sw.in2) queue.push(`tp-in2:${tpId}`); } }
    // Bus → feeder internal propagation
    if (cur.startsWith("bus:")) {
      const busId = cur.slice(4);
      const bus = d.buses.find(b => b.id === busId);
      if (bus?.feeders) bus.feeders.forEach(f => { if (f.closed) queue.push(`bus-${f.id}:${busId}`); });
    }
    // 2БКТП internal propagation
    const m2b = cur.match(/^tp-((?:in1|in2|out1)_[12]):(.+)$/);
    if (m2b) {
      const port = m2b[1], tpId = m2b[2];
      const tp = d.tps.find(t => t.id === tpId);
      if (tp?.type === "2bktp" && tp.sw[port]) {
        const side = port.endsWith("_1") ? "_1" : "_2";
        const otherSide = side === "_1" ? "_2" : "_1";
        ["in1", "in2", "out1"].forEach(b => { const pp = b + side; if (pp !== port && tp.sw[pp]) queue.push(`tp-${pp}:${tpId}`); });
        if (tp.sv10) ["in1", "in2", "out1"].forEach(b => { const pp = b + otherSide; if (tp.sw[pp]) queue.push(`tp-${pp}:${tpId}`); });
      }
    }
  }
  return false;
}
function portEnergized(p, d) { return isEnergized(pKey(p), d); }

// ═══ PORT POSITIONS ═══
const TP_W = 90, TP_H = 56;
function getPortPos(p, d) {
  if (p.block === "tp") {
    const tp = d.tps.find(t => t.id === p.id); if (!tp) return null;
    if (tp.type === "2bktp") {
      if (p.port === "in1_1") return { x: tp.x, y: tp.y + 20 };
      if (p.port === "in2_1") return { x: tp.x, y: tp.y + 44 };
      if (p.port === "out1_1") return { x: tp.x, y: tp.y + 64 };
      if (p.port === "in1_2") return { x: tp.x + TP2_W, y: tp.y + 20 };
      if (p.port === "in2_2") return { x: tp.x + TP2_W, y: tp.y + 44 };
      if (p.port === "out1_2") return { x: tp.x + TP2_W, y: tp.y + 64 };
      return null;
    }
    if (p.port === "in1") return { x: tp.x, y: tp.y + 18 };
    if (p.port === "in2") return { x: tp.x, y: tp.y + 34 };
    if (p.port === "out1") return { x: tp.x + TP_W, y: tp.y + 18 };
    if (p.port === "tr") return { x: tp.x + TP_W / 2, y: tp.y + TP_H };
  }
  if (p.block === "krun") {
    const kr = d.kruns.find(k => k.id === p.id); if (!kr) return null;
    const sIdx = parseInt(p.port.replace("s", "")) - 1;
    return { x: kr.x + 25 + sIdx * 46, y: kr.y + 68 };
  }
  if (p.block === "lr") {
    const lr = d.lrs.find(l => l.id === p.id); if (!lr) return null;
    return p.port === "a" ? { x: lr.x, y: lr.y + 14 } : { x: lr.x + 50, y: lr.y + 14 };
  }
  if (p.block === "cell") {
    const px = d.psBlock?.x || 200, py = d.psBlock?.y || 10;
    const cell = d.cells.find(c => c.id === p.id); if (!cell) return null;
    const s1cells = d.cells.filter(c => c.busId === "bus-1");
    const s1w = Math.max(s1cells.length * 70 + 10, 100);
    const s2start = px + 10 + s1w + 40;
    const isS1 = cell.busId === "bus-1";
    const idxInBus = d.cells.filter(c => c.busId === cell.busId).indexOf(cell);
    const cx = isS1 ? px + 10 + idxInBus * 70 : s2start + idxInBus * 70;
    return { x: cx + 15, y: py + 106 };
  }
  if (p.block === "bus") {
    const bus = d.buses.find(b => b.id === p.id);
    if (bus?.feeders && p.port) {
      const rx = bus.x ?? 500, ry = bus.y ?? 510;
      const fIdx = bus.feeders.findIndex(f => f.id === p.port);
      if (fIdx >= 0) return { x: rx + 50 + fIdx * 100, y: ry + 30 };
    }
    return { x: 780, y: 105 };
  }
  return null;
}

// ═══ ORTHOGONAL ROUTING ═══
function portDir(p, d) {
  // Returns exit direction: "d"=down, "u"=up, "l"=left, "r"=right
  if (p.block === "cell") return "d";  // cells exit downward
  if (p.block === "bus") return "d";   // bus feeders exit downward
  if (p.block === "krun") return "d";  // krun sections exit downward
  if (p.block === "lr") return p.port === "a" ? "l" : "r"; // LR: A=left, B=right
  if (p.block === "tp") {
    const tp = d.tps.find(t => t.id === p.id);
    if (tp?.type === "2bktp") {
      if (p.port.endsWith("_1")) return "l";  // left side ports
      if (p.port.endsWith("_2")) return "r";  // right side ports
    }
    if (p.port === "in1" || p.port === "in2") return "l";
    if (p.port === "out1") return "r";
    if (p.port === "tr") return "d";
  }
  return "d";
}
const STUB = 20;
// Build SVG path with waypoints: port1 → stub → [waypoints] → stub → port2
// Each segment between consecutive points is routed as L-shape (one bend)
function orthoPath(x1, y1, dir1, x2, y2, dir2, waypoints) {
  const pts = [[x1, y1]];
  // Stub from port 1
  let sx1 = x1, sy1 = y1;
  if (dir1 === "d") sy1 += STUB;
  else if (dir1 === "u") sy1 -= STUB;
  else if (dir1 === "l") sx1 -= STUB;
  else if (dir1 === "r") sx1 += STUB;
  pts.push([sx1, sy1]);

  if (waypoints && waypoints.length > 0) {
    // Route through each waypoint with L-shaped segments
    let px = sx1, py = sy1, lastVert = (dir1 === "d" || dir1 === "u");
    for (const wp of waypoints) {
      // L-shape: if last was vertical go horizontal-first, else vertical-first
      if (lastVert) {
        pts.push([wp.x, py]); // horizontal to wp.x
        pts.push([wp.x, wp.y]); // vertical to wp.y
        lastVert = true; // ended with vertical
      } else {
        pts.push([px, wp.y]); // vertical to wp.y
        pts.push([wp.x, wp.y]); // horizontal to wp.x
        lastVert = false; // ended with horizontal
      }
      px = wp.x; py = wp.y;
    }
    // Final segment to stub2
    let ex2 = x2, ey2 = y2;
    if (dir2 === "d") ey2 += STUB;
    else if (dir2 === "u") ey2 -= STUB;
    else if (dir2 === "l") ex2 -= STUB;
    else if (dir2 === "r") ex2 += STUB;
    if (lastVert) {
      pts.push([ex2, py]);
      pts.push([ex2, ey2]);
    } else {
      pts.push([px, ey2]);
      pts.push([ex2, ey2]);
    }
    pts.push([x2, y2]);
  } else {
    // Auto-route without waypoints
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
// Find best insertion index for a new waypoint along existing waypoints
function findWpInsertIdx(fp, tp, waypoints, clickX, clickY) {
  const allPts = [fp, ...(waypoints || []).map(w => ({ x: w.x, y: w.y })), tp];
  let bestIdx = 0, bestDist = Infinity;
  for (let i = 0; i < allPts.length - 1; i++) {
    const ax = allPts[i].x, ay = allPts[i].y, bx = allPts[i + 1].x, by = allPts[i + 1].y;
    const mx = (ax + bx) / 2, my = (ay + by) / 2;
    const dist = Math.hypot(clickX - mx, clickY - my);
    if (dist < bestDist) { bestDist = dist; bestIdx = i; }
  }
  return bestIdx; // insert after waypoints[bestIdx - 1], before waypoints[bestIdx]
}

// ═══ MAIN ═══
export default function App() {
  const [d, setD] = useState(() => {
    const saved = loadState();
    if (!saved) return INIT;
    return { ...INIT, ...saved };
  });
  const [showLog, setShowLog] = useState(false);
  const [drag, setDrag] = useState(null);
  const [modal, setModal] = useState(null);
  const [connecting, setConnecting] = useState(null); // {block,id,port} or null
  const [selLink, setSelLink] = useState(null); // selected link id for waypoint editing
  const [time, setTime] = useState(new Date());
  const [page, setPage] = useState(null); // null=main, {type:"04",tpId}=0.4kV page
  const svgRef = useRef(null);
  useEffect(() => { const t = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(t); }, []);
  useEffect(() => { saveState(d); }, [d]);

  // ═══ MERCURY METER POLLING ═══
  const POLL_INTERVAL = 30000; // 30 сек
  const U_NOM = 230, U_TOL = 0.10;
  const U_MIN = U_NOM * (1 - U_TOL), U_MAX = U_NOM * (1 + U_TOL);
  const phaseStatus = (v) => {
    if (v === null || v === undefined || v === 0) return "warn";
    if (v < U_MIN || v > U_MAX) return "err";
    return "ok";
  };

  useEffect(() => {
    let active = true;
    const poll = async () => {
      // Найти все ТП с привязанным счётчиком (meterReg)
      const metered = d.tps.filter(tp => tp.meterReg);
      for (const tp of metered) {
        try {
          const r = await fetch(`/mercury/api/poll?reg=${tp.meterReg}`);
          if (!r.ok) continue;
          const data = await r.json();
          if (!active) return;
          if (data.ok && data.Ua != null) {
            const phases = {
              a: phaseStatus(data.Ua),
              b: phaseStatus(data.Ub),
              c: phaseStatus(data.Uc),
            };
            const meterData = {
              Ua: data.Ua, Ub: data.Ub, Uc: data.Uc,
              Ia: data.Ia, Ib: data.Ib, Ic: data.Ic,
              P: data.P, freq: data.freq, cosF: data.cosF,
              ts: new Date().toLocaleString("ru-RU"),
            };
            setD(prev => ({
              ...prev,
              tps: prev.tps.map(t => t.id === tp.id ? { ...t, phases, meterData } : t),
            }));
            console.log(`[SCADA] ${tp.name} (${tp.meterReg}): Ua=${data.Ua} Ub=${data.Ub} Uc=${data.Uc}`, phases);
          } else {
            setD(prev => ({
              ...prev,
              tps: prev.tps.map(t => t.id === tp.id ? { ...t, phases: { a: "warn", b: "warn", c: "warn" } } : t),
            }));
            console.warn(`[SCADA] ${tp.name} (${tp.meterReg}): no data`, data.error);
          }
        } catch (e) {
          console.warn(`[SCADA] Mercury poll failed for ${tp.name}:`, e.message);
        }
      }
    };
    poll();
    const timer = setInterval(poll, POLL_INTERVAL);
    return () => { active = false; clearInterval(timer); };
  }, []);

  const log = useCallback(desc => { setD(p => ({ ...p, switchLog: [{ t: new Date().toLocaleString("ru-RU"), d: desc }, ...p.switchLog].slice(0, 300) })); }, []);

  // Toggles
  const togIB = id => setD(p => { const b = p.inputBreakers.find(x => x.id === id); log(`${b.feedName}: ${b.closed ? "ОТКЛ" : "ВКЛ"}`); return { ...p, inputBreakers: p.inputBreakers.map(x => x.id === id ? { ...x, closed: !x.closed } : x) }; });
  const togSB = id => setD(p => { const s = p.sectionBreakers.find(x => x.id === id); log(`${s.name}: ${s.closed ? "ОТКЛ" : "ВКЛ"}`); return { ...p, sectionBreakers: p.sectionBreakers.map(x => x.id === id ? { ...x, closed: !x.closed } : x) }; });
  const togCell = id => setD(p => { const c = p.cells.find(x => x.id === id); log(`Яч.${c.num}: ${c.closed ? "ОТКЛ" : "ВКЛ"}`); return { ...p, cells: p.cells.map(x => x.id === id ? { ...x, closed: !x.closed } : x) }; });
  const togLR = id => setD(p => { const l = d.lrs.find(x => x.id === id); log(`${l.name}: ${l.closed ? "ОТКЛ" : "ВКЛ"}`); return { ...p, lrs: p.lrs.map(x => x.id === id ? { ...x, closed: !x.closed } : x) }; });
  const togKS = (krId, sId) => setD(p => ({ ...p, kruns: p.kruns.map(k => k.id === krId ? { ...k, sections: k.sections.map(s => { if (s.id === sId) { log(`${k.name}/${s.name}: ${s.closed ? "ОТКЛ" : "ВКЛ"}`); return { ...s, closed: !s.closed }; } return s; }) } : k) }));
  const togTP = (tpId, key) => setD(p => { const tp = p.tps.find(t => t.id === tpId); log(`${tp.name} ${key}: ${tp.sw[key] ? "ОТКЛ" : "ВКЛ"}`); return { ...p, tps: p.tps.map(t => t.id === tpId ? { ...t, sw: { ...t.sw, [key]: !t.sw[key] } } : t) }; });
  const togTPsv = (tpId, key) => setD(p => { const tp = p.tps.find(t => t.id === tpId); log(`${tp.name} ${key}: ${tp[key] ? "ОТКЛ" : "ВКЛ"}`); return { ...p, tps: p.tps.map(t => t.id === tpId ? { ...t, [key]: !t[key] } : t) }; });
  const togRPinput = busId => setD(p => ({ ...p, buses: p.buses.map(b => b.id === busId ? { ...b, inputOn: !b.inputOn } : b) }));
  const togRPfeeder = (busId, fId) => setD(p => ({ ...p, buses: p.buses.map(b => b.id === busId ? { ...b, feeders: b.feeders.map(f => f.id === fId ? { ...f, closed: !f.closed } : f) } : b) }));

  // SVG coord helper
  const clientToSvg = (clientX, clientY) => {
    const svg = svgRef.current; if (!svg) return null;
    const pt = svg.createSVGPoint(); pt.x = clientX; pt.y = clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
  };

  // Waypoint management
  const addWaypoint = (linkId, x, y, insertIdx) => {
    setD(p => ({ ...p, links: p.links.map(l => {
      if (l.id !== linkId) return l;
      const wps = [...(l.waypoints || [])];
      wps.splice(insertIdx, 0, { x, y });
      return { ...l, waypoints: wps };
    })}));
  };
  const delWaypoint = (linkId, wpIdx) => {
    setD(p => ({ ...p, links: p.links.map(l => {
      if (l.id !== linkId) return l;
      const wps = (l.waypoints || []).filter((_, i) => i !== wpIdx);
      return { ...l, waypoints: wps };
    })}));
  };

  // Port click for connecting
  const onPortClick = (portRef) => {
    if (!connecting) { setConnecting(portRef); return; }
    // Create link
    const id = uid();
    setD(p => ({ ...p, links: [...p.links, { id, from: connecting, to: portRef, cable: "", waypoints: [] }] }));
    log(`Кабель: ${pKey(connecting)} → ${pKey(portRef)}`);
    setConnecting(null);
  };

  // CRUD helpers
  const inp = { w: "100%", p: 6, bg: DK, bd: "1px solid #263238", br: 4, c: TXT, ff: FN, fs: 10, ol: "none", bx: "border-box" };
  const inpS = { width: inp.w, padding: inp.p, background: inp.bg, border: inp.bd, borderRadius: inp.br, color: inp.c, fontFamily: inp.ff, fontSize: inp.fs, outline: inp.ol, boxSizing: inp.bx };
  const lbl = { color: TD, fontSize: 8, display: "block", marginBottom: 2 };
  const fld = (label, value, onChange, type = "text", ph = "") => (
    <div style={{ marginBottom: 8 }}><label style={lbl}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={ph} style={inpS} /></div>);
  const sel = (label, value, onChange, opts) => (
    <div style={{ marginBottom: 8 }}><label style={lbl}>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} style={inpS}>
        {opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}</select></div>);
  const dangerBtn = (text, onClick) => <button onClick={onClick} style={{ padding: "4px 10px", background: "#4a1515", border: "1px solid #ff174440", borderRadius: 4, color: OFF, fontFamily: FN, fontSize: 8, cursor: "pointer", marginTop: 6 }}>{text}</button>;

  // Cell
  const addCell = () => setModal({ type: "ac", f: { num: String(d.cells.length + 1), busId: "bus-1", type: "line" } });
  const editCell = c => setModal({ type: "ec", id: c.id, f: { num: c.num, busId: c.busId, type: c.type } });
  const delCell = id => { setD(p => ({ ...p, cells: p.cells.filter(c => c.id !== id), links: p.links.filter(l => !(l.from.block === "cell" && l.from.id === id) && !(l.to.block === "cell" && l.to.id === id)) })); setModal(null); };

  // TP
  const addTP = () => {
    const id = uid();
    const x = 300 + d.tps.length * 20, y = 300 + d.tps.length * 15;
    setD(p => ({ ...p, tps: [...p.tps, mkTP(id, "Новая ТП", 1000, "rm6", x, y)] }));
    setModal({ type: "etp", id, f: { name: "Новая ТП", power: "1000", meterHv: "", rm6Type: "rm6", cable10: "", trNominal: "1000", cells04: "12", cellNominal: "630" } });
  };
  const editTP = tp => setModal({ type: "etp", id: tp.id, f: {
    name: tp.name, power: String(tp.power || ""), meterHv: tp.meterHv || "",
    rm6Type: tp.rm6Type, cable10: tp.cable10 || "", trNominal: String(tp.trNominal || tp.power || ""),
    cells04: String(tp.cells04 || 12), cellNominal: String(tp.cellNominal || 630),
  }});
  const delTP = id => { setD(p => ({ ...p, tps: p.tps.filter(t => t.id !== id), links: p.links.filter(l => !(l.from.block === "tp" && l.from.id === id) && !(l.to.block === "tp" && l.to.id === id)) })); setModal(null); };

  // 2БКТП
  const add2BKTP = () => {
    const id = uid();
    const x = 300 + d.tps.length * 20, y = 300 + d.tps.length * 15;
    setD(p => ({ ...p, tps: [...p.tps, mk2BKTP(id, "Новая 2БКТП", 1000, 1000, x, y)] }));
    setModal({ type: "e2bktp", id, f: { name: "Новая 2БКТП", power1: "1000", power2: "1000", meterHv1: "", meterHv2: "", cable10: "" } });
  };
  const edit2BKTP = tp => setModal({ type: "e2bktp", id: tp.id, f: {
    name: tp.name, power1: String(tp.power1 || ""), power2: String(tp.power2 || ""),
    meterHv1: tp.meterHv1 || "", meterHv2: tp.meterHv2 || "", cable10: tp.cable10 || "",
  }});

  // Export/Import
  const exportState = () => {
    const json = JSON.stringify(d, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `scada-${new Date().toISOString().slice(0, 10)}.json`;
    a.click(); URL.revokeObjectURL(url);
  };
  const importRef = useRef(null);
  const importState = e => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try { const data = JSON.parse(ev.target.result); setD(data); log("Импорт схемы из файла"); }
      catch { alert("Ошибка чтения файла"); }
    };
    reader.readAsText(file); e.target.value = "";
  };

  // KRUN
  const addKR = () => {
    const id = uid();
    const x = 200 + d.kruns.length * 30, y = 250 + d.kruns.length * 20;
    const kr = mkKR(id, "Новый КРУН", ["С1", "С2"], x, y);
    setD(p => ({ ...p, kruns: [...p.kruns, kr] }));
    setModal({ type: "ekr", id, f: { name: "Новый КРУН", sections: kr.sections.map(s => ({ ...s })) } });
  };
  const editKR = kr => setModal({ type: "ekr", id: kr.id, f: { name: kr.name, sections: kr.sections.map(s => ({ ...s })) } });
  const delKR = id => { setD(p => ({ ...p, kruns: p.kruns.filter(k => k.id !== id), links: p.links.filter(l => !(l.from.block === "krun" && l.from.id === id) && !(l.to.block === "krun" && l.to.id === id)) })); setModal(null); };

  // LR
  const addLR = () => {
    const id = uid();
    const x = 250 + d.lrs.length * 25, y = 200 + d.lrs.length * 15;
    setD(p => ({ ...p, lrs: [...p.lrs, mkLR(id, "Новый ЛР", x, y)] }));
    setModal({ type: "elr", id, f: { name: "Новый ЛР", meter: "" } });
  };
  const editLR = lr => setModal({ type: "elr", id: lr.id, f: { name: lr.name, meter: lr.meter || "" } });
  const delLR = id => { setD(p => ({ ...p, lrs: p.lrs.filter(l => l.id !== id), links: p.links.filter(l => !(l.from.block === "lr" && l.from.id === id) && !(l.to.block === "lr" && l.to.id === id)) })); setModal(null); };

  const uf = (k, v) => setModal(m => ({ ...m, f: { ...m.f, [k]: v } }));

  const save = () => {
    if (!modal) return; const { type, id, f } = modal;
    if (type === "ac") setD(p => ({ ...p, cells: [...p.cells, { id: uid(), num: f.num, busId: f.busId, type: f.type, closed: f.type !== "reserve" }] }));
    else if (type === "ec") setD(p => ({ ...p, cells: p.cells.map(c => c.id === id ? { ...c, num: f.num, busId: f.busId, type: f.type } : c) }));
    else if (type === "etp") setD(p => ({ ...p, tps: p.tps.map(t => t.id === id ? { ...t, name: f.name, power: Number(f.power) || 0, meterHv: f.meterHv, rm6Type: f.rm6Type, cable10: f.cable10, trNominal: Number(f.trNominal) || 0, cells04: Number(f.cells04) || 12, cellNominal: Number(f.cellNominal) || 630 } : t) }));
    else if (type === "ekr") setD(p => ({ ...p, kruns: p.kruns.map(k => k.id === id ? { ...k, name: f.name, sections: f.sections } : k) }));
    else if (type === "elr") setD(p => ({ ...p, lrs: p.lrs.map(l => l.id === id ? { ...l, name: f.name, meter: f.meter } : l) }));
    else if (type === "e2bktp") setD(p => ({ ...p, tps: p.tps.map(t => t.id === id ? { ...t, name: f.name, power1: Number(f.power1) || 0, power2: Number(f.power2) || 0, meterHv1: f.meterHv1, meterHv2: f.meterHv2, cable10: f.cable10 } : t) }));
    setModal(null);
  };
  const delLink = id => setD(p => ({ ...p, links: p.links.filter(l => l.id !== id) }));

  // Drag
  const startDrag = (e, type, id, extra) => {
    if (e.button !== 0 || connecting) return;
    if (e.defaultPrevented) return;
    if (e.altKey) return; // alt+click is for panning
    const svg = svgRef.current; if (!svg) return;
    const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
    const sp = pt.matrixTransform(svg.getScreenCTM().inverse());
    setDrag({ type, id, sx: sp.x, sy: sp.y, ...extra }); e.preventDefault();
  };
  const onMM = useCallback(e => { if (!drag) return; const svg = svgRef.current; if (!svg) return;
    const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const sp = pt.matrixTransform(ctm.inverse());
    const dx = sp.x - drag.sx, dy = sp.y - drag.sy;
    if (drag.type === "tp") setD(p => ({ ...p, tps: p.tps.map(t => t.id === drag.id ? { ...t, x: t.x + dx, y: t.y + dy } : t) }));
    else if (drag.type === "krun") setD(p => ({ ...p, kruns: p.kruns.map(k => k.id === drag.id ? { ...k, x: k.x + dx, y: k.y + dy } : k) }));
    else if (drag.type === "lr") setD(p => ({ ...p, lrs: p.lrs.map(l => l.id === drag.id ? { ...l, x: l.x + dx, y: l.y + dy } : l) }));
    else if (drag.type === "rp") setD(p => ({ ...p, buses: p.buses.map(b => b.id === drag.id ? { ...b, x: (b.x || 0) + dx, y: (b.y || 0) + dy } : b) }));
    else if (drag.type === "ps") setD(p => ({ ...p, psBlock: { x: (p.psBlock?.x || 200) + dx, y: (p.psBlock?.y || 10) + dy } }));
    else if (drag.type === "wp") setD(p => ({ ...p, links: p.links.map(l => {
      if (l.id !== drag.id) return l;
      const wps = [...(l.waypoints || [])];
      wps[drag.wpIdx] = { x: wps[drag.wpIdx].x + dx, y: wps[drag.wpIdx].y + dy };
      return { ...l, waypoints: wps };
    })}));
    setDrag(pr => ({ ...pr, sx: sp.x, sy: sp.y })); }, [drag]);
  const onMU = useCallback(() => setDrag(null), []);
  useEffect(() => { window.addEventListener("mousemove", onMM); window.addEventListener("mouseup", onMU);
    return () => { window.removeEventListener("mousemove", onMM); window.removeEventListener("mouseup", onMU); }; }, [onMM, onMU]);

  const s1 = busOn("bus-1", d), s2 = busOn("bus-2", d), rp = busOn("bus-rp", d);
  const tpOnCnt = d.tps.filter(t => {
    if (t.type === "2bktp") return (isEnergized(`tp-in1_1:${t.id}`, d) && t.sw.tr_1) || (isEnergized(`tp-in1_2:${t.id}`, d) && t.sw.tr_2);
    return isEnergized(`tp-in1:${t.id}`, d) && t.sw.tr;
  }).length;
  
  // Large canvas
  const CANVAS_W = 6000, CANVAS_H = 4000;
  
  // Pan & Zoom state
  const [view, setView] = useState({ x: 0, y: 0, zoom: 1 });
  const [panning, setPanning] = useState(null);
  const containerRef = useRef(null);
  
  const onWheel = useCallback(e => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setView(v => {
      const newZoom = Math.max(0.2, Math.min(3, v.zoom + delta));
      // Zoom towards cursor
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return { ...v, zoom: newZoom };
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const scale = newZoom / v.zoom;
      return {
        x: mx - scale * (mx - v.x),
        y: my - scale * (my - v.y),
        zoom: newZoom,
      };
    });
  }, []);
  
  const onPanStart = useCallback(e => {
    // Middle button or Ctrl+Left for panning
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      e.preventDefault();
      setPanning({ sx: e.clientX, sy: e.clientY, vx: view.x, vy: view.y });
    }
  }, [view]);
  
  const onPanMove = useCallback(e => {
    if (!panning) return;
    setView(v => ({
      ...v,
      x: panning.vx + (e.clientX - panning.sx),
      y: panning.vy + (e.clientY - panning.sy),
    }));
  }, [panning]);
  
  const onPanEnd = useCallback(() => setPanning(null), []);
  
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [onWheel]);

  // Auto-fit on first render
  const didFit = useRef(false);
  useEffect(() => {
    if (!didFit.current && containerRef.current) {
      didFit.current = true;
      setTimeout(fitAll, 50);
    }
  });
  
  useEffect(() => {
    if (panning) {
      window.addEventListener("mousemove", onPanMove);
      window.addEventListener("mouseup", onPanEnd);
      return () => { window.removeEventListener("mousemove", onPanMove); window.removeEventListener("mouseup", onPanEnd); };
    }
  }, [panning, onPanMove, onPanEnd]);
  
  const resetView = () => setView({ x: 0, y: 0, zoom: 1 });
  const zoomIn = () => setView(v => ({ ...v, zoom: Math.min(3, v.zoom + 0.2) }));
  const zoomOut = () => setView(v => ({ ...v, zoom: Math.max(0.2, v.zoom - 0.2) }));
  
  const zBtn = { width: 28, height: 28, borderRadius: 4, background: PNL, border: `1px solid #263238`, color: WC, fontFamily: FN, fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" };
  const fitAll = () => {
    // Calculate bounding box of all objects
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    d.tps.forEach(t => { const w = t.type === "2bktp" ? TP2_W : TP_W; const h = t.type === "2bktp" ? TP2_H : TP_H; minX = Math.min(minX, t.x); minY = Math.min(minY, t.y); maxX = Math.max(maxX, t.x + w); maxY = Math.max(maxY, t.y + h); });
    d.kruns.forEach(k => { minX = Math.min(minX, k.x); minY = Math.min(minY, k.y); maxX = Math.max(maxX, k.x + k.sections.length * 46 + 40); maxY = Math.max(maxY, k.y + 80); });
    d.lrs.forEach(l => { minX = Math.min(minX, l.x); minY = Math.min(minY, l.y); maxX = Math.max(maxX, l.x + 60); maxY = Math.max(maxY, l.y + 40); });
    // Include RP-25 block
    const rpBus = d.buses.find(b => b.id === "bus-rp");
    if (rpBus?.x != null) { minX = Math.min(minX, rpBus.x - 10); minY = Math.min(minY, rpBus.y - 50); maxX = Math.max(maxX, rpBus.x + 210); maxY = Math.max(maxY, rpBus.y + 40); }
    // Include ПС-677 + РП-34 block
    const px = d.psBlock?.x || 200, py = d.psBlock?.y || 10;
    const s1cells_fit = d.cells.filter(c => c.busId === "bus-1").length;
    const s1w_fit = Math.max(s1cells_fit * 70 + 10, 100);
    const s2start_fit = px + 10 + s1w_fit + 40;
    const s2cells_fit = d.cells.filter(c => c.busId === "bus-2").length;
    const s2w_fit = Math.max(s2cells_fit * 70 + 10, 100);
    const totalW_fit = s2start_fit + s2w_fit;
    minX = Math.min(minX, px - 20); minY = Math.min(minY, py - 10);
    maxX = Math.max(maxX, totalW_fit + 20); maxY = Math.max(maxY, py + 120);
    if (minX === Infinity) return resetView();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return resetView();
    const pad = 40;
    const bw = maxX - minX + pad * 2, bh = maxY - minY + pad * 2;
    const zoom = Math.min(rect.width / bw, rect.height / bh, 2);
    setView({ x: -minX * zoom + pad * zoom + (rect.width - bw * zoom) / 2, y: -minY * zoom + pad * zoom + (rect.height - bh * zoom) / 2, zoom });
  };

  // SVG switch
  const Sw = ({ x, y, on, onClick, sz = 10 }) => (
    <g onMouseDown={e => { e.stopPropagation(); e.preventDefault(); onClick(); }} style={{ cursor: "pointer" }}>
      <rect x={x - sz / 2} y={y - sz / 2} width={sz} height={sz} rx={2} fill={on ? "#1b5e20" : "#6b1515"} stroke={on ? ON : OFF} strokeWidth={.8} />
      {on ? <line x1={x} y1={y - sz / 2 + 2} x2={x} y2={y + sz / 2 - 2} stroke={ON} strokeWidth={1.5} /> :
        <><line x1={x - 2.5} y1={y - 2.5} x2={x + 2.5} y2={y + 2.5} stroke={OFF} strokeWidth={1} />
          <line x1={x + 2.5} y1={y - 2.5} x2={x - 2.5} y2={y + 2.5} stroke={OFF} strokeWidth={1} /></>}
    </g>
  );

  // Port dot — clickable for connecting. Uses onMouseDown+stopPropagation to prevent drag
  const Port = ({ x, y, on, label, portRef }) => {
    const isActive = connecting && pKey(connecting) === pKey(portRef);
    const handleClick = e => {
      e.stopPropagation();
      e.preventDefault();
      onPortClick(portRef);
    };
    return (
      <g onMouseDown={handleClick} style={{ cursor: connecting ? "crosshair" : "pointer" }}>
        {/* Bigger invisible hit area */}
        <circle cx={x} cy={y} r={12} fill="transparent" />
        <circle cx={x} cy={y} r={6} fill={isActive ? "#ff0" : on ? WC : "#1a2a30"}
          stroke={isActive ? "#ff0" : on ? WC : "#2a3a40"} strokeWidth={isActive ? 2.5 : 1.5}
          style={isActive ? { filter: "drop-shadow(0 0 6px #ff0)" } : on ? { filter: `drop-shadow(0 0 4px ${WC}60)` } : {}} />
        <circle cx={x} cy={y} r={2.5} fill={isActive ? "#000" : on ? "#fff" : "#444"} />
        {label && <text x={x} y={y - 10} textAnchor="middle" fill={on ? WC : TM} fontSize={6} fontWeight="bold" fontFamily={FN}>{label}</text>}
      </g>
    );
  };

  // ═══ 0.4kV PAGE ROUTING ═══
  if (page?.type === "04") {
    const tpP = d.tps.find(t => t.id === page.tpId);
    if (!tpP) { setPage(null); return null; }
    const is2b = tpP.type === "2bktp";
    const trState = is2b
      ? { tr1On: isEnergized(`tp-in1_1:${page.tpId}`, d) && tpP.sw.tr_1, tr2On: isEnergized(`tp-in1_2:${page.tpId}`, d) && tpP.sw.tr_2, sv04: tpP.sv04 }
      : { trOn: isEnergized(`tp-in1:${page.tpId}`, d) && tpP.sw.tr };
    return <Page04 tpId={page.tpId} d={d} setD={setD} log={log} trState={trState} onBack={() => setPage(null)} />;
  }

  return (
    <div style={{ background: DK, minHeight: "100vh", fontFamily: FN, color: TXT, display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ padding: "5px 12px", borderBottom: "1px solid #1a2332", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffd600" strokeWidth="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
          <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: 2 }}>ЭНЕРГОУЧЁТ</span>
        </div>
        <div style={{ display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: 8, color: ON, background: "#0d2818", padding: "1px 5px", borderRadius: 3 }}>{time.toLocaleString("ru-RU")}</span>
          {[{ l: "I", on: s1 }, { l: "II", on: s2 }, { l: "РП", on: rp }].map((s, i) =>
            <span key={i} style={{ fontSize: 7, padding: "1px 5px", borderRadius: 2, color: s.on ? ON : OFF, background: s.on ? "#0d2818" : "#2a1010" }}>{s.l}</span>)}
          <span style={{ fontSize: 7, color: BUS }}>ТП:{tpOnCnt}/{d.tps.length}</span>
          {connecting && <span style={{ fontSize: 8, color: "#ff0", background: "#332800", padding: "1px 6px", borderRadius: 3, border: "1px solid #ff0" }}>
            🔗 Выбери вторую точку...
            <button onClick={() => setConnecting(null)} style={{ background: "none", border: "none", color: OFF, cursor: "pointer", fontSize: 8, marginLeft: 4 }}>✕</button>
          </span>}
          <button onClick={addCell} style={{ padding: "1px 6px", borderRadius: 2, background: BUS + "10", border: `1px solid ${BUS}40`, color: BUS, fontFamily: FN, fontSize: 7, cursor: "pointer" }}>+ Яч.</button>
          <button onClick={addTP} style={{ padding: "1px 6px", borderRadius: 2, background: ON + "10", border: `1px solid ${ON}40`, color: ON, fontFamily: FN, fontSize: 7, cursor: "pointer" }}>+ ТП</button>
          <button onClick={add2BKTP} style={{ padding: "1px 6px", borderRadius: 2, background: WC + "10", border: `1px solid ${WC}40`, color: WC, fontFamily: FN, fontSize: 7, cursor: "pointer" }}>+ 2БКТП</button>
          <button onClick={addKR} style={{ padding: "1px 6px", borderRadius: 2, background: KR + "10", border: `1px solid ${KR}40`, color: KR, fontFamily: FN, fontSize: 7, cursor: "pointer" }}>+ КРУН</button>
          <button onClick={addLR} style={{ padding: "1px 6px", borderRadius: 2, background: LRC + "10", border: `1px solid ${LRC}40`, color: LRC, fontFamily: FN, fontSize: 7, cursor: "pointer" }}>+ ЛР</button>
          <button onClick={exportState} style={{ padding: "1px 5px", borderRadius: 2, background: "none", border: `1px solid ${WC}30`, color: WC, fontSize: 7, cursor: "pointer", fontFamily: FN }}>Экспорт</button>
          <button onClick={() => importRef.current?.click()} style={{ padding: "1px 5px", borderRadius: 2, background: "none", border: `1px solid ${WC}30`, color: WC, fontSize: 7, cursor: "pointer", fontFamily: FN }}>Импорт</button>
          <input ref={importRef} type="file" accept=".json" onChange={importState} style={{ display: "none" }} />
          <button onClick={() => { if (confirm("Сбросить все изменения к начальному состоянию?")) { localStorage.removeItem(STORAGE_KEY); setD(INIT); } }} style={{ padding: "1px 5px", borderRadius: 2, background: "none", border: `1px solid ${OFF}30`, color: OFF, fontSize: 7, cursor: "pointer", fontFamily: FN }}>⟲ Сброс</button>
          <button onClick={() => setShowLog(!showLog)} style={{ padding: "1px 5px", borderRadius: 2, background: "none", border: `1px solid ${TD}30`, color: TD, fontSize: 7, cursor: "pointer", fontFamily: FN }}>◷{d.switchLog.length}</button>
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: "flex", gap: 3, padding: "3px 12px", borderBottom: "1px solid #1a2332", flexWrap: "wrap" }}>
        {d.inputBreakers.map(ib =>
          <button key={ib.id} onClick={() => togIB(ib.id)} style={{ padding: "1px 4px", borderRadius: 2, background: ib.closed ? "#0d2818" : "#2a1010", border: `1px solid ${ib.closed ? "#2e7d32" : "#4a2020"}`, cursor: "pointer", color: ib.closed ? ON : OFF, fontFamily: FN, fontSize: 7 }}>{ib.feedName}</button>)}
        {d.sectionBreakers.map(sb =>
          <button key={sb.id} onClick={() => togSB(sb.id)} style={{ padding: "1px 4px", borderRadius: 2, background: sb.closed ? "#0d2818" : "#2a1010", border: `1px solid ${sb.closed ? "#2e7d32" : "#4a2020"}`, cursor: "pointer", color: sb.closed ? ON : OFF, fontFamily: FN, fontSize: 7 }}>{sb.name}</button>)}
      </div>

      {/* SVG Canvas with Pan & Zoom */}
      <div ref={containerRef} onMouseDown={onPanStart} onClick={() => selLink && setSelLink(null)}
        style={{ flex: 1, overflow: "hidden", background: `radial-gradient(ellipse at 50% 20%, #111a24 0%, ${DK} 70%)`, position: "relative", cursor: panning ? "grabbing" : "default" }}>
        
        {/* Zoom controls */}
        <div style={{ position: "absolute", right: 12, top: 12, zIndex: 10, display: "flex", flexDirection: "column", gap: 3 }}>
          <button onClick={zoomIn} style={zBtn}>＋</button>
          <button onClick={zoomOut} style={zBtn}>−</button>
          <button onClick={fitAll} style={zBtn}>⊡</button>
          <button onClick={resetView} style={zBtn}>1:1</button>
          <div style={{ textAlign: "center", fontSize: 7, color: TD, marginTop: 2 }}>{Math.round(view.zoom * 100)}%</div>
        </div>
        
        {/* Pan/zoom hint */}
        <div style={{ position: "absolute", left: 12, bottom: 8, zIndex: 10, fontSize: 7, color: TM }}>
          Колёсико: зум · Alt+тяни: пан · Тяни блок: двигать
        </div>
        
        <svg ref={svgRef} width={CANVAS_W} height={CANVAS_H} viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
          style={{ display: "block", transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})`, transformOrigin: "0 0" }}>
          <defs><pattern id="g" width="30" height="30" patternUnits="userSpaceOnUse"><path d="M30 0L0 0 0 30" fill="none" stroke="#162030" strokeWidth="0.3" /></pattern></defs>
          <rect width={CANVAS_W} height={CANVAS_H} fill="url(#g)" />

          {/* ПС-677 + РП-34 — draggable block */}
          {(() => {
            const px = d.psBlock?.x || 200, py = d.psBlock?.y || 10;
            const s1cells = d.cells.filter(c => c.busId === "bus-1").length;
            const s1w = Math.max(s1cells * 70 + 10, 100);
            const s2start = px + 10 + s1w + 40;
            const s2cells = d.cells.filter(c => c.busId === "bus-2").length;
            const s2w = Math.max(s2cells * 70 + 10, 100);
            const totalW = s2start + s2w;
            const centerX = (px + totalW) / 2;
            const ib1 = d.inputBreakers.find(b => b.busId === "bus-1");
            const ib2 = d.inputBreakers.find(b => b.busId === "bus-2");
            const ib1x = px + s1w / 2, ib2x = s2start + s2w / 2;
            // Block bounding box for border
            const bx1 = px - 10, by1 = py - 8;
            const bx2 = totalW + 10, by2 = py + 110;
            const bW = bx2 - bx1, bH = by2 - by1;
            return <g onMouseDown={e => startDrag(e, "ps", null)} style={{ cursor: drag?.type === "ps" ? "grabbing" : "grab" }}>
              {/* Work zone border */}
              <rect x={bx1} y={by1} width={bW} height={bH} rx={8}
                fill="none" stroke="#263238" strokeWidth={1} strokeDasharray="6 3" />
              <text x={bx1 + 6} y={by1 - 3} fill={TM} fontSize={6} fontFamily={FN}>РП-34</text>

              {/* ПС-677 block */}
              <rect x={centerX - 50} y={py} width={100} height={22} rx={5}
                fill="#1a1a08" stroke={BUS + "60"} strokeWidth={1.2} />
              <text x={centerX} y={py + 15} textAnchor="middle" fill={BUS}
                fontSize={9} fontWeight="bold" fontFamily={FN}>ПС-677</text>

              {/* Луч 1 → Секция I */}
              <line x1={centerX - 20} y1={py + 22} x2={ib1x} y2={py + 34} stroke={ib1?.closed && s1 ? BUS : BUSOFF} strokeWidth={1.5} />
              <text x={ib1x} y={py + 32} textAnchor="middle" fill={ib1?.closed ? BUS : TD} fontSize={5} fontFamily={FN}>Луч 1</text>
              <Sw x={ib1x} y={py + 46} on={ib1?.closed} onClick={() => ib1 && togIB(ib1.id)} sz={11} />
              <line x1={ib1x} y1={py + 52} x2={ib1x} y2={py + 61} stroke={s1 ? BUS : BUSOFF} strokeWidth={1.5} />

              {/* Луч 2 → Секция II */}
              <line x1={centerX + 20} y1={py + 22} x2={ib2x} y2={py + 34} stroke={ib2?.closed && s2 ? BUS : BUSOFF} strokeWidth={1.5} />
              <text x={ib2x} y={py + 32} textAnchor="middle" fill={ib2?.closed ? BUS : TD} fontSize={5} fontFamily={FN}>Луч 2</text>
              <Sw x={ib2x} y={py + 46} on={ib2?.closed} onClick={() => ib2 && togIB(ib2.id)} sz={11} />
              <line x1={ib2x} y1={py + 52} x2={ib2x} y2={py + 61} stroke={s2 ? BUS : BUSOFF} strokeWidth={1.5} />

              {/* РП-34 title */}
              <text x={centerX} y={py + 56} textAnchor="middle" fill={s1 || s2 ? "#4fc3f7" : TD}
                fontSize={7} fontFamily={FN}>РП-34</text>

              {/* Секция I bus */}
              <rect x={px} y={py + 61} width={s1w} height={4} rx={1} fill={s1 ? BUS : BUSOFF} />
              <text x={px + s1w / 2} y={py + 71} textAnchor="middle" fill={s1 ? BUS : TD} fontSize={6} fontFamily={FN}>Секция I</text>

              {/* Секционник */}
              {(() => {
                const sv = d.sectionBreakers[0];
                const svX = px + s1w + 10;
                return <g>
                  <rect x={svX} y={py + 61} width={20} height={4} rx={1} fill={sv?.closed ? BUS : BUSOFF} />
                  <Sw x={svX + 10} y={py + 63} on={sv?.closed} onClick={() => sv && togSB(sv.id)} sz={9} />
                </g>;
              })()}

              {/* Секция II bus */}
              <rect x={s2start} y={py + 61} width={s2w} height={4} rx={1} fill={s2 ? BUS : BUSOFF} />
              <text x={s2start + s2w / 2} y={py + 71} textAnchor="middle" fill={s2 ? BUS : TD} fontSize={6} fontFamily={FN}>Секция II</text>

              {/* Cells inside this block */}
              {d.cells.map((cell) => {
                const isS1 = cell.busId === "bus-1";
                const idxInBus = d.cells.filter(c => c.busId === cell.busId).indexOf(cell);
                const cx = isS1 ? px + 10 + idxInBus * 70 : s2start + idxInBus * 70;
                const cy = py + 76;
                const bOn = busOn(cell.busId, d); const on = bOn && cell.closed;
                const isRes = cell.type === "reserve";
                return (<g key={cell.id}>
                  <rect x={cx} y={cy} width={30} height={26} rx={3}
                    fill={isRes ? "#141020" : on ? "#0d1f12" : "#1a1212"}
                    stroke={isRes ? "#7c4dff30" : on ? BUS + "40" : "#26323850"} strokeWidth={1} opacity={isRes ? .5 : 1} />
                  <text x={cx + 15} y={cy - 3} textAnchor="middle" fill={isRes ? "#7c4dff" : on ? BUS : TD}
                    fontSize={7} fontWeight="bold" fontFamily={FN} style={{ cursor: "pointer" }}
                    onClick={e => { e.stopPropagation(); editCell(cell); }}>Яч.{cell.num}</text>
                  {!isRes && <Sw x={cx + 15} y={cy + 13} on={cell.closed} onClick={() => togCell(cell.id)} sz={10} />}
                  {isRes && <text x={cx + 15} y={cy + 15} textAnchor="middle" fill="#7c4dff" fontSize={6} fontFamily={FN}>рез</text>}
                  {!isRes && <>
                    <line x1={cx + 15} y1={cy + 20} x2={cx + 15} y2={cy + 30} stroke={on ? BUS : WO} strokeWidth={1.5} />
                    <Port x={cx + 15} y={cy + 30} on={on} label="" portRef={{ block: "cell", id: cell.id, port: "out" }} />
                  </>}
                </g>);
              })}
            </g>;
          })()}

          {/* РП-25 — отдельный блок с фидерами-выходами */}
          {(() => {
            const rpBus = d.buses.find(b => b.id === "bus-rp");
            if (!rpBus || !rpBus.feeders) return null;
            const rpX = rpBus.x ?? 500, rpY = rpBus.y ?? 510, rpW = 200;
            const rpOn = busOn("bus-rp", d);
            return (
              <g onMouseDown={e => startDrag(e, "rp", "bus-rp")} style={{ cursor: drag ? "grabbing" : "grab" }}>
                {/* Background */}
                <rect x={rpX - 10} y={rpY - 30} width={rpW + 20} height={75} rx={6}
                  fill={rpOn ? "#0a1f1f" : "#151515"} stroke={rpOn ? WC + "80" : "#3a4a50"} strokeWidth={1.5} />
                {/* Title */}
                <text x={rpX + rpW / 2} y={rpY - 35} textAnchor="middle" fill={rpOn ? WC : TD}
                  fontSize={10} fontWeight="bold" fontFamily={FN}>РП-25</text>
                {/* Input switch */}
                <Sw x={rpX + rpW / 2} y={rpY - 16} on={rpBus.inputOn} onClick={() => togRPinput("bus-rp")} sz={11} />
                <text x={rpX + rpW / 2 + 12} y={rpY - 13} fill={rpBus.inputOn ? WC : TM} fontSize={5} fontFamily={FN}>ввод</text>
                <line x1={rpX + rpW / 2} y1={rpY - 10} x2={rpX + rpW / 2} y2={rpY} stroke={rpOn ? WC : WO} strokeWidth={1.5} />
                {/* Bus bar */}
                <rect x={rpX} y={rpY} width={rpW} height={4} rx={1} fill={rpOn ? WC : WO}
                  style={rpOn ? { filter: `drop-shadow(0 0 4px ${WC}40)` } : {}} />
                {/* Feeder outputs */}
                {rpBus.feeders.map((f, i) => {
                  const fx = rpX + 50 + i * 100;
                  const fOn = rpOn && f.closed;
                  return (
                    <g key={f.id}>
                      <line x1={fx} y1={rpY + 4} x2={fx} y2={rpY + 12} stroke={rpOn ? WC : WO} strokeWidth={1.5} />
                      <Sw x={fx} y={rpY + 18} on={f.closed} onClick={() => togRPfeeder("bus-rp", f.id)} sz={11} />
                      <line x1={fx} y1={rpY + 24} x2={fx} y2={rpY + 30} stroke={fOn ? WC : WO} strokeWidth={1.5} />
                      <Port x={fx} y={rpY + 30} on={fOn} label={f.name} portRef={{ block: "bus", id: "bus-rp", port: f.id }} />
                    </g>
                  );
                })}
              </g>
            );
          })()}

          {/* Cables — orthogonal routing with editable waypoints */}
          {d.links.map(link => {
            const fp = getPortPos(link.from, d); const tp = getPortPos(link.to, d);
            if (!fp || !tp) return null;
            const fOn = portEnergized(link.from, d); const tOn = portEnergized(link.to, d);
            const on = fOn && tOn;
            const d1 = portDir(link.from, d), d2 = portDir(link.to, d);
            const wps = link.waypoints || [];
            const pathD = orthoPath(fp.x, fp.y, d1, tp.x, tp.y, d2, wps);
            const mx = (fp.x + tp.x) / 2, my = (fp.y + tp.y) / 2;
            const isSel = selLink === link.id;
            return (<g key={link.id}>
              {/* Invisible fat path for easier clicking */}
              <path d={pathD} fill="none" stroke="transparent" strokeWidth={12}
                style={{ cursor: "pointer" }}
                onClick={e => { e.stopPropagation(); setSelLink(isSel ? null : link.id); }}
                onDoubleClick={e => {
                  e.stopPropagation();
                  const sp = clientToSvg(e.clientX, e.clientY); if (!sp) return;
                  const idx = findWpInsertIdx(fp, tp, wps, sp.x, sp.y);
                  addWaypoint(link.id, sp.x, sp.y, idx);
                  setSelLink(link.id);
                }} />
              {/* Visible path */}
              <path d={pathD} fill="none"
                stroke={isSel ? "#ffab00" : on ? WC : WO}
                strokeWidth={isSel ? 2 : on ? 1.8 : .8}
                strokeLinejoin="round" strokeLinecap="round"
                style={on && !isSel ? { filter: `drop-shadow(0 0 2px ${WC}40)` } : {}}
                pointerEvents="none" />
              {/* Cable label */}
              {link.cable && <text x={mx} y={my - 4} textAnchor="middle" fill={TM} fontSize={5} fontFamily={FN}>{link.cable}</text>}
              {/* Delete X — only when selected */}
              {isSel && <g onClick={e => { e.stopPropagation(); delLink(link.id); setSelLink(null); }} style={{ cursor: "pointer" }}>
                <circle cx={mx} cy={my} r={4} fill="#2a1010" stroke="#4a2020" strokeWidth={.5} opacity={.6} />
                <text x={mx} y={my + 2.5} textAnchor="middle" fill={OFF} fontSize={6} fontFamily={FN}>✕</text>
              </g>}
              {/* Waypoint handles when selected */}
              {isSel && wps.map((wp, i) => (
                <g key={i}>
                  <circle cx={wp.x} cy={wp.y} r={5} fill="#ffab00" stroke="#fff" strokeWidth={1}
                    style={{ cursor: "grab" }}
                    onMouseDown={e => { e.stopPropagation(); startDrag(e, "wp", link.id, { wpIdx: i }); }}
                    onContextMenu={e => { e.preventDefault(); e.stopPropagation(); delWaypoint(link.id, i); }} />
                </g>
              ))}
              {/* Hint when selected */}
              {isSel && wps.length === 0 && <text x={mx} y={my - 10} textAnchor="middle"
                fill="#ffab00" fontSize={5} fontFamily={FN} pointerEvents="none">2×клик — добавить точку</text>}
            </g>);
          })}

          {/* Work zone border for entire canvas */}
          <rect x={20} y={20} width={CANVAS_W - 40} height={CANVAS_H - 40}
            fill="none" stroke="#1a2332" strokeWidth={2} rx={12} />

          {/* LRs */}
          {d.lrs.map(lr => {
            const en = portEnergized({ block: "lr", id: lr.id, port: "a" }, d) && lr.closed;
            return (<g key={lr.id} onMouseDown={e => startDrag(e, "lr", lr.id)} style={{ cursor: drag ? "grabbing" : "grab" }}>
              <rect x={lr.x} y={lr.y} width={50} height={28} rx={3}
                fill={en ? "#1a1a08" : "#1a1212"} stroke={en ? LRC + "50" : "#26323850"} strokeWidth={1} />
              <text x={lr.x + 25} y={lr.y - 3} textAnchor="middle" fill={en ? LRC : TD}
                fontSize={7} fontWeight="bold" fontFamily={FN}
                style={{ cursor: "pointer" }} onClick={e => { e.stopPropagation(); editLR(lr); }}>{lr.name}</text>
              <Port x={lr.x} y={lr.y + 14} on={en} label="A" portRef={{ block: "lr", id: lr.id, port: "a" }} />
              <line x1={lr.x + 5} y1={lr.y + 14} x2={lr.x + 16} y2={lr.y + 14} stroke={en ? LRC : WO} strokeWidth={1.5} />
              <Sw x={lr.x + 25} y={lr.y + 14} on={lr.closed} onClick={() => togLR(lr.id)} sz={12} />
              <line x1={lr.x + 34} y1={lr.y + 14} x2={lr.x + 45} y2={lr.y + 14} stroke={en ? LRC : WO} strokeWidth={1.5} />
              <Port x={lr.x + 50} y={lr.y + 14} on={en} label="B" portRef={{ block: "lr", id: lr.id, port: "b" }} />
            </g>);
          })}

          {/* KRUNs */}
          {d.kruns.map(kr => {
            const W = Math.max(80, kr.sections.length * 46 + 20);
            const anyOn = kr.sections.some(s => s.closed && isEnergized(`ks:${s.id}`, d));
            return (<g key={kr.id} onMouseDown={e => startDrag(e, "krun", kr.id)} style={{ cursor: drag ? "grabbing" : "grab" }}>
              <rect x={kr.x} y={kr.y} width={W} height={68} rx={5}
                fill={anyOn ? "#1a1028" : "#141020"} stroke={anyOn ? KR + "60" : "#26323850"} strokeWidth={1.2} />
              <text x={kr.x + W / 2} y={kr.y - 4} textAnchor="middle" fill={anyOn ? KR : TD}
                fontSize={9} fontWeight="bold" fontFamily={FN} style={{ cursor: "pointer" }}
                onClick={e => { e.stopPropagation(); editKR(kr); }}>{kr.name}</text>
              <line x1={kr.x + 10} y1={kr.y + 22} x2={kr.x + W - 10} y2={kr.y + 22}
                stroke={anyOn ? KR : BUSOFF} strokeWidth={3} strokeLinecap="round" />
              {kr.sections.map((sec, i) => {
                const sx = kr.x + 25 + i * 46;
                const secOn = sec.closed && isEnergized(`ks:${sec.id}`, d);
                return (<g key={sec.id}>
                  <line x1={sx} y1={kr.y + 24} x2={sx} y2={kr.y + 36} stroke={secOn ? KR : WO} strokeWidth={1.5} />
                  <Sw x={sx} y={kr.y + 42} on={sec.closed} onClick={() => togKS(kr.id, sec.id)} sz={10} />
                  <line x1={sx} y1={kr.y + 48} x2={sx} y2={kr.y + 64} stroke={secOn ? KR : WO} strokeWidth={1.5} />
                  <Port x={sx} y={kr.y + 68} on={secOn} label={sec.name}
                    portRef={{ block: "krun", id: kr.id, port: `s${i + 1}` }} />
                </g>);
              })}
            </g>);
          })}

          {/* TPs — regular (not 2bktp) */}
          {d.tps.filter(t => t.type !== "2bktp").map(tp => {
            const in1On = isEnergized(`tp-in1:${tp.id}`, d);
            const trOn = in1On && tp.sw.tr;
            const outOn = in1On && tp.sw.out1;
            return (<g key={tp.id} onMouseDown={e => startDrag(e, "tp", tp.id)} style={{ cursor: drag ? "grabbing" : "grab" }}>
              <rect x={tp.x} y={tp.y} width={TP_W} height={TP_H} rx={4}
                fill={trOn ? "#0d1f12" : in1On ? "#111a10" : "#1a1212"}
                stroke={trOn ? ON + "60" : in1On ? BUS + "30" : "#26323850"} strokeWidth={1.2} />
              <text x={tp.x + TP_W / 2} y={tp.y - 4} textAnchor="middle" fill={trOn ? BUS : in1On ? "#a5d6a7" : TD}
                fontSize={8} fontWeight="bold" fontFamily={FN} style={{ cursor: "pointer" }}
                onClick={e => { e.stopPropagation(); editTP(tp); }}>{tp.name}</text>
              {tp.power > 0 && <text x={tp.x + TP_W / 2} y={tp.y - 12} textAnchor="middle" fill={TM} fontSize={6} fontFamily={FN}>{tp.power}кВА</text>}

              {/* Port in1 (I ввод) */}
              <Port x={tp.x} y={tp.y + 18} on={in1On} label="I вв" portRef={{ block: "tp", id: tp.id, port: "in1" }} />
              <line x1={tp.x + 5} y1={tp.y + 18} x2={tp.x + 16} y2={tp.y + 18} stroke={in1On ? WC : WO} strokeWidth={1.5} />
              <Sw x={tp.x + 22} y={tp.y + 18} on={tp.sw.in1} onClick={() => togTP(tp.id, "in1")} />

              {/* Internal bus */}
              <line x1={tp.x + 28} y1={tp.y + 18} x2={tp.x + 62} y2={tp.y + 18} stroke={in1On ? WC : WO} strokeWidth={1} />

              {/* Port in2 (I ввод2 — для кольцевого питания) */}
              <Port x={tp.x} y={tp.y + 38} on={isEnergized(`tp-in2:${tp.id}`, d)} label="I вв2"
                portRef={{ block: "tp", id: tp.id, port: "in2" }} />
              <line x1={tp.x + 5} y1={tp.y + 38} x2={tp.x + 16} y2={tp.y + 38} stroke={isEnergized(`tp-in2:${tp.id}`, d) ? WC : WO} strokeWidth={1} />
              <Sw x={tp.x + 22} y={tp.y + 38} on={tp.sw.in2} onClick={() => togTP(tp.id, "in2")} sz={8} />
              <line x1={tp.x + 28} y1={tp.y + 38} x2={tp.x + 28} y2={tp.y + 18} stroke={WO} strokeWidth={.5} strokeDasharray="2" />

              {/* D/ВН branch down */}
              <line x1={tp.x + 45} y1={tp.y + 18} x2={tp.x + 45} y2={tp.y + 28} stroke={in1On ? WC : WO} strokeWidth={1} />
              <Sw x={tp.x + 45} y={tp.y + 33} on={tp.sw.tr} onClick={() => togTP(tp.id, "tr")} sz={9} />
              <text x={tp.x + 45} y={tp.y + 27} textAnchor="middle" fill={TM} fontSize={5} fontFamily={FN}>
                {tp.rm6Type === "rm6" ? "D" : "ВН"}</text>
              <circle cx={tp.x + 45} cy={tp.y + 42} r={3} fill="none" stroke={trOn ? BUS : BUSOFF} strokeWidth={1} />
              <circle cx={tp.x + 45} cy={tp.y + 48} r={3} fill="none" stroke={trOn ? WC : WO} strokeWidth={1} />
              <text x={tp.x + 45} y={tp.y + 56} textAnchor="middle" fill={trOn ? ON : TM} fontSize={5} fontFamily={FN}
                style={{ cursor: "pointer", textDecoration: "underline" }}
                onClick={e => { e.stopPropagation(); setPage({ type: "04", tpId: tp.id }); }}>
                {trOn ? "● 0.4" : "○ 0.4"}</text>
              {/* 3-phase indicators 0.4kV */}
              {(() => { const ph = tp.phases || { a: "warn", b: "warn", c: "warn" };
                const md = tp.meterData;
                const clr = s => !trOn ? PH_OFF : s === "ok" ? PH_OK : s === "err" ? PH_ERR : PH_WARN;
                const uKey = { a: "Ua", b: "Ub", c: "Uc" };
                const bx = tp.x + 33, by = tp.y + 62;
                return <g>
                  {["a","b","c"].map((p,i) => <g key={p}>
                    <circle cx={bx + i * 9} cy={by} r={2.8} fill={clr(ph[p])} opacity={trOn ? 1 : 0.3} />
                    <text x={bx + i * 9} y={by + 8} textAnchor="middle" fill={trOn ? TXT : TM} fontSize={4} fontFamily={FN}>{p.toUpperCase()}</text>
                    {md && md[uKey[p]] != null && <title>{p.toUpperCase()}: {md[uKey[p]].toFixed(1)}В</title>}
                  </g>)}
                  {md?.ts && <text x={bx + 9} y={by + 14} textAnchor="middle" fill={TM} fontSize={3} fontFamily={FN}>{md.ts}</text>}
                </g>;
              })()}

              {/* Port out1 (I выход) */}
              <Sw x={tp.x + 68} y={tp.y + 18} on={tp.sw.out1} onClick={() => togTP(tp.id, "out1")} />
              <line x1={tp.x + 74} y1={tp.y + 18} x2={tp.x + 85} y2={tp.y + 18} stroke={outOn ? WC : WO} strokeWidth={1.5} />
              <Port x={tp.x + TP_W} y={tp.y + 18} on={outOn} label="I вых" portRef={{ block: "tp", id: tp.id, port: "out1" }} />
            </g>);
          })}

          {/* 2БКТП */}
          {d.tps.filter(t => t.type === "2bktp").map(tp => {
            const s1on = isEnergized(`tp-in1_1:${tp.id}`, d);
            const s2on = isEnergized(`tp-in1_2:${tp.id}`, d);
            const tr1on = s1on && tp.sw.tr_1;
            const tr2on = s2on && tp.sw.tr_2;
            const out1on = s1on && tp.sw.out1_1;
            const out2on = s2on && tp.sw.out1_2;
            const in2_1on = isEnergized(`tp-in2_1:${tp.id}`, d);
            const in2_2on = isEnergized(`tp-in2_2:${tp.id}`, d);
            const anyOn = tr1on || tr2on;
            const W = TP2_W, H = TP2_H, cx = tp.x + W / 2;
            return (<g key={tp.id} onMouseDown={e => startDrag(e, "tp", tp.id)} style={{ cursor: drag ? "grabbing" : "grab" }}>
              {/* Background */}
              <rect x={tp.x} y={tp.y} width={W} height={H} rx={5}
                fill={anyOn ? "#0d1f12" : s1on || s2on ? "#111a10" : "#1a1212"}
                stroke={anyOn ? ON + "60" : s1on || s2on ? BUS + "30" : "#26323850"} strokeWidth={1.2} />
              {/* Title */}
              <text x={cx} y={tp.y - 4} textAnchor="middle" fill={anyOn ? BUS : s1on || s2on ? "#a5d6a7" : TD}
                fontSize={9} fontWeight="bold" fontFamily={FN} style={{ cursor: "pointer" }}
                onClick={e => { e.stopPropagation(); edit2BKTP(tp); }}>{tp.name}</text>
              {/* Center divider */}
              <line x1={cx} y1={tp.y + 4} x2={cx} y2={tp.y + H - 4} stroke="#263238" strokeWidth={1} strokeDasharray="3" />
              <text x={cx} y={tp.y - 12} textAnchor="middle" fill={TM} fontSize={6} fontFamily={FN}>2БКТП</text>

              {/* === LEFT RM6 #1 === */}
              {/* Port in1_1 */}
              <Port x={tp.x} y={tp.y + 20} on={s1on} label="I вв" portRef={{ block: "tp", id: tp.id, port: "in1_1" }} />
              <line x1={tp.x + 5} y1={tp.y + 20} x2={tp.x + 16} y2={tp.y + 20} stroke={s1on ? WC : WO} strokeWidth={1.5} />
              <Sw x={tp.x + 22} y={tp.y + 20} on={tp.sw.in1_1} onClick={() => togTP(tp.id, "in1_1")} />
              {/* Left bus */}
              <line x1={tp.x + 28} y1={tp.y + 20} x2={cx - 16} y2={tp.y + 20} stroke={s1on ? WC : WO} strokeWidth={1} />
              {/* Port in2_1 */}
              <Port x={tp.x} y={tp.y + 44} on={in2_1on} label="II вв" portRef={{ block: "tp", id: tp.id, port: "in2_1" }} />
              <line x1={tp.x + 5} y1={tp.y + 44} x2={tp.x + 16} y2={tp.y + 44} stroke={in2_1on ? WC : WO} strokeWidth={1} />
              <Sw x={tp.x + 22} y={tp.y + 44} on={tp.sw.in2_1} onClick={() => togTP(tp.id, "in2_1")} sz={8} />
              <line x1={tp.x + 28} y1={tp.y + 44} x2={tp.x + 28} y2={tp.y + 20} stroke={WO} strokeWidth={.5} strokeDasharray="2" />
              {/* D/tr_1 */}
              <line x1={tp.x + 45} y1={tp.y + 20} x2={tp.x + 45} y2={tp.y + 30} stroke={s1on ? WC : WO} strokeWidth={1} />
              <Sw x={tp.x + 45} y={tp.y + 35} on={tp.sw.tr_1} onClick={() => togTP(tp.id, "tr_1")} sz={9} />
              <text x={tp.x + 45} y={tp.y + 29} textAnchor="middle" fill={TM} fontSize={5} fontFamily={FN}>D</text>
              <circle cx={tp.x + 45} cy={tp.y + 44} r={3} fill="none" stroke={tr1on ? BUS : BUSOFF} strokeWidth={1} />
              <circle cx={tp.x + 45} cy={tp.y + 50} r={3} fill="none" stroke={tr1on ? WC : WO} strokeWidth={1} />
              <text x={tp.x + 45} y={tp.y + 58} textAnchor="middle" fill={tr1on ? ON : TM} fontSize={5} fontFamily={FN}
                style={{ cursor: "pointer", textDecoration: "underline" }}
                onClick={e => { e.stopPropagation(); setPage({ type: "04", tpId: tp.id }); }}>
                {tr1on ? "● 0.4-I" : "○ 0.4-I"}</text>
              {/* 3-phase indicators section 1 */}
              {(() => { const ph = tp.phases1 || { a: "warn", b: "warn", c: "warn" };
                const clr = s => !tr1on ? PH_OFF : s === "ok" ? PH_OK : s === "err" ? PH_ERR : PH_WARN;
                const bx = tp.x + 33, by = tp.y + 64;
                return <g>
                  {["a","b","c"].map((p,i) => <g key={p}>
                    <circle cx={bx + i * 9} cy={by} r={2.8} fill={clr(ph[p])} opacity={tr1on ? 1 : 0.3} />
                    <text x={bx + i * 9} y={by + 8} textAnchor="middle" fill={tr1on ? TXT : TM} fontSize={4} fontFamily={FN}>{p.toUpperCase()}</text>
                  </g>)}
                </g>;
              })()}
              {/* Port out1_1 */}
              <Port x={tp.x} y={tp.y + 64} on={out1on} label="I вых" portRef={{ block: "tp", id: tp.id, port: "out1_1" }} />
              <line x1={tp.x + 5} y1={tp.y + 64} x2={tp.x + 16} y2={tp.y + 64} stroke={out1on ? WC : WO} strokeWidth={1} />
              <Sw x={tp.x + 22} y={tp.y + 64} on={tp.sw.out1_1} onClick={() => togTP(tp.id, "out1_1")} sz={8} />
              <line x1={tp.x + 28} y1={tp.y + 64} x2={tp.x + 28} y2={tp.y + 20} stroke={WO} strokeWidth={.5} strokeDasharray="2" />

              {/* === CENTER: sv10 & sv04 === */}
              <Sw x={cx} y={tp.y + 20} on={tp.sv10} onClick={() => togTPsv(tp.id, "sv10")} sz={10} />
              <text x={cx} y={tp.y + 12} textAnchor="middle" fill={tp.sv10 ? ON : TM} fontSize={5} fontFamily={FN}>СВ10</text>
              <Sw x={cx} y={tp.y + 58} on={tp.sv04} onClick={() => togTPsv(tp.id, "sv04")} sz={10} />
              <text x={cx} y={tp.y + 70} textAnchor="middle" fill={tp.sv04 ? ON : TM} fontSize={5} fontFamily={FN}>СВ04</text>

              {/* === RIGHT RM6 #2 === */}
              {/* Port in1_2 */}
              <Port x={tp.x + W} y={tp.y + 20} on={s2on} label="I вв" portRef={{ block: "tp", id: tp.id, port: "in1_2" }} />
              <line x1={tp.x + W - 5} y1={tp.y + 20} x2={tp.x + W - 16} y2={tp.y + 20} stroke={s2on ? WC : WO} strokeWidth={1.5} />
              <Sw x={tp.x + W - 22} y={tp.y + 20} on={tp.sw.in1_2} onClick={() => togTP(tp.id, "in1_2")} />
              {/* Right bus */}
              <line x1={cx + 16} y1={tp.y + 20} x2={tp.x + W - 28} y2={tp.y + 20} stroke={s2on ? WC : WO} strokeWidth={1} />
              {/* Port in2_2 */}
              <Port x={tp.x + W} y={tp.y + 44} on={in2_2on} label="II вв" portRef={{ block: "tp", id: tp.id, port: "in2_2" }} />
              <line x1={tp.x + W - 5} y1={tp.y + 44} x2={tp.x + W - 16} y2={tp.y + 44} stroke={in2_2on ? WC : WO} strokeWidth={1} />
              <Sw x={tp.x + W - 22} y={tp.y + 44} on={tp.sw.in2_2} onClick={() => togTP(tp.id, "in2_2")} sz={8} />
              <line x1={tp.x + W - 28} y1={tp.y + 44} x2={tp.x + W - 28} y2={tp.y + 20} stroke={WO} strokeWidth={.5} strokeDasharray="2" />
              {/* D/tr_2 */}
              <line x1={tp.x + W - 45} y1={tp.y + 20} x2={tp.x + W - 45} y2={tp.y + 30} stroke={s2on ? WC : WO} strokeWidth={1} />
              <Sw x={tp.x + W - 45} y={tp.y + 35} on={tp.sw.tr_2} onClick={() => togTP(tp.id, "tr_2")} sz={9} />
              <text x={tp.x + W - 45} y={tp.y + 29} textAnchor="middle" fill={TM} fontSize={5} fontFamily={FN}>D</text>
              <circle cx={tp.x + W - 45} cy={tp.y + 44} r={3} fill="none" stroke={tr2on ? BUS : BUSOFF} strokeWidth={1} />
              <circle cx={tp.x + W - 45} cy={tp.y + 50} r={3} fill="none" stroke={tr2on ? WC : WO} strokeWidth={1} />
              <text x={tp.x + W - 45} y={tp.y + 58} textAnchor="middle" fill={tr2on ? ON : TM} fontSize={5} fontFamily={FN}
                style={{ cursor: "pointer", textDecoration: "underline" }}
                onClick={e => { e.stopPropagation(); setPage({ type: "04", tpId: tp.id }); }}>
                {tr2on ? "● 0.4-II" : "○ 0.4-II"}</text>
              {/* 3-phase indicators section 2 */}
              {(() => { const ph = tp.phases2 || { a: "warn", b: "warn", c: "warn" };
                const clr = s => !tr2on ? PH_OFF : s === "ok" ? PH_OK : s === "err" ? PH_ERR : PH_WARN;
                const bx = tp.x + W - 57, by = tp.y + 64;
                return <g>
                  {["a","b","c"].map((p,i) => <g key={p}>
                    <circle cx={bx + i * 9} cy={by} r={2.8} fill={clr(ph[p])} opacity={tr2on ? 1 : 0.3} />
                    <text x={bx + i * 9} y={by + 8} textAnchor="middle" fill={tr2on ? TXT : TM} fontSize={4} fontFamily={FN}>{p.toUpperCase()}</text>
                  </g>)}
                </g>;
              })()}
              {/* Port out1_2 */}
              <Port x={tp.x + W} y={tp.y + 64} on={out2on} label="I вых" portRef={{ block: "tp", id: tp.id, port: "out1_2" }} />
              <line x1={tp.x + W - 5} y1={tp.y + 64} x2={tp.x + W - 16} y2={tp.y + 64} stroke={out2on ? WC : WO} strokeWidth={1} />
              <Sw x={tp.x + W - 22} y={tp.y + 64} on={tp.sw.out1_2} onClick={() => togTP(tp.id, "out1_2")} sz={8} />
              <line x1={tp.x + W - 28} y1={tp.y + 64} x2={tp.x + W - 28} y2={tp.y + 20} stroke={WO} strokeWidth={.5} strokeDasharray="2" />
            </g>);
          })}
        </svg>
      </div>

      {/* Log */}
      {showLog && <div style={{ position: "fixed", right: 0, top: 0, bottom: 0, width: 240, background: PNL, borderLeft: "1px solid #1a2332", zIndex: 900, display: "flex", flexDirection: "column" }}>
        <div style={{ padding: 6, borderBottom: "1px solid #1a2332", display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 9, fontWeight: 700, color: "#ffb300" }}>Журнал</span>
          <button onClick={() => setShowLog(false)} style={{ background: BG, border: "1px solid #263238", color: TD, cursor: "pointer", width: 18, height: 18, borderRadius: 3, fontSize: 10 }}>✕</button></div>
        <div style={{ flex: 1, overflow: "auto", padding: 4 }}>
          {d.switchLog.map((e, i) => <div key={i} style={{ padding: "2px 4px", marginBottom: 1, borderRadius: 2, background: DK }}>
            <span style={{ fontSize: 5, color: TM }}>{e.t} </span><span style={{ fontSize: 7, color: TXT }}>{e.d}</span></div>)}
        </div>
      </div>}

      {/* Modal */}
      {modal && <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={() => setModal(null)}>
        <div style={{ background: PNL, border: "1px solid #263238", borderRadius: 10, padding: 20, minWidth: 380, maxWidth: 500, maxHeight: "85vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h3 style={{ margin: 0, color: "#4fc3f7", fontFamily: FN, fontSize: 13 }}>
              {modal.type === "ac" ? "＋ Новая ячейка" : modal.type === "ec" ? `✎ Ячейка ${modal.f.num}` :
                modal.type === "etp" ? `✎ ${modal.f.name}` : modal.type === "e2bktp" ? `✎ ${modal.f.name}` :
                modal.type === "ekr" ? `✎ ${modal.f.name}` : modal.type === "elr" ? `✎ ${modal.f.name}` : ""}</h3>
            <button onClick={() => setModal(null)} style={{ background: BG, border: "1px solid #37474f", color: TD, cursor: "pointer", fontSize: 14, width: 24, height: 24, borderRadius: 5, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
          </div>

          {/* === ЯЧЕЙКА === */}
          {(modal.type === "ac" || modal.type === "ec") && <>
            {fld("Номер ячейки", modal.f.num, v => uf("num", v))}
            {sel("Секция шин", modal.f.busId, v => uf("busId", v), d.buses.map(b => ({ v: b.id, l: b.name })))}
            {sel("Тип ячейки", modal.f.type, v => uf("type", v), [
              { v: "line", l: "Линейная (отходящая)" }, { v: "input", l: "Вводная" }, { v: "reserve", l: "Резервная" }])}
            {modal.type === "ec" && <>
              <div style={{ borderTop: "1px solid #263238", marginTop: 12, paddingTop: 10 }}>
                <span style={{ fontSize: 8, color: TD }}>Подключённые кабели:</span>
                {d.links.filter(l => (l.from.block === "cell" && l.from.id === modal.id) || (l.to.block === "cell" && l.to.id === modal.id)).map(l => (
                  <div key={l.id} style={{ fontSize: 8, color: TXT, padding: "2px 0", display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ color: WC }}>●</span> {pKey(l.from)} → {pKey(l.to)}
                    <button onClick={() => delLink(l.id)} style={{ background: "none", border: "none", color: OFF, cursor: "pointer", fontSize: 8 }}>✕</button>
                  </div>
                ))}
              </div>
              {dangerBtn("🗑 Удалить ячейку и все связи", () => delCell(modal.id))}
            </>}
          </>}

          {/* === ТП === */}
          {modal.type === "etp" && <>
            {fld("Название ТП", modal.f.name, v => uf("name", v))}
            {sel("Тип ВВ аппарата", modal.f.rm6Type, v => uf("rm6Type", v), [
              { v: "rm6", l: "RM6 (I-I-D) — кольцевая" }, { v: "vn", l: "ВН ячейка с выкл. нагрузки" }])}
            <div style={{ borderTop: "1px solid #263238", marginTop: 8, paddingTop: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 9, color: WC, fontWeight: 600 }}>Трансформатор</span></div>
            <div style={{ display: "flex", gap: 6 }}>
              <div style={{ flex: 1 }}>{fld("Мощность, кВА", modal.f.power, v => uf("power", v), "number", "1000")}</div>
              <div style={{ flex: 1 }}>{fld("Номинал, кВА", modal.f.trNominal, v => uf("trNominal", v), "number", "1000")}</div>
            </div>
            {fld("Счётчик ВН (10кВ)", modal.f.meterHv, v => uf("meterHv", v), "text", "№ счётчика")}
            {fld("Марка кабеля 10кВ", modal.f.cable10, v => uf("cable10", v), "text", "АСБЛ 3×240")}
            <div style={{ borderTop: "1px solid #263238", marginTop: 8, paddingTop: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 9, color: BUS, fontWeight: 600 }}>РУ-0.4 кВ</span></div>
            <div style={{ display: "flex", gap: 6 }}>
              <div style={{ flex: 1 }}>{fld("Ячеек 0.4кВ", modal.f.cells04, v => uf("cells04", v), "number", "12")}</div>
              <div style={{ flex: 1 }}>{fld("Номинал яч., А", modal.f.cellNominal, v => uf("cellNominal", v), "number", "630")}</div>
            </div>
            <div style={{ borderTop: "1px solid #263238", marginTop: 8, paddingTop: 8 }}>
              <span style={{ fontSize: 8, color: TD }}>Подключённые кабели 10кВ:</span>
              {d.links.filter(l => (l.from.block === "tp" && l.from.id === modal.id) || (l.to.block === "tp" && l.to.id === modal.id)).map(l => (
                <div key={l.id} style={{ fontSize: 8, color: TXT, padding: "2px 0", display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ color: WC }}>●</span> {pKey(l.from)} → {pKey(l.to)} {l.cable && <span style={{ color: TM }}>({l.cable})</span>}
                  <button onClick={() => delLink(l.id)} style={{ background: "none", border: "none", color: OFF, cursor: "pointer", fontSize: 8 }}>✕</button>
                </div>
              ))}
            </div>
            {dangerBtn("🗑 Удалить ТП и все связи", () => delTP(modal.id))}
          </>}

          {/* === 2БКТП === */}
          {modal.type === "e2bktp" && <>
            {fld("Название 2БКТП", modal.f.name, v => uf("name", v))}
            {fld("Марка кабеля 10кВ", modal.f.cable10, v => uf("cable10", v), "text", "АСБЛ 3×240")}
            <div style={{ borderTop: "1px solid #263238", marginTop: 8, paddingTop: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 9, color: WC, fontWeight: 600 }}>Трансформатор #1 (левый)</span></div>
            {fld("Мощность Т1, кВА", modal.f.power1, v => uf("power1", v), "number", "1000")}
            {fld("Счётчик ВН #1", modal.f.meterHv1, v => uf("meterHv1", v), "text", "№ счётчика")}
            <div style={{ borderTop: "1px solid #263238", marginTop: 8, paddingTop: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 9, color: WC, fontWeight: 600 }}>Трансформатор #2 (правый)</span></div>
            {fld("Мощность Т2, кВА", modal.f.power2, v => uf("power2", v), "number", "1000")}
            {fld("Счётчик ВН #2", modal.f.meterHv2, v => uf("meterHv2", v), "text", "№ счётчика")}
            <div style={{ borderTop: "1px solid #263238", marginTop: 8, paddingTop: 8 }}>
              <span style={{ fontSize: 8, color: TD }}>Подключённые кабели 10кВ:</span>
              {d.links.filter(l => (l.from.block === "tp" && l.from.id === modal.id) || (l.to.block === "tp" && l.to.id === modal.id)).map(l => (
                <div key={l.id} style={{ fontSize: 8, color: TXT, padding: "2px 0", display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ color: WC }}>●</span> {pKey(l.from)} → {pKey(l.to)} {l.cable && <span style={{ color: TM }}>({l.cable})</span>}
                  <button onClick={() => delLink(l.id)} style={{ background: "none", border: "none", color: OFF, cursor: "pointer", fontSize: 8 }}>✕</button>
                </div>
              ))}
            </div>
            {dangerBtn("🗑 Удалить 2БКТП и все связи", () => delTP(modal.id))}
          </>}

          {/* === КРУН === */}
          {modal.type === "ekr" && <>
            {fld("Название КРУНа", modal.f.name, v => uf("name", v))}
            <div style={{ borderTop: "1px solid #263238", marginTop: 8, paddingTop: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 9, color: KR, fontWeight: 600 }}>Секции ({modal.f.sections.length}/4)</span></div>
            {modal.f.sections.map((s, i) => (
              <div key={i} style={{ display: "flex", gap: 4, marginBottom: 4, alignItems: "center" }}>
                <span style={{ fontSize: 8, color: KR, width: 14 }}>{i + 1}.</span>
                <input value={s.name} onChange={e => { const a = [...modal.f.sections]; a[i] = { ...a[i], name: e.target.value }; uf("sections", a); }}
                  style={{ flex: 1, padding: 5, background: DK, border: "1px solid #263238", borderRadius: 3, color: TXT, fontFamily: FN, fontSize: 9, outline: "none" }} />
                {modal.f.sections.length > 2 && <button onClick={() => uf("sections", modal.f.sections.filter((_, j) => j !== i))}
                  style={{ background: "none", border: "none", color: OFF, cursor: "pointer", fontSize: 11 }}>✕</button>}
              </div>
            ))}
            {modal.f.sections.length < 4 && <button onClick={() => uf("sections", [...modal.f.sections, { id: `${modal.id}-s${modal.f.sections.length + 1}`, name: `С${modal.f.sections.length + 1}`, closed: true }])}
              style={{ padding: "3px 8px", background: KR + "10", border: `1px solid ${KR}40`, borderRadius: 4, color: KR, fontFamily: FN, fontSize: 8, cursor: "pointer", marginTop: 4 }}>＋ Добавить секцию</button>}
            <div style={{ borderTop: "1px solid #263238", marginTop: 10, paddingTop: 8 }}>
              <span style={{ fontSize: 8, color: TD }}>Подключённые кабели:</span>
              {d.links.filter(l => (l.from.block === "krun" && l.from.id === modal.id) || (l.to.block === "krun" && l.to.id === modal.id)).map(l => (
                <div key={l.id} style={{ fontSize: 8, color: TXT, padding: "2px 0", display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ color: KR }}>●</span> {pKey(l.from)} → {pKey(l.to)}
                  <button onClick={() => delLink(l.id)} style={{ background: "none", border: "none", color: OFF, cursor: "pointer", fontSize: 8 }}>✕</button>
                </div>
              ))}
            </div>
            {dangerBtn("🗑 Удалить КРУН и все связи", () => delKR(modal.id))}
          </>}

          {/* === ЛР === */}
          {modal.type === "elr" && <>
            {fld("Название ЛР", modal.f.name, v => uf("name", v))}
            {fld("Счётчик на ЛР", modal.f.meter, v => uf("meter", v), "text", "№ счётчика")}
            <div style={{ borderTop: "1px solid #263238", marginTop: 8, paddingTop: 8 }}>
              <span style={{ fontSize: 8, color: TD }}>Подключённые кабели:</span>
              {d.links.filter(l => (l.from.block === "lr" && l.from.id === modal.id) || (l.to.block === "lr" && l.to.id === modal.id)).map(l => (
                <div key={l.id} style={{ fontSize: 8, color: TXT, padding: "2px 0", display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ color: LRC }}>●</span> {pKey(l.from)} → {pKey(l.to)}
                  <button onClick={() => delLink(l.id)} style={{ background: "none", border: "none", color: OFF, cursor: "pointer", fontSize: 8 }}>✕</button>
                </div>
              ))}
            </div>
            {dangerBtn("🗑 Удалить ЛР и все связи", () => delLR(modal.id))}
          </>}

          {/* Save / Cancel */}
          <div style={{ display: "flex", gap: 6, marginTop: 16, justifyContent: "flex-end" }}>
            <button onClick={() => setModal(null)} style={{ padding: "4px 12px", background: "none", border: `1px solid ${TD}40`, borderRadius: 4, color: TD, fontFamily: FN, fontSize: 9, cursor: "pointer" }}>Отмена</button>
            <button onClick={save} style={{ padding: "4px 12px", background: ON + "15", border: `1px solid ${ON}40`, borderRadius: 4, color: ON, fontFamily: FN, fontSize: 9, fontWeight: 600, cursor: "pointer" }}>💾 Сохранить</button>
          </div>
        </div>
      </div>}
    </div>
  );
}
