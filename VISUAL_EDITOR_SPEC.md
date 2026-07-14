# Sequence Operator — Visual Program Editor Specification

**Status:** Draft
**Audience:** Implementing model/developer
**Scope:** A new node-based (dataflow) visual editor that *supplements* — does not replace — the existing form-based interface of sequence-operator.

---

## 1. Overview and Goals

The Visual Program Editor ("Patch Editor") is a touch- and mouse-driven, drag-and-drop canvas where users build *programs* by placing **nodes** (sequence sources and operations) and connecting them with **wires**. The output of any operation can be hooked to the input of another without typing. Programs are evaluated as directed acyclic graphs (DAGs): whenever an upstream value changes, all downstream nodes recompute automatically.

### 1.1 Goals

- Expose **every** operation currently available in the app (all `Combiner` × `Operation` binary combinations, all unary sequence operations, and all unary tritwise operations) as connectable nodes.
- Allow the output of one node to feed the input of one or more other nodes purely by dragging a wire between ports — no typing required for wiring.
- Provide **Sequence nodes** as sources (literal input), sinks (named outputs), and pass-through inspection points.
- Allow **programs to be connected together**: a saved program becomes a reusable *subprogram node* with its own inputs and outputs, embeddable inside other programs.
- Work equally well with mouse and touch (single-finger drag, pinch-zoom, long-press context menu).
- Coexist with the current interface: shared sequence memory, shared history, shared display base settings.

### 1.2 Non-Goals

- No replacement or removal of the existing "Classic" tab/interface.
- No cycles / feedback loops in v1 (graphs are strictly acyclic).
- No collaborative/multi-user editing.
- No server component — everything runs client-side, persisted in `localStorage` (with JSON file import/export).

---

## 2. Integration with the Existing App

### 2.1 UI placement

- Add a top-level navigation control (Vuetify `v-tabs` or a `v-bottom-navigation` on mobile) with two entries: **Classic** (the current `App.vue` content, extracted into `ClassicView.vue`) and **Patch** (the new editor, `PatchEditorView.vue`).
- `App.vue` becomes a thin shell hosting the tab switcher and shared state (display base, word size, sequence memory, history).

### 2.2 Shared state

- **Sequence memory (`M[i]`)**: the editor's *Memory Read* and *Memory Write* nodes bind to the same memory slots used by the classic interface (same `localStorage` keys). Writing from a patch updates the classic view and vice versa.
- **Display base / word size**: node previews render sequences using the globally selected base (2/8/10/16) and word size, identical to the classic view.
- **History**: an "Export to history" action on any node appends its current output to the shared history list.

### 2.3 Code reuse

- All evaluation logic must call the existing functions in `src/lib.ts` (`combine`, `rotate`, `reverse`, `difference`, `antidifference`, `cyclicalDifference`, `cyclicalAntidifference`, `signs`, `timesN`, `permuteBlocks`, `hierarchicalPermute`, `unaryTritwise`, `permutationOrbit`) and the `COMBINERS` / `OPERATIONS` exports. No operation logic is duplicated in the editor.
- Sequences flow between nodes as space-separated strings (the canonical format already used by `lib.ts`), avoiding conversion layers.

---

## 3. Node Catalog

Every node has zero or more **input ports** (left edge), zero or more **output ports** (right edge), a **header** (icon + name), and an optional **inline parameter area** (small controls rendered in the node body). Ports are typed (see §5).

### 3.1 Source / sink nodes

| Node | Inputs | Outputs | Parameters | Behavior |
|---|---|---|---|---|
| **Sequence** | — | `out: Seq` | editable text field (space-separated integers, respecting display base) | Literal sequence source. Doubles as an inspector when its input variant is used (see Display). |
| **Number** | — | `out: Num` | editable integer field | Scalar constant for parameter ports (e.g. rotate steps `n`, antidifference `k`). |
| **Memory Read** | — | `out: Seq` | slot selector `M[0..9]` | Emits the current content of a shared memory slot; re-emits when the slot changes. |
| **Memory Write** | `in: Seq` | `out: Seq` (pass-through) | slot selector | Writes its input into the selected shared memory slot; passes value through. |
| **Display** | `in: Seq` | — | read-only rendered sequence + length badge + copy button | Terminal sink for viewing/copying results; renders in the global display base. |

