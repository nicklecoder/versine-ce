import { el, fitToContent } from './dom.js';

/**
 * Numerator over denominator, stacked the way it is written on paper.
 *
 * Two boxes rather than one text field, because the notation is the thing
 * being learned. Keyboard-first: digits fill the numerator, `/` or Space or
 * Down moves to the denominator, Backspace on an empty denominator goes back.
 *
 * Enter is not handled here at all. It always means "submit", in every input
 * in the app, and the play screen owns it -- a widget that also submitted
 * would make one keypress both answer the problem and skip its own reveal.
 */
/**
 * @param {object} [spec]
 * @param {{signed?: boolean}} [opts]  whether this level ever asks for a
 *        negative answer, which only the numerator can carry
 */
export function fracInput(spec, opts = {}) {
  // Only the numerator goes negative -- a denominator never does -- so only
  // it pays the keyboard cost. The reasoning is the integer input's: no
  // iPhone numeric pad carries a minus, so a level that can go negative asks
  // for the full keyboard and accepts the extra tap.
  const box = (cls, placeholder, signable = false) => el(`input.frac-box.${cls}`, {
    'aria-label': signable ? 'Numerator' : 'Denominator',
    type: 'text', inputmode: signable && opts.signed ? 'text' : 'numeric', maxlength: 4,
    autocomplete: 'off', spellcheck: 'false', placeholder,
    oninput: (e) => {
      // A denominator is never negative, so it does not keep a minus at all.
      const clean = signable
        // The top keeps one point: a decimal typed here is answered with a
        // hint, where stripping the point turned 0.25 into 25 and marked it.
        ? e.target.value.replace(/[−–—]/g, '-').replace(/[^0-9.-]/g, '').replace(/(?!^)-/g, '')
          .replace(/(\..*)\./g, '$1')
        : e.target.value.replace(/[^0-9]/g, '');
      if (clean !== e.target.value) e.target.value = clean;
    },
  });

  const num = box('frac-box--num', 'n', true);
  const den = box('frac-box--den', 'd');
  const fits = [num, den].map((b) => fitToContent(b, 2.4));

  const onKey = (e) => {
    if (e.key === '/' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      den.focus();
      return;
    }
    if (e.key === 'Backspace' && e.target === den && den.value === '') {
      e.preventDefault();
      num.focus();
      num.setSelectionRange(num.value.length, num.value.length);
    }
    if (e.key === 'ArrowDown' && e.target === num) { e.preventDefault(); den.focus(); }
    if (e.key === 'ArrowUp' && e.target === den) { e.preventDefault(); num.focus(); }
  };
  num.addEventListener('keydown', onKey);
  den.addEventListener('keydown', onKey);

  const node = el('div.frac-input', {}, num, el('div.frac-bar'), den);

  return {
    node,
    /**
     * The two boxes as one string for the answer parser. A filled numerator
     * with an empty denominator is a whole number -- dividing fractions often
     * gives one, and making a child type "6/1" would be silly.
     */
    value: () => {
      if (num.value === '' && den.value === '') return '';
      if (den.value === '') return num.value;
      // A bottom with no top is half an answer, not zero: let it fail to
      // parse, so it is refused with a hint instead of marked wrong.
      return `${num.value}/${den.value}`;
    },
    /**
     * Enter with the top typed and the bottom still empty moves down instead
     * of answering, since submitting the half-typed fraction would cost an
     * attempt. From the bottom box, Enter answers -- so a whole number is two
     * presses. True when it moved, and the play screen then does not submit.
     */
    advance() {
      if (document.activeElement !== num || num.value === '' || den.value !== '') return false;
      den.focus();
      return true;
    },
    select() { num.focus(); num.select(); },
    clear() { num.value = ''; den.value = ''; fits.forEach((f) => f()); },
    focus() { num.focus(); },
    contains: (element) => element === num || element === den,
    setState(state) {
      for (const b of [num, den]) {
        b.classList.remove('is-right', 'is-wrong');
        if (state) b.classList.add(`is-${state}`);
      }
    },
  };
}
