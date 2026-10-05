/**
 * Smart Escape - Input Validation Module
 * Adheres strictly to Section 3.1 constraints:
 * - 2-60 nodes and 1-150 undirected edges
 * - At least one room/junction and at least one exit
 * - Case-sensitive IDs
 * - No self-loops (edge.from === edge.to)
 * - No repeated node pairs (undirected multi-edges)
 * - Category consistency for initial_state (blocked_nodes are room/junction; closed_exits are exits)
 * - Disconnected graphs are valid
 * - Clear error messages in both English and Bangla
 */

const VALID_NODE_TYPES = new Set(['room', 'junction', 'exit']);

export function validateBuilding(data) {
  const errors = [];
  const isObject = (val) => val !== null && typeof val === 'object' && !Array.isArray(val);
  const nonEmptyString = (val) => typeof val === 'string' && val.trim().length > 0;
  const finiteNumber = (val) => typeof val === 'number' && Number.isFinite(val);

  if (!isObject(data)) {
    return ['Root JSON value must be an object. / মূল JSON একটি object হতে হবে।'];
  }

  if (!nonEmptyString(data.building)) {
    errors.push('building must be a non-empty string. / building একটি খালি নয় এমন string হতে হবে।');
  }

  if (!Array.isArray(data.nodes)) {
    errors.push('nodes must be an array. / nodes একটি array হতে হবে।');
  }

  if (!Array.isArray(data.edges)) {
    errors.push('edges must be an array. / edges একটি array হতে হবে।');
  }

  if (!isObject(data.initial_state)) {
    errors.push('initial_state must be an object. / initial_state একটি object হতে হবে।');
  }

  if (!Array.isArray(data.nodes) || !Array.isArray(data.edges) || !isObject(data.initial_state)) {
    return errors;
  }

  // Node count limits: 2-60
  if (data.nodes.length < 2 || data.nodes.length > 60) {
    errors.push(`Building must have between 2 and 60 nodes (got ${data.nodes.length}). / ভবনে ২ থেকে ৬০টি নোড থাকতে হবে (পাওয়া গেছে ${data.nodes.length}টি)।`);
  }

  // Edge count limits: 1-150
  if (data.edges.length < 1 || data.edges.length > 150) {
    errors.push(`Building must have between 1 and 150 edges (got ${data.edges.length}). / ভবনে ১ থেকে ১৫০টি করিডোর থাকতে হবে (পাওয়া গেছে ${data.edges.length}টি)।`);
  }

  const nodeIds = new Set();
  const nodeById = new Map();
  let hasRoomOrJunction = false;
  let hasExit = false;

  data.nodes.forEach((node, index) => {
    const p = `nodes[${index}]`;
    if (!isObject(node)) {
      errors.push(`${p} must be an object. / ${p} একটি object হতে হবে।`);
      return;
    }

    if (!nonEmptyString(node.id)) {
      errors.push(`${p}.id must be a non-empty string. / ${p}.id খালি হতে পারবে না।`);
    } else if (nodeIds.has(node.id)) {
      errors.push(`Duplicate node ID "${node.id}". / একই node ID "${node.id}" একাধিকবার আছে।`);
    } else {
      nodeIds.add(node.id);
      nodeById.set(node.id, node);
    }

    if (!nonEmptyString(node.label)) {
      errors.push(`${p}.label must be a non-empty string. / ${p}.label খালি হতে পারবে না।`);
    }

    if (!VALID_NODE_TYPES.has(node.type)) {
      errors.push(`${p}.type must be room, junction, or exit. / ${p}.type room, junction অথবা exit হতে হবে।`);
    } else {
      if (node.type === 'room' || node.type === 'junction') hasRoomOrJunction = true;
      if (node.type === 'exit') hasExit = true;
    }

    if (!finiteNumber(node.x) || !finiteNumber(node.y)) {
      errors.push(`${p}.x and ${p}.y must be finite numbers. / ${p}.x ও ${p}.y বৈধ সংখ্যা হতে হবে।`);
    }
  });

  if (!hasRoomOrJunction) {
    errors.push('Building must contain at least one room or junction. / ভবনে অন্তত একটি রুম বা জংশন থাকতে হবে।');
  }

  if (!hasExit) {
    errors.push('Building must contain at least one exit. / ভবনে অন্তত একটি এক্সিট থাকতে হবে।');
  }

  const edgeIds = new Set();
  const edgeById = new Map();
  const nodePairSeen = new Set();

  data.edges.forEach((edge, index) => {
    const p = `edges[${index}]`;
    if (!isObject(edge)) {
      errors.push(`${p} must be an object. / ${p} একটি object হতে হবে।`);
      return;
    }

    if (!nonEmptyString(edge.id)) {
      errors.push(`${p}.id must be a non-empty string. / ${p}.id খালি হতে পারবে না।`);
    } else if (edgeIds.has(edge.id)) {
      errors.push(`Duplicate edge ID "${edge.id}". / একই edge ID "${edge.id}" একাধিকবার আছে।`);
    } else {
      edgeIds.add(edge.id);
      edgeById.set(edge.id, edge);
    }

    const validFrom = nonEmptyString(edge.from) && nodeIds.has(edge.from);
    const validTo = nonEmptyString(edge.to) && nodeIds.has(edge.to);

    if (!validFrom) {
      errors.push(`${p}.from must reference an existing node. / ${p}.from-এ বিদ্যমান node ID দিতে হবে।`);
    }
    if (!validTo) {
      errors.push(`${p}.to must reference an existing node. / ${p}.to-তে বিদ্যমান node ID দিতে হবে।`);
    }

    // Constraint: No self-loops
    if (validFrom && validTo && edge.from === edge.to) {
      errors.push(`${p} is a self-loop on node "${edge.from}". Self-loops are not allowed. / ${p}-এ সেলফ-লুপ শনাক্ত হয়েছে ("${edge.from}")। সেলফ-লুপ অনুমোদিত নয়।`);
    }

    // Constraint: No repeated node pairs (undirected)
    if (validFrom && validTo && edge.from !== edge.to) {
      const pairKey = edge.from < edge.to ? `${edge.from} <-> ${edge.to}` : `${edge.to} <-> ${edge.from}`;
      if (nodePairSeen.has(pairKey)) {
        errors.push(`Duplicate edge connecting "${edge.from}" and "${edge.to}". Repeated node pairs are not allowed. / "${edge.from}" ও "${edge.to}"-এর মধ্যে ডুপ্লিকেট এজ রয়েছে।`);
      } else {
        nodePairSeen.add(pairKey);
      }
    }

    // Edge cost constraint: positive integer
    if (!Number.isInteger(edge.cost) || edge.cost <= 0) {
      errors.push(`${p}.cost must be a positive integer. / ${p}.cost একটি ধনাত্মক পূর্ণসংখ্যা হতে হবে।`);
    }
  });

  const state = data.initial_state;
  const stateArrays = ['blocked_nodes', 'blocked_edges', 'closed_exits'];
  stateArrays.forEach((key) => {
    if (!Array.isArray(state[key])) {
      errors.push(`initial_state.${key} must be an array. / initial_state.${key} একটি array হতে হবে।`);
    }
  });

  if (errors.some((e) => e.includes('initial_state.'))) return errors;

  const checkUniqueHazardIds = (items, key) => {
    const seen = new Set();
    items.forEach((id) => {
      if (typeof id !== 'string' || !id.trim()) {
        errors.push(`initial_state.${key} contains an invalid or empty ID. / initial_state.${key}-এ অবৈধ ID রয়েছে।`);
      } else if (seen.has(id)) {
        errors.push(`Duplicate ID "${id}" in initial_state.${key}. / initial_state.${key}-এ "${id}" একাধিকবার আছে।`);
      } else {
        seen.add(id);
      }
    });
  };

  checkUniqueHazardIds(state.blocked_nodes, 'blocked_nodes');
  checkUniqueHazardIds(state.blocked_edges, 'blocked_edges');
  checkUniqueHazardIds(state.closed_exits, 'closed_exits');

  // Verify blocked_nodes exist and are room or junction
  state.blocked_nodes.forEach((id) => {
    const node = nodeById.get(id);
    if (!node) {
      errors.push(`Blocked node "${id}" in initial_state does not exist. / initial_state-এর blocked node "${id}" বিদ্যমান নয়।`);
    } else if (node.type !== 'room' && node.type !== 'junction') {
      errors.push(`Blocked node "${id}" must be a room or junction (found "${node.type}"). / blocked node "${id}" room অথবা junction হতে হবে।`);
    }
  });

  // Verify blocked_edges exist
  state.blocked_edges.forEach((id) => {
    if (!edgeById.has(id)) {
      errors.push(`Blocked edge "${id}" in initial_state does not exist. / initial_state-এর blocked edge "${id}" বিদ্যমান নয়।`);
    }
  });

  // Verify closed_exits exist and are exits
  state.closed_exits.forEach((id) => {
    const node = nodeById.get(id);
    if (!node) {
      errors.push(`Closed exit "${id}" in initial_state does not exist. / initial_state-এর closed exit "${id}" বিদ্যমান নয়।`);
    } else if (node.type !== 'exit') {
      errors.push(`Closed exit "${id}" must reference an exit node (found "${node.type}"). / closed exit "${id}" অবশ্যই একটি exit নোড হতে হবে।`);
    }
  });

  return errors;
}