### 3.2 Binary nodes

| Node | Inputs | Outputs | Parameters |
|---|---|---|---|
| **Combine** | `x: Seq`, `y: Seq` | `out: Seq` | **Combiner** dropdown: Product, SwappedProduct, Divisive, Convolution, Triangular, SwappedTriangular, Recycle, Apply, Mixed Radix — and **Operation** dropdown: Add, Subtract, Multiply, Divide, X, Y, Power, Log, Min, Max, Modulo, Bounce, Distance, And, Nand, Or, Nor, Implication, ReverseImplication, Xor, Xnor, ShiftBits, ProjectBits, LCM, GCD, Equal, NotEqual, LessThan, LessThanOrEqual, GreaterThan, GreaterThanOrEqual, Binomial, ExpandBits, ExpandBitsFill, CantorIntervalBinaryNumber, PermuteBits, PermuteTrits, HardThreshold, RandInt, IterateBetween, Bits, Trits, TritAnd, TritNand, TritOr, TritNor, TritCons, TritNcons, TritAny, TritNany, TritMul, TritNmul, TritSum, TritNsum |

The Combine node is a single node type parameterized by the two dropdowns (mirroring the classic UI), evaluated via `lib.combine(combiner, operation, x, y)`. The palette additionally exposes each Combiner as a preconfigured entry (e.g. "Combine ▸ Recycle") for quick placement.

> **Note on non-determinism:** operations such as `RandInt` are non-deterministic. Nodes using them get a **Reroll** button (⟳) in their header that forces re-evaluation; results are cached otherwise (see §6).

### 3.3 Unary sequence nodes

| Node | Inputs | Outputs | Parameters | lib.ts function |
|---|---|---|---|---|
| **Reverse** | `in: Seq` | `out: Seq` | — | `reverse` |
| **Rotate** | `in: Seq`, `n: Num` | `out: Seq` | inline `n` (used when `n` port is unwired) | `rotate` |
| **Difference (Δ)** | `in: Seq` | `out: Seq` | — | `difference` |
| **Antidifference (∑)** | `in: Seq`, `k: Num` | `out: Seq` | inline `k` | `antidifference` |
| **Cyclical Difference** | `in: Seq` | `out: Seq` | — | `cyclicalDifference` |
| **Cyclical Antidifference** | `in: Seq`, `k: Num` | `out: Seq` | inline `k` | `cyclicalAntidifference` |
| **Signs** | `in: Seq` | `out: Seq` | — | `signs` |
| **Times N (×n)** | `in: Seq`, `n: Num` | `out: Seq` | inline `n` | `timesN` |
| **Permute Blocks (π)** | `in: Seq`, `p: Seq` | `out: Seq` | inline permutation field | `permuteBlocks` |
| **Hierarchical Permute (H)** | `in: Seq`, `c: Seq`, `p: Seq` | `out: Seq` | inline composition + permutation fields | `hierarchicalPermute` |
| **Permutation Orbit** | `in: Seq` | `out: Seq` | — | `permutationOrbit` |

