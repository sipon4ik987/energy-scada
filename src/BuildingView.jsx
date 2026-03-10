import { useState, useMemo, useCallback, useEffect, useRef } from "react";

// ═══ CONSTANTS ═══
const FN = `'Share Tech Mono','JetBrains Mono','Fira Code',monospace`;
const BG = "#0a1929";
const CELL_W = 160;
const CELL_H = 100;
const WALL_T = 8;
const GRID_PAD = 80;
const ROWS = ["И", "З", "Ж", "Е", "Д", "Г"];
const SECTIONS = [8, 9, 10, 11, 12];
const COLS = ROWS.length;
const SECS = SECTIONS.length;
const STORAGE_KEY = "building-view-state";

const PLACES = {
  "И8": 8, "И9": 8, "И10": 4, "И11": 4, "И12": 5,
  "З8": 8, "З9": 8, "З10": 4, "З11": 4, "З12": 5,
  "Ж8": 8, "Ж9": 8, "Ж10": 8, "Ж11": 8, "Ж12": 8,
  "Е8": 8, "Е9": 8, "Е10": 8, "Е11": 8, "Е12": 8,
  "Д8": 8, "Д9": 8, "Д10": 8, "Д11": 8, "Д12": 8,
  "Г8": 8, "Г9": 8, "Г10": 8, "Г11": 8, "Г12": 6,
};

const BUILDING_METERS = [
  { id: "10236", name: "Общий Г-9/1; Г-8/1-Г-9/7,8", ct: 30, row: "Г", sections: "8-9" },
  { id: "10237", name: "Общий Г-11/1, Г-10/1-11/6", ct: 40, row: "Г", sections: "10-11" },
  { id: "10227", name: "Общий Г-12/8, Г-12/1-13/6", ct: 40, row: "Г", sections: "12" },
  { id: "10240", name: "Общий Д-12/7, Д-12/1-13А/1", ct: 50, row: "Д", sections: "12" },
  { id: "10242", name: "Общий Д-10/8, Д-10/1-11/8", ct: 30, row: "Д", sections: "10-11" },
  { id: "10244", name: "Общий Д-8/8, Д-8/1-9/8", ct: 40, row: "Д", sections: "8-9" },
  { id: "7933", name: "Ряды Е8-Е12", ct: 40, row: "Е", sections: "8-12" },
  { id: "7929", name: "Общий Е-12", ct: 50, row: "Е", sections: "12" },
  { id: "7931", name: "Общий Е-9/1", ct: 40, row: "Е", sections: "8-9" },
  { id: "7928", name: "Общий Е-11/1", ct: 50, row: "Е", sections: "10-11" },
  { id: "7934", name: "Ряд Ж8-Ж12", ct: 40, row: "Ж", sections: "8-12" },
  { id: "7935", name: "Секция Ж-9/1", ct: 50, row: "Ж", sections: "8-9" },
  { id: "7932", name: "Секция Ж-11", ct: 50, row: "Ж", sections: "10-11" },
  { id: "7930", name: "Секция Ж-12", ct: 50, row: "Ж", sections: "12" },
  { id: "10226", name: "Общий З-8/8 З-8/1-8/8", ct: 40, row: "З", sections: "8" },
  { id: "10238", name: "Общий З-12/1 З-11/1-12/5", ct: 40, row: "З", sections: "11-12" },
  { id: "10225", name: "Общий З-10/1 З-9/1-10/4", ct: 40, row: "З", sections: "9-10" },
  { id: "10223", name: "Общий И-8/8 И-8/1-И8/8", ct: 30, row: "И", sections: "8" },
  { id: "10228", name: "Общий И-9/8 И-9/1-10/4", ct: 40, row: "И", sections: "9-10" },
  { id: "10221", name: "Общий И-12/1 И-12/1-12/5", ct: 40, row: "И", sections: "11-12" },
];

const uid = () => "p" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

