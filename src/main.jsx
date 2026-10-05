import React, { useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const copy = {
  en: {
    eyebrow: 'EVACUATION ROUTE SIMULATOR', title: 'Smart Escape', building: 'Building', awaiting: 'Awaiting building import', reset: 'Reset',
    workspace: 'Map workspace', workspaceHint: 'Your building graph will appear here after import.', importTitle: 'Import building JSON',
    importBody: 'Load the building.json file supplied for this simulation. The map will populate once the file is imported.', choose: 'Choose JSON file',
    noFile: 'No building file selected', selected: 'Loaded', controls: 'Controls', start: 'Start location', startEmpty: 'Route controls come in the next step',
    hazards: 'Hazards', hazardsEmpty: 'Hazard behavior comes in the next step', route: 'Route status', routeEmpty: 'No route calculated yet',
    routeHint: 'Routing is intentionally not active in this step. The imported graph is ready for the next stage.', legend: 'Legend', room: 'Room',
    junction: 'Junction', exit: 'Exit', blocked: 'Blocked', selectedState: 'Selected', frontend: 'Frontend-only foundation', resetAria: 'Reset workspace',
    languageAria: 'Switch language', summary: 'Dataset summary', nodes: 'Nodes', corridors: 'Corridors', exits: 'Exits', loaded: 'Dataset loaded',
    invalidFile: 'Invalid building JSON', validationFailed: 'The file was not imported because the data is invalid.', validFile: 'Valid building data',
    mapLoaded: 'Building graph loaded from JSON', noGraph: 'No building loaded', graphHint: 'Import a valid building.json to visualize its nodes and corridors.',
  },
  bn: {
    eyebrow: 'নিরাপদ বহির্গমন রুট সিমুলেটর', title: 'Smart Escape', building: 'ভবন', awaiting: 'ভবনের ডেটা অপেক্ষমাণ', reset: 'রিসেট',
    workspace: 'ম্যাপ ওয়ার্কস্পেস', workspaceHint: 'ইমপোর্ট করার পর এখানে আপনার বিল্ডিং গ্রাফ দেখা যাবে।', importTitle: 'বিল্ডিং JSON ইমপোর্ট করুন',
    importBody: 'এই সিমুলেশনের জন্য দেওয়া building.json ফাইল নির্বাচন করুন। ফাইল ইমপোর্ট হলে ম্যাপ দেখা যাবে।', choose: 'JSON ফাইল নির্বাচন',
    noFile: 'কোনো বিল্ডিং ফাইল লোড করা হয়নি', selected: 'লোড হয়েছে', controls: 'কন্ট্রোল', start: 'শুরুর স্থান', startEmpty: 'পরবর্তী ধাপে রুট কন্ট্রোল যোগ হবে',
    hazards: 'ঝুঁকি', hazardsEmpty: 'পরবর্তী ধাপে ঝুঁকি নিয়ন্ত্রণ যোগ হবে', route: 'রুট স্ট্যাটাস', routeEmpty: 'এখনও কোনো রুট হিসাব করা হয়নি',
    routeHint: 'এই ধাপে রাউটিং চালু নেই। ইমপোর্ট করা গ্রাফ পরবর্তী ধাপের জন্য প্রস্তুত।', legend: 'লেজেন্ড', room: 'রুম', junction: 'জংশন', exit: 'এক্সিট',
    blocked: 'ব্লকড', selectedState: 'নির্বাচিত', frontend: 'ফ্রন্টএন্ড-অনলি ফাউন্ডেশন', resetAria: 'ওয়ার্কস্পেস রিসেট', languageAria: 'ভাষা পরিবর্তন',
    summary: 'ডেটাসেট সারাংশ', nodes: 'নোড', corridors: 'করিডোর', exits: 'এক্সিট', loaded: 'ডেটাসেট লোড হয়েছে', invalidFile: 'অবৈধ বিল্ডিং JSON',
    validationFailed: 'ডেটা অবৈধ হওয়ায় ফাইলটি ইমপোর্ট করা হয়নি।', validFile: 'বিল্ডিং ডেটা সঠিক', mapLoaded: 'JSON থেকে বিল্ডিং গ্রাফ লোড হয়েছে', noGraph: 'কোনো বিল্ডিং লোড হয়নি',
    graphHint: 'নোড ও করিডোর দেখতে একটি সঠিক building.json ইমপোর্ট করুন।',
  },
};

const VALID_NODE_TYPES = new Set(['room', 'junction', 'exit']);

function pathName(path) {
  return path.map(String).join('.');
}

function validateBuilding(data) {
  const errors = [];
  const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
  const nonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;
  const finiteNumber = (value) => typeof value === 'number' && Number.isFinite(value);

  if (!isObject(data)) return ['Root JSON value must be an object. / মূল JSON একটি object হতে হবে।'];
  if (!nonEmptyString(data.building)) errors.push('building must be a non-empty string. / building একটি খালি নয় এমন string হতে হবে।');
  if (!Array.isArray(data.nodes)) errors.push('nodes must be an array. / nodes একটি array হতে হবে।');
  if (!Array.isArray(data.edges)) errors.push('edges must be an array. / edges একটি array হতে হবে।');
  if (!isObject(data.initial_state)) errors.push('initial_state must be an object. / initial_state একটি object হতে হবে।');

  if (!Array.isArray(data.nodes) || !Array.isArray(data.edges) || !isObject(data.initial_state)) return errors;

  const nodeIds = new Set();
  const edgeIds = new Set();
  const nodeById = new Map();
  const edgeById = new Map();

  data.nodes.forEach((node, index) => {
    const p = `nodes[${index}]`;
    if (!isObject(node)) { errors.push(`${p} must be an object. / ${p} একটি object হতে হবে।`); return; }
    if (!nonEmptyString(node.id)) errors.push(`${p}.id must be a non-empty string. / ${p}.id খালি হতে পারবে না।`);
    else if (nodeIds.has(node.id)) errors.push(`Duplicate node ID "${node.id}". / একই node ID "${node.id}" একাধিকবার আছে।`);
    else { nodeIds.add(node.id); nodeById.set(node.id, node); }
    if (!nonEmptyString(node.label)) errors.push(`${p}.label must be a non-empty string. / ${p}.label খালি হতে পারবে না।`);
    if (!VALID_NODE_TYPES.has(node.type)) errors.push(`${p}.type must be room, junction, or exit. / ${p}.type room, junction অথবা exit হতে হবে।`);
    if (!finiteNumber(node.x) || !finiteNumber(node.y)) errors.push(`${p}.x and ${p}.y must be finite numbers. / ${p}.x ও ${p}.y বৈধ সংখ্যা হতে হবে।`);
  });

  data.edges.forEach((edge, index) => {
    const p = `edges[${index}]`;
    if (!isObject(edge)) { errors.push(`${p} must be an object. / ${p} একটি object হতে হবে।`); return; }
    if (!nonEmptyString(edge.id)) errors.push(`${p}.id must be a non-empty string. / ${p}.id খালি হতে পারবে না।`);
    else if (edgeIds.has(edge.id)) errors.push(`Duplicate edge ID "${edge.id}". / একই edge ID "${edge.id}" একাধিকবার আছে।`);
    else { edgeIds.add(edge.id); edgeById.set(edge.id, edge); }
    if (!nonEmptyString(edge.from) || !nodeIds.has(edge.from)) errors.push(`${p}.from must reference an existing node. / ${p}.from-এ বিদ্যমান node ID দিতে হবে।`);
    if (!nonEmptyString(edge.to) || !nodeIds.has(edge.to)) errors.push(`${p}.to must reference an existing node. / ${p}.to-তে বিদ্যমান node ID দিতে হবে।`);
    if (!Number.isInteger(edge.cost) || edge.cost <= 0) errors.push(`${p}.cost must be a positive integer. / ${p}.cost একটি ধনাত্মক পূর্ণসংখ্যা হতে হবে।`);
  });

  const state = data.initial_state;
  const arrays = ['blocked_nodes', 'blocked_edges', 'closed_exits'];
  arrays.forEach((key) => {
    if (!Array.isArray(state[key])) errors.push(`initial_state.${key} must be an array. / initial_state.${key} একটি array হতে হবে।`);
  });
  if (errors.some((e) => e.includes('initial_state.'))) return errors;

  const checkUnique = (items, label) => {
    const seen = new Set();
    items.forEach((id) => {
      if (typeof id !== 'string' || !id.trim()) errors.push(`initial_state.${label} contains an invalid ID. / initial_state.${label}-এ অবৈধ ID আছে।`);
      else if (seen.has(id)) errors.push(`Duplicate hazard ID "${id}" in ${label}. / ${label}-এ "${id}" ID একাধিকবার আছে।`);
      else seen.add(id);
    });
  };
  checkUnique(state.blocked_nodes, 'blocked_nodes');
  checkUnique(state.blocked_edges, 'blocked_edges');
  checkUnique(state.closed_exits, 'closed_exits');

  state.blocked_nodes.forEach((id) => {
    const node = nodeById.get(id);
    if (!node) errors.push(`Blocked node "${id}" does not exist. / blocked node "${id}" বিদ্যমান নয়।`);
    else if (!['room', 'junction'].includes(node.type)) errors.push(`Blocked node "${id}" must be a room or junction. / blocked node "${id}" room বা junction হতে হবে।`);
  });
  state.blocked_edges.forEach((id) => {
    if (!edgeById.has(id)) errors.push(`Blocked edge "${id}" does not exist. / blocked edge "${id}" বিদ্যমান নয়।`);
  });
  state.closed_exits.forEach((id) => {
    const node = nodeById.get(id);
    if (!node) errors.push(`Closed exit "${id}" does not exist. / closed exit "${id}" বিদ্যমান নয়।`);
    else if (node.type !== 'exit') errors.push(`Closed exit "${id}" must reference an exit node. / closed exit "${id}"-কে exit node হতে হবে।`);
  });

  return errors;
}

function Icon({ name, size = 18 }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };
  const paths = {
    rotate: <><path d="M3 12a9 9 0 0 1 15.4-6.3L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15.4 6.3L3 16"/><path d="M3 21v-5h5"/></>,
    upload: <><path d="M12 16V4"/><path d="m7 9 5-5 5 5"/><path d="M5 20h14"/></>,
    map: <><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3Z"/><path d="M9 3v15"/><path d="M15 6v15"/></>,
    chevron: <path d="m9 18 6-6-6-6"/>,
    shield: <path d="M12 3 5 6v5c0 4.6 2.9 8.1 7 10 4.1-1.9 7-5.4 7-10V6l-7-3Z"/>,
    alert: <><path d="M12 3 2.8 20h18.4L12 3Z"/><path d="M12 9v5"/><path d="M12 17h.01"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
  };
  return <svg {...common}>{paths[name]}</svg>;
}

