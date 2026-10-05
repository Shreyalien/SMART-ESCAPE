import { calculateEvacuationRoute } from './src/routing.js';
import fs from 'fs';

const building = JSON.parse(fs.readFileSync('./building.json', 'utf8'));

console.log('--- RUNNING OFFICIAL TEST SUITE ---');

// Test 1: Baseline (Select R1)
// Expected: R1 - C1 - C2 - E1; cost 7
const t1 = calculateEvacuationRoute({
  building,
  startId: 'R1',
  blockedNodes: new Set(),
  blockedEdges: new Set(),
  closedExits: new Set(),
});
console.log('Test 1 (Baseline R1):', {
  status: t1.status,
  path: t1.route?.path.join(' - '),
  cost: t1.route?.cost,
  exit: t1.route?.exitId,
});
const pass1 = t1.status === 'SUCCESS' && t1.route.path.join(' - ') === 'R1 - C1 - C2 - E1' && t1.route.cost === 7;
console.log('Test 1 PASS?', pass1);

// Test 2: Blocked junction (Select R1; block C2)
// Expected: R1 - C1 - C3 - C4 - E2; cost 11
const t2 = calculateEvacuationRoute({
  building,
  startId: 'R1',
  blockedNodes: new Set(['C2']),
  blockedEdges: new Set(),
  closedExits: new Set(),
});
console.log('Test 2 (Block C2):', {
  status: t2.status,
  path: t2.route?.path.join(' - '),
  cost: t2.route?.cost,
  exit: t2.route?.exitId,
});
const pass2 = t2.status === 'SUCCESS' && t2.route.path.join(' - ') === 'R1 - C1 - C3 - C4 - E2' && t2.route.cost === 11;
console.log('Test 2 PASS?', pass2);

// Test 3: Exits closed (Select R1; close E1 and E2)
// Expected: No route available
const t3 = calculateEvacuationRoute({
  building,
  startId: 'R1',
  blockedNodes: new Set(),
  blockedEdges: new Set(),
  closedExits: new Set(['E1', 'E2']),
});
console.log('Test 3 (Close E1 and E2):', {
  status: t3.status,
  error: t3.error,
});
const pass3 = t3.status === 'NO_ROUTE' && t3.error === 'No route available';
console.log('Test 3 PASS?', pass3);

// Test 4: Different start (Select R2)
// Expected: R2 - C3 - C4 - E2; cost 7
const t4 = calculateEvacuationRoute({
  building,
  startId: 'R2',
  blockedNodes: new Set(),
  blockedEdges: new Set(),
  closedExits: new Set(),
});
console.log('Test 4 (Select R2):', {
  status: t4.status,
  path: t4.route?.path.join(' - '),
  cost: t4.route?.cost,
  exit: t4.route?.exitId,
});
const pass4 = t4.status === 'SUCCESS' && t4.route.path.join(' - ') === 'R2 - C3 - C4 - E2' && t4.route.cost === 7;
console.log('Test 4 PASS?', pass4);

// Test 5: Blocked start (Select R1; then block R1)
// Expected: Starting location blocked
const t5 = calculateEvacuationRoute({
  building,
  startId: 'R1',
  blockedNodes: new Set(['R1']),
  blockedEdges: new Set(),
  closedExits: new Set(),
});
console.log('Test 5 (Block start R1):', {
  status: t5.status,
  error: t5.error,
});
const pass5 = t5.status === 'START_BLOCKED' && t5.error === 'Starting location blocked';
console.log('Test 5 PASS?', pass5);

if (pass1 && pass2 && pass3 && pass4 && pass5) {
  console.log('>>> ALL 5 OFFICIAL TEST CASES PASSED PERFECTLY! <<<');
} else {
  console.error('>>> SOME TESTS FAILED <<<');
  process.exit(1);
}