// Convert pre-populated panels to internal format
// betweenRows gives two adjacent row letters; the panel sits on the vertical wall between them.
// wallSide "right" of left-row = "left" of right-row — we use col index of the wall.
function convertInitialPanels() {
  const initial = [
    { num: "04.04", wallSide: "right", section: 8, betweenRows: ["Д", "Г"] },
    { num: "03.05", wallSide: "right", section: 9, betweenRows: ["Д", "Г"] },
    { num: "05.05", wallSide: "right", section: 8, betweenRows: ["Е", "Д"] },
    { num: "04.05", wallSide: "right", section: 10, betweenRows: ["Д", "Г"] },
    { num: "05.06", wallSide: "right", section: 10, betweenRows: ["Е", "Д"] },
    { num: "05.07", wallSide: "right", section: 12, betweenRows: ["Е", "Д"] },
    { num: "04.06", wallSide: "right", section: 12, betweenRows: ["Д", "Г"] },
    { num: "06.05", wallSide: "left", section: 8, betweenRows: ["Ж", "Е"] },
    { num: "06.06", wallSide: "right", section: 9, betweenRows: ["Ж", "Е"] },
    { num: "06.07", wallSide: "right", section: 11, betweenRows: ["Ж", "Е"] },
    { num: "06.08", wallSide: "right", section: 12, betweenRows: ["Ж", "Е"] },
    { num: "07.05", wallSide: "right", section: 8, betweenRows: ["З", "Ж"] },
    { num: "07.06", wallSide: "right", section: 10, betweenRows: ["З", "Ж"] },
    { num: "07.07", wallSide: "right", section: 12, betweenRows: ["З", "Ж"] },
  ];
  return initial.map(p => {
    // Find column index of the wall between the two rows
    const leftRowIdx = ROWS.indexOf(p.betweenRows[0]);
    const rightRowIdx = ROWS.indexOf(p.betweenRows[1]);
    // The vertical wall between col leftRowIdx and col rightRowIdx
    // wallCol = the higher col index (walls are indexed by the cell to their right)
    const wallCol = Math.max(leftRowIdx, rightRowIdx);
    const secIdx = SECTIONS.indexOf(p.section);
    return {
      id: uid(),
      num: p.num,
      wallType: "vertical",
      wallCol: wallCol,
      wallRow: secIdx,
      linkedMeters: [],
    };
  });
}

function loadPanels() {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s) {
      const parsed = JSON.parse(s);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) { /* ignore */ }
  return convertInitialPanels();
}

// ═══ WALL GEOMETRY ═══
// Grid origin
const OX = GRID_PAD + 40;
const OY = GRID_PAD + 30;

function getVerticalWalls() {
  // Vertical walls between columns and on left/right perimeter
  // wallCol 0 = left perimeter, wallCol 1..COLS-1 = between cols, wallCol COLS = right perimeter
  const walls = [];
  for (let wc = 0; wc <= COLS; wc++) {
    for (let sr = 0; sr < SECS; sr++) {
      const x = OX + wc * CELL_W;
      const y = OY + sr * CELL_H;
      walls.push({
        type: "vertical",
        wallCol: wc,
        wallRow: sr,
        x: x - WALL_T / 2,
        y: y,
        w: WALL_T,
        h: CELL_H,
      });
    }
  }
  return walls;
}

function getHorizontalWalls() {
  // Horizontal walls between section rows and on top/bottom perimeter
  const walls = [];
  for (let c = 0; c < COLS; c++) {
    for (let wr = 0; wr <= SECS; wr++) {
      const x = OX + c * CELL_W;
      const y = OY + wr * CELL_H;
      walls.push({
        type: "horizontal",
        wallCol: c,
        wallRow: wr,
        x: x,
        y: y - WALL_T / 2,
        w: CELL_W,
        h: WALL_T,
      });
    }
  }
  return walls;
}

