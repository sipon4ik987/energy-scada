// Page04.jsx — 0.4kV Distribution Panel Visualization Page
import { useState, useCallback, useEffect, useRef } from "react";
import {
  ON, OFF, BUS, BUSOFF, WC, WO, PNL as PNL_C, DK, BG, TXT, TD, TM, FN,
  PH_OK, PH_WARN, PH_ERR, PH_OFF,
  uid, STUB, orthoPath, findWpInsertIdx,
  Sw, Port, inpS, lblS, fld, sel, dangerBtn
} from "./shared";
import { SLD_SYMBOLS, getSymbolPortPos } from "./symbols";
import { SldPalette, SldCanvas, computeSldEnergy } from "./SldEditor";

const PW = 180, CANVAS_W = 4000, CANVAS_H = 3000;
const BUS04_Y = 90, FEEDER_SP = 60, CARD_H = 50;
const pnlH = () => CARD_H + 10;
const SLD_W = 2000, SLD_H = 1500;

// ═══ SLD EDITOR OVERLAY COMPONENT ═══
function SldEditorOverlay({
  panelId, panels, feeders, placingType, setPlacingType,
  connecting, setConnecting, onClose, setPanelSld, toggleSldElem,
  openSldElemEditor, onSldPortClick, uid, SLD_SYMBOLS, computeSldEnergy
}) {
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const [ev, setEv] = useState({ x: 0, y: 0, zoom: 1 });
  const [epan, setEpan] = useState(null);
  const [edrag, setEdrag] = useState(null);

  const pnl = panels.find(p => p.id === panelId);
  if (!pnl) return null;
  const eSld = pnl.sld || { elements: [], wires: [] };
  const eEnergized = computeSldEnergy(eSld);

  const c2s = (cx, cy) => {
    const svg = svgRef.current; if (!svg) return null;
    const pt = svg.createSVGPoint(); pt.x = cx; pt.y = cy;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
  };

  // Zoom
  useEffect(() => {
    const el = containerRef.current; if (!el) return;
    const h = e => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setEv(v => {
        const nz = Math.max(0.2, Math.min(3, v.zoom + delta));
        const rect = el.getBoundingClientRect();
        const mx = e.clientX - rect.left, my = e.clientY - rect.top;
        const scale = nz / v.zoom;
        return { x: mx - scale * (mx - v.x), y: my - scale * (my - v.y), zoom: nz };
      });
    };
    el.addEventListener("wheel", h, { passive: false });
    return () => el.removeEventListener("wheel", h);
  }, []);

  // Pan
  const onPanStart = e => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      e.preventDefault(); setEpan({ sx: e.clientX, sy: e.clientY, vx: ev.x, vy: ev.y });
    }
  };
  useEffect(() => {
    if (!epan) return;
    const mm = e => setEv(v => ({ ...v, x: epan.vx + (e.clientX - epan.sx), y: epan.vy + (e.clientY - epan.sy) }));
    const mu = () => setEpan(null);
    window.addEventListener("mousemove", mm); window.addEventListener("mouseup", mu);
    return () => { window.removeEventListener("mousemove", mm); window.removeEventListener("mouseup", mu); };
  }, [epan]);

  // Drag elements
  const startEdrag = (e, id) => {
    if (e.button !== 0 || e.altKey || connecting) return;
    e.preventDefault(); e.stopPropagation();
    const sp = c2s(e.clientX, e.clientY); if (!sp) return;
    setEdrag({ id, sx: sp.x, sy: sp.y });
  };
  useEffect(() => {
    if (!edrag) return;
    const mm = e => {
      const svg = svgRef.current; if (!svg) return;
      const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
      const ctm = svg.getScreenCTM(); if (!ctm) return;
      const sp = pt.matrixTransform(ctm.inverse());
      const dx = sp.x - edrag.sx, dy = sp.y - edrag.sy;
      setPanelSld(panelId, s => ({ ...s, elements: s.elements.map(el => el.id === edrag.id ? { ...el, x: el.x + dx, y: el.y + dy } : el) }));
      setEdrag(pr => ({ ...pr, sx: sp.x, sy: sp.y }));
    };
    const mu = () => setEdrag(null);
    window.addEventListener("mousemove", mm); window.addEventListener("mouseup", mu);
    return () => { window.removeEventListener("mousemove", mm); window.removeEventListener("mouseup", mu); };
  }, [edrag, panelId]);

  return <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
    onClick={onClose}>
    <div style={{ background: DK, border: `1px solid ${WC}40`, borderRadius: 10, width: "92vw", height: "88vh", display: "flex", flexDirection: "column", overflow: "hidden" }}
      onClick={e => e.stopPropagation()}>

      {/* Header */}
      <div style={{ padding: "6px 12px", borderBottom: `1px solid ${WC}30`, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 800, color: WC, fontFamily: FN }}>ОЛС</span>
          <span style={{ fontSize: 10, color: BUS, fontFamily: FN }}>{pnl.name}</span>
          {pnl.location && <span style={{ fontSize: 8, color: TM, fontFamily: FN }}>{pnl.location}</span>}
          <span style={{ fontSize: 7, color: TD }}>{eSld.elements.length} эл.</span>
        </div>
        <div style={{ display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap" }}>
          <SldPalette placingType={placingType} setPlacingType={setPlacingType} />
          {connecting?.sldPort && <span style={{ fontSize: 8, color: "#ff0", background: "#332800", padding: "1px 6px", borderRadius: 3, border: "1px solid #ff0" }}>
            Выбери порт...
            <button onClick={() => setConnecting(null)} style={{ background: "none", border: "none", color: OFF, cursor: "pointer", fontSize: 8, marginLeft: 4 }}>✕</button>
          </span>}
          {placingType && <span style={{ fontSize: 8, color: WC, background: WC + "15", padding: "1px 6px", borderRadius: 3, border: `1px solid ${WC}40` }}>
            Размещение «{SLD_SYMBOLS[placingType]?.label}»
            <button onClick={() => setPlacingType(null)} style={{ background: "none", border: "none", color: OFF, cursor: "pointer", fontSize: 8, marginLeft: 4 }}>✕</button>
          </span>}
        </div>
        <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
          <button onClick={() => setEv(v => ({ ...v, zoom: Math.min(3, v.zoom + 0.2) }))}
            style={{ width: 24, height: 24, borderRadius: 3, background: PNL_C, border: "1px solid #263238", color: WC, fontFamily: FN, fontSize: 12, cursor: "pointer" }}>＋</button>
          <button onClick={() => setEv(v => ({ ...v, zoom: Math.max(0.2, v.zoom - 0.2) }))}
            style={{ width: 24, height: 24, borderRadius: 3, background: PNL_C, border: "1px solid #263238", color: WC, fontFamily: FN, fontSize: 12, cursor: "pointer" }}>−</button>
          <button onClick={() => setEv({ x: 0, y: 0, zoom: 1 })}
            style={{ width: 24, height: 24, borderRadius: 3, background: PNL_C, border: "1px solid #263238", color: WC, fontFamily: FN, fontSize: 12, cursor: "pointer" }}>⊡</button>
          <span style={{ fontSize: 7, color: TD, minWidth: 28, textAlign: "center" }}>{Math.round(ev.zoom * 100)}%</span>
          <button onClick={onClose}
            style={{ background: BG, border: "1px solid #37474f", color: TD, cursor: "pointer", fontSize: 14, width: 28, height: 28, borderRadius: 5, marginLeft: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>
      </div>

      {/* Canvas */}
      <div ref={containerRef} onMouseDown={onPanStart}
        style={{ flex: 1, overflow: "hidden", background: `radial-gradient(ellipse at 50% 20%, #111a24 0%, ${DK} 70%)`, position: "relative", cursor: epan ? "grabbing" : "default" }}>
        <svg ref={svgRef} width={SLD_W} height={SLD_H} viewBox={`0 0 ${SLD_W} ${SLD_H}`}
          style={{ display: "block", transform: `translate(${ev.x}px, ${ev.y}px) scale(${ev.zoom})`, transformOrigin: "0 0" }}>
          <defs>
            <pattern id="gSldEd" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M20 0L0 0 0 20" fill="none" stroke="#162030" strokeWidth="0.3" />
            </pattern>
          </defs>
          <rect width={SLD_W} height={SLD_H} fill="url(#gSldEd)"
            onClick={e => {
              if (!placingType) return;
              const sp = c2s(e.clientX, e.clientY); if (!sp) return;
              const sym = SLD_SYMBOLS[placingType]; if (!sym) return;
              const el = { id: uid(), type: placingType, x: sp.x, y: sp.y, label: sym.label, on: !!sym.switchable, params: { ...sym.defaultParams }, feederLink: null };
              setPanelSld(panelId, s => ({ ...s, elements: [...s.elements, el] }));
            }}
            style={placingType ? { cursor: "crosshair" } : {}} />

          <text x={SLD_W / 2} y={24} textAnchor="middle" fill={WC} fontSize={12} fontWeight="bold" fontFamily={FN}>
            {pnl.name}{pnl.location ? ` — ${pnl.location}` : ""}
          </text>

          <SldCanvas sld={eSld} energized={eEnergized} feeders={feeders}
            connecting={connecting} setConnecting={setConnecting}
            onElemClick={id => { const el = eSld.elements.find(ee => ee.id === id); if (el && SLD_SYMBOLS[el.type]?.switchable) toggleSldElem(id, panelId); }}
            onElemDblClick={id => openSldElemEditor(id, panelId)}
            onPortClick={(eId, pId) => onSldPortClick(eId, pId, panelId)}
            onElemDragStart={(e, id) => startEdrag(e, id)} />
        </svg>
      </div>

      {/* Footer */}
      <div style={{ padding: "4px 12px", borderTop: "1px solid #162030", fontSize: 7, color: TM, fontFamily: FN }}>
        Клик: переключить · 2×клик: редактировать · Тяни: двигать · Alt+тяни: пан · Колёсико: зум · Палитра → клик: разместить · Порт → порт: провод
      </div>
    </div>
  </div>;
}

export default function Page04({ tpId, d, setD, onBack, log, trState }) {
  const [modal, setModal] = useState(null);
  const [connecting, setConnecting] = useState(null);
  const [drag, setDrag] = useState(null);
  const [selLink, setSelLink] = useState(null);
  const [placingType, setPlacingType] = useState(null);
  const [editSldElem, setEditSldElem] = useState(null);
  const [sldTarget, setSldTarget] = useState(null); // null = main canvas, panelId = that panel
  const [sldEditor, setSldEditor] = useState(null); // { panelId } — inline SLD editor for a panel
  const [view, setView] = useState({ x: 0, y: 0, zoom: 1 });
  const [panning, setPanning] = useState(null);
  const svgRef = useRef(null);
  const containerRef = useRef(null);

  const tp = d.tps.find(t => t.id === tpId);
  const is2b = tp?.type === "2bktp";
  const p04 = d.panels04?.[tpId] || { feeders: [], panels: [], links04: [] };
  const { feeders, panels, links04 } = p04;
  const sld = p04.sld || { elements: [], wires: [] };
  const sldEnergized = computeSldEnergy(sld);

  // ═══ INIT FEEDERS ═══
  const didInit = useRef(false);
  useEffect(() => {
    if (didInit.current || !tp || d.panels04?.[tpId]) return;
    didInit.current = true;
    const n = is2b ? 8 : (tp.cells04 || 4);
    const nom = tp.cellNominal || 630;
    const fds = Array.from({ length: n }, (_, i) => ({
      id: uid(), name: `Ф-${i + 1}`, nominal: nom, closed: true,
      section: is2b ? (i < n / 2 ? 1 : 2) : 1,
    }));
    setD(prev => ({
      ...prev,
      panels04: { ...prev.panels04, [tpId]: { feeders: fds, panels: [], links04: [] } }
    }));
  }, [tpId]);

  // ═══ HELPER: UPDATE P04 ═══
  const setP04 = fn => setD(prev => ({
    ...prev,
    panels04: {
      ...prev.panels04,
      [tpId]: fn(prev.panels04?.[tpId] || { feeders: [], panels: [], links04: [] })
    }
  }));

  // ═══ BUS GEOMETRY ═══
  const busW = Math.max(300, feeders.length * FEEDER_SP + 80);
  const busX = CANVAS_W / 2 - busW / 2;
  const feederX = i => busX + 50 + i * FEEDER_SP;
  const FEEDER_PORT_Y = BUS04_Y + 70;

  // ═══ ENERGIZATION ═══
  const busOn04 = is2b
    ? (s) => {
        const t1 = trState.tr1On, t2 = trState.tr2On, sv = trState.sv04;
        return s === 1 ? (t1 || (sv && t2)) : (t2 || (sv && t1));
      }
    : () => !!trState.trOn;

  const energyMap = {};
  {
    const queue = [];
    for (const f of feeders) {
      if (busOn04(f.section) && f.closed) {
        for (const lk of links04) {
          if (!lk.from.panelId && lk.from.breakerId === f.id) queue.push(lk.to.panelId);
        }
      }
    }
    while (queue.length) {
      const pid = queue.shift();
      if (energyMap[pid]) continue;
      const pnl = panels.find(p => p.id === pid);
      if (!pnl?.inputBreaker?.closed) continue;
      energyMap[pid] = true;
      for (const ob of pnl.outBreakers) {
        if (!ob.closed) continue;
        for (const lk of links04) {
          if (lk.from.panelId === pid && lk.from.breakerId === ob.id) queue.push(lk.to.panelId);
        }
      }
    }
  }

  // ═══ PORT POSITIONS ═══
  const feederPortPos = i => ({ x: feederX(i), y: FEEDER_PORT_Y });

  const panelInPos = pnl => ({ x: pnl.x + PW / 2, y: pnl.y });

  const panelOutPos = (pnl) => ({ x: pnl.x + PW / 2, y: pnl.y + CARD_H + 10 });

  const linkPortPos = (ref, isFrom) => {
    // SLD element port — resolve via panel offset + element position
    if (ref.sldElemId && ref.sldPortId && ref.panelId) {
      const pnl = panels.find(p => p.id === ref.panelId);
      if (!pnl?.sld) return null;
      const elem = pnl.sld.elements.find(e => e.id === ref.sldElemId);
      if (!elem) return null;
      const pos = getSymbolPortPos(elem, ref.sldPortId);
      if (!pos) return null;
      return { x: pos.x + pnl.x, y: pos.y + pnl.y };
    }
    if (isFrom) {
      if (!ref.panelId) {
        const fi = feeders.findIndex(f => f.id === ref.breakerId);
        return fi >= 0 ? feederPortPos(fi) : null;
      }
      const pnl = panels.find(p => p.id === ref.panelId);
      if (!pnl) return null;
      const bi = pnl.outBreakers.findIndex(b => b.id === ref.breakerId);
      return bi >= 0 ? panelOutPos(pnl) : null;
    }
    const pnl = panels.find(p => p.id === ref.panelId);
    return pnl ? panelInPos(pnl) : null;
  };

  const getLinkDir = (ref, defaultDir) => {
    if (ref.sldElemId && ref.sldPortId && ref.panelId) {
      const pnl = panels.find(p => p.id === ref.panelId);
      const elem = pnl?.sld?.elements?.find(e => e.id === ref.sldElemId);
      if (elem) {
        const pos = getSymbolPortPos(elem, ref.sldPortId);
        if (pos) return pos.dir;
      }
    }
    return defaultDir;
  };

  // ═══ FEEDER ENERGIZED ═══
  const feederOn = f => busOn04(f.section) && f.closed;

  // ═══ LINK ENERGIZED ═══
  const linkOn = lk => {
    if (!lk.from.panelId) {
      const f = feeders.find(fd => fd.id === lk.from.breakerId);
      if (!f || !feederOn(f)) return false;
    } else {
      if (!energyMap[lk.from.panelId]) return false;
      const pnl = panels.find(p => p.id === lk.from.panelId);
      const ob = pnl?.outBreakers.find(b => b.id === lk.from.breakerId);
      if (!ob?.closed) return false;
    }
    return true;
  };

  // ═══ AUTO-LAYOUT ═══
  const autoLayout = () => {
    const feederPanels = {}, childMap = {};
    for (const lk of links04) {
      if (!lk.from.panelId) {
        if (!feederPanels[lk.from.breakerId]) feederPanels[lk.from.breakerId] = [];
        feederPanels[lk.from.breakerId].push(lk.to.panelId);
      } else {
        if (!childMap[lk.from.panelId]) childMap[lk.from.panelId] = [];
        childMap[lk.from.panelId].push(lk.to.panelId);
      }
    }
    const GAP = 40, LH = 200;
    const treeW = pid => {
      const ch = childMap[pid] || [];
      if (!ch.length) return PW;
      return Math.max(PW, ch.map(treeW).reduce((a, b) => a + b + GAP, -GAP));
    };
    const pos = {};
    const place = (pid, cx, y) => {
      pos[pid] = { x: cx - PW / 2, y };
      const ch = childMap[pid] || [];
      if (!ch.length) return;
      const ws = ch.map(treeW);
      const tot = ws.reduce((a, b) => a + b + GAP, -GAP);
      let sx = cx - tot / 2;
      ch.forEach((cid, i) => { place(cid, sx + ws[i] / 2, y + LH); sx += ws[i] + GAP; });
    };
    const PANEL_Y0 = FEEDER_PORT_Y + 120;
    feeders.forEach((f, i) => {
      const fx = feederX(i);
      const roots = feederPanels[f.id] || [];
      if (!roots.length) return;
      const ws = roots.map(treeW);
      const tot = ws.reduce((a, b) => a + b + GAP, -GAP);
      let sx = fx - tot / 2;
      roots.forEach((rid, j) => { place(rid, sx + ws[j] / 2, PANEL_Y0); sx += ws[j] + GAP; });
    });
    // Place unconnected panels in a row below
    let ux = busX;
    panels.forEach(p => {
      if (!pos[p.id]) { pos[p.id] = { x: ux, y: PANEL_Y0 + 400 }; ux += PW + GAP; }
    });
    setP04(prev => ({
      ...prev,
      panels: prev.panels.map(p => pos[p.id] ? { ...p, x: pos[p.id].x, y: pos[p.id].y } : p)
    }));
  };

  // Auto-layout on first open if panels have no positions
  const didLayout = useRef(false);
  useEffect(() => {
    if (didLayout.current || !panels.length) return;
    if (panels.some(p => p.x === 0 && p.y === 0)) { didLayout.current = true; autoLayout(); }
  }, [panels.length]);

  // ═══ CONNECTING ═══
  const onPortClick = ref => {
    if (!connecting) { setConnecting(ref); return; }
    // connecting → ref: create link
    if (ref.type === "panelIn") {
      const lk = {
        id: uid(),
        from: {
          panelId: connecting.panelId || null, breakerId: connecting.breakerId,
          ...(connecting.sldElemId && { sldElemId: connecting.sldElemId, sldPortId: connecting.sldPortId }),
        },
        to: {
          panelId: ref.panelId,
          ...(ref.sldElemId && { sldElemId: ref.sldElemId, sldPortId: ref.sldPortId }),
        },
        waypoints: []
      };
      setP04(prev => ({ ...prev, links04: [...prev.links04, lk] }));
      log(`0.4: соединение → РЩ`);
    }
    setConnecting(null);
  };

  // ═══ CRUD: FEEDERS ═══
  const addFeeder = () => {
    const f = { id: uid(), name: `Ф-${feeders.length + 1}`, nominal: 630, closed: true, section: 1 };
    setP04(prev => ({ ...prev, feeders: [...prev.feeders, f] }));
  };
  const togFeeder = fId => setP04(prev => ({
    ...prev, feeders: prev.feeders.map(f => f.id === fId ? { ...f, closed: !f.closed } : f)
  }));
  const delFeeder = fId => setP04(prev => ({
    ...prev,
    feeders: prev.feeders.filter(f => f.id !== fId),
    links04: prev.links04.filter(l => !(l.from.panelId === null && l.from.breakerId === fId))
  }));
  const editFeeder = f => setModal({ type: "ef", id: f.id, f: { name: f.name, nominal: String(f.nominal), section: String(f.section) } });

  // ═══ CRUD: PANELS ═══
  const addPanel = () => {
    const id = uid();
    const x = busX + panels.length * 30, y = FEEDER_PORT_Y + 150 + panels.length * 20;
    const pnl = {
      id, tpId, parentId: null, parentBreakerId: null,
      name: `РЩ-${panels.length + 1}`, location: "",
      meter: { model: "", serial: "" },
      inputCable: { brand: "ВВГнг 4×70", length: 0, section: 70 },
      inputBreaker: { name: "QF-ввод", nominal: 250, closed: true },
      outBreakers: [
        { id: uid(), name: "QF1", nominal: 63, closed: true, targetCable: { brand: "", length: 0, section: 0 } },
      ],
      liveData: null, x, y
    };
    setP04(prev => ({ ...prev, panels: [...prev.panels, pnl] }));
    editPanel(pnl);
  };
  const editPanel = pnl => setModal({
    type: "ep", id: pnl.id,
    f: {
      name: pnl.name, location: pnl.location || "",
      meterModel: pnl.meter?.model || "", meterSerial: pnl.meter?.serial || "",
      cableBrand: pnl.inputCable?.brand || "", cableLength: String(pnl.inputCable?.length || 0), cableSection: String(pnl.inputCable?.section || 0),
      ibName: pnl.inputBreaker?.name || "QF", ibNominal: String(pnl.inputBreaker?.nominal || 250),
      outBreakers: (pnl.outBreakers || []).map(b => ({ ...b, nominal: String(b.nominal) })),
    }
  });
  const delPanel = id => {
    setP04(prev => ({
      ...prev,
      panels: prev.panels.filter(p => p.id !== id),
      links04: prev.links04.filter(l => l.to.panelId !== id && l.from.panelId !== id)
    }));
    setModal(null);
  };

  // ═══ LINKS ═══
  const delLink04 = id => setP04(prev => ({ ...prev, links04: prev.links04.filter(l => l.id !== id) }));
  const addWaypoint = (lId, x, y, idx) => setP04(prev => ({
    ...prev, links04: prev.links04.map(l => {
      if (l.id !== lId) return l;
      const wps = [...(l.waypoints || [])]; wps.splice(idx, 0, { x, y }); return { ...l, waypoints: wps };
    })
  }));
  const delWaypoint = (lId, wpIdx) => setP04(prev => ({
    ...prev, links04: prev.links04.map(l => {
      if (l.id !== lId) return l;
      return { ...l, waypoints: (l.waypoints || []).filter((_, i) => i !== wpIdx) };
    })
  }));

  // ═══ SLD CRUD ═══
  // Main canvas SLD
  const setSld = fn => setP04(prev => ({
    ...prev, sld: fn(prev.sld || { elements: [], wires: [] })
  }));

  // Per-panel SLD
  const setPanelSld = (panelId, fn) => setP04(prev => ({
    ...prev, panels: prev.panels.map(p => p.id === panelId
      ? { ...p, sld: fn(p.sld || { elements: [], wires: [] }) } : p)
  }));

  // Get the active SLD based on sldTarget
  const getTargetSld = () => {
    if (sldTarget) {
      const pnl = panels.find(p => p.id === sldTarget);
      return pnl?.sld || { elements: [], wires: [] };
    }
    return sld;
  };

  const setTargetSld = fn => {
    if (sldTarget) setPanelSld(sldTarget, fn);
    else setSld(fn);
  };

  const addSldElem = (type, x, y) => {
    const sym = SLD_SYMBOLS[type]; if (!sym) return;
    // If targeting a panel, store coordinates relative to panel position
    let ex = x, ey = y;
    if (sldTarget) {
      const pnl = panels.find(p => p.id === sldTarget);
      if (pnl) { ex = x - pnl.x; ey = y - pnl.y; }
    }
    const el = { id: uid(), type, x: ex, y: ey, label: sym.label, on: !!sym.switchable, params: { ...sym.defaultParams }, feederLink: null };
    setTargetSld(s => ({ ...s, elements: [...s.elements, el] }));
  };

  const toggleSldElem = (id, panelId) => {
    const fn = s => ({ ...s, elements: s.elements.map(e => e.id === id
      ? { ...e, on: SLD_SYMBOLS[e.type]?.switchable ? !e.on : e.on } : e) });
    if (panelId) setPanelSld(panelId, fn); else setSld(fn);
  };

  const deleteSldElem = (id, panelId) => {
    const fn = s => ({
      ...s,
      elements: s.elements.filter(e => e.id !== id),
      wires: s.wires.filter(w => w.from.elementId !== id && w.to.elementId !== id)
    });
    if (panelId) setPanelSld(panelId, fn); else setSld(fn);
  };

  const addSldWire = (fromElemId, fromPortId, toElemId, toPortId, panelId) => {
    if (fromElemId === toElemId) return;
    const targetSld = panelId ? (panels.find(p => p.id === panelId)?.sld || { elements: [], wires: [] }) : sld;
    const exists = targetSld.wires.some(w =>
      (w.from.elementId === fromElemId && w.from.portId === fromPortId && w.to.elementId === toElemId && w.to.portId === toPortId) ||
      (w.from.elementId === toElemId && w.from.portId === toPortId && w.to.elementId === fromElemId && w.to.portId === fromPortId)
    );
    if (exists) return;
    const wire = { id: uid(), from: { elementId: fromElemId, portId: fromPortId }, to: { elementId: toElemId, portId: toPortId }, waypoints: [] };
    const fn = s => ({ ...s, wires: [...s.wires, wire] });
    if (panelId) setPanelSld(panelId, fn); else setSld(fn);
  };

  const onSldPortClick = (elemId, portId, panelId) => {
    if (!connecting?.sldPort) {
      setConnecting({ sldPort: { elementId: elemId, portId, panelId: panelId || null } });
    } else {
      // Both ports must be in the same SLD context
      const srcPanel = connecting.sldPort.panelId;
      if (srcPanel === (panelId || null)) {
        addSldWire(connecting.sldPort.elementId, connecting.sldPort.portId, elemId, portId, srcPanel);
      }
      setConnecting(null);
    }
  };

  const openSldElemEditor = (id, panelId) => {
    const targetSld = panelId ? (panels.find(p => p.id === panelId)?.sld || { elements: [], wires: [] }) : sld;
    const el = targetSld.elements.find(e => e.id === id);
    if (!el) return;
    setEditSldElem({ ...el, params: { ...el.params }, _panelId: panelId || null });
  };

  const saveSldElem = () => {
    if (!editSldElem) return;
    const { _panelId, ...elData } = editSldElem;
    const fn = s => ({ ...s, elements: s.elements.map(e => e.id === elData.id ? { ...elData } : e) });
    if (_panelId) setPanelSld(_panelId, fn); else setSld(fn);
    setEditSldElem(null);
  };

  // ═══ MODAL ═══
  const uf = (k, v) => setModal(m => ({ ...m, f: { ...m.f, [k]: v } }));

  const saveModal = () => {
    if (!modal) return;
    const { type, id, f } = modal;
    if (type === "ef") {
      setP04(prev => ({
        ...prev, feeders: prev.feeders.map(fd => fd.id === id
          ? { ...fd, name: f.name, nominal: Number(f.nominal) || 630, section: Number(f.section) || 1 } : fd)
      }));
    } else if (type === "ep") {
      setP04(prev => ({
        ...prev, panels: prev.panels.map(p => p.id === id ? {
          ...p, name: f.name, location: f.location,
          meter: { model: f.meterModel, serial: f.meterSerial },
          inputCable: { brand: f.cableBrand, length: Number(f.cableLength) || 0, section: Number(f.cableSection) || 0 },
          inputBreaker: { ...p.inputBreaker, name: f.ibName, nominal: Number(f.ibNominal) || 250 },
          outBreakers: f.outBreakers.map(b => ({ ...b, nominal: Number(b.nominal) || 63 })),
        } : p)
      }));
    }
    setModal(null);
  };

  // ═══ SVG COORD ═══
  const clientToSvg = (cx, cy) => {
    const svg = svgRef.current; if (!svg) return null;
    const pt = svg.createSVGPoint(); pt.x = cx; pt.y = cy;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
  };

  // ═══ DRAG ═══
  const startDrag = (e, type, id, extra) => {
    if (e.button !== 0 || connecting || e.altKey) return;
    if (e.defaultPrevented) return;
    const useSvg = svgRef.current;
    if (!useSvg) return;
    const pt = useSvg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
    const sp = pt.matrixTransform(useSvg.getScreenCTM().inverse());
    setDrag({ type, id, sx: sp.x, sy: sp.y, ...extra }); e.preventDefault();
  };
  const onMM = useCallback(e => {
    if (!drag) return;
    const useSvg = svgRef.current;
    if (!useSvg) return;
    const pt = useSvg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
    const ctm = useSvg.getScreenCTM(); if (!ctm) return;
    const sp = pt.matrixTransform(ctm.inverse());
    const dx = sp.x - drag.sx, dy = sp.y - drag.sy;
    if (drag.type === "panel") {
      setP04(prev => ({ ...prev, panels: prev.panels.map(p => p.id === drag.id ? { ...p, x: p.x + dx, y: p.y + dy } : p) }));
    } else if (drag.type === "sldElem") {
      const fn = s => ({ ...s, elements: s.elements.map(e => e.id === drag.id ? { ...e, x: e.x + dx, y: e.y + dy } : e) });
      if (drag.panelId) setPanelSld(drag.panelId, fn); else setSld(fn);
    } else if (drag.type === "wp04") {
      setP04(prev => ({
        ...prev, links04: prev.links04.map(l => {
          if (l.id !== drag.id) return l;
          const wps = [...(l.waypoints || [])];
          wps[drag.wpIdx] = { x: wps[drag.wpIdx].x + dx, y: wps[drag.wpIdx].y + dy };
          return { ...l, waypoints: wps };
        })
      }));
    }
    setDrag(pr => ({ ...pr, sx: sp.x, sy: sp.y }));
  }, [drag]);
  const onMU = useCallback(() => setDrag(null), []);
  useEffect(() => {
    window.addEventListener("mousemove", onMM); window.addEventListener("mouseup", onMU);
    return () => { window.removeEventListener("mousemove", onMM); window.removeEventListener("mouseup", onMU); };
  }, [onMM, onMU]);

  // ═══ PAN & ZOOM ═══
  const onWheel = useCallback(e => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setView(v => {
      const nz = Math.max(0.2, Math.min(3, v.zoom + delta));
      const rect = containerRef.current?.getBoundingClientRect(); if (!rect) return { ...v, zoom: nz };
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      const scale = nz / v.zoom;
      return { x: mx - scale * (mx - v.x), y: my - scale * (my - v.y), zoom: nz };
    });
  }, []);
  const onPanStart = useCallback(e => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      e.preventDefault(); setPanning({ sx: e.clientX, sy: e.clientY, vx: view.x, vy: view.y });
    }
  }, [view]);
  const onPanMove = useCallback(e => {
    if (!panning) return;
    setView(v => ({ ...v, x: panning.vx + (e.clientX - panning.sx), y: panning.vy + (e.clientY - panning.sy) }));
  }, [panning]);
  const onPanEnd = useCallback(() => setPanning(null), []);
  useEffect(() => { const el = containerRef.current; if (!el) return; el.addEventListener("wheel", onWheel, { passive: false }); return () => el.removeEventListener("wheel", onWheel); }, [onWheel]);
  useEffect(() => {
    if (panning) { window.addEventListener("mousemove", onPanMove); window.addEventListener("mouseup", onPanEnd); return () => { window.removeEventListener("mousemove", onPanMove); window.removeEventListener("mouseup", onPanEnd); }; }
  }, [panning, onPanMove, onPanEnd]);

  const fitAll = () => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    // Bus
    minX = Math.min(minX, busX - 20); minY = Math.min(minY, 10); maxX = Math.max(maxX, busX + busW + 20); maxY = Math.max(maxY, FEEDER_PORT_Y + 20);
    // Panels
    panels.forEach(p => { minX = Math.min(minX, p.x - 10); minY = Math.min(minY, p.y - 20); maxX = Math.max(maxX, p.x + PW + 10); maxY = Math.max(maxY, p.y + pnlH() + 20); });
    if (minX === Infinity) return setView({ x: 0, y: 0, zoom: 1 });
    const rect = containerRef.current?.getBoundingClientRect(); if (!rect) return;
    const pad = 40, bw = maxX - minX + pad * 2, bh = maxY - minY + pad * 2;
    const zoom = Math.min(rect.width / bw, rect.height / bh, 2);
    setView({ x: -minX * zoom + pad * zoom + (rect.width - bw * zoom) / 2, y: -minY * zoom + pad * zoom + (rect.height - bh * zoom) / 2, zoom });
  };

  const didFit = useRef(false);
  useEffect(() => { if (!didFit.current && containerRef.current) { didFit.current = true; setTimeout(fitAll, 100); } });

  const zBtn = { width: 28, height: 28, borderRadius: 4, background: PNL_C, border: "1px solid #263238", color: WC, fontFamily: FN, fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" };

  const tpName = tp?.name || tpId;
  const anyBusOn = is2b ? (busOn04(1) || busOn04(2)) : busOn04(1);

  // ═══ RENDER ═══
  return (
    <div style={{ background: DK, minHeight: "100vh", fontFamily: FN, color: TXT, display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ padding: "5px 12px", borderBottom: "1px solid #1a2332", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={onBack} style={{ padding: "2px 8px", borderRadius: 3, background: "#1a2332", border: "1px solid #263238", color: WC, fontFamily: FN, fontSize: 9, cursor: "pointer" }}>← 10кВ</button>
          <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1, color: BUS }}>0.4 кВ</span>
          <span style={{ fontSize: 10, color: TXT }}>{tpName}</span>
          <span style={{ fontSize: 7, padding: "1px 5px", borderRadius: 2, color: anyBusOn ? ON : OFF, background: anyBusOn ? "#0d2818" : "#2a1010" }}>
            {anyBusOn ? "ПОД НАПР." : "ОТКЛ."}
          </span>
        </div>
        <div style={{ display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap" }}>
          <SldPalette placingType={placingType} setPlacingType={setPlacingType} />
          {connecting && <span style={{ fontSize: 8, color: "#ff0", background: "#332800", padding: "1px 6px", borderRadius: 3, border: "1px solid #ff0" }}>
            {connecting.sldPort ? "Выбери порт SLD..." : "Выбери вторую точку..."}
            <button onClick={() => setConnecting(null)} style={{ background: "none", border: "none", color: OFF, cursor: "pointer", fontSize: 8, marginLeft: 4 }}>✕</button>
          </span>}
          {placingType && !sldEditor && <span style={{ fontSize: 8, color: WC, background: WC + "15", padding: "1px 6px", borderRadius: 3, border: `1px solid ${WC}40` }}>
            Кликни на канвас для размещения «{SLD_SYMBOLS[placingType]?.label}»
            <button onClick={() => setPlacingType(null)} style={{ background: "none", border: "none", color: OFF, cursor: "pointer", fontSize: 8, marginLeft: 4 }}>✕</button>
          </span>}
          <button onClick={addFeeder} style={{ padding: "1px 6px", borderRadius: 2, background: BUS + "10", border: `1px solid ${BUS}40`, color: BUS, fontFamily: FN, fontSize: 7, cursor: "pointer" }}>+ Фидер</button>
          <button onClick={addPanel} style={{ padding: "1px 6px", borderRadius: 2, background: ON + "10", border: `1px solid ${ON}40`, color: ON, fontFamily: FN, fontSize: 7, cursor: "pointer" }}>+ РЩ</button>
          <button onClick={autoLayout} style={{ padding: "1px 6px", borderRadius: 2, background: WC + "10", border: `1px solid ${WC}40`, color: WC, fontFamily: FN, fontSize: 7, cursor: "pointer" }}>Авто-раскладка</button>
          <button onClick={fitAll} style={{ padding: "1px 6px", borderRadius: 2, background: "none", border: `1px solid ${WC}30`, color: WC, fontSize: 7, cursor: "pointer", fontFamily: FN }}>⊡ Вписать</button>
        </div>
      </div>

      {/* Canvas */}
      <div ref={containerRef} onMouseDown={onPanStart} onClick={() => selLink && setSelLink(null)}
        style={{ flex: 1, overflow: "hidden", background: `radial-gradient(ellipse at 50% 20%, #111a24 0%, ${DK} 70%)`, position: "relative", cursor: panning ? "grabbing" : "default" }}>

        {/* Zoom controls */}
        <div style={{ position: "absolute", right: 12, top: 12, zIndex: 10, display: "flex", flexDirection: "column", gap: 3 }}>
          <button onClick={() => setView(v => ({ ...v, zoom: Math.min(3, v.zoom + 0.2) }))} style={zBtn}>＋</button>
          <button onClick={() => setView(v => ({ ...v, zoom: Math.max(0.2, v.zoom - 0.2) }))} style={zBtn}>−</button>
          <button onClick={fitAll} style={zBtn}>⊡</button>
          <div style={{ textAlign: "center", fontSize: 7, color: TD, marginTop: 2 }}>{Math.round(view.zoom * 100)}%</div>
        </div>

        <div style={{ position: "absolute", left: 12, bottom: 8, zIndex: 10, fontSize: 7, color: TM }}>
          Колёсико: зум · Alt+тяни: пан · Тяни блок: двигать · 2×клик кабель: waypoint
        </div>

        <svg ref={svgRef} width={CANVAS_W} height={CANVAS_H} viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
          style={{ display: "block", transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})`, transformOrigin: "0 0" }}>
          <defs>
            <pattern id="g04" width="30" height="30" patternUnits="userSpaceOnUse">
              <path d="M30 0L0 0 0 30" fill="none" stroke="#162030" strokeWidth="0.3" />
            </pattern>
          </defs>
          <rect width={CANVAS_W} height={CANVAS_H} fill="url(#g04)"
            onClick={e => {
              if (!placingType) return;
              const sp = clientToSvg(e.clientX, e.clientY); if (!sp) return;
              addSldElem(placingType, sp.x, sp.y);
            }}
            style={placingType ? { cursor: "crosshair" } : {}} />

          {/* ═══ SLD CANVAS (main) ═══ */}
          <SldCanvas sld={sld} energized={sldEnergized} feeders={feeders}
            connecting={connecting} setConnecting={setConnecting}
            onElemClick={id => { const el = sld.elements.find(e => e.id === id); if (el && SLD_SYMBOLS[el.type]?.switchable) toggleSldElem(id, null); }}
            onElemDblClick={id => openSldElemEditor(id, null)}
            onPortClick={(eId, pId) => onSldPortClick(eId, pId, null)}
            onElemDragStart={(e, id) => startDrag(e, "sldElem", id)} />

          {/* ═══ MINI TP SCHEMATIC ═══ */}
          {(() => {
            const cx = CANVAS_W / 2;
            if (is2b) {
              // 2БКТП: two transformers + СВ-04
              const t1on = trState.tr1On, t2on = trState.tr2On, sv04 = trState.sv04;
              const b1on = busOn04(1), b2on = busOn04(2);
              const halfW = busW / 2 - 20;
              return <g>
                {/* Title */}
                <text x={cx} y={20} textAnchor="middle" fill={t1on || t2on ? BUS : TD} fontSize={11} fontWeight="bold" fontFamily={FN}>{tpName} — РУ-0.4 кВ</text>

                {/* Tr 1 (left) */}
                <text x={cx - halfW / 2} y={32} textAnchor="middle" fill={t1on ? BUS : TM} fontSize={7} fontFamily={FN}>10кВ-I</text>
                <line x1={cx - halfW / 2} y1={36} x2={cx - halfW / 2} y2={48} stroke={t1on ? WC : WO} strokeWidth={1.5} />
                <circle cx={cx - halfW / 2} cy={53} r={5} fill="none" stroke={t1on ? BUS : BUSOFF} strokeWidth={1.2} />
                <circle cx={cx - halfW / 2} cy={63} r={5} fill="none" stroke={t1on ? WC : WO} strokeWidth={1.2} />
                <line x1={cx - halfW / 2} y1={68} x2={cx - halfW / 2} y2={BUS04_Y} stroke={b1on ? WC : WO} strokeWidth={1.5} />

                {/* Tr 2 (right) */}
                <text x={cx + halfW / 2} y={32} textAnchor="middle" fill={t2on ? BUS : TM} fontSize={7} fontFamily={FN}>10кВ-II</text>
                <line x1={cx + halfW / 2} y1={36} x2={cx + halfW / 2} y2={48} stroke={t2on ? WC : WO} strokeWidth={1.5} />
                <circle cx={cx + halfW / 2} cy={53} r={5} fill="none" stroke={t2on ? BUS : BUSOFF} strokeWidth={1.2} />
                <circle cx={cx + halfW / 2} cy={63} r={5} fill="none" stroke={t2on ? WC : WO} strokeWidth={1.2} />
                <line x1={cx + halfW / 2} y1={68} x2={cx + halfW / 2} y2={BUS04_Y} stroke={b2on ? WC : WO} strokeWidth={1.5} />

                {/* Bus section 1 */}
                <rect x={busX} y={BUS04_Y} width={halfW} height={5} rx={1} fill={b1on ? BUS : BUSOFF}
                  style={b1on ? { filter: `drop-shadow(0 0 4px ${BUS}40)` } : {}} />
                <text x={busX + halfW / 2} y={BUS04_Y - 3} textAnchor="middle" fill={b1on ? BUS : TD} fontSize={6} fontFamily={FN}>Секция I — 0.4 кВ</text>

                {/* СВ-04 */}
                <Sw x={cx} y={BUS04_Y + 2} on={sv04} onClick={() => setD(prev => ({
                  ...prev, tps: prev.tps.map(t => t.id === tpId ? { ...t, sv04: !t.sv04 } : t)
                }))} sz={11} />
                <text x={cx} y={BUS04_Y + 15} textAnchor="middle" fill={sv04 ? ON : TM} fontSize={5} fontFamily={FN}>СВ-04</text>

                {/* Bus section 2 */}
                <rect x={busX + halfW + 40} y={BUS04_Y} width={halfW} height={5} rx={1} fill={b2on ? BUS : BUSOFF}
                  style={b2on ? { filter: `drop-shadow(0 0 4px ${BUS}40)` } : {}} />
                <text x={busX + halfW + 40 + halfW / 2} y={BUS04_Y - 3} textAnchor="middle" fill={b2on ? BUS : TD} fontSize={6} fontFamily={FN}>Секция II — 0.4 кВ</text>
              </g>;
            }

            // Regular TP
            const trOn = trState.trOn;
            return <g>
              <text x={cx} y={20} textAnchor="middle" fill={trOn ? BUS : TD} fontSize={11} fontWeight="bold" fontFamily={FN}>{tpName} — РУ-0.4 кВ</text>
              {/* 10kV input + transformer */}
              <text x={cx} y={32} textAnchor="middle" fill={trOn ? BUS : TM} fontSize={7} fontFamily={FN}>10 кВ</text>
              <line x1={cx} y1={36} x2={cx} y2={48} stroke={trOn ? WC : WO} strokeWidth={1.5} />
              <circle cx={cx} cy={53} r={6} fill="none" stroke={trOn ? BUS : BUSOFF} strokeWidth={1.2} />
              <circle cx={cx} cy={65} r={6} fill="none" stroke={trOn ? WC : WO} strokeWidth={1.2} />
              <line x1={cx} y1={71} x2={cx} y2={BUS04_Y} stroke={trOn ? WC : WO} strokeWidth={1.5} />
              {/* 0.4kV bus */}
              <rect x={busX} y={BUS04_Y} width={busW} height={5} rx={1} fill={trOn ? BUS : BUSOFF}
                style={trOn ? { filter: `drop-shadow(0 0 4px ${BUS}40)` } : {}} />
              <text x={busX + busW / 2} y={BUS04_Y - 3} textAnchor="middle" fill={trOn ? BUS : TD} fontSize={7} fontFamily={FN}>ШИНА 0.4 кВ</text>
            </g>;
          })()}

          {/* ═══ FEEDERS ═══ */}
          {feeders.map((f, i) => {
            const fx = feederX(i);
            const on = feederOn(f);
            return <g key={f.id}>
              <line x1={fx} y1={BUS04_Y + 5} x2={fx} y2={BUS04_Y + 20} stroke={busOn04(f.section) ? BUS : WO} strokeWidth={1.5} />
              <Sw x={fx} y={BUS04_Y + 26} on={f.closed} onClick={() => togFeeder(f.id)} sz={10} />
              <line x1={fx} y1={BUS04_Y + 32} x2={fx} y2={FEEDER_PORT_Y - 8} stroke={on ? WC : WO} strokeWidth={1.5} />
              <text x={fx} y={BUS04_Y + 42} textAnchor="middle" fill={on ? TXT : TM} fontSize={5} fontFamily={FN}>{f.name}</text>
              <text x={fx} y={BUS04_Y + 49} textAnchor="middle" fill={TM} fontSize={4} fontFamily={FN}>{f.nominal}А</text>
              {/* Feeder name — clickable for edit */}
              <text x={fx} y={FEEDER_PORT_Y + 12} textAnchor="middle" fill={on ? WC : TD} fontSize={5} fontFamily={FN}
                style={{ cursor: "pointer" }} onClick={e => { e.stopPropagation(); editFeeder(f); }}>{f.name}</text>
              {/* Delete feeder */}
              <text x={fx + 12} y={BUS04_Y + 16} fill={TD} fontSize={6} fontFamily={FN}
                style={{ cursor: "pointer" }} onClick={e => { e.stopPropagation(); delFeeder(f.id); }}>✕</text>
              {/* Port */}
              <Port x={fx} y={FEEDER_PORT_Y} on={on} label=""
                isActive={connecting && !connecting.panelId && connecting.breakerId === f.id}
                onMouseDown={e => { e.stopPropagation(); e.preventDefault(); onPortClick({ panelId: null, breakerId: f.id, type: "feederOut" }); }}
                cursor={connecting ? "crosshair" : "pointer"} />
            </g>;
          })}

          {/* ═══ CABLES ═══ */}
          {links04.map(lk => {
            const fp = linkPortPos(lk.from, true), tp2 = linkPortPos(lk.to, false);
            if (!fp || !tp2) return null;
            const on = linkOn(lk);
            const wps = lk.waypoints || [];
            const fromDir = getLinkDir(lk.from, "d"), toDir = getLinkDir(lk.to, "u");
            const pathD = orthoPath(fp.x, fp.y, fromDir, tp2.x, tp2.y, toDir, wps);
            const mx = (fp.x + tp2.x) / 2, my = (fp.y + tp2.y) / 2;
            const isSel = selLink === lk.id;
            // Find cable info
            let cableLabel = "";
            if (!lk.from.panelId) {
              // from feeder — no cable info on feeder itself
            } else {
              const srcPnl = panels.find(p => p.id === lk.from.panelId);
              const srcBrk = srcPnl?.outBreakers.find(b => b.id === lk.from.breakerId);
              if (srcBrk?.targetCable?.brand) cableLabel = `${srcBrk.targetCable.brand} ${srcBrk.targetCable.length}м`;
            }
            // Cable to panel — use panel's inputCable info
            const toPnl = panels.find(p => p.id === lk.to.panelId);
            if (toPnl?.inputCable?.brand && !cableLabel) cableLabel = `${toPnl.inputCable.brand} ${toPnl.inputCable.length}м`;

            return <g key={lk.id}>
              <path d={pathD} fill="none" stroke="transparent" strokeWidth={12} style={{ cursor: "pointer" }}
                onClick={e => { e.stopPropagation(); setSelLink(isSel ? null : lk.id); }}
                onDoubleClick={e => {
                  e.stopPropagation();
                  const sp = clientToSvg(e.clientX, e.clientY); if (!sp) return;
                  const idx = findWpInsertIdx(fp, tp2, wps, sp.x, sp.y);
                  addWaypoint(lk.id, sp.x, sp.y, idx); setSelLink(lk.id);
                }} />
              <path d={pathD} fill="none" stroke={isSel ? "#ffab00" : on ? WC : WO}
                strokeWidth={isSel ? 2 : on ? 1.8 : .8} strokeLinejoin="round" strokeLinecap="round"
                style={on && !isSel ? { filter: `drop-shadow(0 0 2px ${WC}40)` } : {}} pointerEvents="none" />
              {cableLabel && <text x={mx} y={my - 4} textAnchor="middle" fill={TM} fontSize={5} fontFamily={FN}>{cableLabel}</text>}
              {isSel && <g onClick={e => { e.stopPropagation(); delLink04(lk.id); setSelLink(null); }} style={{ cursor: "pointer" }}>
                <circle cx={mx} cy={my} r={4} fill="#2a1010" stroke="#4a2020" strokeWidth={.5} opacity={.6} />
                <text x={mx} y={my + 2.5} textAnchor="middle" fill={OFF} fontSize={6} fontFamily={FN}>✕</text>
              </g>}
              {isSel && wps.map((wp, i) => (
                <g key={i}>
                  <circle cx={wp.x} cy={wp.y} r={5} fill="#ffab00" stroke="#fff" strokeWidth={1}
                    style={{ cursor: "grab" }}
                    onMouseDown={e => { e.stopPropagation(); startDrag(e, "wp04", lk.id, { wpIdx: i }); }}
                    onContextMenu={e => { e.preventDefault(); e.stopPropagation(); delWaypoint(lk.id, i); }} />
                </g>
              ))}
              {isSel && wps.length === 0 && <text x={mx} y={my - 10} textAnchor="middle" fill="#ffab00" fontSize={5} fontFamily={FN} pointerEvents="none">2×клик — добавить точку</text>}
            </g>;
          })}

          {/* ═══ PANELS (РЩ) — compact cards ═══ */}
          {panels.map(pnl => {
            const on = !!energyMap[pnl.id];
            const hasSld = pnl.sld?.elements?.length > 0;

            return <g key={pnl.id} onMouseDown={e => startDrag(e, "panel", pnl.id)} style={{ cursor: drag?.type === "panel" ? "grabbing" : "grab" }}>
              {/* Input port */}
              <Port x={pnl.x + PW / 2} y={pnl.y} on={on} label=""
                isActive={connecting?.type === "panelIn" && connecting.panelId === pnl.id}
                onMouseDown={e => { e.stopPropagation(); e.preventDefault(); onPortClick({ panelId: pnl.id, type: "panelIn" }); }}
                cursor={connecting ? "crosshair" : "pointer"} />

              {/* Name label */}
              <text x={pnl.x + PW / 2} y={pnl.y - 14} textAnchor="middle" fill={on ? BUS : TD}
                fontSize={9} fontWeight="bold" fontFamily={FN} style={{ cursor: "pointer" }}
                onClick={e => { e.stopPropagation(); editPanel(pnl); }}>{pnl.name}</text>
              {pnl.location && <text x={pnl.x + PW / 2} y={pnl.y - 5} textAnchor="middle" fill={TM} fontSize={5} fontFamily={FN}>{pnl.location}</text>}

              {/* Card background */}
              <rect x={pnl.x} y={pnl.y + 4} width={PW} height={CARD_H} rx={5}
                fill={on ? "#0d1f12" : "#1a1212"} stroke={on ? ON + "40" : "#26323850"} strokeWidth={1.2}
                style={{ cursor: "pointer" }} onClick={e => { e.stopPropagation(); editPanel(pnl); }} />

              {/* Meter info */}
              <text x={pnl.x + 8} y={pnl.y + 18} fill={TM} fontSize={5} fontFamily={FN}>
                {pnl.meter?.model || "—"}{pnl.meter?.serial ? ` #${pnl.meter.serial}` : ""}
              </text>

              {/* Current data */}
              {pnl.liveData ? (() => {
                const ld = pnl.liveData;
                const phS = v => (!v || v === 0) ? "warn" : (v < 207 || v > 253) ? "err" : "ok";
                const clr = s => !on ? PH_OFF : s === "ok" ? PH_OK : s === "err" ? PH_ERR : PH_WARN;
                return <g>
                  <text x={pnl.x + 8} y={pnl.y + 30} fill={on ? TXT : TM} fontSize={5} fontFamily={FN}>
                    Ia={ld.Ia || 0}A  Ib={ld.Ib || 0}A  Ic={ld.Ic || 0}A
                  </text>
                  {["Ua", "Ub", "Uc"].map((k, i) => (
                    <g key={k}>
                      <circle cx={pnl.x + PW - 26 + i * 8} cy={pnl.y + 16} r={2.5} fill={clr(phS(ld[k]))} />
                      <text x={pnl.x + PW - 26 + i * 8} y={pnl.y + 23} textAnchor="middle" fill={TM} fontSize={3.5} fontFamily={FN}>{k[1]}</text>
                    </g>
                  ))}
                </g>;
              })() : <text x={pnl.x + 8} y={pnl.y + 30} fill={TM} fontSize={5} fontFamily={FN}>нет данных</text>}

              {/* Cable + breaker summary */}
              <text x={pnl.x + 8} y={pnl.y + 42} fill={TM} fontSize={4.5} fontFamily={FN}>
                {pnl.inputBreaker?.name} {pnl.inputBreaker?.nominal}А · {pnl.inputCable?.brand || ""}
              </text>

              {/* Output port */}
              <Port x={pnl.x + PW / 2} y={pnl.y + CARD_H + 10} on={on} label=""
                isActive={connecting?.panelId === pnl.id && connecting?.type === "breakerOut"}
                onMouseDown={e => {
                  e.stopPropagation(); e.preventDefault();
                  const firstBrk = pnl.outBreakers[0];
                  if (firstBrk) onPortClick({ panelId: pnl.id, breakerId: firstBrk.id, type: "breakerOut" });
                }}
                cursor={connecting ? "crosshair" : "pointer"} />

              {/* ОЛС button */}
              <g onClick={e => { e.stopPropagation(); setSldEditor({ panelId: pnl.id }); setPlacingType(null); setConnecting(null); }}
                style={{ cursor: "pointer" }}>
                <rect x={pnl.x + PW - 26} y={pnl.y + 6} width={22} height={12} rx={2}
                  fill={hasSld ? WC + "15" : "#0a0f16"} stroke={hasSld ? WC : "#263238"} strokeWidth={0.8} />
                <text x={pnl.x + PW - 15} y={pnl.y + 14.5} textAnchor="middle"
                  fill={hasSld ? WC : TD} fontSize={5} fontFamily={FN}>ОЛС</text>
              </g>

              {/* Panel SLD on main canvas */}
              {hasSld && (() => {
                const pEnergized = computeSldEnergy(pnl.sld);
                return <SldCanvas sld={pnl.sld} energized={pEnergized} feeders={feeders}
                  connecting={connecting} setConnecting={setConnecting}
                  offsetX={pnl.x} offsetY={pnl.y}
                  onElemClick={id => { const el = pnl.sld.elements.find(ee => ee.id === id); if (el && SLD_SYMBOLS[el.type]?.switchable) toggleSldElem(id, pnl.id); }}
                  onElemDblClick={id => openSldElemEditor(id, pnl.id)}
                  onPortClick={(eId, pId) => {
                    const el = pnl.sld.elements.find(ee => ee.id === eId);
                    if (!el) return;
                    const sym = SLD_SYMBOLS[el.type];
                    const port = sym?.ports.find(pp => pp.id === pId);
                    if (!port) return;
                    if (port.dir === "u" || port.dir === "l") {
                      onPortClick({ panelId: pnl.id, type: "panelIn", sldElemId: eId, sldPortId: pId });
                    } else {
                      onPortClick({ panelId: pnl.id, breakerId: eId, type: "breakerOut", sldElemId: eId, sldPortId: pId });
                    }
                  }}
                  onElemDragStart={(e, id) => startDrag(e, "sldElem", id, { panelId: pnl.id })} />;
              })()}
            </g>;
          })}

          {/* Connecting preview line */}
          {connecting && (() => {
            // Show a dashed line from the connecting source to the cursor area
            let fromPos = null;
            if (connecting.sldElemId && connecting.sldPortId && connecting.panelId) {
              // SLD element port
              const cpnl = panels.find(p => p.id === connecting.panelId);
              if (cpnl?.sld) {
                const celem = cpnl.sld.elements.find(e => e.id === connecting.sldElemId);
                if (celem) {
                  const cpos = getSymbolPortPos(celem, connecting.sldPortId);
                  if (cpos) fromPos = { x: cpos.x + cpnl.x, y: cpos.y + cpnl.y };
                }
              }
            } else if (connecting.type === "feederOut") {
              const fi = feeders.findIndex(f => f.id === connecting.breakerId);
              if (fi >= 0) fromPos = feederPortPos(fi);
            } else if (connecting.type === "breakerOut") {
              const pnl = panels.find(p => p.id === connecting.panelId);
              if (pnl) {
                const bi = pnl.outBreakers.findIndex(b => b.id === connecting.breakerId);
                if (bi >= 0) fromPos = panelOutPos(pnl);
              }
            } else if (connecting.type === "panelIn" && connecting.panelId) {
              fromPos = panelInPos(panels.find(p => p.id === connecting.panelId));
            }
            if (!fromPos) return null;
            return <circle cx={fromPos.x} cy={fromPos.y + 15} r={4} fill="none" stroke="#ff0" strokeWidth={1} strokeDasharray="3" opacity={0.6}>
              <animate attributeName="r" from="4" to="12" dur="1s" repeatCount="indefinite" />
              <animate attributeName="opacity" from="0.6" to="0" dur="1s" repeatCount="indefinite" />
            </circle>;
          })()}
        </svg>
      </div>

      {/* ═══ MODAL ═══ */}
      {modal && <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={() => setModal(null)}>
        <div style={{ background: PNL_C, border: "1px solid #263238", borderRadius: 10, padding: 20, minWidth: 380, maxWidth: 500, maxHeight: "85vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h3 style={{ margin: 0, color: "#4fc3f7", fontFamily: FN, fontSize: 13 }}>
              {modal.type === "ef" ? `Фидер ${modal.f.name}` : modal.type === "ep" ? `РЩ ${modal.f.name}` : ""}
            </h3>
            <button onClick={() => setModal(null)} style={{ background: BG, border: "1px solid #37474f", color: TD, cursor: "pointer", fontSize: 14, width: 24, height: 24, borderRadius: 5, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
          </div>

          {/* === FEEDER MODAL === */}
          {modal.type === "ef" && <>
            {fld("Название", modal.f.name, v => uf("name", v))}
            {fld("Номинал, А", modal.f.nominal, v => uf("nominal", v), "number", "630")}
            {is2b && sel("Секция", modal.f.section, v => uf("section", v), [
              { v: "1", l: "Секция I (Тр-1)" }, { v: "2", l: "Секция II (Тр-2)" }
            ])}
          </>}

          {/* === PANEL MODAL === */}
          {modal.type === "ep" && <>
            {fld("Название РЩ", modal.f.name, v => uf("name", v))}
            {fld("Место установки", modal.f.location, v => uf("location", v), "text", "подвал корп.3")}

            <div style={{ borderTop: "1px solid #263238", marginTop: 8, paddingTop: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 9, color: WC, fontWeight: 600 }}>Прибор учёта</span></div>
            <div style={{ display: "flex", gap: 6 }}>
              <div style={{ flex: 1 }}>{fld("Модель", modal.f.meterModel, v => uf("meterModel", v), "text", "Меркурий 230")}</div>
              <div style={{ flex: 1 }}>{fld("Серийный №", modal.f.meterSerial, v => uf("meterSerial", v), "text", "12345678")}</div>
            </div>

            <div style={{ borderTop: "1px solid #263238", marginTop: 8, paddingTop: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 9, color: WC, fontWeight: 600 }}>Вводной кабель</span></div>
            <div style={{ display: "flex", gap: 6 }}>
              <div style={{ flex: 2 }}>{fld("Марка", modal.f.cableBrand, v => uf("cableBrand", v), "text", "ВВГнг 4×70")}</div>
              <div style={{ flex: 1 }}>{fld("Длина, м", modal.f.cableLength, v => uf("cableLength", v), "number")}</div>
              <div style={{ flex: 1 }}>{fld("Сеч., мм²", modal.f.cableSection, v => uf("cableSection", v), "number")}</div>
            </div>

            <div style={{ borderTop: "1px solid #263238", marginTop: 8, paddingTop: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 9, color: WC, fontWeight: 600 }}>Вводной автомат</span></div>
            <div style={{ display: "flex", gap: 6 }}>
              <div style={{ flex: 2 }}>{fld("Название", modal.f.ibName, v => uf("ibName", v), "text", "ВА 47-100")}</div>
              <div style={{ flex: 1 }}>{fld("Номинал, А", modal.f.ibNominal, v => uf("ibNominal", v), "number", "250")}</div>
            </div>

            <div style={{ borderTop: "1px solid #263238", marginTop: 8, paddingTop: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 9, color: BUS, fontWeight: 600 }}>Отходящие автоматы ({modal.f.outBreakers.length})</span></div>
            {modal.f.outBreakers.map((ob, i) => (
              <div key={ob.id || i} style={{ display: "flex", gap: 4, marginBottom: 4, alignItems: "center" }}>
                <span style={{ fontSize: 8, color: BUS, width: 14 }}>{i + 1}.</span>
                <input value={ob.name} onChange={e => {
                  const a = [...modal.f.outBreakers]; a[i] = { ...a[i], name: e.target.value }; uf("outBreakers", a);
                }} style={{ flex: 2, padding: 5, background: DK, border: "1px solid #263238", borderRadius: 3, color: TXT, fontFamily: FN, fontSize: 9, outline: "none" }} placeholder="QF1" />
                <input value={ob.nominal} onChange={e => {
                  const a = [...modal.f.outBreakers]; a[i] = { ...a[i], nominal: e.target.value }; uf("outBreakers", a);
                }} style={{ width: 50, padding: 5, background: DK, border: "1px solid #263238", borderRadius: 3, color: TXT, fontFamily: FN, fontSize: 9, outline: "none" }} placeholder="63" />
                <span style={{ fontSize: 7, color: TM }}>А</span>
                {modal.f.outBreakers.length > 1 && <button onClick={() => uf("outBreakers", modal.f.outBreakers.filter((_, j) => j !== i))}
                  style={{ background: "none", border: "none", color: OFF, cursor: "pointer", fontSize: 11 }}>✕</button>}
              </div>
            ))}
            <button onClick={() => uf("outBreakers", [...modal.f.outBreakers, {
              id: uid(), name: `QF${modal.f.outBreakers.length + 1}`, nominal: "63", closed: true,
              targetCable: { brand: "", length: 0, section: 0 }
            }])} style={{ padding: "3px 8px", background: BUS + "10", border: `1px solid ${BUS}40`, borderRadius: 4, color: BUS, fontFamily: FN, fontSize: 8, cursor: "pointer", marginTop: 4 }}>
              ＋ Добавить автомат
            </button>

            {/* Connected cables */}
            <div style={{ borderTop: "1px solid #263238", marginTop: 10, paddingTop: 8 }}>
              <span style={{ fontSize: 8, color: TD }}>Подключённые кабели:</span>
              {links04.filter(l => l.to.panelId === modal.id || l.from.panelId === modal.id).map(l => (
                <div key={l.id} style={{ fontSize: 8, color: TXT, padding: "2px 0", display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ color: WC }}>●</span>
                  {l.from.panelId ? `${panels.find(p => p.id === l.from.panelId)?.name || "?"}` : `${feeders.find(f => f.id === l.from.breakerId)?.name || "?"}`}
                  {" → "}{panels.find(p => p.id === l.to.panelId)?.name || "?"}
                  <button onClick={() => delLink04(l.id)} style={{ background: "none", border: "none", color: OFF, cursor: "pointer", fontSize: 8 }}>✕</button>
                </div>
              ))}
            </div>
            {dangerBtn("Удалить РЩ и все связи", () => delPanel(modal.id))}
          </>}

          {/* Save / Cancel */}
          <div style={{ display: "flex", gap: 6, marginTop: 16, justifyContent: "flex-end" }}>
            <button onClick={() => setModal(null)} style={{ padding: "4px 12px", background: "none", border: `1px solid ${TD}40`, borderRadius: 4, color: TD, fontFamily: FN, fontSize: 9, cursor: "pointer" }}>Отмена</button>
            <button onClick={saveModal} style={{ padding: "4px 12px", background: ON + "15", border: `1px solid ${ON}40`, borderRadius: 4, color: ON, fontFamily: FN, fontSize: 9, fontWeight: 600, cursor: "pointer" }}>Сохранить</button>
          </div>
        </div>
      </div>}

      {/* ═══ INLINE SLD EDITOR ═══ */}
      {sldEditor && <SldEditorOverlay
        panelId={sldEditor.panelId} panels={panels} feeders={feeders}
        placingType={placingType} setPlacingType={setPlacingType}
        connecting={connecting} setConnecting={setConnecting}
        onClose={() => { setSldEditor(null); setPlacingType(null); setConnecting(null); }}
        setPanelSld={setPanelSld} toggleSldElem={toggleSldElem}
        openSldElemEditor={openSldElemEditor} onSldPortClick={onSldPortClick}
        uid={uid} SLD_SYMBOLS={SLD_SYMBOLS} computeSldEnergy={computeSldEnergy}
      />}

      {/* ═══ SLD ELEMENT EDIT MODAL ═══ */}
      {editSldElem && <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={() => setEditSldElem(null)}>
        <div style={{ background: PNL_C, border: "1px solid #263238", borderRadius: 10, padding: 20, minWidth: 320, maxWidth: 420 }} onClick={e => e.stopPropagation()}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h3 style={{ margin: 0, color: "#4fc3f7", fontFamily: FN, fontSize: 13 }}>
              {SLD_SYMBOLS[editSldElem.type]?.label || editSldElem.type} — {editSldElem.label}
            </h3>
            <button onClick={() => setEditSldElem(null)} style={{ background: BG, border: "1px solid #37474f", color: TD, cursor: "pointer", fontSize: 14, width: 24, height: 24, borderRadius: 5, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
          </div>

          {fld("Обозначение", editSldElem.label, v => setEditSldElem(p => ({ ...p, label: v })))}

          {editSldElem.params?.nominal !== undefined &&
            fld("Номинал, А", editSldElem.params.nominal, v => setEditSldElem(p => ({ ...p, params: { ...p.params, nominal: v } })), "text", "630")}

          {editSldElem.params?.model !== undefined &&
            fld("Модель", editSldElem.params.model, v => setEditSldElem(p => ({ ...p, params: { ...p.params, model: v } })), "text")}

          {editSldElem.params?.power !== undefined &&
            fld("Мощность, кВА", editSldElem.params.power, v => setEditSldElem(p => ({ ...p, params: { ...p.params, power: v } })), "text", "400")}

          {editSldElem.params?.ratio !== undefined &&
            fld("Коэфф. трансф.", editSldElem.params.ratio, v => setEditSldElem(p => ({ ...p, params: { ...p.params, ratio: v } })), "text", "200/5")}

          {editSldElem.params?.voltage !== undefined &&
            fld("Напряжение, кВ", editSldElem.params.voltage, v => setEditSldElem(p => ({ ...p, params: { ...p.params, voltage: v } })), "text", "10")}

          {/* Feeder link */}
          {feeders.length > 0 && <div style={{ marginBottom: 8 }}>
            <label style={lblS}>Привязка к фидеру</label>
            <select value={editSldElem.feederLink || ""} onChange={e => setEditSldElem(p => ({ ...p, feederLink: e.target.value || null }))} style={inpS}>
              <option value="">— нет —</option>
              {feeders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>}

          {SLD_SYMBOLS[editSldElem.type]?.switchable && <div style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
            <label style={lblS}>Состояние:</label>
            <span style={{ color: editSldElem.on ? ON : OFF, fontSize: 9, fontFamily: FN }}>{editSldElem.on ? "ВКЛ" : "ВЫКЛ"}</span>
            <button onClick={() => setEditSldElem(p => ({ ...p, on: !p.on }))}
              style={{ padding: "2px 8px", borderRadius: 3, background: editSldElem.on ? "#1b5e20" : "#6b1515", border: `1px solid ${editSldElem.on ? ON : OFF}40`, color: editSldElem.on ? ON : OFF, fontFamily: FN, fontSize: 8, cursor: "pointer" }}>
              {editSldElem.on ? "Выключить" : "Включить"}
            </button>
          </div>}

          {/* Wires connected to this element */}
          {(() => {
            const tSld = editSldElem._panelId
              ? (panels.find(p => p.id === editSldElem._panelId)?.sld || { elements: [], wires: [] })
              : sld;
            const wires = tSld.wires.filter(w => w.from.elementId === editSldElem.id || w.to.elementId === editSldElem.id);
            if (!wires.length) return null;
            return <div style={{ borderTop: "1px solid #263238", marginTop: 8, paddingTop: 8 }}>
              <span style={{ fontSize: 8, color: TD }}>Подключённые провода:</span>
              {wires.map(w => {
                const other = w.from.elementId === editSldElem.id ? w.to : w.from;
                const otherElem = tSld.elements.find(e => e.id === other.elementId);
                const delWire = () => {
                  const fn = s => ({ ...s, wires: s.wires.filter(ww => ww.id !== w.id) });
                  if (editSldElem._panelId) setPanelSld(editSldElem._panelId, fn); else setSld(fn);
                };
                return <div key={w.id} style={{ fontSize: 8, color: TXT, padding: "2px 0", display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ color: WC }}>●</span> {otherElem?.label || "?"} ({other.portId})
                  <button onClick={delWire} style={{ background: "none", border: "none", color: OFF, cursor: "pointer", fontSize: 8 }}>✕</button>
                </div>;
              })}
            </div>;
          })()}

          {dangerBtn("Удалить элемент и все провода", () => { deleteSldElem(editSldElem.id, editSldElem._panelId); setEditSldElem(null); })}

          <div style={{ display: "flex", gap: 6, marginTop: 16, justifyContent: "flex-end" }}>
            <button onClick={() => setEditSldElem(null)} style={{ padding: "4px 12px", background: "none", border: `1px solid ${TD}40`, borderRadius: 4, color: TD, fontFamily: FN, fontSize: 9, cursor: "pointer" }}>Отмена</button>
            <button onClick={saveSldElem} style={{ padding: "4px 12px", background: ON + "15", border: `1px solid ${ON}40`, borderRadius: 4, color: ON, fontFamily: FN, fontSize: 9, fontWeight: 600, cursor: "pointer" }}>Сохранить</button>
          </div>
        </div>
      </div>}
    </div>
  );
}
