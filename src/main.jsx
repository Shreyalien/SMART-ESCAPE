import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { validateBuilding } from './validation.js';
import { calculateEvacuationRoute } from './routing.js';
import { translations } from './translations.js';
import './styles.css';

// Pre-bundled official sample building
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

function Icon({ name, size = 18 }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
  };
  const paths = {
    rotate: (
      <>
        <path d="M3 12a9 9 0 0 1 15.4-6.3L21 8" />
        <path d="M21 3v5h-5" />
        <path d="M21 12a9 9 0 0 1-15.4 6.3L3 16" />
        <path d="M3 21v-5h5" />
      </>
    ),
    upload: (
      <>
        <path d="M12 16V4" />
        <path d="m7 9 5-5 5 5" />
        <path d="M5 20h14" />
      </>
    ),
    download: (
      <>
        <path d="M12 4v12" />
        <path d="m7 11 5 5 5-5" />
        <path d="M5 20h14" />
      </>
    ),
    map: (
      <>
        <path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3Z" />
        <path d="M9 3v15" />
        <path d="M15 6v15" />
      </>
    ),
    chevron: <path d="m9 18 6-6-6-6" />,
    shield: <path d="M12 3 5 6v5c0 4.6 2.9 8.1 7 10 4.1-1.9 7-5.4 7-10V6l-7-3Z" />,
    alert: (
      <>
        <path d="M12 3 2.8 20h18.4L12 3Z" />
        <path d="M12 9v5" />
        <path d="M12 17h.01" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    flame: <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />,
    play: <polygon points="5 3 19 12 5 21 5 3" fill="currentColor" />,
    pause: (
      <>
        <rect x="6" y="4" width="4" height="16" fill="currentColor" />
        <rect x="14" y="4" width="4" height="16" fill="currentColor" />
      </>
    ),
    step: (
      <>
        <polygon points="5 4 15 12 5 20 5 4" fill="currentColor" />
        <line x1="19" y1="5" x2="19" y2="19" strokeWidth="2.5" />
      </>
    ),
    contrast: (
      <>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 2a10 10 0 0 1 0 20Z" fill="currentColor" />
      </>
    ),
    sparkles: (
      <>
        <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
      </>
    ),
    navArrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
  };
  return <svg {...common}>{paths[name]}</svg>;
}