function wallDescription(wallType, wallCol, wallRow) {
  if (wallType === "vertical") {
    const secLabel = SECTIONS[wallRow];
    if (wallCol === 0) return `Левая стена, секция ${secLabel} (${ROWS[0]})`;
    if (wallCol === COLS) return `Правая стена, секция ${secLabel} (${ROWS[COLS - 1]})`;
    const leftRow = ROWS[wallCol - 1];
    const rightRow = ROWS[wallCol];
    return `Стена между ${leftRow}${secLabel} и ${rightRow}${secLabel}`;
  } else {
    const colRow = ROWS[wallCol];
    if (wallRow === 0) return `Верхняя стена, ${colRow}${SECTIONS[0]}`;
    if (wallRow === SECS) return `Нижняя стена, ${colRow}${SECTIONS[SECS - 1]}`;
    const topSec = SECTIONS[wallRow - 1];
    const botSec = SECTIONS[wallRow];
    return `Стена между ${colRow}${topSec} и ${colRow}${botSec}`;
  }
}

function panelPosition(panel) {
  if (panel.wallType === "vertical") {
    const x = OX + panel.wallCol * CELL_W;
    const y = OY + panel.wallRow * CELL_H + CELL_H / 2;
    return { x, y };
  } else {
    const x = OX + panel.wallCol * CELL_W + CELL_W / 2;
    const y = OY + panel.wallRow * CELL_H;
    return { x, y };
  }
}

