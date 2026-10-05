/**
 * Smart Escape - Core Routing Engine
 * Implements Dijkstra's algorithm with strict tie-breaking rules:
 * 1. Minimum total path cost
 * 2. On equal cost: Lexicographically smallest exit ID
 * 3. On paths to that exit tying: Lexicographically smallest sequence of node IDs
 */

export function calculateEvacuationRoute({
  building,
  startId,
  blockedNodes = new Set(),
  blockedEdges = new Set(),
  closedExits = new Set(),
}) {
  if (!building || !building.nodes || !building.edges) {
    return { status: 'NO_BUILDING', route: null, error: 'No building loaded' };
  }

  if (!startId) {
    return { status: 'NO_START', route: null, error: 'No start location selected' };
  }

  const nodeMap = new Map(building.nodes.map((n) => [n.id, n]));
  const startNode = nodeMap.get(startId);

  if (!startNode) {
    return { status: 'INVALID_START', route: null, error: 'Invalid start location' };
  }

  // Failure Case 1: Starting location blocked
  if (blockedNodes.has(startId)) {
    return {
      status: 'START_BLOCKED',
      route: null,
      error: 'Starting location blocked',
    };
  }

  // Identify open exits
  const openExits = building.nodes.filter(
    (n) => n.type === 'exit' && !closedExits.has(n.id) && !blockedNodes.has(n.id)
  );

  if (openExits.length === 0) {
    return {
      status: 'NO_ROUTE',
      route: null,
      error: 'No route available',
    };
  }

  // If start is already an open exit
  if (startNode.type === 'exit') {
    return {
      status: 'SUCCESS',
      route: {
        path: [startId],
        edges: [],
        cost: 0,
        exitId: startId,
        exitLabel: startNode.label,
      },
      alternatives: [],
    };
  }

  // Build adjacency graph excluding blocked elements
  // Undirected edges
  const adj = new Map();
  for (const node of building.nodes) {
    adj.set(node.id, []);
  }

  // Helper to check if a node is usable
  const isNodeUsable = (id) => {
    if (blockedNodes.has(id)) return false;
    const node = nodeMap.get(id);
    if (!node) return false;
    // Closed exits cannot be entered or crossed as intermediate nodes
    if (node.type === 'exit' && closedExits.has(id)) return false;
    return true;
  };

  for (const edge of building.edges) {
    if (blockedEdges.has(edge.id)) continue;
    if (!isNodeUsable(edge.from) || !isNodeUsable(edge.to)) continue;

    // Both endpoints are valid and edge is unblocked
    adj.get(edge.from).push({
      neighbor: edge.to,
      edgeId: edge.id,
      cost: edge.cost,
    });
    adj.get(edge.to).push({
      neighbor: edge.from,
      edgeId: edge.id,
      cost: edge.cost,
    });
  }

  /**
   * Compare two node ID sequences lexicographically
   * Returns negative if seqA < seqB, positive if seqA > seqB, 0 if equal
   */
  const compareNodeSequences = (seqA, seqB) => {
    const len = Math.min(seqA.length, seqB.length);
    for (let i = 0; i < len; i++) {
      if (seqA[i] < seqB[i]) return -1;
      if (seqA[i] > seqB[i]) return 1;
    }
    return seqA.length - seqB.length;
  };

  // Dijkstra's algorithm tracking best distance and lexicographically smallest path
  const distances = new Map();
  const bestPaths = new Map();
  const bestEdgePaths = new Map();

  for (const node of building.nodes) {
    distances.set(node.id, Infinity);
    bestPaths.set(node.id, null);
    bestEdgePaths.set(node.id, []);
  }

  distances.set(startId, 0);
  bestPaths.set(startId, [startId]);
  bestEdgePaths.set(startId, []);

  // Priority queue / unvisited set
  const queue = [{ id: startId, cost: 0, path: [startId], edgePath: [] }];

  while (queue.length > 0) {
    // Extract minimum cost; on tie, lexicographically smallest path
    queue.sort((a, b) => {
      if (a.cost !== b.cost) return a.cost - b.cost;
      return compareNodeSequences(a.path, b.path);
    });

    const current = queue.shift();
    const currDist = distances.get(current.id);

    // If current entry is worse than known best, skip
    if (current.cost > currDist) continue;
    if (current.cost === currDist && compareNodeSequences(current.path, bestPaths.get(current.id)) > 0) {
      continue;
    }

    // Explore neighbors
    const neighbors = adj.get(current.id) || [];
    for (const { neighbor, edgeId, cost } of neighbors) {
      const nextCost = current.cost + cost;
      const nextPath = [...current.path, neighbor];
      const nextEdgePath = [...current.edgePath, edgeId];

      const existingDist = distances.get(neighbor);
      const existingPath = bestPaths.get(neighbor);

      let isImprovement = false;
      if (nextCost < existingDist) {
        isImprovement = true;
      } else if (nextCost === existingDist) {
        if (existingPath === null || compareNodeSequences(nextPath, existingPath) < 0) {
          isImprovement = true;
        }
      }

      if (isImprovement) {
        distances.set(neighbor, nextCost);
        bestPaths.set(neighbor, nextPath);
        bestEdgePaths.set(neighbor, nextEdgePath);
        queue.push({
          id: neighbor,
          cost: nextCost,
          path: nextPath,
          edgePath: nextEdgePath,
        });
      }
    }
  }

  // Collect all reachable open exits
  const reachableExits = [];
  for (const exitNode of openExits) {
    const cost = distances.get(exitNode.id);
    if (cost !== Infinity && bestPaths.get(exitNode.id)) {
      reachableExits.push({
        exitId: exitNode.id,
        exitLabel: exitNode.label,
        cost,
        path: bestPaths.get(exitNode.id),
        edges: bestEdgePaths.get(exitNode.id),
      });
    }
  }

  // Failure Case 2: No route available
  if (reachableExits.length === 0) {
    return {
      status: 'NO_ROUTE',
      route: null,
      error: 'No route available',
    };
  }

  // Sort candidate exits by exact tie-breaking criteria:
  // 1. Minimum cost
  // 2. Lexicographically smallest exit ID
  // 3. Lexicographically smallest sequence of node IDs
  reachableExits.sort((a, b) => {
    if (a.cost !== b.cost) return a.cost - b.cost;
    if (a.exitId < b.exitId) return -1;
    if (a.exitId > b.exitId) return 1;
    return compareNodeSequences(a.path, b.path);
  });

  const primaryRoute = reachableExits[0];
  const alternatives = reachableExits.slice(1);

  return {
    status: 'SUCCESS',
    route: primaryRoute,
    alternatives,
    allCandidateCount: reachableExits.length,
  };
}
