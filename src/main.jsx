import React, { useMemo, useRef, useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { calculateCheapestExit } from './routing.js';

const SAMPLE_BUILDING = {
  building: "AI DevFest Complex",
  nodes: [
    { id: "R1", label: "Room 1", type: "room", x: 100, y: 300 },
    { id: "R2", label: "Room 2", type: "room", x: 100, y: 100 },
    { id: "C1", label: "Corridor 1", type: "junction", x: 250, y: 300 },
    { id: "C2", label: "Corridor 2", type: "junction", x: 400, y: 300 },
    { id: "C3", label: "Corridor 3", type: "junction", x: 250, y: 100 },
    { id: "C4", label: "Corridor 4", type: "junction", x: 400, y: 100 },
    { id: "E1", label: "Exit 1", type: "exit", x: 550, y: 300 },
    { id: "E2", label: "Exit 2", type: "exit", x: 550, y: 100 },
  ],
  edges: [
    { id: "e_r1_c1", from: "R1", to: "C1", cost: 2 },
    { id: "e_c1_c2", from: "C1", to: "C2", cost: 2 },
    { id: "e_c2_e1", from: "C2", to: "E1", cost: 3 },
    { id: "e_r2_c3", from: "R2", to: "C3", cost: 2 },
    { id: "e_c3_c4", from: "C3", to: "C4", cost: 2 },
    { id: "e_c4_e2", from: "C4", to: "E2", cost: 3 },
    { id: "e_c1_c3", from: "C1", to: "C3", cost: 4 },
  ],
  initial_state: {
    blocked_nodes: [],
    blocked_edges: [],
    closed_exits: [],
  },
};

const copy = {
  en: {
    eyebrow: 'EVACUATION ROUTE SIMULATOR', title: 'Smart Escape', building: 'Building', awaiting: 'Awaiting building import', reset: 'Reset',
    workspace: 'Map workspace', workspaceHint: 'Your building graph will appear here after import.', importTitle: 'Import building JSON',
    importBody: 'Load the building.json file supplied for this simulation. The map will populate once the file is imported.', choose: 'Choose JSON file',
    loadSample: 'Load Sample Building', noFile: 'No building file selected', selected: 'Loaded', controls: 'Controls', start: 'Start location', startEmpty: 'Import a building to choose a start',
    hazards: 'Hazards', hazardsEmpty: 'Hazard controls appear after a building is imported', route: 'Route status', routeEmpty: 'No route calculated yet',
    routeHint: 'Select a room or junction to calculate the cheapest reachable open exit.', legend: 'Legend', room: 'Room',
    junction: 'Junction', exit: 'Exit', blocked: 'Blocked', selectedState: 'Selected', frontend: 'Frontend-only', resetAria: 'Reset workspace',
    languageAria: 'Switch language', summary: 'Dataset summary', nodes: 'Nodes', corridors: 'Corridors', exits: 'Exits', loaded: 'Dataset loaded',
    invalidFile: 'Invalid building JSON', validationFailed: 'The file was not imported because the data is invalid.', validFile: 'Valid building data',
    mapLoaded: 'Building graph loaded from JSON', noGraph: 'No building loaded', graphHint: 'Import a valid building.json to visualize its nodes and corridors.',
    chooseStart: 'Choose a starting location', starting: 'Starting location', destination: 'Destination exit', totalCost: 'Total cost', noRoute: 'No route available',
    blockedStart: 'Starting location blocked', selectHint: 'Select a room or junction on the map or here.', blockNodes: 'Block rooms / junctions', unblockNodes: 'Unblock rooms / junctions', blockEdges: 'Block corridors', unblockEdges: 'Unblock corridors', closeExits: 'Close exits', reopenExits: 'Reopen exits',
    routeChip: 'ROUTE', idleChip: 'IDLE', statusChip: 'STATUS', resetDone: 'Reset restored the imported initial state', moreErrors: (n) => `+ ${n} more validation errors`,
    blockedStartHint: 'Starting node cannot be entered while blocked.', noRouteHint: 'No open exit is reachable from this starting location.', importSection: 'IMPORT', dataSection: 'DATA', validBadge: 'VALID',
    validation: {
      root: 'Root JSON value must be an object.', building: 'building must be a non-empty string.', nodes: 'nodes must be an array.', edges: 'edges must be an array.', initial: 'initial_state must be an object.',
      nodeCount: (c) => `Building must have between 2 and 60 nodes (got ${c}).`, edgeCount: (c) => `Building must have between 1 and 150 edges (got ${c}).`,
      minNodes: 'Building must have at least one room/junction and one exit.', selfLoop: (id) => `Self-loop detected on node "${id}".`, duplicateEdgePair: (f, t) => `Duplicate edge between "${f}" and "${t}".`,
      object: (p) => `${p} must be an object.`, idEmpty: (p) => `${p}.id must be a non-empty string.`, duplicateNode: (id) => `Duplicate node ID "${id}".`,
      labelEmpty: (p) => `${p}.label must be a non-empty string.`, type: (p) => `${p}.type must be room, junction, or exit.`, coords: (p) => `${p}.x and ${p}.y must be finite numbers.`,
      duplicateEdge: (id) => `Duplicate edge ID "${id}".`, from: (p) => `${p}.from must reference an existing node.`, to: (p) => `${p}.to must reference an existing node.`, cost: (p) => `${p}.cost must be a positive integer.`,
      stateArray: (key) => `initial_state.${key} must be an array.`, invalidId: (key) => `initial_state.${key} contains an invalid ID.`, duplicateHazard: (id,key) => `Duplicate hazard ID "${id}" in ${key}.`,
      missingBlockedNode: (id) => `Blocked node "${id}" does not exist.`, blockedNodeType: (id) => `Blocked node "${id}" must be a room or junction.`, missingEdge: (id) => `Blocked edge "${id}" does not exist.`,
      missingExit: (id) => `Closed exit "${id}" does not exist.`, closedExitType: (id) => `Closed exit "${id}" must reference an exit node.`, invalidJson: 'The selected file is not valid JSON.', unreadable: 'Unable to read the selected file.'
    }
  },
  bn: {
    eyebrow: 'নিরাপদ বহির্গমন রুট সিমুলেটর', title: 'Smart Escape', building: 'ভবন', awaiting: 'ভবনের ডেটা অপেক্ষমাণ', reset: 'রিসেট',
    workspace: 'ম্যাপ ওয়ার্কস্পেস', workspaceHint: 'ইমপোর্ট করার পর এখানে আপনার বিল্ডিং গ্রাফ দেখা যাবে।', importTitle: 'বিল্ডিং JSON ইমপোর্ট করুন',
    importBody: 'এই সিমুলেশনের জন্য দেওয়া building.json ফাইল নির্বাচন করুন। ফাইল ইমপোর্ট হলে ম্যাপ দেখা যাবে।', choose: 'JSON ফাইল নির্বাচন করুন',
    loadSample: 'নমুনা ভবন লোড করুন', noFile: 'কোনো বিল্ডিং ফাইল নির্বাচন করা হয়নি', selected: 'লোড হয়েছে', controls: 'কন্ট্রোল', start: 'শুরুর স্থান', startEmpty: 'শুরুর স্থান বাছাই করতে বিল্ডিং ইমপোর্ট করুন',
    hazards: 'ঝুঁকি নিয়ন্ত্রণ', hazardsEmpty: 'বিল্ডিং ইমপোর্ট করার পর ঝুঁকি নিয়ন্ত্রণ দেখা যাবে', route: 'রুট স্ট্যাটাস', routeEmpty: 'এখনও কোনো রুট হিসাব করা হয়নি',
    routeHint: 'একটি রুম বা জংশন নির্বাচন করলে সবচেয়ে কম খরচের খোলা এক্সিটের রুট হিসাব হবে।', legend: 'লেজেন্ড', room: 'রুম',
    junction: 'জংশন', exit: 'এক্সিট', blocked: 'ব্লকড', selectedState: 'নির্বাচিত', frontend: 'ফ্রন্টএন্ড-অনলি', resetAria: 'ওয়ার্কস্পেস রিসেট',
    languageAria: 'ভাষা পরিবর্তন', summary: 'ডেটাসেট সারাংশ', nodes: 'নোড', corridors: 'করিডোর', exits: 'এক্সিট', loaded: 'ডেটাসেট লোড হয়েছে',
    invalidFile: 'অবৈধ বিল্ডিং JSON', validationFailed: 'ডেটা অবৈধ হওয়ায় ফাইলটি ইমপোর্ট করা হয়নি।', validFile: 'বিল্ডিং ডেটা সঠিক',
    mapLoaded: 'JSON থেকে বিল্ডিং গ্রাফ লোড হয়েছে', noGraph: 'কোনো বিল্ডিং লোড হয়নি', graphHint: 'নোড ও করিডোর দেখতে একটি সঠিক building.json ইমপোর্ট করুন।',
    chooseStart: 'শুরুর স্থান নির্বাচন করুন', starting: 'শুরুর স্থান', destination: 'গন্তব্য এক্সিট', totalCost: 'মোট খরচ', noRoute: 'কোনো রুট পাওয়া যায়নি',
    blockedStart: 'শুরুর স্থান ব্লকড', selectHint: 'ম্যাপে বা এখানে একটি রুম/জংশন নির্বাচন করুন।', blockNodes: 'রুম / জংশন ব্লক করুন', unblockNodes: 'রুম / জংশন আনব্লক করুন', blockEdges: 'করিডোর ব্লক করুন', unblockEdges: 'করিডোর আনব্লক করুন', closeExits: 'এক্সিট বন্ধ করুন', reopenExits: 'এক্সিট খুলুন',
    routeChip: 'রুট', idleChip: 'অপেক্ষমাণ', statusChip: 'স্ট্যাটাস', resetDone: 'ইমপোর্ট করা initial state পুনরুদ্ধার হয়েছে', moreErrors: (n) => `+ ${n}টি অতিরিক্ত validation error`,
    blockedStartHint: 'ব্লকড অবস্থায় শুরুর নোডে প্রবেশ করা যায় না।', noRouteHint: 'এই শুরুর স্থান থেকে কোনো খোলা এক্সিটে পৌঁছানো যায়নি।', importSection: 'ইমপোর্ট', dataSection: 'ডেটা', validBadge: 'সঠিক',
    validation: {
      root: 'মূল JSON একটি object হতে হবে।', building: 'building একটি খালি নয় এমন string হতে হবে।', nodes: 'nodes একটি array হতে হবে।', edges: 'edges একটি array হতে হবে।', initial: 'initial_state একটি object হতে হবে।',
      nodeCount: (c) => `ভবনে ২ থেকে ৬০টি নোড থাকতে হবে (${c}টি পাওয়া গেছে)।`, edgeCount: (c) => `ভবনে ১ থেকে ১৫০টি এজ থাকতে হবে (${c}টি পাওয়া গেছে)।`,
      minNodes: 'ভবনে অন্তত একটি রুম/জংশন এবং একটি এক্সিট থাকতে হবে।', selfLoop: (id) => `"${id}" নোডে সেলফ-লুপ শনাক্ত হয়েছে।`, duplicateEdgePair: (f, t) => `"${f}" ও "${t}" এর মধ্যে ডুপ্লিকেট এজ রয়েছে।`,
      object: (p) => `${p} একটি object হতে হবে।`, idEmpty: (p) => `${p}.id খালি হতে পারবে না।`, duplicateNode: (id) => `একই node ID "${id}" একাধিকবার আছে।`,
      labelEmpty: (p) => `${p}.label খালি হতে পারবে না।`, type: (p) => `${p}.type room, junction অথবা exit হতে হবে।`, coords: (p) => `${p}.x ও ${p}.y বৈধ সংখ্যা হতে হবে।`,
      duplicateEdge: (id) => `একই edge ID "${id}" একাধিকবার আছে।`, from: (p) => `${p}.from-এ বিদ্যমান node ID দিতে হবে।`, to: (p) => `${p}.to-তে বিদ্যমান node ID দিতে হবে।`, cost: (p) => `${p}.cost একটি ধনাত্মক পূর্ণসংখ্যা হতে হবে।`,
      stateArray: (key) => `initial_state.${key} একটি array হতে হবে।`, invalidId: (key) => `initial_state.${key}-এ অবৈধ ID আছে।`, duplicateHazard: (id,key) => `${key}-এ "${id}" ID একাধিকবার আছে।`,
      missingBlockedNode: (id) => `blocked node "${id}" বিদ্যমান নয়।`, blockedNodeType: (id) => `blocked node "${id}" room বা junction হতে হবে।`, missingEdge: (id) => `blocked edge "${id}" বিদ্যমান নয়।`,
      missingExit: (id) => `closed exit "${id}" বিদ্যমান নয়।`, closedExitType: (id) => `closed exit "${id}"-কে exit node হতে হবে।`, invalidJson: 'নির্বাচিত ফাইলটি বৈধ JSON নয়।', unreadable: 'ফাইলটি পড়া যায়নি।'
    }
  }
};

const VALID_NODE_TYPES = new Set(['room', 'junction', 'exit']);

function validateBuilding(data, t) {
  const errors = [];
  const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
  const nonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;
  const finiteNumber = (value) => typeof value === 'number' && Number.isFinite(value);
  const v = t.validation;

  if (!isObject(data)) return [v.root];
  if (!nonEmptyString(data.building)) errors.push(v.building);
  if (!Array.isArray(data.nodes)) errors.push(v.nodes);
  if (!Array.isArray(data.edges)) errors.push(v.edges);
  if (!isObject(data.initial_state)) errors.push(v.initial);
  if (!Array.isArray(data.nodes) || !Array.isArray(data.edges) || !isObject(data.initial_state)) return errors;

  if (data.nodes.length < 2 || data.nodes.length > 60) errors.push(v.nodeCount(data.nodes.length));
  if (data.edges.length < 1 || data.edges.length > 150) errors.push(v.edgeCount(data.edges.length));

  const nodeIds = new Set();
  const edgeIds = new Set();
  const nodeById = new Map();
  const edgeById = new Map();
  const edgePairSeen = new Set();
  let hasRoomOrJunction = false;
  let hasExit = false;

  data.nodes.forEach((node, index) => {
    const p = `nodes[${index}]`;
    if (!isObject(node)) { errors.push(v.object(p)); return; }
    if (!nonEmptyString(node.id)) errors.push(v.idEmpty(p));
    else if (nodeIds.has(node.id)) errors.push(v.duplicateNode(node.id));
    else { nodeIds.add(node.id); nodeById.set(node.id, node); }
    if (!nonEmptyString(node.label)) errors.push(v.labelEmpty(p));
    if (!VALID_NODE_TYPES.has(node.type)) errors.push(v.type(p));
    else {
      if (node.type === 'room' || node.type === 'junction') hasRoomOrJunction = true;
      if (node.type === 'exit') hasExit = true;
    }
    if (!finiteNumber(node.x) || !finiteNumber(node.y)) errors.push(v.coords(p));
  });

  if (!hasRoomOrJunction || !hasExit) errors.push(v.minNodes);

  data.edges.forEach((edge, index) => {
    const p = `edges[${index}]`;
    if (!isObject(edge)) { errors.push(v.object(p)); return; }
    if (!nonEmptyString(edge.id)) errors.push(v.idEmpty(p));
    else if (edgeIds.has(edge.id)) errors.push(v.duplicateEdge(edge.id));
    else { edgeIds.add(edge.id); edgeById.set(edge.id, edge); }

    const validFrom = nonEmptyString(edge.from) && nodeIds.has(edge.from);
    const validTo = nonEmptyString(edge.to) && nodeIds.has(edge.to);

    if (!validFrom) errors.push(v.from(p));
    if (!validTo) errors.push(v.to(p));

    if (validFrom && validTo && edge.from === edge.to) {
      errors.push(v.selfLoop(edge.from));
    }
    if (validFrom && validTo && edge.from !== edge.to) {
      const pair = edge.from < edge.to ? `${edge.from}-${edge.to}` : `${edge.to}-${edge.from}`;
      if (edgePairSeen.has(pair)) errors.push(v.duplicateEdgePair(edge.from, edge.to));
      else edgePairSeen.add(pair);
    }

    if (!Number.isInteger(edge.cost) || edge.cost <= 0) errors.push(v.cost(p));
  });

  const state = data.initial_state;
  const arrays = ['blocked_nodes', 'blocked_edges', 'closed_exits'];
  arrays.forEach((key) => { if (!Array.isArray(state[key])) errors.push(v.stateArray(key)); });
  if (errors.some((e) => arrays.some((key) => e === v.stateArray(key)))) return errors;

  const checkUnique = (items, label) => {
    const seen = new Set();
    items.forEach((id) => {
      if (typeof id !== 'string' || !id.trim()) errors.push(v.invalidId(label));
      else if (seen.has(id)) errors.push(v.duplicateHazard(id, label));
      else seen.add(id);
    });
  };
  checkUnique(state.blocked_nodes, 'blocked_nodes');
  checkUnique(state.blocked_edges, 'blocked_edges');
  checkUnique(state.closed_exits, 'closed_exits');

  state.blocked_nodes.forEach((id) => {
    const node = nodeById.get(id);
    if (!node) errors.push(v.missingBlockedNode(id));
    else if (!['room', 'junction'].includes(node.type)) errors.push(v.blockedNodeType(id));
  });
  state.blocked_edges.forEach((id) => { if (!edgeById.has(id)) errors.push(v.missingEdge(id)); });
  state.closed_exits.forEach((id) => {
    const node = nodeById.get(id);
    if (!node) errors.push(v.missingExit(id));
    else if (node.type !== 'exit') errors.push(v.closedExitType(id));
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
    sparkles: <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/>,
  };
  return <svg {...common}>{paths[name]}</svg>;
}

function cloneState(state) {
  return {
    blocked_nodes: [...(state?.blocked_nodes || [])],
    blocked_edges: [...(state?.blocked_edges || [])],
    closed_exits: [...(state?.closed_exits || [])],
  };
}

export function App() {
  const [lang, setLang] = useState('en');
  const [fileName, setFileName] = useState('building.json (Default Sample)');
  const [building, setBuilding] = useState(SAMPLE_BUILDING);
  const [originalInitialState, setOriginalInitialState] = useState(() => cloneState(SAMPLE_BUILDING.initial_state));
  const [currentState, setCurrentState] = useState(() => cloneState(SAMPLE_BUILDING.initial_state));
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(true);
  const [selectedStart, setSelectedStart] = useState('R1');
  const fileRef = useRef(null);
  const t = copy[lang];

  const reset = () => {
    if (!building || !originalInitialState) return;
    setCurrentState(cloneState(originalInitialState));
    setError(null);
  };

  const loadSample = (start = 'R1', blocked = []) => {
    setBuilding(SAMPLE_BUILDING);
    setOriginalInitialState(cloneState(SAMPLE_BUILDING.initial_state));
    const nextState = cloneState(SAMPLE_BUILDING.initial_state);
    if (blocked.length) nextState.blocked_nodes = [...blocked];
    setCurrentState(nextState);
    setSelectedStart(start);
    setFileName('building.json (Sample)');
    setSuccess(true);
    setError(null);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const scenario = params.get('scenario');
    if (scenario === 'blockC2') {
      loadSample('R1', ['C2']);
    } else if (scenario === 'baseline') {
      loadSample('R1', []);
    }
  }, []);

  const onFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null); setSuccess(false);
    try {
      const text = await file.text();
      let data;
      try { data = JSON.parse(text); }
      catch { throw new Error(t.validation.invalidJson); }
      const errors = validateBuilding(data, t);
      if (errors.length) {
        setError({ fileName: file.name, messages: errors });
        return;
      }
      setBuilding(data);
      setOriginalInitialState(cloneState(data.initial_state));
      setCurrentState(cloneState(data.initial_state));
      const firstAvailable = data.nodes.find((n) => (n.type === 'room' || n.type === 'junction') && !data.initial_state.blocked_nodes.includes(n.id));
      setSelectedStart(firstAvailable ? firstAvailable.id : data.nodes[0]?.id || '');
      setFileName(file.name);
      setSuccess(true);
    } catch (err) {
      setError({ fileName: file.name, messages: [err.message || t.validation.unreadable] });
    } finally {
      event.target.value = '';
    }
  };

  const routedBuilding = useMemo(() => (building && currentState ? { ...building, initial_state: currentState } : null), [building, currentState]);
  const routeResult = useMemo(() => (routedBuilding && selectedStart ? calculateCheapestExit(routedBuilding, selectedStart) : null), [routedBuilding, selectedStart]);
  const graph = useMemo(() => routedBuilding ? <BuildingGraph building={routedBuilding} selectedStart={selectedStart} routeResult={routeResult} onSelectStart={setSelectedStart} /> : null, [routedBuilding, selectedStart, routeResult]);
  const buildingName = building?.building || t.awaiting;

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-block"><div className="brand-mark"><Icon name="shield" size={20} /></div><div><div className="eyebrow">{t.eyebrow}</div><div className="brand-title">{t.title}</div></div></div>
        <div className="header-meta"><div className="building-slot"><span className="meta-label">{t.building}</span><span className="building-name">{buildingName}</span></div>
          <div className="header-actions"><button className="language-toggle" onClick={() => setLang((v) => v === 'en' ? 'bn' : 'en')} aria-label={t.languageAria}><span className={lang === 'en' ? 'active' : ''}>EN</span><span className="slash">/</span><span className={lang === 'bn' ? 'active' : ''}>বাং</span></button><button className="reset-button" onClick={reset} aria-label={t.resetAria} disabled={!building}><Icon name="rotate" size={16} /><span>{t.reset}</span></button></div>
        </div>
      </header>

      <main className="main-content">
        <section className="workspace-column">
          <div className="section-heading"><div><span className="section-kicker">01</span><h1>{t.workspace}</h1></div><span className="status-pill"><span className={`status-dot ${building ? 'loaded' : ''}`} />{building ? t.loaded : t.frontend}</span></div>
          <div className={`map-card ${building ? 'has-graph' : ''}`}>
            {!building ? <><div className="map-grid" aria-hidden="true" /><div className="map-empty"><div className="map-icon"><Icon name="map" size={28} /></div><h2>{t.workspaceHint}</h2><p>{t.importBody}</p><div className="empty-buttons-row"><button className="primary-button" onClick={() => fileRef.current?.click()}><Icon name="upload" size={17} />{t.choose}</button><button className="secondary-button" onClick={() => loadSample()}><Icon name="sparkles" size={17} />{t.loadSample}</button></div><div className="file-state">{t.noFile}</div></div></> : graph}
            <div className="map-corner-label">MAP / {building ? '01' : '00'}</div>
          </div>

          {error && <div className="message-card error-card" role="alert"><div className="message-icon"><Icon name="alert" size={17} /></div><div className="message-copy"><strong>{t.invalidFile}</strong><p>{t.validationFailed}</p><ul>{error.messages.slice(0, 8).map((message, i) => <li key={`${message}-${i}`}>{message}</li>)}</ul>{error.messages.length > 8 && <small>{t.moreErrors(error.messages.length - 8)}</small>}</div></div>}
          {success && <div className="message-card success-card" role="status"><div className="message-icon"><Icon name="check" size={17} /></div><div className="message-copy"><strong>{t.validFile}</strong><p>{t.mapLoaded}: <b>{fileName}</b></p></div></div>}

          <div className="bottom-grid">
            <RouteStatus t={t} result={routeResult} selectedStart={selectedStart} building={building} />
            <section className="legend-card panel-card"><div className="panel-title-row"><div><span className="section-kicker">03</span><h2>{t.legend}</h2></div></div><div className="legend-list"><LegendItem type="room" label={t.room}/><LegendItem type="junction" label={t.junction}/><LegendItem type="exit" label={t.exit}/><LegendItem type="blocked" label={t.blocked}/><LegendItem type="selected" label={t.selectedState}/></div></section>
          </div>
        </section>

        <aside className="control-column">
          <section className="import-card panel-card"><div className="panel-title-row"><div><span className="section-kicker">{t.importSection}</span><h2>{t.importTitle}</h2></div><div className="json-badge">JSON</div></div><p>{t.importBody}</p><button className="upload-zone" onClick={() => fileRef.current?.click()}><span className="upload-icon"><Icon name="upload" size={20}/></span><span className="upload-copy"><strong>{t.choose}</strong><small>.json</small></span><Icon name="chevron" size={17}/></button><input ref={fileRef} className="visually-hidden" type="file" accept="application/json,.json" onChange={onFileChange}/><div className={`file-status ${fileName ? 'is-loaded' : ''}`}>{fileName ? <><span className="file-check">✓</span>{fileName}</> : t.noFile}</div></section>

          <section className="summary-card panel-card"><div className="panel-title-row"><div><span className="section-kicker">{t.dataSection}</span><h2>{t.summary}</h2></div>{building && <span className="json-badge">{t.validBadge}</span>}</div>{building ? <div className="summary-grid"><SummaryStat label={t.nodes} value={building.nodes.length}/><SummaryStat label={t.corridors} value={building.edges.length}/><SummaryStat label={t.exits} value={building.nodes.filter((n) => n.type === 'exit').length}/></div> : <div className="summary-empty">{t.graphHint}</div>}</section>

          <section className="controls-card panel-card"><div className="panel-title-row"><div><span className="section-kicker">04</span><h2>{t.controls}</h2></div></div><div className="start-picker"><label htmlFor="start-location">{t.start}</label><select id="start-location" value={selectedStart} onChange={(event) => setSelectedStart(event.target.value)} disabled={!building}><option value="">{building ? t.chooseStart : t.startEmpty}</option>{building?.nodes.filter((node) => (node.type === 'room' || node.type === 'junction')).map((node) => <option key={node.id} value={node.id}>{node.label} ({node.id})</option>)}</select><p>{t.selectHint}</p></div>{building && currentState && <HazardControls building={building} state={currentState} setState={setCurrentState} t={t}/>}</section>
        </aside>
      </main>
    </div>
  );
}

