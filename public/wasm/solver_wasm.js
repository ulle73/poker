/* @ts-self-types="./solver_wasm.d.ts" */

/**
 * A loaded or freshly solved spot: the strategies, plus everything needed to answer
 * questions about them without re-solving.
 */
export class SolutionHandle {
    static __wrap(ptr) {
        const obj = Object.create(SolutionHandle.prototype);
        obj.__wbg_ptr = ptr;
        SolutionHandleFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        SolutionHandleFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_solutionhandle_free(ptr, 0);
    }
    /**
     * Live combos `player` can hold at `id` — the combo axis of every array below.
     * @param {number} id
     * @param {number} player
     * @returns {number}
     */
    combo_count(id, player) {
        const ret = wasm.solutionhandle_combo_count(this.__wbg_ptr, id, player);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return ret[0] >>> 0;
    }
    /**
     * The weight each entry of [`SolutionHandle::combo_evs`] carries when aggregating,
     * as a `Float32Array` in the same slot order.
     *
     * `sum(weight * ev) / sum(weight)` over the non-`NaN` slots is `player`'s EV in
     * chips for their whole range at this node, on the zero-sum convention. At the root
     * that reproduces `root_evs().zero_sum[player]` exactly.
     *
     * It is `reach * compatible_mass`: how much of this player's range holds the combo,
     * times how much of the opponent's range can be there facing it.
     * @param {number} id
     * @param {number} player
     * @returns {Float32Array}
     */
    combo_ev_weights(id, player) {
        const ret = wasm.solutionhandle_combo_ev_weights(this.__wbg_ptr, id, player);
        if (ret[3]) {
            throw takeFromExternrefTable0(ret[2]);
        }
        var v1 = getArrayF32FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * Per-combo EV in chips for `player` at node `id`, as a `Float32Array` in the same
     * slot order as [`SolutionHandle::combos`].
     *
     * # What the number means
     *
     * "What this hand is worth here, in chips, if the hand is played out from this node
     * with both players following the solved average strategy." It is a **zero-sum** EV:
     * net chips against the start of the solve, so the two players' range-level figures
     * sum to 0 (less rake), not to the pot. Add `starting_pot / 2` for the pot-share
     * convention — see [`SolutionHandle::root_evs`], which reports both.
     *
     * # How it is computed
     *
     * The opponent's reach vector at `id` is walked down from the root (range weights,
     * times the opponent's average-strategy probabilities on the path, compacted and
     * weighted across each chance edge) and handed to `br::subtree_values` with
     * `maximize = false`. Each combo's raw counterfactual value is then divided by that
     * combo's **compatible opponent mass** at this node — without it a hand that blocks
     * most of the opponent's range would look small purely because less mass reaches it.
     *
     * That is the whole denominator. The engine's deal weights are conditional
     * (`1 / (unseen - 4)`, since four of the unseen cards are in the two players' hands),
     * so every pair carries exactly one unit of runout mass at every chance depth and
     * there is no residual runout factor left to divide out.
     *
     * # Zero mass
     *
     * A combo whose compatible opponent mass at this node is 0 — the opponent's range
     * cannot reach here holding anything this hand does not block — has **no defined
     * EV**, and its slot is `NaN`. Test with `Number.isNaN` and render it as blank, not
     * as 0.0: a chip value of zero means break-even, which is a different claim. (The
     * engine's own `root_combo_evs` returns 0.0 in the same situation; this deliberately
     * does not.)
     * @param {number} id
     * @param {number} player
     * @returns {Float32Array}
     */
    combo_evs(id, player) {
        const ret = wasm.solutionhandle_combo_evs(this.__wbg_ptr, id, player);
        if (ret[3]) {
            throw takeFromExternrefTable0(ret[2]);
        }
        var v1 = getArrayF32FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * `player`'s live combos at `id`, in slot order, as a JSON array of
     * `{index, cards, weight}`.
     *
     * `index` is the canonical 1326-combo index (matching [`parse_range`] and
     * [`combo_labels`]), `cards` is e.g. `"AhKh"`, and `weight` is that combo's reach at
     * this node: its range weight times this player's own average-strategy probability
     * for every action taken on the path here. Deal probabilities are excluded, so the
     * weights stay on the range's own scale — use them for a range grid, and
     * [`SolutionHandle::combo_ev_weights`] to average EVs.
     * @param {number} id
     * @param {number} player
     * @returns {string}
     */
    combos(id, player) {
        let deferred2_0;
        let deferred2_1;
        try {
            const ret = wasm.solutionhandle_combos(this.__wbg_ptr, id, player);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * Solve metadata and the headline numbers, as a JSON string:
     * `format_version`, `engine_version`, `iterations`, `wall_seconds`,
     * `exploitability_chips`, `exploitability_pct_of_pot`, `payoff_unit`, `gain`,
     * `root_evs` (both conventions), `node_count`, `board`, `street`, `starting_pot`,
     * `effective_stack`, `oop_range`, `ip_range`, `root_combos` (counts per player),
     * `tournament`, and `locks`.
     *
     * `payoff_unit` is `"chips"` for an ordinary solve and `"cste"` when the spot was
     * scored in tournament equity. Under `"cste"` the game is general-sum, so
     * `exploitability_chips` holds **NashConv**, not a bound on either player's loss,
     * and a UI must not call it exploitability. `gain` is `[OOP, IP]`, each player's
     * unilateral best-response gain, and the two sum to `exploitability_chips`.
     *
     * `tournament` is `null` for a chip solve. Otherwise it carries the structure the
     * spot was scored against — `stacks` (chips behind per seat at this node),
     * `payouts` (prize per finishing place), `seats` (`[OOP, IP]` indices into
     * `stacks`) — plus `bubble_factors`, the pairwise matrix `m[hero][villain]` at each
     * pair's effective risk. A cell is `null` where the factor is not finite (a seat
     * that already holds every prize the structure pays).
     *
     * `stacks` is the structure as written; the factors are measured one step later,
     * at the stacks the payoff map is centred on (each in-hand seat credited half the
     * starting pot), because that is the table the solve actually scored. On the
     * shipped river/bubble fixtures the two reference points differ in the first
     * decimal of the factor.
     *
     * `locks` is one `{node, player, line}` per frozen decision node, in config order —
     * empty for an ordinary solve. Those nodes' strategies are the locked distributions
     * rather than solved ones, which is what a UI badge should say, and
     * `exploitability_*` is measured against the locked profile.
     * @returns {string}
     */
    meta() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.solutionhandle_meta(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Everything public about one node, as a JSON string.
     *
     * Always: `id`, `kind` (`"decision"`/`"chance"`/`"terminal"`), `street`, `board`
     * (card strings known at this node), `pot`, `stacks` `[oop, ip]`.
     *
     * Decision nodes add `player`, `locked` (true when this node's strategy was frozen
     * by a config lock rather than solved), and `actions`, each
     * `{label, text, amount_to, percent_of_pot, child}` — `label` is one of
     * `fold`/`check`/`call`/`bet`/`raise`/`allin`; `amount_to` is the street total the
     * player has in after the action (bet/raise only, else `null`); `percent_of_pot` is
     * the sizing as the config expresses it — against the pot at this node for a bet,
     * against the post-call pot for a raise (`null` otherwise).
     *
     * Chance nodes add `valid_cards`, one `{card, child}` per card that can still be
     * dealt (every card not already on `board`).
     *
     * Terminal nodes add `terminal`: `{"kind":"fold","folder":p,"pot":x}` where `pot` is
     * the matched pot with the uncalled bet already returned, or
     * `{"kind":"showdown","pot":x}`.
     * @param {number} id
     * @returns {string}
     */
    node(id) {
        let deferred2_0;
        let deferred2_1;
        try {
            const ret = wasm.solutionhandle_node(this.__wbg_ptr, id);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * Number of nodes in the tree. Valid ids are `0 .. node_count()`.
     * @returns {number}
     */
    get node_count() {
        const ret = wasm.solutionhandle_node_count(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Actions at a decision node; 0 at a chance or terminal node.
     * @param {number} id
     * @returns {number}
     */
    num_actions(id) {
        const ret = wasm.solutionhandle_num_actions(this.__wbg_ptr, id);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return ret[0] >>> 0;
    }
    /**
     * Root EVs in both display conventions, as a JSON string
     * `{"zero_sum":[oop,ip],"pot_share":[oop,ip]}`.
     *
     * `zero_sum` is net chips against the start of the solve and sums to 0 (less rake).
     * `pot_share` is the PioSOLVER-style pot-inclusive figure and sums to the starting
     * pot. Both are per hand, averaged over each player's whole range.
     * @returns {string}
     */
    root_evs() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.solutionhandle_root_evs(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * The average strategy at decision node `id` as a `Float32Array`, **action-major**:
     * `strategy[a * combo_count(id, player) + i]` is the probability the acting player
     * takes action `a` with combo slot `i`. Each combo's entries sum to 1.
     *
     * A combo that never reached this node is reported uniform over the actions, which
     * is the engine's convention, not a solved frequency.
     * @param {number} id
     * @returns {Float32Array}
     */
    strategy(id) {
        const ret = wasm.solutionhandle_strategy(this.__wbg_ptr, id);
        if (ret[3]) {
            throw takeFromExternrefTable0(ret[2]);
        }
        var v1 = getArrayF32FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * Re-serializes this solution to JSON, for download or for a later
     * [`load_solution`]. Round-trips exactly: a handle from [`solve_spot`] and the
     * handle from `load_solution(handle.to_json())` hold identical data.
     * @returns {string}
     */
    to_json() {
        let deferred2_0;
        let deferred2_1;
        try {
            const ret = wasm.solutionhandle_to_json(this.__wbg_ptr);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
}
if (Symbol.dispose) SolutionHandle.prototype[Symbol.dispose] = SolutionHandle.prototype.free;

/**
 * The 1326 canonical combo labels (`"AhKh"`) in combo-index order, as a JSON array.
 *
 * Call once and cache: it is the axis every weight array from [`parse_range`] is
 * indexed by.
 * @returns {string}
 */
export function combo_labels() {
    let deferred1_0;
    let deferred1_1;
    try {
        const ret = wasm.combo_labels();
        deferred1_0 = ret[0];
        deferred1_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
}

/**
 * Parses and validates a saved solution document.
 *
 * `json` is the text of a file written by `Solution::save` / [`SolutionHandle::to_json`].
 * The engine's structure guard runs first (node count, per-node acting player, action
 * count and array length against a tree rebuilt from the embedded config); this then
 * additionally checks that **every** decision node in the rebuilt tree carries a
 * strategy of the right combo width, because a gap there would panic later inside the
 * best-response walk, and a wasm panic cannot be caught.
 * @param {string} json
 * @returns {SolutionHandle}
 */
export function load_solution(json) {
    const ptr0 = passStringToWasm0(json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.load_solution(ptr0, len0);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return SolutionHandle.__wrap(ret[0]);
}

/**
 * Expands a range string into per-combo weights, for a range-editor preview grid.
 *
 * `"random"` (any case) is the full 1326-combo range; anything else is standard range
 * notation. Returns a JSON string
 * `{"num_combos":1326,"nonzero":N,"total_weight":W,"weights":[...1326 floats...]}`,
 * indexed by canonical combo index — the same index [`combo_labels`] labels and the
 * same one [`SolutionHandle::combos`] reports per slot.
 * @param {string} range
 * @returns {string}
 */
export function parse_range(range) {
    let deferred3_0;
    let deferred3_1;
    try {
        const ptr0 = passStringToWasm0(range, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.parse_range(ptr0, len0);
        var ptr2 = ret[0];
        var len2 = ret[1];
        if (ret[3]) {
            ptr2 = 0; len2 = 0;
            throw takeFromExternrefTable0(ret[2]);
        }
        deferred3_0 = ptr2;
        deferred3_1 = len2;
        return getStringFromWasm0(ptr2, len2);
    } finally {
        wasm.__wbindgen_free(deferred3_0, deferred3_1, 1);
    }
}

/**
 * Solves a spot in the browser and returns a handle on the result.
 *
 * `config_toml` is the same TOML the CLI reads. `max_iterations` and `target_pct`
 * override the config's own `max_iterations` / `target_exploitability`: the run stops at
 * whichever comes first, `target_pct` being exploitability as a **percent of the pot**.
 *
 * `report_every` is both the progress interval and the granularity of the stop check, so
 * it must be at least 1. Each report costs two full best-response walks — keep it coarse.
 *
 * `on_progress(iteration, exploitability_chips, exploitability_pct_of_pot)` is called on
 * the calling thread; an exception it throws is swallowed so a UI bug cannot abandon a
 * half-finished solve. There is no yielding: this blocks until the run ends, so drive it
 * from a Web Worker if the page must stay responsive.
 *
 * Call [`tree_stats`] first. This allocates `solver_storage_bytes` up front, and a
 * failed allocation in wasm aborts the module rather than returning an error.
 *
 * # Node locking
 *
 * `[[locks]]` entries in the TOML freeze the acting player's strategy at the nodes
 * their lines name, and the rest of the tree is solved around them — see
 * [`engine::config::NodeLock`] for the syntax. There is no separate argument: the locks
 * are part of the spot, they travel in the config the returned handle embeds, and
 * `to_json()` -> [`load_solution`] reproduces the same constrained game. A locked node's
 * `strategy(id)` is the frozen distribution exactly, and `meta().locks` says which nodes
 * they are. Exploitability then means exploitability *given* the locks; see the
 * `engine::br` module docs.
 * @param {string} config_toml
 * @param {number} max_iterations
 * @param {number} target_pct
 * @param {number} report_every
 * @param {Function} on_progress
 * @returns {SolutionHandle}
 */
export function solve_spot(config_toml, max_iterations, target_pct, report_every, on_progress) {
    const ptr0 = passStringToWasm0(config_toml, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.solve_spot(ptr0, len0, max_iterations, target_pct, report_every, on_progress);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return SolutionHandle.__wrap(ret[0]);
}

export function start() {
    wasm.start();
}

/**
 * Preflight for [`solve_spot`]: what this config would cost, without solving it.
 *
 * Builds the tree and per-board combo tables — the same setup a solve does — but never
 * allocates the solver's regret/strategy arrays. Returns a JSON string:
 *
 * ```json
 * {
 *   "nodes": { "decision": 3, "chance": 0, "fold": 2, "showdown": 2, "total": 12 },
 *   "boards": 1,
 *   "root_combos": [11, 12],
 *   "strategy_entries": 46,
 *   "solver_storage_bytes": 368,
 *   "solution_strategy_bytes": 184,
 *   "chance_map_bytes": 0,
 *   "total_bytes": 368
 * }
 * ```
 *
 * `locks` is the number of `[[locks]]` entries in the config that resolved, and is the
 * cheapest way to find out whether a config's locks are well formed: this call builds
 * the tree, so a bad line or a mis-shaped distribution is reported here rather than
 * after a solve has been paid for.
 *
 * `strategy_entries` is the number of (action, combo) pairs over all decision nodes.
 * `solver_storage_bytes` is `entries * 2 * 4` — the regret and cumulative-strategy
 * arrays a solve needs resident. `solution_strategy_bytes` is `entries * 4`, the size
 * of the strategy payload in the exported JSON's numeric form (the text encoding is
 * several times larger). `total_bytes` is `solver_storage_bytes + chance_map_bytes`,
 * the figure to compare against a browser's budget.
 * @param {string} config_toml
 * @returns {string}
 */
export function tree_stats(config_toml) {
    let deferred3_0;
    let deferred3_1;
    try {
        const ptr0 = passStringToWasm0(config_toml, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.tree_stats(ptr0, len0);
        var ptr2 = ret[0];
        var len2 = ret[1];
        if (ret[3]) {
            ptr2 = 0; len2 = 0;
            throw takeFromExternrefTable0(ret[2]);
        }
        deferred3_0 = ptr2;
        deferred3_1 = len2;
        return getStringFromWasm0(ptr2, len2);
    } finally {
        wasm.__wbindgen_free(deferred3_0, deferred3_1, 1);
    }
}
function __wbg_get_imports() {
    const import0 = {
        __proto__: null,
        __wbg___wbindgen_throw_bb96b2010945f0bc: function(arg0, arg1) {
            throw new Error(getStringFromWasm0(arg0, arg1));
        },
        __wbg_call_39f824e18d9d2414: function() { return handleError(function (arg0, arg1, arg2, arg3, arg4) {
            const ret = arg0.call(arg1, arg2, arg3, arg4);
            return ret;
        }, arguments); },
        __wbg_error_757e9472f8410341: function(arg0, arg1) {
            let deferred0_0;
            let deferred0_1;
            try {
                deferred0_0 = arg0;
                deferred0_1 = arg1;
                console.error(getStringFromWasm0(arg0, arg1));
            } finally {
                wasm.__wbindgen_free(deferred0_0, deferred0_1, 1);
            }
        },
        __wbg_new_227d7c05414eb861: function() {
            const ret = new Error();
            return ret;
        },
        __wbg_now_8b265300afd5f2b9: function() {
            const ret = Date.now();
            return ret;
        },
        __wbg_stack_3b0d974bbf31e44f: function(arg0, arg1) {
            const ret = arg1.stack;
            const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        },
        __wbindgen_cast_0000000000000001: function(arg0) {
            // Cast intrinsic for `F64 -> Externref`.
            const ret = arg0;
            return ret;
        },
        __wbindgen_cast_0000000000000002: function(arg0, arg1) {
            // Cast intrinsic for `Ref(String) -> Externref`.
            const ret = getStringFromWasm0(arg0, arg1);
            return ret;
        },
        __wbindgen_init_externref_table: function() {
            const table = wasm.__wbindgen_externrefs;
            const offset = table.grow(4);
            table.set(0, undefined);
            table.set(offset + 0, undefined);
            table.set(offset + 1, null);
            table.set(offset + 2, true);
            table.set(offset + 3, false);
        },
    };
    return {
        __proto__: null,
        "./solver_wasm_bg.js": import0,
    };
}

const SolutionHandleFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_solutionhandle_free(ptr, 1));

function addToExternrefTable0(obj) {
    const idx = wasm.__externref_table_alloc();
    wasm.__wbindgen_externrefs.set(idx, obj);
    return idx;
}

function getArrayF32FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getFloat32ArrayMemory0().subarray(ptr / 4, ptr / 4 + len);
}

let cachedDataViewMemory0 = null;
function getDataViewMemory0() {
    if (cachedDataViewMemory0 === null || cachedDataViewMemory0.buffer.detached === true || (cachedDataViewMemory0.buffer.detached === undefined && cachedDataViewMemory0.buffer !== wasm.memory.buffer)) {
        cachedDataViewMemory0 = new DataView(wasm.memory.buffer);
    }
    return cachedDataViewMemory0;
}

let cachedFloat32ArrayMemory0 = null;
function getFloat32ArrayMemory0() {
    if (cachedFloat32ArrayMemory0 === null || cachedFloat32ArrayMemory0.byteLength === 0) {
        cachedFloat32ArrayMemory0 = new Float32Array(wasm.memory.buffer);
    }
    return cachedFloat32ArrayMemory0;
}

function getStringFromWasm0(ptr, len) {
    return decodeText(ptr >>> 0, len);
}

let cachedUint8ArrayMemory0 = null;
function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

function handleError(f, args) {
    try {
        return f.apply(this, args);
    } catch (e) {
        const idx = addToExternrefTable0(e);
        wasm.__wbindgen_exn_store(idx);
    }
}

function passStringToWasm0(arg, malloc, realloc) {
    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length, 1) >>> 0;
        getUint8ArrayMemory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }

    let len = arg.length;
    let ptr = malloc(len, 1) >>> 0;

    const mem = getUint8ArrayMemory0();

    let offset = 0;

    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7F) break;
        mem[ptr + offset] = code;
    }
    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = realloc(ptr, len, len = offset + arg.length * 3, 1) >>> 0;
        const view = getUint8ArrayMemory0().subarray(ptr + offset, ptr + len);
        const ret = cachedTextEncoder.encodeInto(arg, view);

        offset += ret.written;
        ptr = realloc(ptr, len, offset, 1) >>> 0;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}

function takeFromExternrefTable0(idx) {
    const value = wasm.__wbindgen_externrefs.get(idx);
    wasm.__externref_table_dealloc(idx);
    return value;
}

let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
cachedTextDecoder.decode();
const MAX_SAFARI_DECODE_BYTES = 2146435072;
let numBytesDecoded = 0;
function decodeText(ptr, len) {
    numBytesDecoded += len;
    if (numBytesDecoded >= MAX_SAFARI_DECODE_BYTES) {
        cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
        cachedTextDecoder.decode();
        numBytesDecoded = len;
    }
    return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}

const cachedTextEncoder = new TextEncoder();

if (!('encodeInto' in cachedTextEncoder)) {
    cachedTextEncoder.encodeInto = function (arg, view) {
        const buf = cachedTextEncoder.encode(arg);
        view.set(buf);
        return {
            read: arg.length,
            written: buf.length
        };
    };
}

let WASM_VECTOR_LEN = 0;

let wasmModule, wasmInstance, wasm;
function __wbg_finalize_init(instance, module) {
    wasmInstance = instance;
    wasm = instance.exports;
    wasmModule = module;
    cachedDataViewMemory0 = null;
    cachedFloat32ArrayMemory0 = null;
    cachedUint8ArrayMemory0 = null;
    wasm.__wbindgen_start();
    return wasm;
}

async function __wbg_load(module, imports) {
    if (typeof Response === 'function' && module instanceof Response) {
        if (!module.ok) {
            throw new Error(`failed to fetch Wasm: ${module.status} ${module.statusText} fetching '${module.url}'`);
        }

        if (typeof WebAssembly.instantiateStreaming === 'function') {
            try {
                return await WebAssembly.instantiateStreaming(module, imports);
            } catch (e) {
                const validResponse = expectedResponseType(module.type);

                if (validResponse && module.headers.get('Content-Type') !== 'application/wasm') {
                    console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);

                } else { throw e; }
            }
        }

        const bytes = await module.arrayBuffer();
        return await WebAssembly.instantiate(bytes, imports);
    } else {
        const instance = await WebAssembly.instantiate(module, imports);

        if (instance instanceof WebAssembly.Instance) {
            return { instance, module };
        } else {
            return instance;
        }
    }

    function expectedResponseType(type) {
        switch (type) {
            case 'basic': case 'cors': case 'default': return true;
        }
        return false;
    }
}

function initSync(module) {
    if (wasm !== undefined) return wasm;


    if (module !== undefined) {
        if (Object.getPrototypeOf(module) === Object.prototype) {
            ({module} = module)
        } else {
            console.warn('using deprecated parameters for `initSync()`; pass a single object instead')
        }
    }

    const imports = __wbg_get_imports();
    if (!(module instanceof WebAssembly.Module)) {
        module = new WebAssembly.Module(module);
    }
    const instance = new WebAssembly.Instance(module, imports);
    return __wbg_finalize_init(instance, module);
}

async function __wbg_init(module_or_path) {
    if (wasm !== undefined) return wasm;


    if (module_or_path !== undefined) {
        if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
            ({module_or_path} = module_or_path)
        } else {
            console.warn('using deprecated parameters for the initialization function; pass a single object instead')
        }
    }

    if (module_or_path === undefined) {
        module_or_path = new URL('solver_wasm_bg.wasm', import.meta.url);
    }
    const imports = __wbg_get_imports();

    if (typeof module_or_path === 'string' || (typeof Request === 'function' && module_or_path instanceof Request) || (typeof URL === 'function' && module_or_path instanceof URL)) {
        module_or_path = fetch(module_or_path);
    }

    const { instance, module } = await __wbg_load(await module_or_path, imports);

    return __wbg_finalize_init(instance, module);
}

export { initSync, __wbg_init as default };