Numeric/sequence parameter ports (`n`, `k`, `p`, `c`) may be either wired (value comes from an upstream node) or unwired (value comes from the node's inline control). A wired port disables and visually dims the corresponding inline control.

### 3.4 Unary tritwise nodes

One node type, **Tritwise (▽)**, with `in: Seq` → `out: Seq` and an operation dropdown listing all 14 ops: Buf, Not, Pnot, Nnot, Abs, Clu, Cld, Inc, Dec, Rtu, Rtd, Isp, Isz, Isn — evaluated via `lib.unaryTritwise`. The palette also exposes each op as a preconfigured entry.

### 3.5 Program composition nodes

| Node | Description |
|---|---|
| **Input** | Declares a named external input of the *current* program. Inside the program it acts as a source; when the program is embedded as a subprogram node, each Input becomes an input port. Parameters: name, type (Seq/Num), optional default value. |
| **Output** | Declares a named external output. Inside the program it is a sink; when embedded, each Output becomes an output port. |
| **Subprogram** | An instance of another saved program. Its ports are derived from that program's Input/Output nodes. Double-tap/double-click opens the referenced program in a new editor tab (breadcrumb navigation back). Recursive embedding (a program containing itself, directly or transitively) is rejected with an error toast. |
| **Comment** | Free-text sticky note, resizable, no ports. |

---

## 4. Canvas, Interaction, and Layout

### 4.1 Layout

```
┌────────────────────────────────────────────────────────────┐
│ Toolbar: program name ▾ | New Save Load Import Export | ⟳  │
├──────────┬─────────────────────────────────────────────────┤
│ Palette  │                                                 │
│ (collap- │                Canvas (pan/zoom)                │
│  sible,  │                                                 │
│  search- │                                                 │
│  able,   │                                                 │
│  grouped)│                                                 │
├──────────┴─────────────────────────────────────────────────┤
│ Status bar: zoom % | node/edge count | evaluation status   │
└────────────────────────────────────────────────────────────┘
```

- **Palette** groups: Sources & Sinks, Combine, Unary, Tritwise, Programs (saved programs appear here as draggable Subprogram entries), Misc. Includes a search box that filters entries. On narrow/mobile screens the palette collapses into a floating "＋" FAB that opens a bottom-sheet picker.
- **Canvas**: infinite pannable/zoomable surface with an optional dot grid and snap-to-grid (toggleable).

### 4.2 Pointer interactions (mouse and touch unified via Pointer Events)

| Gesture | Action |
|---|---|
| Drag palette entry onto canvas (or tap FAB entry) | Create node at drop point / canvas center |
| Drag node header | Move node (with grid snapping if enabled) |
| Drag from an output port | Start a wire; a live bezier follows the pointer; compatible input ports highlight; release over a port to connect, elsewhere to cancel |
| Drag from a *wired* input port | Detach the wire and re-drag it (rewire) |
| Tap/click node or wire | Select (Shift/long-press adds to selection) |
| Drag on empty canvas | Pan (single pointer) / rubber-band select (with modifier key or after long-press) |
| Pinch / mouse wheel (Ctrl+wheel) | Zoom around pointer/pinch center (25%–300%) |
| Double-tap/double-click empty canvas | Open quick-add search popup at that position |
| Long-press / right-click node or wire | Context menu: Duplicate, Delete, Disconnect all, Export to history, (Subprogram: Open) |
| `Delete`/`Backspace` key | Delete selection |
| `Ctrl+Z` / `Ctrl+Y` | Undo / redo (see §7.3) |

- **Touch targets**: ports render at least 24 px visually with a ≥ 44 px invisible hit area; ports enlarge while a wire drag is in progress.
- Wires render as cubic bezier curves; the wire being dragged and its candidate target ports use a highlight color; invalid targets are dimmed.

### 4.3 Node visuals

- Vuetify-consistent dark theme cards with colored headers per category (source = green, binary = blue, unary = purple, tritwise = teal, program = orange, sink = gray).
- Each node with a `Seq` output shows a truncated **live preview** of its current value (first ~24 characters + length badge), rendered in the global display base.
- Error state: red border + error icon; tapping the icon shows the error message (e.g. "Sequence length must equal 2^sum(composition)"). Errors propagate downstream as "no value" — downstream nodes show a muted "waiting" state rather than cascading error badges.

---

## 5. Ports, Types, and Connection Rules

- Port types: **Seq** (space-separated integer sequence, circular port) and **Num** (single integer, diamond port).
- A connection is valid iff: types match (with the coercion below), the target is an *input* port, and adding the edge creates no cycle (checked incrementally with DFS/topological check; invalid drops show a brief shake animation + toast).
- **Coercion:** a `Num` output may connect to a `Seq` input (treated as a length-1 sequence). `Seq → Num` is not allowed.
- An **output** port supports unlimited outgoing connections (fan-out). An **input** port accepts exactly one incoming connection; dropping a wire on an occupied input replaces the existing wire.
- Unwired required `Seq` inputs leave the node in "waiting" state (no evaluation, no error).

---

## 6. Evaluation Model

- **Reactive dataflow, eager evaluation**: maintain a topological order of the DAG; when a node's parameters or any upstream output changes, re-evaluate it and its transitive dependents in topological order.
- Each node caches its last output keyed by (input values, parameter values); unchanged nodes are skipped. Nodes flagged non-deterministic (Operation = RandInt) bypass the cache only when explicitly rerolled via the ⟳ button or a global "Re-run" toolbar action.
- Evaluation is synchronous per node (all `lib.ts` functions are synchronous) but the scheduler yields to the UI between nodes (microtask batching) so large graphs never freeze the interface; a small progress indicator appears in the status bar during evaluation.
- All exceptions thrown by `lib.ts` are caught per node and surfaced as that node's error state (§4.3).
- Subprogram nodes evaluate by instantiating the referenced program's graph internally, binding its Input nodes to the subprogram's input ports and reading its Output nodes.

---

## 7. Persistence and Program Management

### 7.1 Serialization format

Programs serialize to JSON:

```json
{
  "formatVersion": 1,
  "id": "uuid",
  "name": "My Program",
  "nodes": [
    { "id": "n1", "type": "sequence", "x": 100, "y": 80, "params": { "value": "1 2 3 4" } },
    { "id": "n2", "type": "combine", "x": 340, "y": 120,
      "params": { "combiner": "Recycle", "operation": "Add" } }
  ],
  "edges": [
    { "from": { "node": "n1", "port": "out" }, "to": { "node": "n2", "port": "x" } }
  ],
  "viewport": { "x": 0, "y": 0, "zoom": 1 }
}
```

- Node `type` strings and `params` keys are stable identifiers (never localized) so files remain portable across versions. `formatVersion` gates future migrations.
- Subprogram nodes store the referenced program's `id`; loading a program with missing references shows placeholder error nodes instead of failing.

### 7.2 Storage

- Programs are stored in `localStorage` under a namespaced key (e.g. `SEQOP_programs`, consistent with existing `SEQOP_*` keys), with an autosave of the working copy (`SEQOP_currentProgram`) on every mutation (debounced).
- Toolbar actions: **New**, **Save / Save As**, **Load** (picker listing saved programs with name + node count + last-modified), **Rename**, **Delete**, **Export** (download `.json`), **Import** (file picker / drag a `.json` file onto the canvas).

### 7.3 Undo / redo

- Command-pattern history (add/move/delete node, connect/disconnect, parameter change — parameter edits coalesced per field) with at least 100 steps, cleared on program switch.

---

## 8. Architecture and Implementation Notes

- **New files** (suggested): `src/views/PatchEditorView.vue`, `src/views/ClassicView.vue` (extracted current UI), `src/patch/graph.ts` (graph model, topological sort, cycle detection), `src/patch/nodes.ts` (node type registry: metadata, ports, evaluate fn delegating to `lib.ts`), `src/patch/evaluator.ts`, `src/patch/store.ts` (persistence + undo), plus components `PatchCanvas.vue`, `PatchNode.vue`, `PatchWire.vue`, `NodePalette.vue`.
- **Node registry pattern**: each node type is declared once as `{ type, label, category, icon, inputs, outputs, params, evaluate }`. The palette, canvas rendering, serialization, and evaluator are all driven by this registry — adding a future operation means adding one registry entry.
- **Rendering**: nodes as absolutely-positioned Vue components inside a CSS-transformed (pan/zoom) container; wires in a single SVG layer underneath the nodes. No canvas-2D rendering needed at the expected graph sizes (≤ a few hundred nodes).
- **Dependencies**: prefer zero new runtime dependencies (hand-rolled canvas is ~straightforward with Pointer Events). If a library is used instead, choose one that is Vue-3-native, touch-capable, and MIT-licensed (e.g. Vue Flow), and gate the decision on bundle-size impact.
- **State**: Vue 3 reactivity (`reactive` graph model) is sufficient; no store library required.
- Type-check and build must pass with the existing scripts: `yarn build` (app) — no changes needed to `yarn build-tools` since the editor is app-only.

---

## 9. Accessibility

- All toolbar/palette controls are keyboard-reachable with visible focus and `aria-label`s.
- Selected node supports keyboard nudging (arrow keys) and `Delete`.
- Color is never the sole carrier of meaning: port types differ by shape, error states include an icon, wire validity feedback includes motion/toast.
- Respect `prefers-reduced-motion` (disable wire/shake animations).

---

## 10. Acceptance Criteria

1. A user can, without typing anything except literal sequence values: place two Sequence nodes, a Combine node, and a Display node; wire them; and see the combined result live — on both desktop (mouse) and mobile (touch).
2. Every Combiner (9), every Operation (54), every unary sequence operation (11), and every unary tritwise operation (14) listed in §3 is reachable as a node or node configuration, and produces output identical to the classic interface for the same inputs.
3. Changing any upstream value or parameter re-evaluates all downstream nodes automatically; errors are shown on the failing node only.
4. Attempting to create a cycle is rejected with feedback; the graph is never left in an invalid state.
5. A program with Input/Output nodes can be saved and used as a Subprogram node in another program, with correct evaluation; self-reference is rejected.
6. Programs survive page reload (autosave), and can be exported to / imported from JSON files.
7. Memory Read/Write nodes interoperate with the classic interface's `M[i]` slots in both directions.
8. The classic interface remains fully functional and unchanged in behavior.
9. Undo/redo works for all structural edits and parameter changes.
10. `yarn build` (type-check + production build) passes.

---

## Appendix A — Complete operation inventory (as of this spec)

- **Combiners (9):** Product, SwappedProduct, Divisive, Convolution, Triangular, SwappedTriangular, Recycle, Apply, Mixed Radix.
- **Operations (54):** Add, Subtract, Multiply, Divide, X, Y, Power, Log, Min, Max, Modulo, Bounce, Distance, And, Nand, Or, Nor, Implication, ReverseImplication, Xor, Xnor, ShiftBits, ProjectBits, LCM, GCD, Equal, NotEqual, LessThan, LessThanOrEqual, GreaterThan, GreaterThanOrEqual, Binomial, ExpandBits, ExpandBitsFill, CantorIntervalBinaryNumber, PermuteBits, PermuteTrits, HardThreshold, RandInt, IterateBetween, Bits, Trits, TritAnd, TritNand, TritOr, TritNor, TritCons, TritNcons, TritAny, TritNany, TritMul, TritNmul, TritSum, TritNsum.
- **Unary sequence operations (11):** Reverse, Rotate, Difference, Antidifference, Cyclical Difference, Cyclical Antidifference, Signs, Times N, Permute Blocks, Hierarchical Permute, Permutation Orbit.
- **Unary tritwise operations (14):** Buf, Not, Pnot, Nnot, Abs, Clu, Cld, Inc, Dec, Rtu, Rtd, Isp, Isz, Isn.

The implementation must derive the Combiner/Operation lists at runtime from `COMBINERS` and `OPERATIONS` in `src/lib.ts` so the editor automatically tracks future additions to `ultra-mega-enumerator`.