function HazardControls({ building, state, setState, t }) {
  const toggle = (key, id) => setState((prev) => {
    const values = new Set(prev[key]);
    values.has(id) ? values.delete(id) : values.add(id);
    return { ...prev, [key]: [...values] };
  });
  return <div className="hazard-controls">
    <div className="hazard-group"><span className="control-label">{state.blocked_nodes.length ? t.unblockNodes : t.blockNodes}</span>{building.nodes.filter((n) => n.type !== 'exit').map((node) => <label key={node.id} className="hazard-option"><input type="checkbox" checked={state.blocked_nodes.includes(node.id)} onChange={() => toggle('blocked_nodes', node.id)}/><span>{node.label} ({node.id})</span></label>)}</div>
    <div className="hazard-group"><span className="control-label">{state.blocked_edges.length ? t.unblockEdges : t.blockEdges}</span>{building.edges.map((edge) => <label key={edge.id} className="hazard-option"><input type="checkbox" checked={state.blocked_edges.includes(edge.id)} onChange={() => toggle('blocked_edges', edge.id)}/><span>{edge.id}</span></label>)}</div>
    <div className="hazard-group"><span className="control-label">{state.closed_exits.length ? t.reopenExits : t.closeExits}</span>{building.nodes.filter((n) => n.type === 'exit').map((node) => <label key={node.id} className="hazard-option"><input type="checkbox" checked={state.closed_exits.includes(node.id)} onChange={() => toggle('closed_exits', node.id)}/><span>{node.label} ({node.id})</span></label>)}</div>
  </div>;
}

