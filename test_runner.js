import { calculateCheapestExit } from './src/routing.js';
import fs from 'fs';

const building = JSON.parse(fs.readFileSync('./building.json', 'utf8'));

console.log('--- RUNNING OFFICIAL TEST SUITE (STEP 5) ---');

// Test 1: Baseline (Select R1)
// Expected: R1 - C1 - C2 - E1; cost 7
const t1 = calculateCheapestExit(building, 'R1');
console.log('Test 1 (Baseline R1):', {
  status: t1.status,
  path: t1.path?.join(' - '),
  cost: t1.cost,
  exit: t1.exitId,
});
const pass1 = t1.status === 'route' && t1.path.join(' - ') === 'R1 - C1 - C2 - E1' && t1.cost === 7 && t1.exitId === 'E1';
console.log('Test 1 PASS?', pass1);

// Test 2: Blocked junction (Select R1; block C2)
// Expected: R1 - C1 - C3 - C4 - E2; cost 11
const b2 = JSON.parse(JSON.stringify(building));
b2.initial_state.blocked_nodes = ['C2'];
const t2 = calculateCheapestExit(b2, 'R1');
console.log('Test 2 (Block C2):', {
  status: t2.status,
  path: t2.path?.join(' - '),
  cost: t2.cost,
  exit: t2.exitId,
});
const pass2 = t2.status === 'route' && t2.path.join(' - ') === 'R1 - C1 - C3 - C4 - E2' && t2.cost === 11 && t2.exitId === 'E2';
console.log('Test 2 PASS?', pass2);

// Test 3: Exits closed (Select R1; close E1 and E2)
// Expected: No route available
const b3 = JSON.parse(JSON.stringify(building));
b3.initial_state.closed_exits = ['E1', 'E2'];
const t3 = calculateCheapestExit(b3, 'R1');
console.log('Test 3 (Close E1 and E2):', {
  status: t3.status,
});
const pass3 = t3.status === 'no-route';
console.log('Test 3 PASS?', pass3);

// Test 4: Different start (Select R2)
// Expected: R2 - C3 - C4 - E2; cost 7
const t4 = calculateCheapestExit(building, 'R2');
console.log('Test 4 (Select R2):', {
  status: t4.status,
  path: t4.path?.join(' - '),
  cost: t4.cost,
  exit: t4.exitId,
});
const pass4 = t4.status === 'route' && t4.path.join(' - ') === 'R2 - C3 - C4 - E2' && t4.cost === 7 && t4.exitId === 'E2';
console.log('Test 4 PASS?', pass4);

// Test 5: Blocked start (Select R1; then block R1)
// Expected: Starting location blocked
const b5 = JSON.parse(JSON.stringify(building));
b5.initial_state.blocked_nodes = ['R1'];
const t5 = calculateCheapestExit(b5, 'R1');
console.log('Test 5 (Block start R1):', {
  status: t5.status,
});
const pass5 = t5.status === 'blocked-start';
console.log('Test 5 PASS?', pass5);

if (pass1 && pass2 && pass3 && pass4 && pass5) {
  console.log('>>> ALL 5 OFFICIAL TEST CASES PASSED PERFECTLY! <<<');
} else {
  console.error('>>> SOME TESTS FAILED <<<');
  process.exit(1);
}