// ═══ COMPONENT ═══
export default function BuildingView({ onBack }) {
  const [panels, setPanels] = useState(loadPanels);
  const [selectedId, setSelectedId] = useState(null);
  const [placingMode, setPlacingMode] = useState(false);
  const [placingNum, setPlacingNum] = useState("");
  const [showNumPrompt, setShowNumPrompt] = useState(false);
  const [hoveredWall, setHoveredWall] = useState(null);
  const [view, setView] = useState({ x: 0, y: 0, zoom: 1 });
  const [panning, setPanning] = useState(null);
  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const didFit = useRef(false);

  // Persist panels
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(panels));
    } catch (e) { /* ignore */ }
  }, [panels]);

  const selected = useMemo(() => panels.find(p => p.id === selectedId) || null, [panels, selectedId]);

  const vertWalls = useMemo(getVerticalWalls, []);
  const horizWalls = useMemo(getHorizontalWalls, []);
  const allWalls = useMemo(() => [...vertWalls, ...horizWalls], [vertWalls, horizWalls]);

  // ═══ PAN / ZOOM ═══
  const onWheel = useCallback(e => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setView(v => {
      const newZoom = Math.max(0.15, Math.min(4, v.zoom + delta));
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
    if (e.button === 1 || e.button === 2 || (e.button === 0 && e.altKey)) {
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

  useEffect(() => {
    if (panning) {
      window.addEventListener("mousemove", onPanMove);
      window.addEventListener("mouseup", onPanEnd);
      return () => { window.removeEventListener("mousemove", onPanMove); window.removeEventListener("mouseup", onPanEnd); };
    }
  }, [panning, onPanMove, onPanEnd]);

  // Auto-fit
  useEffect(() => {
    if (!didFit.current && containerRef.current) {
      didFit.current = true;
      setTimeout(() => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;
        const totalW = COLS * CELL_W + GRID_PAD * 2 + 80;
        const totalH = SECS * CELL_H + GRID_PAD * 2 + 60;
        const zoom = Math.min(rect.width / totalW, rect.height / totalH, 1.5);
        setView({
          x: (rect.width - totalW * zoom) / 2,
          y: (rect.height - totalH * zoom) / 2,
          zoom,
        });
      }, 50);
    }
  });

  // ═══ CONTEXT MENU BLOCK ═══
  const onContextMenu = useCallback(e => e.preventDefault(), []);

  // ═══ SVG COORDS FROM MOUSE ═══
  const svgCoords = useCallback((e) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (e.clientX - rect.left - view.x) / view.zoom,
      y: (e.clientY - rect.top - view.y) / view.zoom,
    };
  }, [view]);

  // ═══ WALL CLICK ═══
  const onWallClick = useCallback((wall) => {
    if (!placingMode) return;
    const newPanel = {
      id: uid(),
      num: placingNum,
      wallType: wall.type,
      wallCol: wall.wallCol,
      wallRow: wall.wallRow,
      linkedMeters: [],
    };
    setPanels(prev => [...prev, newPanel]);
    setPlacingMode(false);
    setPlacingNum("");
    setSelectedId(newPanel.id);
  }, [placingMode, placingNum]);

  // ═══ PANEL CLICK ═══
  const onPanelClick = useCallback((e, panelId) => {
    e.stopPropagation();
    if (placingMode) return;
    setSelectedId(prev => prev === panelId ? null : panelId);
  }, [placingMode]);

  // ═══ BACKGROUND CLICK ═══
  const onBgClick = useCallback((e) => {
    if (e.button !== 0 || e.altKey) return;
    if (!placingMode) {
      setSelectedId(null);
    }
  }, [placingMode]);

  // ═══ ADD PANEL FLOW ═══
  const startAddPanel = useCallback(() => {
    setShowNumPrompt(true);
    setPlacingNum("");
  }, []);

  const confirmNum = useCallback(() => {
    if (!placingNum.trim()) return;
    setShowNumPrompt(false);
    setPlacingMode(true);
    setSelectedId(null);
  }, [placingNum]);

  const cancelAdd = useCallback(() => {
    setShowNumPrompt(false);
    setPlacingMode(false);
    setPlacingNum("");
  }, []);

  // ═══ SIDEBAR ACTIONS ═══
  const updatePanelNum = useCallback((num) => {
    setPanels(prev => prev.map(p => p.id === selectedId ? { ...p, num } : p));
  }, [selectedId]);

  const linkMeter = useCallback((meterId) => {
    if (!meterId) return;
    setPanels(prev => prev.map(p => {
      if (p.id !== selectedId) return p;
      if (p.linkedMeters.includes(meterId)) return p;
      return { ...p, linkedMeters: [...p.linkedMeters, meterId] };
    }));
  }, [selectedId]);

  const unlinkMeter = useCallback((meterId) => {
    setPanels(prev => prev.map(p => {
      if (p.id !== selectedId) return p;
      return { ...p, linkedMeters: p.linkedMeters.filter(m => m !== meterId) };
    }));
  }, [selectedId]);

  const deletePanel = useCallback(() => {
    setPanels(prev => prev.filter(p => p.id !== selectedId));
    setSelectedId(null);
  }, [selectedId]);

  // ═══ SVG DIMENSIONS ═══
  const SVG_W = COLS * CELL_W + GRID_PAD * 2 + 80;
  const SVG_H = SECS * CELL_H + GRID_PAD * 2 + 60;

  // ═══ RENDER ═══
  const btnS = {
    padding: "6px 14px",
    background: "#112240",
    border: "1px solid #1e3a5f",
    borderRadius: 4,
    color: "#00bcd4",
    fontFamily: FN,
    fontSize: 11,
    cursor: "pointer",
    whiteSpace: "nowrap",
  };

  const headerH = 44;

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: BG, fontFamily: FN, color: "#b0bec5", overflow: "hidden" }}>
      {/* HEADER */}
      <div style={{
        height: headerH,
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "0 16px",
        background: "#0d1b2a",
        borderBottom: "1px solid #1e3a5f",
        flexShrink: 0,
      }}>
        <button onClick={onBack} style={{ ...btnS, background: "transparent", border: "none", color: "#546e7a", fontSize: 12, padding: "4px 8px" }}>
          ← Назад
        </button>
        <span style={{ fontSize: 14, fontWeight: 700, color: "#ffa726", letterSpacing: 1 }}>
          Здание Г-И 8-12
        </span>
        <div style={{ flex: 1 }} />
        {placingMode ? (
          <>
            <span style={{ fontSize: 10, color: "#ffd600", background: "#332800", padding: "3px 8px", borderRadius: 3, border: "1px solid #ffd600" }}>
              Щиток "{placingNum}" — кликните на стену для размещения
            </span>
            <button onClick={cancelAdd} style={{ ...btnS, color: "#ff1744", borderColor: "#ff174440" }}>Отмена</button>
          </>
        ) : (
          <button onClick={startAddPanel} style={btnS}>+ Добавить щиток</button>
        )}
        <span style={{ fontSize: 8, color: "#37474f" }}>{Math.round(view.zoom * 100)}%</span>
      </div>

      {/* NUMBER PROMPT MODAL */}
      {showNumPrompt && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.7)", zIndex: 1000,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
          onClick={cancelAdd}
        >
          <div style={{
            background: "#0d1b2a", border: "1px solid #1e3a5f", borderRadius: 8,
            padding: 24, minWidth: 300,
          }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontSize: 12, color: "#ffa726", marginBottom: 12, fontWeight: 700 }}>Номер щитка</div>
            <input
              autoFocus
              type="text"
              placeholder="XX.XX (напр. 04.04)"
              value={placingNum}
              onChange={e => setPlacingNum(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") confirmNum(); if (e.key === "Escape") cancelAdd(); }}
              style={{
                width: "100%", padding: 8, background: "#0a0f16",
                border: "1px solid #263238", borderRadius: 4, color: "#b0bec5",
                fontFamily: FN, fontSize: 12, outline: "none", boxSizing: "border-box",
                marginBottom: 12,
              }}
            />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={cancelAdd} style={{ ...btnS, color: "#546e7a" }}>Отмена</button>
              <button onClick={confirmNum} style={{ ...btnS, color: "#00e676", borderColor: "#00e67640" }}>OK</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* CANVAS */}
        <div
          ref={containerRef}
          style={{
            flex: 1, overflow: "hidden", position: "relative",
            background: `radial-gradient(ellipse at 50% 30%, #111a24 0%, ${BG} 70%)`,
            cursor: panning ? "grabbing" : placingMode ? "crosshair" : "default",
          }}
          onMouseDown={e => {
            onPanStart(e);
            if (e.button === 0 && !e.altKey) onBgClick(e);
          }}
          onContextMenu={onContextMenu}
        >
          <svg
            ref={svgRef}
            width={SVG_W}
            height={SVG_H}
            viewBox={`0 0 ${SVG_W} ${SVG_H}`}
            style={{
              display: "block",
              transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})`,
              transformOrigin: "0 0",
            }}
          >
            {/* GRID CELLS */}
            {SECTIONS.map((sec, si) =>
              ROWS.map((row, ri) => {
                const x = OX + ri * CELL_W;
                const y = OY + si * CELL_H;
                const label = `${row}${sec}`;
                const places = PLACES[label] || 8;
                return (
                  <g key={label}>
                    <rect
                      x={x} y={y} width={CELL_W} height={CELL_H}
                      fill="#2a1f0a" stroke="#ffa726" strokeWidth={0.5}
                      opacity={0.85}
                    />
                    <text
                      x={x + CELL_W / 2} y={y + CELL_H / 2 - 6}
                      textAnchor="middle" fill="#ffa726" fontSize={14} fontWeight="bold" fontFamily={FN}
                    >{label}</text>
                    <text
                      x={x + CELL_W / 2} y={y + CELL_H / 2 + 12}
                      textAnchor="middle" fill="#8d6e1a" fontSize={9} fontFamily={FN}
                    >{places} мест</text>
                  </g>
                );
              })
            )}

            {/* ROW LABELS (top) */}
            {ROWS.map((row, ri) => (
              <text
                key={`rl-${row}`}
                x={OX + ri * CELL_W + CELL_W / 2}
                y={OY - 12}
                textAnchor="middle"
                fill="#00bcd4"
                fontSize={16}
                fontWeight="bold"
                fontFamily={FN}
              >{row}</text>
            ))}

            {/* SECTION LABELS (left) */}
            {SECTIONS.map((sec, si) => (
              <text
                key={`sl-${sec}`}
                x={OX - 16}
                y={OY + si * CELL_H + CELL_H / 2 + 5}
                textAnchor="middle"
                fill="#b0bec5"
                fontSize={13}
                fontWeight="bold"
                fontFamily={FN}
              >{sec}</text>
            ))}

            {/* WALL CLICK ZONES */}
            {placingMode && allWalls.map((w, i) => {
              const isHovered = hoveredWall && hoveredWall.type === w.type && hoveredWall.wallCol === w.wallCol && hoveredWall.wallRow === w.wallRow;
              return (
                <rect
                  key={`wall-${i}`}
                  x={w.x} y={w.y} width={w.w} height={w.h}
                  fill={isHovered ? "rgba(255,215,0,0.35)" : "transparent"}
                  stroke={isHovered ? "#ffd700" : "transparent"}
                  strokeWidth={isHovered ? 1.5 : 0}
                  style={{ cursor: "crosshair" }}
                  onMouseEnter={() => setHoveredWall(w)}
                  onMouseLeave={() => setHoveredWall(null)}
                  onMouseDown={e => {
                    if (e.button === 0 && !e.altKey) {
                      e.stopPropagation();
                      onWallClick(w);
                    }
                  }}
                />
              );
            })}

            {/* PANELS */}
            {panels.map(panel => {
              const pos = panelPosition(panel);
              const isSel = panel.id === selectedId;
              const pw = 24;
              const ph = 16;
              return (
                <g
                  key={panel.id}
                  style={{ cursor: "pointer" }}
                  onMouseDown={e => {
                    if (e.button === 0 && !e.altKey) {
                      onPanelClick(e, panel.id);
                    }
                  }}
                >
                  {/* Glow for selected */}
                  {isSel && (
                    <rect
                      x={pos.x - pw / 2 - 3} y={pos.y - ph / 2 - 3}
                      width={pw + 6} height={ph + 6}
                      rx={3} fill="none" stroke="#ffd600" strokeWidth={2}
                      style={{ filter: "drop-shadow(0 0 6px #ffd600)" }}
                    />
                  )}
                  {/* Blue top half */}
                  <rect
                    x={pos.x - pw / 2} y={pos.y - ph / 2}
                    width={pw} height={ph / 2}
                    fill="#1565c0" stroke="#42a5f5" strokeWidth={0.5}
                    rx={1}
                  />
                  {/* Red bottom half */}
                  <rect
                    x={pos.x - pw / 2} y={pos.y}
                    width={pw} height={ph / 2}
                    fill="#b71c1c" stroke="#ef5350" strokeWidth={0.5}
                    rx={1}
                  />
                  {/* Number label */}
                  <rect
                    x={pos.x + pw / 2 + 3} y={pos.y - 7}
                    width={36} height={14}
                    rx={2} fill="rgba(10,25,41,0.9)" stroke="#37474f" strokeWidth={0.5}
                  />
                  <text
                    x={pos.x + pw / 2 + 21} y={pos.y + 3}
                    textAnchor="middle" fill="#fff" fontSize={8} fontWeight="bold" fontFamily={FN}
                  >{panel.num}</text>
                  {/* Linked meters count */}
                  {panel.linkedMeters.length > 0 && (
                    <>
                      <circle cx={pos.x + pw / 2 - 2} cy={pos.y - ph / 2 - 2} r={6} fill="#00e676" opacity={0.9} />
                      <text
                        x={pos.x + pw / 2 - 2} y={pos.y - ph / 2 + 1}
                        textAnchor="middle" fill="#000" fontSize={7} fontWeight="bold" fontFamily={FN}
                      >{panel.linkedMeters.length}</text>
                    </>
                  )}
                </g>
              );
            })}

            {/* BUILDING OUTLINE */}
            <rect
              x={OX} y={OY}
              width={COLS * CELL_W} height={SECS * CELL_H}
              fill="none" stroke="#ffa726" strokeWidth={2} rx={2}
            />
          </svg>
        </div>

        {/* SIDEBAR */}
        {selected && (
          <div style={{
            width: 280, flexShrink: 0,
            background: "#0d1b2a",
            borderLeft: "1px solid #1e3a5f",
            display: "flex", flexDirection: "column",
            overflow: "hidden",
          }}>
            <div style={{ padding: 14, borderBottom: "1px solid #1e3a5f" }}>
              <div style={{ fontSize: 10, color: "#546e7a", marginBottom: 4 }}>Щиток</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                {/* Blue-red icon */}
                <svg width={18} height={14}>
                  <rect x={0} y={0} width={18} height={7} fill="#1565c0" rx={1} />
                  <rect x={0} y={7} width={18} height={7} fill="#b71c1c" rx={1} />
                </svg>
                <input
                  type="text"
                  value={selected.num}
                  onChange={e => updatePanelNum(e.target.value)}
                  style={{
                    flex: 1, padding: 4, background: "#0a0f16",
                    border: "1px solid #263238", borderRadius: 3,
                    color: "#ffa726", fontFamily: FN, fontSize: 14, fontWeight: 700,
                    outline: "none",
                  }}
                />
              </div>
              <div style={{ fontSize: 9, color: "#546e7a", lineHeight: 1.4 }}>
                {wallDescription(selected.wallType, selected.wallCol, selected.wallRow)}
              </div>
            </div>

            {/* LINKED METERS */}
            <div style={{ padding: 14, flex: 1, overflowY: "auto" }}>
              <div style={{ fontSize: 10, color: "#00bcd4", fontWeight: 700, marginBottom: 8 }}>
                Привязанные счётчики
              </div>
              {selected.linkedMeters.length === 0 && (
                <div style={{ fontSize: 9, color: "#37474f", fontStyle: "italic", marginBottom: 8 }}>
                  Нет привязанных счётчиков
                </div>
              )}
              {selected.linkedMeters.map(mid => {
                const meter = BUILDING_METERS.find(m => m.id === mid);
                if (!meter) return null;
                return (
                  <div key={mid} style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "4px 6px", marginBottom: 4,
                    background: "#112240", borderRadius: 3,
                    border: "1px solid #1e3a5f",
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 8, color: "#ffa726", fontWeight: 600 }}>{meter.row} / CT={meter.ct}</div>
                      <div style={{ fontSize: 7, color: "#b0bec5", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {meter.name}
                      </div>
                    </div>
                    <button
                      onClick={() => unlinkMeter(mid)}
                      style={{
                        background: "transparent", border: "none", color: "#ff1744",
                        cursor: "pointer", fontSize: 12, padding: "0 2px", fontFamily: FN,
                        flexShrink: 0,
                      }}
                      title="Отвязать"
                    >×</button>
                  </div>
                );
              })}

              {/* ADD METER DROPDOWN */}
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 9, color: "#546e7a", marginBottom: 4 }}>Добавить счётчик:</div>
                <select
                  value=""
                  onChange={e => linkMeter(e.target.value)}
                  style={{
                    width: "100%", padding: 5, background: "#0a0f16",
                    border: "1px solid #263238", borderRadius: 3,
                    color: "#b0bec5", fontFamily: FN, fontSize: 8,
                    outline: "none",
                  }}
                >
                  <option value="">-- Выберите счётчик --</option>
                  {BUILDING_METERS.filter(m => !selected.linkedMeters.includes(m.id)).map(m => (
                    <option key={m.id} value={m.id}>
                      {m.row} CT={m.ct} | {m.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* DELETE */}
            <div style={{ padding: 14, borderTop: "1px solid #1e3a5f" }}>
              <button
                onClick={deletePanel}
                style={{
                  width: "100%", padding: "6px 0",
                  background: "#4a1515", border: "1px solid #ff174440",
                  borderRadius: 4, color: "#ff1744", fontFamily: FN,
                  fontSize: 9, cursor: "pointer",
                }}
              >Удалить щиток</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
