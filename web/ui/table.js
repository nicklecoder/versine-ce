import { el, mount } from './dom.js';

/**
 * A table of values: a header row naming the columns, then one row per pair.
 *
 * Named after its shape rather than a lesson, so that the proportional
 * relationships that first needed it are not the only skill that can use it:
 * functions, linear models and sequences all hand a student a table and ask
 * what it says.
 *
 * Cells are strings the catalogue already wrote, never values the renderer
 * works out. A cell reading '?' is the one being asked about; `fill`, the
 * string that belongs there, is withheld until an answer is committed, so a
 * table cannot show its own answer while the question is open.
 *
 * `working` is a column of the same kind: one cell per row, headed
 * `workingCol`, and drawn only on reveal. It is where a table whose question
 * is about the whole of it -- is this proportional, what is the constant --
 * shows the row-by-row step that decided the answer.
 *
 * @typedef {{cols:string[], rows:string[][], fill?:string, note?:string,
 *   workingCol?:string, working?:string[]}} TableSpec
 */

/**
 * @param {HTMLElement} container
 * @param {TableSpec} spec
 * @param {{reveal?:boolean, verdict?:'ok'|'bad'}} [opts]
 */
export function drawTable(container, spec, { reveal = false, verdict = null } = {}) {
  const { cols, rows, fill, note, workingCol, working } = spec;
  const shown = reveal && working !== undefined;
  const cell = (v) => {
    if (v !== '?') return el('td', {}, v);
    if (reveal && fill !== undefined) {
      return el('td.is-answer', {}, fill,
        verdict ? el('span', { class: `bar-verdict is-${verdict}` }, verdict === 'ok' ? '✓' : '✗') : null);
    }
    return el('td.is-blank', {}, '?');
  };
  mount(container, el('div.vtable', {},
    el('table', {},
      el('thead', {}, el('tr', {}, ...cols.map((c) => el('th', {}, c)),
        shown ? el('th.is-answer', {}, workingCol ?? '') : null)),
      el('tbody', {}, ...rows.map((r, i) => el('tr', {}, ...r.map(cell),
        shown ? el('td.is-answer', {}, working[i] ?? '') : null)))),
    note ? el('p.vtable-note', {}, note) : null));
}