function App() {
  const [lang, setLang] = useState('en');
  const [fileName, setFileName] = useState('');
  const [building, setBuilding] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const fileRef = useRef(null);
  const t = copy[lang];

  const reset = () => {
    setFileName(''); setBuilding(null); setError(null); setSuccess(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const onFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null); setSuccess(false);
    try {
      const text = await file.text();
      let data;
      try { data = JSON.parse(text); }
      catch { throw new Error('The selected file is not valid JSON. / নির্বাচিত ফাইলটি বৈধ JSON নয়।'); }
      const errors = validateBuilding(data);
      if (errors.length) {
        setError({ fileName: file.name, messages: errors });
        return;
      }
      setBuilding(data);
      setFileName(file.name);
      setSuccess(true);
    } catch (err) {
      setError({ fileName: file.name, messages: [err.message || 'Unable to read the selected file. / ফাইলটি পড়া যায়নি।'] });
    } finally {
      event.target.value = '';
    }
  };

  const graph = useMemo(() => building ? <BuildingGraph building={building} /> : null, [building]);
  const buildingName = building?.building || t.awaiting;

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-block"><div className="brand-mark"><Icon name="shield" size={20} /></div><div><div className="eyebrow">{t.eyebrow}</div><div className="brand-title">{t.title}</div></div></div>
        <div className="header-meta"><div className="building-slot"><span className="meta-label">{t.building}</span><span className="building-name">{buildingName}</span></div>
          <div className="header-actions"><button className="language-toggle" onClick={() => setLang((v) => v === 'en' ? 'bn' : 'en')} aria-label={t.languageAria}><span className={lang === 'en' ? 'active' : ''}>EN</span><span className="slash">/</span><span className={lang === 'bn' ? 'active' : ''}>বাং</span></button><button className="reset-button" onClick={reset} aria-label={t.resetAria}><Icon name="rotate" size={16} /><span>{t.reset}</span></button></div>
        </div>
      </header>

      <main className="main-content">
        <section className="workspace-column">
          <div className="section-heading"><div><span className="section-kicker">01</span><h1>{t.workspace}</h1></div><span className="status-pill"><span className={`status-dot ${building ? 'loaded' : ''}`} />{building ? t.loaded : t.frontend}</span></div>
          <div className={`map-card ${building ? 'has-graph' : ''}`}>
            {!building ? <><div className="map-grid" aria-hidden="true" /><div className="map-empty"><div className="map-icon"><Icon name="map" size={28} /></div><h2>{t.workspaceHint}</h2><p>{t.importBody}</p><button className="primary-button" onClick={() => fileRef.current?.click()}><Icon name="upload" size={17} />{t.choose}</button><div className="file-state">{t.noFile}</div></div></> : graph}
            <div className="map-corner-label">MAP / {building ? '01' : '00'}</div>
          </div>

          {error && <div className="message-card error-card" role="alert"><div className="message-icon"><Icon name="alert" size={17} /></div><div className="message-copy"><strong>{t.invalidFile}</strong><p>{t.validationFailed}</p><ul>{error.messages.slice(0, 8).map((message, i) => <li key={`${message}-${i}`}>{message}</li>)}</ul>{error.messages.length > 8 && <small>+ {error.messages.length - 8} more validation errors / আরও validation error আছে</small>}</div></div>}
          {success && <div className="message-card success-card" role="status"><div className="message-icon"><Icon name="check" size={17} /></div><div className="message-copy"><strong>{t.validFile}</strong><p>{t.mapLoaded}: <b>{fileName}</b></p></div></div>}

          <div className="bottom-grid">
            <section className="route-card panel-card"><div className="panel-title-row"><div><span className="section-kicker">02</span><h2>{t.route}</h2></div><span className="neutral-chip">IDLE</span></div><div className="route-empty"><div className="route-line" /><div><strong>{t.routeEmpty}</strong><p>{t.routeHint}</p></div></div></section>
            <section className="legend-card panel-card"><div className="panel-title-row"><div><span className="section-kicker">03</span><h2>{t.legend}</h2></div></div><div className="legend-list"><LegendItem type="room" label={t.room}/><LegendItem type="junction" label={t.junction}/><LegendItem type="exit" label={t.exit}/><LegendItem type="blocked" label={t.blocked}/><LegendItem type="selected" label={t.selectedState}/></div></section>
          </div>
        </section>

        <aside className="control-column">
          <section className="import-card panel-card"><div className="panel-title-row"><div><span className="section-kicker">IMPORT</span><h2>{t.importTitle}</h2></div><div className="json-badge">JSON</div></div><p>{t.importBody}</p><button className="upload-zone" onClick={() => fileRef.current?.click()}><span className="upload-icon"><Icon name="upload" size={20}/></span><span className="upload-copy"><strong>{t.choose}</strong><small>.json</small></span><Icon name="chevron" size={17}/></button><input ref={fileRef} className="visually-hidden" type="file" accept="application/json,.json" onChange={onFileChange}/><div className={`file-status ${fileName ? 'is-loaded' : ''}`}>{fileName ? <><span className="file-check">✓</span>{fileName}</> : t.noFile}</div></section>

          <section className="summary-card panel-card"><div className="panel-title-row"><div><span className="section-kicker">DATA</span><h2>{t.summary}</h2></div>{building && <span className="json-badge">VALID</span>}</div>{building ? <div className="summary-grid"><SummaryStat label={t.nodes} value={building.nodes.length}/><SummaryStat label={t.corridors} value={building.edges.length}/><SummaryStat label={t.exits} value={building.nodes.filter((n) => n.type === 'exit').length}/></div> : <div className="summary-empty">{t.graphHint}</div>}</section>

          <section className="controls-card panel-card"><div className="panel-title-row"><div><span className="section-kicker">04</span><h2>{t.controls}</h2></div></div><ControlRow label={t.start} value={t.startEmpty}/><ControlRow label={t.hazards} value={t.hazardsEmpty}/></section>
        </aside>
      </main>
    </div>
  );
}