function RouteStatus({ t, result, selectedStart, building }) {
  const startNode = building?.nodes.find((node) => node.id === selectedStart);
  const state = !result ? 'idle' : result.status;
  const chip = state === 'route' ? t.routeChip : state === 'idle' ? t.idleChip : t.statusChip;
  return <section className="route-card panel-card">
    <div className="panel-title-row"><div><span className="section-kicker">02</span><h2>{t.route}</h2></div><span className={`neutral-chip route-chip ${state}`}>{chip}</span></div>
    {!result ? <div className="route-empty"><div className="route-line" /><div><strong>{t.routeEmpty}</strong><p>{t.routeHint}</p></div></div> : state === 'route' ? <div className="route-result">
      <div className="route-fact"><span>{t.starting}</span><strong>{startNode?.label || selectedStart} <em>({selectedStart})</em></strong></div>
      <div className="route-fact route-path-fact"><span>{t.route}</span><strong>{result.path.join(' → ')}</strong></div>
      <div className="route-fact"><span>{t.destination}</span><strong>{result.exitId}</strong></div>
      <div className="route-cost"><span>{t.totalCost}</span><strong>{result.cost}</strong></div>
    </div> : <div className="route-empty route-state"><div className="route-line" /><div><strong>{state === 'blocked-start' ? t.blockedStart : t.noRoute}</strong><p>{state === 'blocked-start' ? t.blockedStartHint : t.noRouteHint}</p></div></div>}
  </section>;
}

