// symbols.jsx — ГОСТ electrical single-line diagram symbols for Energy SCADA
import { ON, OFF, BUS, BUSOFF, WC, WO, TXT, TM, FN } from "./shared";

const S = (on) => on ? ON : "#37474f";
const SW_F = (on) => on ? "#1b5e20" : "#6b1515";
const glow = (c) => ({ filter: `drop-shadow(0 0 4px ${c})` });

// ═══ SYMBOL DEFINITIONS ═══
export const SLD_SYMBOLS = {
  cable_entry: {
    type: "cable_entry", label: "Ввод", w: 24, h: 30, switchable: false,
    ports: [{ id: "bottom", x: 0, y: 15, dir: "d" }],
    defaultParams: { voltage: "10" },
    render: (x, y, on) => <g>
      <line x1={x} y1={y - 12} x2={x} y2={y + 15} stroke={S(on)} strokeWidth={2} />
      <line x1={x - 8} y1={y - 12} x2={x + 8} y2={y - 12} stroke={S(on)} strokeWidth={2} />
      <line x1={x - 5} y1={y - 15} x2={x + 5} y2={y - 15} stroke={S(on)} strokeWidth={1.5} />
      <line x1={x - 2} y1={y - 18} x2={x + 2} y2={y - 18} stroke={S(on)} strokeWidth={1} />
    </g>,
  },

  vna: {
    type: "vna", label: "ВНА", w: 24, h: 36, switchable: true,
    ports: [{ id: "top", x: 0, y: -18, dir: "u" }, { id: "bottom", x: 0, y: 18, dir: "d" }],
    defaultParams: { nominal: "630" },
    render: (x, y, on) => <g>
      <line x1={x} y1={y - 18} x2={x} y2={y - 6} stroke={S(on)} strokeWidth={1.5} />
      <rect x={x - 8} y={y - 6} width={16} height={12} rx={2} fill={SW_F(on)} stroke={S(on)} strokeWidth={1} />
      {on ? <line x1={x} y1={y - 4} x2={x} y2={y + 4} stroke={ON} strokeWidth={2} /> :
        <><line x1={x - 3} y1={y - 3} x2={x + 3} y2={y + 3} stroke={OFF} strokeWidth={1.2} />
          <line x1={x + 3} y1={y - 3} x2={x - 3} y2={y + 3} stroke={OFF} strokeWidth={1.2} /></>}
      <line x1={x} y1={y + 6} x2={x} y2={y + 18} stroke={S(on)} strokeWidth={1.5} />
    </g>,
  },

  breaker: {
    type: "breaker", label: "Q", w: 24, h: 36, switchable: true,
    ports: [{ id: "top", x: 0, y: -18, dir: "u" }, { id: "bottom", x: 0, y: 18, dir: "d" }],
    defaultParams: { nominal: "630", model: "" },
    render: (x, y, on) => <g>
      <line x1={x} y1={y - 18} x2={x} y2={y - 6} stroke={S(on)} strokeWidth={1.5} />
      <rect x={x - 7} y={y - 6} width={14} height={12} rx={2} fill={SW_F(on)} stroke={S(on)} strokeWidth={1} />
      {on ? <line x1={x} y1={y - 4} x2={x} y2={y + 4} stroke={ON} strokeWidth={2} /> :
        <><line x1={x - 3} y1={y - 3} x2={x + 3} y2={y + 3} stroke={OFF} strokeWidth={1.2} />
          <line x1={x + 3} y1={y - 3} x2={x - 3} y2={y + 3} stroke={OFF} strokeWidth={1.2} /></>}
      <line x1={x} y1={y + 6} x2={x} y2={y + 18} stroke={S(on)} strokeWidth={1.5} />
    </g>,
  },

  disconnector: {
    type: "disconnector", label: "QS", w: 24, h: 36, switchable: true,
    ports: [{ id: "top", x: 0, y: -18, dir: "u" }, { id: "bottom", x: 0, y: 18, dir: "d" }],
    defaultParams: { nominal: "250" },
    render: (x, y, on) => <g>
      <line x1={x} y1={y - 18} x2={x} y2={y - 4} stroke={S(on)} strokeWidth={1.5} />
      <circle cx={x} cy={y - 4} r={2} fill={S(on)} />
      {on ? <line x1={x} y1={y - 4} x2={x} y2={y + 4} stroke={S(on)} strokeWidth={2} /> :
        <line x1={x} y1={y - 4} x2={x + 6} y2={y - 12} stroke={OFF} strokeWidth={2} />}
      <circle cx={x} cy={y + 4} r={2} fill={S(on)} />
      <line x1={x} y1={y + 4} x2={x} y2={y + 18} stroke={S(on)} strokeWidth={1.5} />
    </g>,
  },

  fuse: {
    type: "fuse", label: "FU", w: 20, h: 30, switchable: false,
    ports: [{ id: "top", x: 0, y: -15, dir: "u" }, { id: "bottom", x: 0, y: 15, dir: "d" }],
    defaultParams: { nominal: "100" },
    render: (x, y, on) => <g>
      <line x1={x} y1={y - 15} x2={x} y2={y - 6} stroke={S(on)} strokeWidth={1.5} />
      <rect x={x - 3} y={y - 6} width={6} height={12} rx={1} fill="none" stroke={S(on)} strokeWidth={1.2} />
      <line x1={x} y1={y - 5} x2={x} y2={y + 5} stroke={S(on)} strokeWidth={1.5} />
      <line x1={x} y1={y + 6} x2={x} y2={y + 15} stroke={S(on)} strokeWidth={1.5} />
    </g>,
  },

  transformer: {
    type: "transformer", label: "T", w: 30, h: 36, switchable: false,
    ports: [{ id: "top", x: 0, y: -18, dir: "u" }, { id: "bottom", x: 0, y: 18, dir: "d" }],
    defaultParams: { power: "400", model: "ТМГ-400/10" },
    render: (x, y, on) => <g>
      <line x1={x} y1={y - 18} x2={x} y2={y - 8} stroke={S(on)} strokeWidth={1.5} />
      <circle cx={x} cy={y - 4} r={7} fill="none" stroke={on ? BUS : BUSOFF} strokeWidth={1.3}
        style={on ? glow(BUS + "40") : {}} />
      <circle cx={x} cy={y + 6} r={7} fill="none" stroke={on ? WC : WO} strokeWidth={1.3}
        style={on ? glow(WC + "40") : {}} />
      <line x1={x} y1={y + 13} x2={x} y2={y + 18} stroke={S(on)} strokeWidth={1.5} />
    </g>,
  },

  ct: {
    type: "ct", label: "TA", w: 20, h: 24, switchable: false,
    ports: [{ id: "top", x: 0, y: -12, dir: "u" }, { id: "bottom", x: 0, y: 12, dir: "d" }],
    defaultParams: { ratio: "200/5" },
    render: (x, y, on) => <g>
      <line x1={x} y1={y - 12} x2={x} y2={y + 12} stroke={S(on)} strokeWidth={1.5} />
      <circle cx={x} cy={y} r={5} fill="none" stroke={S(on)} strokeWidth={1} />
      <text x={x} y={y + 2} textAnchor="middle" fill={S(on)} fontSize={5} fontFamily={FN}>I</text>
    </g>,
  },

  meter: {
    type: "meter", label: "Wh", w: 22, h: 22, switchable: false,
    ports: [{ id: "left", x: -11, y: 0, dir: "l" }],
    defaultParams: { model: "" },
    render: (x, y, on) => <g>
      <circle cx={x} cy={y} r={8} fill="none" stroke={S(on)} strokeWidth={1} />
      <text x={x} y={y + 3} textAnchor="middle" fill={S(on)} fontSize={6} fontWeight="bold" fontFamily={FN}>Wh</text>
      <line x1={x - 11} y1={y} x2={x - 8} y2={y} stroke={S(on)} strokeWidth={1} />
    </g>,
  },

  ammeter: {
    type: "ammeter", label: "PA", w: 22, h: 22, switchable: false,
    ports: [{ id: "left", x: -11, y: 0, dir: "l" }],
    defaultParams: {},
    render: (x, y, on) => <g>
      <circle cx={x} cy={y} r={8} fill="none" stroke={S(on)} strokeWidth={1} />
      <text x={x} y={y + 3} textAnchor="middle" fill={S(on)} fontSize={7} fontWeight="bold" fontFamily={FN}>A</text>
      <line x1={x - 11} y1={y} x2={x - 8} y2={y} stroke={S(on)} strokeWidth={1} />
    </g>,
  },

  voltmeter: {
    type: "voltmeter", label: "PV", w: 22, h: 22, switchable: false,
    ports: [{ id: "left", x: -11, y: -4, dir: "l" }, { id: "left2", x: -11, y: 4, dir: "l" }],
    defaultParams: {},
    render: (x, y, on) => <g>
      <circle cx={x} cy={y} r={8} fill="none" stroke={S(on)} strokeWidth={1} />
      <text x={x} y={y + 3} textAnchor="middle" fill={S(on)} fontSize={7} fontWeight="bold" fontFamily={FN}>V</text>
      <line x1={x - 11} y1={y - 4} x2={x - 8} y2={y - 4} stroke={S(on)} strokeWidth={1} />
      <line x1={x - 11} y1={y + 4} x2={x - 8} y2={y + 4} stroke={S(on)} strokeWidth={1} />
    </g>,
  },

  arrester: {
    type: "arrester", label: "FV", w: 20, h: 28, switchable: false,
    ports: [{ id: "top", x: 0, y: -14, dir: "u" }],
    defaultParams: {},
    render: (x, y, on) => <g>
      <line x1={x} y1={y - 14} x2={x} y2={y - 4} stroke={S(on)} strokeWidth={1.5} />
      <rect x={x - 5} y={y - 4} width={10} height={8} fill="none" stroke={S(on)} strokeWidth={1} />
      <line x1={x} y1={y + 4} x2={x} y2={y + 8} stroke={S(on)} strokeWidth={1.5} />
      {/* Ground */}
      <line x1={x - 5} y1={y + 8} x2={x + 5} y2={y + 8} stroke={S(on)} strokeWidth={1.2} />
      <line x1={x - 3} y1={y + 10} x2={x + 3} y2={y + 10} stroke={S(on)} strokeWidth={1} />
      <line x1={x - 1} y1={y + 12} x2={x + 1} y2={y + 12} stroke={S(on)} strokeWidth={0.8} />
    </g>,
  },

  bus: {
    type: "bus", label: "Шина", w: 100, h: 8, switchable: false,
    ports: [
      { id: "left", x: -50, y: 0, dir: "l" }, { id: "right", x: 50, y: 0, dir: "r" },
      { id: "t1", x: -30, y: -4, dir: "u" }, { id: "t2", x: -10, y: -4, dir: "u" },
      { id: "t3", x: 10, y: -4, dir: "u" }, { id: "t4", x: 30, y: -4, dir: "u" },
      { id: "b1", x: -30, y: 4, dir: "d" }, { id: "b2", x: -10, y: 4, dir: "d" },
      { id: "b3", x: 10, y: 4, dir: "d" }, { id: "b4", x: 30, y: 4, dir: "d" },
    ],
    defaultParams: { voltage: "0.4" },
    render: (x, y, on) => <g>
      <rect x={x - 50} y={y - 3} width={100} height={6} rx={1} fill={on ? BUS : BUSOFF}
        style={on ? glow(BUS + "40") : {}} />
    </g>,
  },

  ground: {
    type: "ground", label: "PE", w: 16, h: 18, switchable: false,
    ports: [{ id: "top", x: 0, y: -9, dir: "u" }],
    defaultParams: {},
    render: (x, y, on) => <g>
      <line x1={x} y1={y - 9} x2={x} y2={y} stroke={S(on)} strokeWidth={1.5} />
      <line x1={x - 7} y1={y} x2={x + 7} y2={y} stroke={S(on)} strokeWidth={1.5} />
      <line x1={x - 4} y1={y + 3} x2={x + 4} y2={y + 3} stroke={S(on)} strokeWidth={1.2} />
      <line x1={x - 2} y1={y + 6} x2={x + 2} y2={y + 6} stroke={S(on)} strokeWidth={0.9} />
    </g>,
  },

  wire_v: {
    type: "wire_v", label: "—", w: 6, h: 40, switchable: false,
    ports: [{ id: "top", x: 0, y: -20, dir: "u" }, { id: "bottom", x: 0, y: 20, dir: "d" }],
    defaultParams: {},
    render: (x, y, on) => <g>
      <line x1={x} y1={y - 20} x2={x} y2={y + 20} stroke={S(on)} strokeWidth={1.5} />
    </g>,
  },
};

