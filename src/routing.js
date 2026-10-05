export function compareNodeSequence(a, b) {
  const length = Math.min(a.length, b.length);
  for (let i = 0; i < length; i += 1) {
    const left = String(a[i]);
    const right = String(b[i]);
    if (left < right) return -1;
    if (left > right) return 1;
  }
  return a.length - b.length;
}

export function compareRouteCandidate(a, b) {
  if (!b) return -1;
  if (a.cost !== b.cost) return a.cost - b.cost;
  return compareNodeSequence(a.path, b.path);
}

export function calculateCheapestExit(building, startId) {
  const nodeById = new Map(building.nodes.map((node) => [node.id, node]));
  const blockedNodes = new Set(building.initial_state.blocked_nodes);
  const blockedEdges = new Set(building.initial_state.blocked_edges);
  const closedExits = new Set(building.initial_state.closed_exits);

  const start = nodeById.get(startId);
  if (!start) return { status: 'no-start' };
  if (blockedNodes.has(startId)) return { status: 'blocked-start' };

  const adjacency = new Map(building.nodes.map((node) => [node.id, []]));
  for (const edge of building.edges) {
    if (blockedEdges.has(edge.id)) continue;
    if (blockedNodes.has(edge.from) || blockedNodes.has(edge.to)) continue;
    adjacency.get(edge.from)?.push({ to: edge.to, cost: edge.cost });
    adjacency.get(edge.to)?.push({ to: edge.from, cost: edge.cost });
  }

  const best = new Map([[startId, { cost: 0, path: [startId] }]]);
  const queue = [{ id: startId, cost: 0, path: [startId] }];

  while (queue.length) {
    queue.sort((a, b) => compareRouteCandidate(a, b));
    const current = queue.shift();
    const known = best.get(current.id);
    if (!known || compareRouteCandidate(current, known) !== 0) continue;

    for (const neighbor of adjacency.get(current.id) ?? []) {
      if (current.path.includes(neighbor.to)) continue;
      const candidate = {
        cost: current.cost + neighbor.cost,
        path: [...current.path, neighbor.to],
      };
      const existing = best.get(neighbor.to);
      if (!existing || compareRouteCandidate(candidate, existing) < 0) {
        best.set(neighbor.to, candidate);
        queue.push({ id: neighbor.to, ...candidate });
      }
    }
  }

  const candidates = building.nodes
    .filter((node) => node.type === 'exit' && !closedExits.has(node.id) && !blockedNodes.has(node.id))
    .map((exit) => {
      const result = best.get(exit.id);
      return result ? { exitId: exit.id, ...result } : null;
    })
    .filter(Boolean);

  if (!candidates.length) return { status: 'no-route' };

  candidates.sort((a, b) => {
    if (a.cost !== b.cost) return a.cost - b.cost;
    const exitCompare = String(a.exitId) < String(b.exitId) ? -1 : String(a.exitId) > String(b.exitId) ? 1 : 0;
    if (exitCompare !== 0) return exitCompare;
    return compareNodeSequence(a.path, b.path);
  });

  const winner = candidates[0];
  const routeEdges = new Set();
  for (let i = 0; i < winner.path.length - 1; i += 1) {
    const from = winner.path[i];
    const to = winner.path[i + 1];
    const edge = building.edges.find((item) =>
      !blockedEdges.has(item.id) &&
      ((item.from === from && item.to === to) || (item.from === to && item.to === from))
    );
    if (edge) routeEdges.add(edge.id);
  }

  return { status: 'route', ...winner, routeEdges };
}