function BuildingGraph({ building, selectedStart, routeResult, onSelectStart }) {
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
  const routeEdges = routeResult?.status === 'route' ? routeResult.routeEdges : new Set();
  const selectable = (node) => (node.type === 'room' || node.type === 'junction') && !blockedNodes.has(node.id);

  return <div className="graph-wrap" aria-label={`${building.building}`}>
    <svg className="building-graph" viewBox={`0 0 ${viewWidth} ${viewHeight}`} role="img" aria-label={`${building.nodes.length} nodes, ${building.edges.length} corridors`} preserveAspectRatio="xMidYMid meet">
      <defs><filter id="nodeGlow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="2.2" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter><filter id="routeGlow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="2" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
      <g className="edge-layer">{building.edges.map((edge) => { const a = nodeMap.get(edge.from), b = nodeMap.get(edge.to); if (!a || !b) return null; const p1 = point(a), p2 = point(b); const blocked = blockedEdges.has(edge.id); const onRoute = routeEdges.has(edge.id); return <g key={edge.id} className={`edge${blocked ? ' blocked' : ''}${onRoute ? ' route-edge' : ''}`}><line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} filter={onRoute ? 'url(#routeGlow)' : undefined}/><g className="edge-cost"><rect x={(p1.x+p2.x)/2-14} y={(p1.y+p2.y)/2-9} width="28" height="18" rx="5"/><text x={(p1.x+p2.x)/2} y={(p1.y+p2.y)/2+3} textAnchor="middle">{edge.cost}</text></g></g>; })}</g>
      <g className="node-layer">{building.nodes.map((node) => { const p = point(node); const blocked = blockedNodes.has(node.id); const closed = node.type === 'exit' && closedExits.has(node.id); const selected = node.id === selectedStart; const stateClass = blocked || closed ? ' blocked' : ''; return <g key={node.id} className={`graph-node ${node.type}${stateClass}${selected ? ' selected' : ''}${selectable(node) ? ' selectable' : ''}`} transform={`translate(${p.x} ${p.y})`} filter={blocked || closed ? undefined : 'url(#nodeGlow)'} onClick={() => selectable(node) && onSelectStart(node.id)} role={selectable(node) ? 'button' : undefined} aria-label={selectable(node) ? `Select ${node.label} as starting location` : undefined} tabIndex={selectable(node) ? 0 : undefined} onKeyDown={(event) => { if (selectable(node) && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); onSelectStart(node.id); } }}><circle className="node-halo" r={node.type === 'junction' ? 10 : 11}/><circle className="node-shape" r={node.type === 'junction' ? 6 : 7}/><text className="node-label" x="10" y="-10">{node.label}</text><text className="node-id" x="10" y="4">{node.id}</text></g>; })}</g>
    </svg>
    <div className="graph-caption"><span>{building.building}</span><span>{building.nodes.length} nodes · {building.edges.length} corridors</span></div>
  </div>;
}

function SummaryStat({ label, value }) { return <div className="summary-stat"><strong>{value}</strong><span>{label}</span></div>; }
function LegendItem({ type, label }) { return <div className="legend-item"><span className={`legend-symbol ${type}`}/><span>{label}</span></div>; }

createRoot(document.getElementById('root')).render(<App/>);
