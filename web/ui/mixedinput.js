import { el, fitToContent } from './dom.js';

/**
 * Whole number beside a fraction: 1 3/4, written the way it is on paper.
 *
 * Keyboard: digits fill the whole; space or `/` steps into the fraction;
 * `/` again steps to the denominator. Enter always submits — it never
 * navigates, so the rule is the same in every input in the app.
 */
export function mixedInput() {
  const LABEL = { w: 'Whole number', n: 'Numerator', d: 'Denominator' };
  const box = (cls, placeholder, size) => el('input', {
    'aria-label': LABEL[placeholder],
    class: cls,
    type: 'text', inputmode: 'numeric', maxlength: size,
    autocomplete: 'off', spellcheck: 'false', placeholder,
    oninput: (e) => {
      const clean = e.target.value.replace(/\D/g, '');
      if (clean !== e.target.value) e.target.value = clean;
    },
  });

  const whole = box('mixed-whole', 'w', 3);
  const num = box('frac-box frac-box--num', 'n', 3);
  const den = box('frac-box frac-box--den', 'd', 3);
  const boxes = [whole, num, den];
  const fits = [fitToContent(whole, 1.6), fitToContent(num, 2.4), fitToContent(den, 2.4)];

  const onKey = (e) => {
    const i = boxes.indexOf(e.target);
    if (e.key === '/' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      boxes[Math.min(i + 1, boxes.length - 1)].focus();
      return;
    }
    if (e.key === 'Backspace' && e.target.value === '' && i > 0) {
      e.preventDefault();
      boxes[i - 1].focus();
      return;
    }
    if ((e.key === 'ArrowRight' || e.key === 'ArrowDown') && i < boxes.length - 1) {
      e.preventDefault(); e.stopPropagation(); boxes[i + 1].focus();
    }
    if ((e.key === 'ArrowLeft' || e.key === 'ArrowUp') && i > 0) {
      e.preventDefault(); e.stopPropagation(); boxes[i - 1].focus();
    }
  };
  boxes.forEach((b) => b.addEventListener('keydown', onKey));

  const node = el('div.mixed-input', {},
    whole,
    el('div.frac-input', {}, num, el('div.frac-bar'), den));

  return {
    node,
    value: () => {
      const w = whole.value.trim();
      const f = num.value && den.value ? `${num.value}/${den.value}`
        : num.value ? `${num.value}/` : '';
      if (!w && !f) return '';
      return [w, f].filter(Boolean).join(' ');
    },
    select() { whole.focus(); whole.select(); },
    clear() { boxes.forEach((b) => { b.value = ''; }); fits.forEach((f) => f()); },
    focus() { whole.focus(); },
    contains: (element) => boxes.includes(element),
    setState(state) {
      boxes.forEach((b) => {
        b.classList.remove('is-right', 'is-wrong');
        if (state) b.classList.add(`is-${state}`);
      });
    },
  };
}
