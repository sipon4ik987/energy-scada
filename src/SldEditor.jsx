// SldEditor.jsx — Single-Line Diagram editor components for Energy SCADA
import { ON, OFF, BUS, WC, WO, TXT, TD, TM, FN, orthoPath } from "./shared";
import { SLD_SYMBOLS, SYMBOL_PALETTE, getSymbolPortPos, renderSymbol } from "./symbols";

const PNL_C = "#0e1822";

// ═══ BFS ENERGIZATION ═══
export function computeSldEnergy(sld) {
  if (!sld?.elements?.length) return new Set();
  const energized = new Set();
  const adj = {};
  // Build adjacency: wire connects elem:port <-> elem:port
  for (const w of (sld.wires || [])) {
    const fk = `${w.from.elementId}`, tk = `${w.to.elementId}`;
    if (!adj[fk]) adj[fk] = [];
    if (!adj[tk]) adj[tk] = [];
    adj[fk].push({ wireId: w.id, neighborId: w.to.elementId, fromPort: w.from.portId, toPort: w.to.portId });
    adj[tk].push({ wireId: w.id, neighborId: w.from.elementId, fromPort: w.to.portId, toPort: w.from.portId });
  }

  // Seeds: cable_entry elements are always energized sources
  const queue = [];
  for (const el of sld.elements) {
    if (el.type === "cable_entry") { energized.add(el.id); queue.push(el.id); }
  }

  while (queue.length) {
    const eid = queue.shift();
    const neighbors = adj[eid] || [];
    for (const nb of neighbors) {
      if (energized.has(nb.neighborId)) continue;
      const nbElem = sld.elements.find(e => e.id === nb.neighborId);
      if (!nbElem) continue;
      const sym = SLD_SYMBOLS[nbElem.type];
      // If switchable and off — block propagation
      if (sym?.switchable && !nbElem.on) continue;
      energized.add(nb.neighborId);
      queue.push(nb.neighborId);
    }
  }
  return energized;
}

// ═══ SLD PALETTE ═══
export function SldPalette({ placingType, setPlacingType }) {
  return <div style={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center" }}>
    <span style={{ fontSize: 7, color: TD, marginRight: 2 }}>ОЛС:</span>
    {SYMBOL_PALETTE.map(type => {
      const sym = SLD_SYMBOLS[type];
      const active = placingType === type;
      return <button key={type} title={sym.label}
        onClick={() => setPlacingType(active ? null : type)}
        style={{
          padding: "1px 4px", borderRadius: 2, fontSize: 7, fontFamily: FN, cursor: "pointer",
          background: active ? WC + "30" : "transparent",
          border: `1px solid ${active ? WC : "#263238"}`,
          color: active ? WC : TD,
        }}>
        {sym.label}
      </button>;
    })}
  </div>;
}

// ═══ SLD CANVAS ═══
export function SldCanvas({
  sld, energized, feeders, connecting, setConnecting,
  onElemClick, onElemDblClick, onPortClick, onElemDragStart,
  offsetX = 0, offsetY = 0
}) {
  if (!sld) return null;
  const elements = sld.elements || [];
  const wires = sld.wires || [];

  return <g transform={offsetX || offsetY ? `translate(${offsetX},${offsetY})` : undefined}>
    {/* Wires */}
    {wires.map(w => {
      const fromElem = elements.find(e => e.id === w.from.elementId);
      const toElem = elements.find(e => e.id === w.to.elementId);
      if (!fromElem || !toElem) return null;
      const fp = getSymbolPortPos(fromElem, w.from.portId);
      const tp = getSymbolPortPos(toElem, w.to.portId);
      if (!fp || !tp) return null;
      const on = energized.has(fromElem.id) && energized.has(toElem.id);
      const pathD = orthoPath(fp.x, fp.y, fp.dir, tp.x, tp.y, tp.dir, w.waypoints);
      return <g key={w.id}>
        <path d={pathD} fill="none" stroke={on ? WC : WO} strokeWidth={on ? 1.8 : 0.8}
          strokeLinejoin="round" strokeLinecap="round"
          style={on ? { filter: `drop-shadow(0 0 2px ${WC}40)` } : {}} />
      </g>;
    })}

    {/* Elements */}
    {elements.map(el => {
      const on = energized.has(el.id);
      const sym = SLD_SYMBOLS[el.type];
      if (!sym) return null;

      return <g key={el.id}
        onMouseDown={e => {
          if (e.button !== 0 || e.defaultPrevented) return;
          e.preventDefault(); e.stopPropagation();
          onElemDragStart(e, el.id);
        }}>
        {renderSymbol(el, on, e => { e.stopPropagation(); onElemClick(el.id); },
          e => { e.stopPropagation(); onElemDblClick(el.id); })}

        {/* Ports */}
        {sym.ports.map(p => {
          const px = el.x + p.x, py = el.y + p.y;
          const isActive = connecting?.sldPort?.elementId === el.id && connecting?.sldPort?.portId === p.id;
          return <g key={p.id}
            onMouseDown={e => { e.stopPropagation(); e.preventDefault(); onPortClick(el.id, p.id); }}
            style={{ cursor: connecting ? "crosshair" : "pointer" }}>
            <circle cx={px} cy={py} r={8} fill="transparent" />
            <circle cx={px} cy={py} r={3.5}
              fill={isActive ? "#ff0" : on ? WC : "#1a2a30"}
              stroke={isActive ? "#ff0" : on ? WC : "#2a3a40"}
              strokeWidth={isActive ? 2 : 1}
              style={isActive ? { filter: "drop-shadow(0 0 6px #ff0)" } : {}} />
          </g>;
        })}

        {/* Feeder link indicator */}
        {el.feederLink && (() => {
          const fd = feeders.find(f => f.id === el.feederLink);
          if (!fd) return null;
          return <text x={el.x} y={el.y + sym.h / 2 + 12} textAnchor="middle"
            fill={BUS} fontSize={5} fontFamily={FN}>{"→ " + fd.name}</text>;
        })()}
      </g>;
    })}
  </g>;
}