// Palette order
export const SYMBOL_PALETTE = [
  "cable_entry", "vna", "fuse", "breaker", "disconnector",
  "transformer", "ct", "meter", "ammeter", "voltmeter",
  "arrester", "bus", "ground", "wire_v"
];

// Get absolute port position for a placed element
export function getSymbolPortPos(elem, portId) {
  const sym = SLD_SYMBOLS[elem.type];
  if (!sym) return null;
  const p = sym.ports.find(pp => pp.id === portId);
  if (!p) return null;
  return { x: elem.x + p.x, y: elem.y + p.y, dir: p.dir };
}

// Render a symbol at its position with label
export function renderSymbol(elem, on, onClick, onDblClick) {
  const sym = SLD_SYMBOLS[elem.type];
  if (!sym) return null;
  return <g key={elem.id} onClick={onClick} onDoubleClick={onDblClick} style={{ cursor: "pointer" }}>
    {sym.render(elem.x, elem.y, on)}
    {elem.label && <text x={elem.x + sym.w / 2 + 4} y={elem.y + 3} fill={on ? TXT : TM}
      fontSize={6} fontFamily={FN}>{elem.label}</text>}
    {elem.params?.nominal && <text x={elem.x + sym.w / 2 + 4} y={elem.y + 10} fill={TM}
      fontSize={5} fontFamily={FN}>{elem.params.nominal}А</text>}
  </g>;
}