function BuildingGraph({ building }) {
  const xs = building.nodes.map((n) => n.x); const ys = building.nodes.map((n) => n.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const width = Math.max(maxX - minX, 1), height = Math.max(maxY - minY, 1);
  const pad = Math.max(Math.max(width, height) * 0.1, 35);
  const viewWidth = width + pad * 2, viewHeight = height + pad * 2;
  const point = (node) => ({ x: node.x - minX + pad, y: maxY - node.y + pad });
  const nodeMap = new Map(building.nodes.map((n) => [n.id, n]));
  const blockedNodes = new Set(building.initial_state.blocked_nodes);
  const blockedEdges = new Set(building.initial_state.blocked_edges);
  const closedExits = new Set(building.initial_state.closed_exits);

  return <div className="graph-wrap" aria-label={`Building graph for ${building.building}`}>
    <svg className="building-graph" viewBox={`0 0 ${viewWidth} ${viewHeight}`} role="img" aria-label={`Building graph: ${building.nodes.length} nodes and ${building.edges.length} corridors`} preserveAspectRatio="xMidYMid meet">
      <defs><filter id="nodeGlow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="2.2" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
      <g className="edge-layer">{building.edges.map((edge) => { const a = nodeMap.get(edge.from), b = nodeMap.get(edge.to); if (!a || !b) return null; const p1 = point(a), p2 = point(b); const blocked = blockedEdges.has(edge.id); return <g key={edge.id} className={blocked ? 'edge blocked' : 'edge'}><line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}/><g className="edge-cost"><rect x={(p1.x+p2.x)/2-14} y={(p1.y+p2.y)/2-9} width="28" height="18" rx="5"/><text x={(p1.x+p2.x)/2} y={(p1.y+p2.y)/2+3} textAnchor="middle">{edge.cost}</text></g></g>; })}</g>
      <g className="node-layer">{building.nodes.map((node) => { const p = point(node); const blocked = blockedNodes.has(node.id); const closed = node.type === 'exit' && closedExits.has(node.id); const stateClass = blocked || closed ? ' blocked' : ''; return <g key={node.id} className={`graph-node ${node.type}${stateClass}`} transform={`translate(${p.x} ${p.y})`} filter={blocked || closed ? undefined : 'url(#nodeGlow)'}><circle className="node-halo" r={node.type === 'junction' ? 10 : 11}/><circle className="node-shape" r={node.type === 'junction' ? 6 : 7}/><text className="node-label" x="10" y="-10">{node.label}</text><text className="node-id" x="10" y="4">{node.id}</text></g>; })}</g>
    </svg>
    <div className="graph-caption"><span>{building.building}</span><span>{building.nodes.length} nodes · {building.edges.length} corridors</span></div>
  </div>;
}

function SummaryStat({ label, value }) { return <div className="summary-stat"><strong>{value}</strong><span>{label}</span></div>; }
function ControlRow({ label, value }) { return <div className="control-row"><span className="control-label">{label}</span><span className="control-value">{value}<Icon name="chevron" size={15}/></span></div>; }
function LegendItem({ type, label }) { return <div className="legend-item"><span className={`legend-symbol ${type}`}/><span>{label}</span></div>; }

createRoot(document.getElementById('root')).render(<App/>);
