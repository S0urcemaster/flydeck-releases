/* tslint:disable */
/* eslint-disable */

export class LifeEngine {
  free(): void;
  [Symbol.dispose](): void;
  constructor(canvas: HTMLCanvasElement, canvas_width: number, canvas_height: number, cell_size: number, is_blurry: boolean);
  tick(): void;
  reset(): void;
  resize(width: number, height: number): void;
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly __wbg_lifeengine_free: (a: number, b: number) => void;
  readonly lifeengine_new: (a: any, b: number, c: number, d: number, e: number) => [number, number, number];
  readonly lifeengine_reset: (a: number) => void;
  readonly lifeengine_resize: (a: number, b: number, c: number) => void;
  readonly lifeengine_tick: (a: number) => void;
  readonly __wbindgen_exn_store: (a: number) => void;
  readonly __externref_table_alloc: () => number;
  readonly __wbindgen_externrefs: WebAssembly.Table;
  readonly __externref_table_dealloc: (a: number) => void;
  readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
* Instantiates the given `module`, which can either be bytes or
* a precompiled `WebAssembly.Module`.
*
* @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
*
* @returns {InitOutput}
*/
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
*
* @returns {Promise<InitOutput>}
*/
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
