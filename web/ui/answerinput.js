import { el } from './dom.js';
import { fracInput } from './fracinput.js';
import { mixedInput } from './mixedinput.js';
import { choiceInput } from './choiceinput.js';
import { freeInput } from './freeinput.js';
import { pairInput } from './pairinput.js';
import { getType } from '../math/answer.js';

/**
 * The answer widget, chosen by the problem's answer type.
 *
 * Every widget presents the same small surface to the play screen, so the
 * screen never learns whether it is collecting an integer or a fraction:
 *
 *   node, value(), clear(), focus(), contains(el), setState('right'|'wrong'|null)
 *
 * and optionally select(), which puts a wrong answer up to be typed over, and
 * advance(), which takes an Enter that would submit half an answer.
 *
 * No widget handles Enter for submission. The play screen owns that key, so a
 * single keypress can never both answer the problem and skip its own reveal.
 */

/**
 * @param {object} [spec]   the problem's answer spec
 * @param {{signed?: boolean}} [opts]  whether this level ever asks for a
 *        negative answer
 */
function intInput(spec, opts = {}) {
  // No iPhone keyboard is both numeric and has a minus: not type="number", not
  // inputmode="numeric" or "decimal", not type="tel". The only one carrying a
  // minus is the full keyboard, where it sits on the 123 layer. So on levels
  // that can go negative we ask for the full keyboard and accept the extra
  // tap; on the other 26 levels the numeric pad is still the better keyboard.
  //
  // Android's numeric pad does have a minus, so this costs it something. It is
  // applied to both rather than sniffing the platform, because two kids on
  // different phones should meet the same app.
  const input = el('input.answer', {
    type: 'text', inputmode: opts.signed ? 'text' : 'numeric',
    // requiem: catalogue/library/answer-typeable-in-its-boxes
    pattern: '-?[0-9]*', maxlength: 7,
    autocomplete: 'off', autocorrect: 'off', spellcheck: 'false', placeholder: '?', 'aria-label': 'Answer',
    oninput: () => {
      // A decimal box keeps commas and a slash as typed, and reads them only
      // on submit: mid-typing, "4," cannot yet tell 4,8 from 4,800.
      // A minus pasted from the prompt is U+2212, and some keyboards type an
      // en dash: each is a minus, not a stray character to drop.
      const clean = input.value.replace(/[−–—]/g, '-').replace(opts.comma ? /[^0-9.,/-]/g : /[^0-9.-]/g, '')
        .replace(/(?!^)-/g, '')
        .replace(/(\..*)\./g, '$1');
      if (clean !== input.value) input.value = clean;
    },
  });

  return {
    node: input,
    value: () => (opts.comma ? decimalTyped(input.value) : input.value),
    select() { input.focus(); input.select(); },
    clear() { input.value = ''; },
    focus() { input.focus(); },
    contains: (element) => element === input,
    setState(state) {
      input.classList.remove('is-right', 'is-wrong');
      if (state) input.classList.add(`is-${state}`);
    },
  };
}

/**
 * A comma read the way it was meant. 4,800 and 12,000 are grouped thousands,
 * as the prompts write them; 4,8 is a decimal comma, the decimal key on a
 * German or French iPhone. Converting every comma to a point as it was typed
 * made 4,800 into 4.8 and marked a right answer wrong.
 */
// requiem: play/answers/thousands-comma-read
export function decimalTyped(raw) {
  const s = String(raw).trim();
  if (/^-?\d{1,3}(,\d{3})+(\.\d*)?$/.test(s)) return s.replace(/,/g, '');
  if (/^-?\d*,\d*$/.test(s)) return s.replace(',', '.');
  return s;
}

/**
 * Decimals reuse the integer box with a decimal pad and a dot allowed. iOS
 * offers a decimal point on `inputmode="decimal"` -- but still no minus, so a
 * level that can go negative falls back to the full keyboard exactly as the
 * integer input does.
 */
function decimalInput(spec, opts = {}) {
  const w = intInput(spec, { ...opts, comma: true });
  w.node.setAttribute('inputmode', opts.signed ? 'text' : 'decimal');
  w.node.setAttribute('pattern', '-?[0-9]*\\.?[0-9]*');
  // requiem: catalogue/library/answer-fits-its-box
  // −0.00000276 is eleven characters, and scientific notation read back
  // needs every one of them.
  w.node.setAttribute('maxlength', '12');
  // Wide enough to show a long one whole: 14062.5, −0.000056.
  w.node.classList.add('answer--decimal');
  return w;
}

const WIDGETS = {
  int: intInput, frac: fracInput, mixed: mixedInput,
  choice: choiceInput, decimal: decimalInput, free: freeInput, pair: pairInput,
};

/**
 * @param {string} answerType
 * @param {object} [spec] the problem's answer spec, for widgets that need it
 */
export function makeAnswerInput(answerType, spec, opts = {}) {
  const kind = getType(answerType).input;
  return (WIDGETS[kind] ?? intInput)(spec, opts);
}