export function App() {
  const [lang, setLang] = useState('en');
  const [highContrast, setHighContrast] = useState(false);
  const [building, setBuilding] = useState(SAMPLE_BUILDING);
  const [fileName, setFileName] = useState('building.json (Default Sample)');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(true);

  // Dynamic state
  const [startId, setStartId] = useState('R1');
  const [blockedNodes, setBlockedNodes] = useState(() => new Set(SAMPLE_BUILDING.initial_state.blocked_nodes));
  const [blockedEdges, setBlockedEdges] = useState(() => new Set(SAMPLE_BUILDING.initial_state.blocked_edges));
  const [closedExits, setClosedExits] = useState(() => new Set(SAMPLE_BUILDING.initial_state.closed_exits));

  // Walkthrough animation playback
  const [playbackStep, setPlaybackStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const fileRef = useRef(null);
  const svgRef = useRef(null);
  const t = translations[lang];

  // Calculate route reactively
  const routeResult = useMemo(() => {
    if (!building) return null;
    return calculateEvacuationRoute({
      building,
      startId,
      blockedNodes,
      blockedEdges,
      closedExits,
    });
  }, [building, startId, blockedNodes, blockedEdges, closedExits]);

  const activePath = routeResult?.route?.path || [];
  const activeEdgeIds = useMemo(() => new Set(routeResult?.route?.edges || []), [routeResult]);

  // Walkthrough playback effect
  useEffect(() => {
    setPlaybackStep(0);
    setIsPlaying(false);
  }, [routeResult?.route]);

  // Support ?scenario= query param for test automation and screenshots
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const scenario = params.get('scenario');
    if (scenario) {
      applyScenario(scenario);
    }
  }, []);

  useEffect(() => {
    let timer;
    if (isPlaying && activePath.length > 1) {
      timer = setInterval(() => {
        setPlaybackStep((prev) => {
          if (prev >= activePath.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 750);
    }
    return () => clearInterval(timer);
  }, [isPlaying, activePath]);

  // Reset to initial_state of current building
  const handleResetHazards = useCallback(() => {
    if (!building) return;
    setBlockedNodes(new Set(building.initial_state.blocked_nodes || []));
    setBlockedEdges(new Set(building.initial_state.blocked_edges || []));
    setClosedExits(new Set(building.initial_state.closed_exits || []));
  }, [building]);

  // Full reset (clear building)
  const handleFullReset = useCallback(() => {
    setBuilding(null);
    setFileName('');
    setStartId('');
    setBlockedNodes(new Set());
    setBlockedEdges(new Set());
    setClosedExits(new Set());
    setError(null);
    setSuccess(false);
    if (fileRef.current) fileRef.current.value = '';
  }, []);

  // Load official sample
  const handleLoadSample = useCallback(() => {
    setBuilding(SAMPLE_BUILDING);
    setFileName('building.json (AI DevFest Complex)');
    setStartId('R1');
    setBlockedNodes(new Set(SAMPLE_BUILDING.initial_state.blocked_nodes));
    setBlockedEdges(new Set(SAMPLE_BUILDING.initial_state.blocked_edges));
    setClosedExits(new Set(SAMPLE_BUILDING.initial_state.closed_exits));
    setError(null);
    setSuccess(true);
  }, []);

  // File import handler
  const onFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);
    setSuccess(false);
    try {
      const text = await file.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error('The selected file is not valid JSON. / নির্বাচিত ফাইলটি বৈধ JSON নয়।');
      }

      const errors = validateBuilding(data);
      if (errors.length) {
        setError({ fileName: file.name, messages: errors });
        return;
      }

      setBuilding(data);
      setFileName(file.name);
      setBlockedNodes(new Set(data.initial_state.blocked_nodes || []));
      setBlockedEdges(new Set(data.initial_state.blocked_edges || []));
      setClosedExits(new Set(data.initial_state.closed_exits || []));

      // Pick an initial start node (first available unblocked room or junction)
      const firstAvailable = data.nodes.find(
        (n) =>
          (n.type === 'room' || n.type === 'junction') &&
          !data.initial_state.blocked_nodes?.includes(n.id)
      );
      setStartId(firstAvailable ? firstAvailable.id : data.nodes[0]?.id || '');
      setSuccess(true);
    } catch (err) {
      setError({
        fileName: file.name,
        messages: [err.message || 'Unable to read the selected file. / ফাইলটি পড়া যায়নি।'],
      });
    } finally {
      event.target.value = '';
    }
  };

  // Hazard toggles
  const toggleNodeHazard = (nodeId) => {
    if (!building) return;
    const node = building.nodes.find((n) => n.id === nodeId);
    if (!node) return;

    if (node.type === 'exit') {
      setClosedExits((prev) => {
        const next = new Set(prev);
        if (next.has(nodeId)) next.delete(nodeId);
        else next.add(nodeId);
        return next;
      });
    } else {
      setBlockedNodes((prev) => {
        const next = new Set(prev);
        if (next.has(nodeId)) next.delete(nodeId);
        else next.add(nodeId);
        return next;
      });
    }
  };

  const toggleEdgeHazard = (edgeId) => {
    setBlockedEdges((prev) => {
      const next = new Set(prev);
      if (next.has(edgeId)) next.delete(edgeId);
      else next.add(edgeId);
      return next;
    });
  };

  // Node click handler: If right click or modifier key, toggle hazard; if regular click, select start or toggle hazard if exit
  const handleNodeClick = (node, e) => {
    if (e.shiftKey || e.altKey) {
      toggleNodeHazard(node.id);
      return;
    }
    if (node.type === 'exit') {
      toggleNodeHazard(node.id);
    } else {
      setStartId(node.id);
    }
  };

  // Quick scenario presets
  const applyScenario = (type) => {
    if (!building) handleLoadSample();
    switch (type) {
      case 'baseline':
        setStartId('R1');
        handleResetHazards();
        break;
      case 'blockC2':
        setStartId('R1');
        setBlockedNodes(new Set(['C2']));
        setBlockedEdges(new Set());
        setClosedExits(new Set());
        break;
      case 'closeExits':
        setStartId('R1');
        setBlockedNodes(new Set());
        setBlockedEdges(new Set());
        setClosedExits(new Set(['E1', 'E2']));
        break;
      case 'startR2':
        setStartId('R2');
        handleResetHazards();
        break;
      case 'blockStart':
        setStartId('R1');
        setBlockedNodes(new Set(['R1']));
        break;
      default:
        break;
    }
  };

  // PNG Export
  const exportPngMap = () => {
    const svg = svgRef.current;
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      canvas.width = svg.clientWidth * 2 || 1200;
      canvas.height = svg.clientHeight * 2 || 800;
      ctx.fillStyle = highContrast ? '#000000' : '#09111d';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      const a = document.createElement('a');
      a.download = `smart-escape-${startId || 'map'}.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
    };
    img.src = url;
  };

  // JSON Scenario Export
  const exportJsonScenario = () => {
    if (!building) return;
    const scenarioData = {
      ...building,
      initial_state: {
        blocked_nodes: Array.from(blockedNodes),
        blocked_edges: Array.from(blockedEdges),
        closed_exits: Array.from(closedExits),
      },
      current_start: startId,
    };
    const blob = new Blob([JSON.stringify(scenarioData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.download = `scenario-${building.building.replace(/\s+/g, '_').toLowerCase()}.json`;
    a.href = url;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`app-shell ${highContrast ? 'high-contrast-mode' : ''}`}>
      {/* Top Navigation */}
      <header className="topbar">
        <div className="brand-block">
          <div className="brand-mark">
            <Icon name="shield" size={20} />
          </div>
          <div>
            <div className="eyebrow">{t.eyebrow}</div>
            <div className="brand-title">{t.title}</div>
          </div>
        </div>

        <div className="header-meta">
          <div className="building-slot">
            <span className="meta-label">{t.building}</span>
            <span className="building-name" title={building?.building || t.awaiting}>
              {building?.building || t.awaiting}
            </span>
          </div>

          <div className="header-actions">
            <button
              className="icon-button"
              onClick={() => setHighContrast((v) => !v)}
              title={highContrast ? t.normalContrast : t.highContrast}
              aria-label="Toggle High Contrast"
            >
              <Icon name="contrast" size={16} />
              <span className="button-text">{highContrast ? 'HC' : 'NORM'}</span>
            </button>

            <button
              className="language-toggle"
              onClick={() => setLang((v) => (v === 'en' ? 'bn' : 'en'))}
              aria-label="Switch Language"
            >
              <span className={lang === 'en' ? 'active' : ''}>EN</span>
              <span className="slash">/</span>
              <span className={lang === 'bn' ? 'active' : ''}>বাং</span>
            </button>

            <button
              className="reset-button"
              onClick={handleResetHazards}
              title={t.resetTooltip}
              aria-label={t.reset}
            >
              <Icon name="rotate" size={15} />
              <span>{t.reset}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="main-content">
        {/* Left Column: Interactive Map & Route Display */}
        <section className="workspace-column">
          <div className="section-heading">
            <div>
              <span className="section-kicker">01</span>
              <h1>{t.workspace}</h1>
              <p className="section-sub">{t.workspaceSubtitle}</p>
            </div>
            <div className="workspace-header-actions">
              <span className="status-pill">
                <span className={`status-dot ${building ? 'loaded' : ''}`} />
                {building ? t.loadedStatus : t.idleStatus}
              </span>
              {building && (
                <>
                  <button className="small-action-btn" onClick={exportPngMap} title={t.exportPng}>
                    <Icon name="download" size={14} />
                    <span>PNG</span>
                  </button>
                  <button className="small-action-btn" onClick={exportJsonScenario} title={t.exportJson}>
                    <Icon name="download" size={14} />
                    <span>JSON</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Map Card */}
          <div className={`map-card ${building ? 'has-graph' : ''}`}>
            {!building ? (
              <>
                <div className="map-grid" aria-hidden="true" />
                <div className="map-empty">
                  <div className="map-icon">
                    <Icon name="map" size={28} />
                  </div>
                  <h2>{t.workspaceHint}</h2>
                  <p>{t.importBody}</p>
                  <div className="empty-buttons-row">
                    <button className="primary-button" onClick={() => fileRef.current?.click()}>
                      <Icon name="upload" size={17} />
                      {t.choose}
                    </button>
                    <button className="secondary-button" onClick={handleLoadSample}>
                      <Icon name="sparkles" size={17} />
                      {t.loadSample}
                    </button>
                  </div>
                  <div className="file-state">{t.noFile}</div>
                </div>
              </>
            ) : (
              <BuildingGraph
                ref={svgRef}
                building={building}
                startId={startId}
                blockedNodes={blockedNodes}
                blockedEdges={blockedEdges}
                closedExits={closedExits}
                activePath={activePath}
                activeEdgeIds={activeEdgeIds}
                playbackStep={playbackStep}
                onNodeClick={handleNodeClick}
                onEdgeClick={toggleEdgeHazard}
              />
            )}
            <div className="map-corner-label">SMART-ESCAPE / REALTIME PATHFINDER</div>
          </div>

          {/* Validation & Status Banners */}
          {error && (
            <div className="message-card error-card" role="alert">
              <div className="message-icon">
                <Icon name="alert" size={18} />
              </div>
              <div className="message-copy">
                <strong>{t.invalidFile}</strong>
                <p>{t.validationFailed}</p>
                <ul>
                  {error.messages.slice(0, 8).map((message, i) => (
                    <li key={`${message}-${i}`}>{message}</li>
                  ))}
                </ul>
                {error.messages.length > 8 && (
                  <small>+ {error.messages.length - 8} more validation errors</small>
                )}
              </div>
            </div>
          )}

          {/* Failure Case Warnings according to Section 3.2 */}
          {building && routeResult?.status === 'START_BLOCKED' && (
            <div className="message-card warning-card pulse-hazard" role="alert">
              <div className="message-icon">
                <Icon name="flame" size={20} />
              </div>
              <div className="message-copy">
                <strong className="danger-text">{t.startBlocked}</strong>
                <p>
                  {lang === 'en'
                    ? `The chosen starting point "${startId}" is currently blocked by emergency hazards. Unblock this node or select another starting location.`
                    : `নির্বাচিত শুরুর স্থান "${startId}" বর্তমানে ঝুঁকিপূর্ণ কারণে অবরুদ্ধ। নোডটি আনব্লক করুন অথবা অন্য শুরুর স্থান নির্বাচন করুন।`}
                </p>
              </div>
            </div>
          )}

          {building && routeResult?.status === 'NO_ROUTE' && (
            <div className="message-card warning-card" role="alert">
              <div className="message-icon">
                <Icon name="alert" size={20} />
              </div>
              <div className="message-copy">
                <strong className="danger-text">{t.noRouteAvailable}</strong>
                <p>
                  {lang === 'en'
                    ? 'All reachable escape paths to open exits are obstructed by active hazards or closed exits.'
                    : 'উন্মুক্ত এক্সিট পর্যন্ত পৌঁছানোর সব পথ সক্রিয় ঝুঁকি বা বন্ধ এক্সিটের কারণে অবরুদ্ধ।'}
                </p>
              </div>
            </div>
          )}

          {/* Bottom Grid: Route Details & Legend */}
          <div className="bottom-grid">
            {/* Route Status Card */}
            <section className="route-card panel-card">
              <div className="panel-title-row">
                <div>
                  <span className="section-kicker">02</span>
                  <h2>{t.route}</h2>
                </div>
                <span className={`neutral-chip ${routeResult?.status === 'SUCCESS' ? 'chip-success' : 'chip-idle'}`}>
                  {routeResult?.status === 'SUCCESS'
                    ? 'EVACUATION PATH ACTIVE'
                    : routeResult?.status || 'IDLE'}
                </span>
              </div>

              {routeResult?.status === 'SUCCESS' ? (
                <div className="route-details">
                  <div className="route-metrics">
                    <div className="metric-box">
                      <span className="metric-label">{t.routeCost}</span>
                      <strong className="metric-val accent-text">{routeResult.route.cost}</strong>
                    </div>
                    <div className="metric-box">
                      <span className="metric-label">{t.targetExit}</span>
                      <strong className="metric-val">{routeResult.route.exitId}</strong>
                    </div>
                    <div className="metric-box">
                      <span className="metric-label">{t.openExits}</span>
                      <span className="metric-val-sm">
                        {building.nodes.filter((n) => n.type === 'exit' && !closedExits.has(n.id)).length} /{' '}
                        {building.nodes.filter((n) => n.type === 'exit').length}
                      </span>
                    </div>
                  </div>

                  <div className="sequence-box">
                    <span className="sequence-label">{t.pathSequence}:</span>
                    <div className="sequence-flow">
                      {routeResult.route.path.map((nodeId, idx) => {
                        const isStart = idx === 0;
                        const isEnd = idx === routeResult.route.path.length - 1;
                        return (
                          <React.Fragment key={nodeId}>
                            <span
                              className={`sequence-node ${
                                isStart ? 'seq-start' : isEnd ? 'seq-exit' : 'seq-mid'
                              } ${playbackStep === idx ? 'seq-active-step' : ''}`}
                            >
                              {nodeId}
                            </span>
                            {!isEnd && <span className="sequence-arrow">→</span>}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </div>

                  {/* Walkthrough Controls */}
                  <div className="playback-controls-bar">
                    <div className="playback-title">
                      <Icon name="sparkles" size={14} />
                      <span>{t.playbackTitle}</span>
                    </div>
                    <div className="playback-buttons">
                      <button
                        className="play-btn"
                        onClick={() => setIsPlaying((p) => !p)}
                        title={isPlaying ? t.pause : t.play}
                      >
                        <Icon name={isPlaying ? 'pause' : 'play'} size={14} />
                        <span>{isPlaying ? t.pause : t.play}</span>
                      </button>
                      <button
                        className="step-btn"
                        onClick={() => {
                          setIsPlaying(false);
                          setPlaybackStep((p) => (p + 1) % activePath.length);
                        }}
                        title={t.step}
                      >
                        <Icon name="step" size={14} />
                        <span>{t.step}</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="route-empty">
                  <div className="route-line" />
                  <div>
                    <strong>
                      {routeResult?.status === 'START_BLOCKED'
                        ? t.startBlocked
                        : routeResult?.status === 'NO_ROUTE'
                        ? t.noRouteAvailable
                        : t.routeEmpty}
                    </strong>
                    <p>
                      {building
                        ? t.selectStartHint
                        : t.graphHint}
                    </p>
                  </div>
                </div>
              )}
            </section>

            {/* Legend Card */}
            <section className="legend-card panel-card">
              <div className="panel-title-row">
                <div>
                  <span className="section-kicker">03</span>
                  <h2>{t.legend}</h2>
                </div>
              </div>
              <div className="legend-list">
                <LegendItem type="room" label={t.room} />
                <LegendItem type="junction" label={t.junction} />
                <LegendItem type="exit" label={t.exit} />
                <LegendItem type="blocked" label={t.blockedNode} />
                <LegendItem type="closed" label={t.closedExit} />
                <LegendItem type="active-path" label={t.activePath} />
                <LegendItem type="selected" label={t.selectedStart} />
              </div>
              <div className="hint-footer">
                <small>💡 {t.clickToToggle}</small>
              </div>
            </section>
          </div>
        </section>

        {/* Right Column: Controls, Hazards & Official Test Presets */}
        <aside className="control-column">
          {/* Official Test Scenarios Preset Box */}
          <section className="panel-card scenarios-panel">
            <div className="panel-title-row">
              <div>
                <span className="section-kicker">TESTS</span>
                <h2>{t.quickScenarios}</h2>
              </div>
            </div>
            <div className="scenarios-grid">
              <button
                className={`scenario-btn ${startId === 'R1' && blockedNodes.size === 0 && closedExits.size === 0 ? 'active' : ''}`}
                onClick={() => applyScenario('baseline')}
              >
                {t.scenarioBaseline}
              </button>
              <button
                className={`scenario-btn ${blockedNodes.has('C2') ? 'active' : ''}`}
                onClick={() => applyScenario('blockC2')}
              >
                {t.scenarioBlockC2}
              </button>
              <button
                className={`scenario-btn ${closedExits.has('E1') && closedExits.has('E2') ? 'active' : ''}`}
                onClick={() => applyScenario('closeExits')}
              >
                {t.scenarioCloseExits}
              </button>
              <button
                className={`scenario-btn ${startId === 'R2' && blockedNodes.size === 0 ? 'active' : ''}`}
                onClick={() => applyScenario('startR2')}
              >
                {t.scenarioStartR2}
              </button>
              <button
                className={`scenario-btn ${startId === 'R1' && blockedNodes.has('R1') ? 'active' : ''}`}
                onClick={() => applyScenario('blockStart')}
              >
                {t.scenarioBlockStart}
              </button>
            </div>
          </section>

          {/* Import JSON Box */}
          <section className="import-card panel-card">
            <div className="panel-title-row">
              <div>
                <span className="section-kicker">DATA</span>
                <h2>{t.importTitle}</h2>
              </div>
              <div className="json-badge">JSON</div>
            </div>
            <p>{t.importBody}</p>

            <button className="upload-zone" onClick={() => fileRef.current?.click()}>
              <span className="upload-icon">
                <Icon name="upload" size={20} />
              </span>
              <span className="upload-copy">
                <strong>{t.choose}</strong>
                <small>.json (2-60 nodes, 1-150 edges)</small>
              </span>
              <Icon name="chevron" size={17} />
            </button>
            <input
              ref={fileRef}
              className="visually-hidden"
              type="file"
              accept="application/json,.json"
              onChange={onFileChange}
            />

            <button className="secondary-button full-width-btn" onClick={handleLoadSample}>
              <Icon name="sparkles" size={15} />
              <span>{t.loadSample}</span>
            </button>

            <div className={`file-status ${fileName ? 'is-loaded' : ''}`}>
              {fileName ? (
                <>
                  <span className="file-check">✓</span>
                  {fileName}
                </>
              ) : (
                t.noFile
              )}
            </div>
          </section>

          {/* Start Location Selector & Controls */}
          {building && (
            <section className="controls-card panel-card">
              <div className="panel-title-row">
                <div>
                  <span className="section-kicker">04</span>
                  <h2>{t.controls}</h2>
                </div>
              </div>

              <div className="control-group">
                <label className="control-label" htmlFor="start-selector">
                  {t.startLocation}
                </label>
                <select
                  id="start-selector"
                  className="control-select"
                  value={startId}
                  onChange={(e) => setStartId(e.target.value)}
                >
                  <option value="" disabled>
                    -- {t.noStartSelected} --
                  </option>
                  {building.nodes
                    .filter((n) => n.type === 'room' || n.type === 'junction')
                    .map((n) => {
                      const isBlocked = blockedNodes.has(n.id);
                      return (
                        <option key={n.id} value={n.id}>
                          {n.id} ({n.label}) [{n.type}] {isBlocked ? '⚠️ BLOCKED' : ''}
                        </option>
                      );
                    })}
                </select>
              </div>

              {/* Hazard Management List */}
              <div className="hazard-section">
                <div className="hazard-header">
                  <span className="control-label">{t.hazards}</span>
                  <button className="text-reset-btn" onClick={handleResetHazards}>
                    {t.reset}
                  </button>
                </div>
                <p className="hazard-hint-text">{t.hazardHint}</p>

                <div className="hazard-toggle-pills">
                  {/* Nodes list */}
                  {building.nodes.map((node) => {
                    const isExit = node.type === 'exit';
                    const isHazard = isExit ? closedExits.has(node.id) : blockedNodes.has(node.id);
                    return (
                      <button
                        key={node.id}
                        className={`hazard-pill ${isHazard ? 'pill-hazard' : 'pill-normal'} ${
                          node.id === startId ? 'pill-current-start' : ''
                        }`}
                        onClick={() => toggleNodeHazard(node.id)}
                        title={`Toggle ${node.label}`}
                      >
                        <span className="hazard-pill-id">{node.id}</span>
                        {isHazard && <span className="hazard-pill-icon">🔥</span>}
                      </button>
                    );
                  })}
                </div>

                {/* Corridor list */}
                <span className="control-label mt-8">{t.corridors}</span>
                <div className="hazard-toggle-pills">
                  {building.edges.map((edge) => {
                    const isBlocked = blockedEdges.has(edge.id);
                    return (
                      <button
                        key={edge.id}
                        className={`hazard-pill ${isBlocked ? 'pill-hazard' : 'pill-normal'}`}
                        onClick={() => toggleEdgeHazard(edge.id)}
                        title={`Corridor ${edge.from} ↔ ${edge.to} (cost ${edge.cost})`}
                      >
                        <span className="hazard-pill-id">{edge.from}↔{edge.to}</span>
                        <small className="cost-tag">c:{edge.cost}</small>
                        {isBlocked && <span className="hazard-pill-icon">⛔</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>
          )}

          {/* Dataset Summary */}
          <section className="summary-card panel-card">
            <div className="panel-title-row">
              <div>
                <span className="section-kicker">STATS</span>
                <h2>{t.summary}</h2>
              </div>
              {building && <span className="json-badge">VALID</span>}
            </div>
            {building ? (
              <div className="summary-grid">
                <SummaryStat label={t.nodes} value={building.nodes.length} />
                <SummaryStat label={t.corridors} value={building.edges.length} />
                <SummaryStat
                  label={t.exits}
                  value={building.nodes.filter((n) => n.type === 'exit').length}
                />
                <SummaryStat
                  label={t.blockedHazards}
                  value={blockedNodes.size + blockedEdges.size + closedExits.size}
                />
              </div>
            ) : (
              <div className="summary-empty">{t.graphHint}</div>
            )}
          </section>
        </aside>
      </main>
    </div>
  );
}

const BuildingGraph = React.forwardRef(function BuildingGraph(
  {
    building,
    startId,
    blockedNodes,
    blockedEdges,
    closedExits,
    activePath,
    activeEdgeIds,
    playbackStep,
    onNodeClick,
    onEdgeClick,
  },
  ref
) {
  const xs = building.nodes.map((n) => n.x);
  const ys = building.nodes.map((n) => n.y);
  const minX = Math.min(...xs),
    maxX = Math.max(...xs),
    minY = Math.min(...ys),
    maxY = Math.max(...ys);

  const width = Math.max(maxX - minX, 1);
  const height = Math.max(maxY - minY, 1);
  const pad = Math.max(Math.max(width, height) * 0.12, 45);
  const viewWidth = width + pad * 2;
  const viewHeight = height + pad * 2;

  // Invert y so traditional coordinates render intuitively
  const point = (node) => ({
    x: node.x - minX + pad,
    y: maxY - node.y + pad,
  });

  const nodeMap = new Map(building.nodes.map((n) => [n.id, n]));

  // Walkthrough avatar coordinate
  const currentPlaybackNodeId = activePath[playbackStep];
  const playbackNode = currentPlaybackNodeId ? nodeMap.get(currentPlaybackNodeId) : null;
  const playbackPoint = playbackNode ? point(playbackNode) : null;

  return (
    <div className="graph-wrap" aria-label={`Building graph for ${building.building}`}>
      <svg
        ref={ref}
        className="building-graph"
        viewBox={`0 0 ${viewWidth} ${viewHeight}`}
        role="img"
        aria-label={`Building graph: ${building.nodes.length} nodes and ${building.edges.length} corridors`}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <filter id="nodeGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="routeGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Edge Layer */}
        <g className="edge-layer">
          {building.edges.map((edge) => {
            const a = nodeMap.get(edge.from);
            const b = nodeMap.get(edge.to);
            if (!a || !b) return null;
            const p1 = point(a);
            const p2 = point(b);
            const isBlocked = blockedEdges.has(edge.id);
            const isIncidentBlocked =
              blockedNodes.has(edge.from) ||
              blockedNodes.has(edge.to) ||
              (a.type === 'exit' && closedExits.has(a.id)) ||
              (b.type === 'exit' && closedExits.has(b.id));
            const isActive = activeEdgeIds.has(edge.id);

            let edgeClass = 'edge';
            if (isBlocked || isIncidentBlocked) edgeClass += ' blocked';
            if (isActive) edgeClass += ' active-path-edge';

            return (
              <g
                key={edge.id}
                className={edgeClass}
                onClick={() => onEdgeClick(edge.id)}
                style={{ cursor: 'pointer' }}
              >
                {/* Wider invisible stroke for easy clicking */}
                <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} className="edge-hitbox" />
                {/* Active path glow line */}
                {isActive && (
                  <line
                    x1={p1.x}
                    y1={p1.y}
                    x2={p2.x}
                    y2={p2.y}
                    className="edge-glow-line"
                    filter="url(#routeGlow)"
                  />
                )}
                {/* Visible edge line */}
                <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} className="edge-line" />
                {/* Edge cost badge */}
                <g className="edge-cost">
                  <rect
                    x={(p1.x + p2.x) / 2 - 14}
                    y={(p1.y + p2.y) / 2 - 9}
                    width="28"
                    height="18"
                    rx="5"
                  />
                  <text x={(p1.x + p2.x) / 2} y={(p1.y + p2.y) / 2 + 3} textAnchor="middle">
                    {edge.cost}
                  </text>
                </g>
              </g>
            );
          })}
        </g>

        {/* Node Layer */}
        <g className="node-layer">
          {building.nodes.map((node) => {
            const p = point(node);
            const isBlocked = blockedNodes.has(node.id);
            const isClosed = node.type === 'exit' && closedExits.has(node.id);
            const isStart = node.id === startId;
            const isInPath = activePath.includes(node.id);
            const isTargetExit = activePath.length > 0 && activePath[activePath.length - 1] === node.id;

            let nodeClass = `graph-node ${node.type}`;
            if (isBlocked || isClosed) nodeClass += ' blocked';
            if (isStart) nodeClass += ' is-start';
            if (isInPath) nodeClass += ' in-route';
            if (isTargetExit) nodeClass += ' is-target-exit';

            const radius = node.type === 'junction' ? 7 : 9;

            return (
              <g
                key={node.id}
                className={nodeClass}
                transform={`translate(${p.x} ${p.y})`}
                onClick={(e) => onNodeClick(node, e)}
                style={{ cursor: 'pointer' }}
              >
                {/* Halo */}
                <circle
                  className="node-halo"
                  r={radius + (isStart || isTargetExit ? 7 : 4)}
                />

                {/* Main Node Body */}
                <circle
                  className="node-shape"
                  r={radius}
                  filter={isInPath ? 'url(#nodeGlow)' : undefined}
                />

                {/* Marker Pin for Start Node */}
                {isStart && (
                  <g className="start-pin-indicator">
                    <circle r={radius + 9} className="start-pulse-ring" />
                    <text y={-radius - 12} textAnchor="middle" className="start-badge-text">
                      START
                    </text>
                  </g>
                )}

                {/* Marker Pin for Target Exit */}
                {isTargetExit && (
                  <g className="target-exit-indicator">
                    <circle r={radius + 9} className="exit-pulse-ring" />
                    <text y={-radius - 12} textAnchor="middle" className="exit-badge-text">
                      ESCAPE
                    </text>
                  </g>
                )}

                {/* Hazard indicator */}
                {(isBlocked || isClosed) && (
                  <g className="hazard-x">
                    <line x1="-5" y1="-5" x2="5" y2="5" stroke="#ff4d4f" strokeWidth="2" />
                    <line x1="5" y1="-5" x2="-5" y2="5" stroke="#ff4d4f" strokeWidth="2" />
                  </g>
                )}

                {/* Label & ID */}
                <text className="node-label" x="12" y="-9">
                  {node.label}
                </text>
                <text className="node-id" x="12" y="6">
                  {node.id}
                </text>
              </g>
            );
          })}
        </g>

        {/* Walkthrough Animated Marker */}
        {playbackPoint && (
          <g
            className="playback-avatar-marker"
            transform={`translate(${playbackPoint.x} ${playbackPoint.y})`}
          >
            <circle r="14" className="playback-ring" />
            <circle r="6" className="playback-dot" />
          </g>
        )}
      </svg>

      <div className="graph-caption">
        <span>{building.building}</span>
        <span>
          {building.nodes.length} nodes · {building.edges.length} corridors
        </span>
      </div>
    </div>
  );
});

function SummaryStat({ label, value }) {
  return (
    <div className="summary-stat">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function LegendItem({ type, label }) {
  return (
    <div className="legend-item">
      <span className={`legend-symbol ${type}`} />
      <span>{label}</span>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
