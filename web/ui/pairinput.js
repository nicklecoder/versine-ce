import { el, fitToContent } from './dom.js';

/**
 * An ordered pair, written the way it is on paper: ( x , y ).
 *
 * Two boxes rather than one text field, for the reason the fraction input
 * has two: the notation is part of what is being learned, and a pair typed
 * into one box as "3 2" loses the order that is the whole of its meaning.
 * Keyboard-first: a comma, Space or Right moves to y; Backspace on an empty
 * y goes back to x.
 *
 * Each half takes a whole number, a fraction or a decimal, since a system's
 * solution is not always whole. Enter is the play screen's, as everywhere.
 *
 * @param {object} [spec]
 * @param {{signed?: boolean}} [opts]  whether this level ever asks for a
 *        negative coordinate, which decides the keyboard as it does elsewhere
 */
export function pairInput(spec, opts = {}) {
  const box = (cls, placeholder) => el(`input.pair-box.${cls}`, {
    'aria-label': `${placeholder} coordinate`,
    // requiem: catalogue/library/answer-typeable-in-its-boxes
    type: 'text', inputmode: opts.signed ? 'text' : 'decimal', maxlength: 7,
    autocomplete: 'off', spellcheck: 'false', placeholder,
    oninput: (e) => {
      const clean = e.target.value.replace(/[^0-9./−-]/g, '').replace(/(?!^)[−-]/g, '');
      if (clean !== e.target.value) e.target.value = clean;
    },
  });

  const x = box('pair-box--x', 'x');
  const y = box('pair-box--y', 'y');
  const fits = [x, y].map((b) => fitToContent(b, 3.2));

  const onKey = (e) => {
    if (e.target === x && (e.key === ',' || e.key === ' '
        || (e.key === 'ArrowRight' && x.selectionStart === x.value.length))) {
      e.preventDefault();
      e.stopPropagation();
      y.focus();
      return;
    }
    if (e.target === y && ((e.key === 'Backspace' && y.value === '')
        || (e.key === 'ArrowLeft' && y.selectionStart === 0))) {
      e.preventDefault();
      x.focus();
      x.setSelectionRange(x.value.length, x.value.length);
    }
  };
  x.addEventListener('keydown', onKey);
  y.addEventListener('keydown', onKey);

  const node = el('div.pair-input', {},
    el('span.pair-mark', {}, '('), x, el('span.pair-mark', {}, ','), y, el('span.pair-mark', {}, ')'));

  return {
    node,
    /** Both halves as one string for the parser; one empty half parses as nothing. */
    value: () => (x.value === '' && y.value === '' ? '' : `${x.value},${y.value}`),
    select() { x.focus(); x.select(); },
    clear() { x.value = ''; y.value = ''; fits.forEach((f) => f()); },
    focus() { x.focus(); },
    contains: (element) => element === x || element === y,
    setState(state) {
      for (const b of [x, y]) {
        b.classList.remove('is-right', 'is-wrong');
        if (state) b.classList.add(`is-${state}`);
      }
    },
  };
}
