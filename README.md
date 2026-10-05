# Smart Escape — Frontend Foundation

Frontend-only React/Vite foundation for the Smart Escape evacuation route simulator.

## Step 2 implemented

- Browser-side `building.json` import using the File API.
- JSON parsing with safe error handling.
- Validation for:
  - required `building`, `nodes`, `edges`, `initial_state` fields
  - unique node IDs and edge IDs
  - valid node types: `room`, `junction`, `exit`
  - valid node labels and finite `x`/`y` coordinates
  - edge endpoints referencing existing nodes
  - positive integer edge costs
  - `blocked_nodes`, `blocked_edges`, and `closed_exits` arrays
  - unique and category-correct hazard IDs
- Invalid data never replaces the last valid building.
- Clear validation errors are shown in English and Bangla.
- Valid data replaces the current building and renders the graph from supplied coordinates.
- Room, junction, exit and initial blocked/closed states have distinct visuals.
- Corridor costs are displayed on edges.
- Disconnected graphs render normally.
- Dataset summary shows node, corridor and exit counts.
- No routing or automatic hazard behavior is included yet.

## Run

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
```
