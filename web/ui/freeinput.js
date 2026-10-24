import { el } from './dom.js';
import { renderPrompt } from './prompt.js';
import { previewOf } from './express.js';
import { getType } from '../math/answer.js';

/**
 * A single box, with the input rendered back as notation above it.
 *
 * Unstructured entry is unnerving because nothing tells you whether the system
 * read what you meant. So it shows you: type `2^1/2` and see the exponent bound
 * tightly, whether or not that is what you expected.
 *
 * Two rules the preview follows.
 *
 * It renders structure and never evaluates -- `4/8` stays `4/8`, `2+3` stays
 * `2+3`. A preview that simplified would do the student's work and hand back
 * the answer.
 *
 * It is forgiving while typing. `2^` is not an error, it is somebody
 * mid-keystroke, so the last thing that parsed stays on screen and nothing
 * goes red before the answer is submitted. A preview that scolds you while you
 * are still typing teaches people to stop looking at it.
 *
 * It sits above the box rather than below because the screen runs prompt,
 * visual, input, keyboard -- anything under the input can end up under the
 * keyboard on a phone.
 */
export function freeInput(spec = {}, opts = {}) {
  // A type that is not an expression -- a set, an inequality -- draws its own.
  const draw = (spec.type && getType(spec.type).preview) || previewOf;
  const preview = el('div.free__preview');
  const hint = el('div.free__hint');
  const input = el('input.answer.answer--free', {
    type: 'text', inputmode: 'text',
    autocomplete: 'off', autocorrect: 'off', autocapitalize: 'off',
    spellcheck: 'false', placeholder: '?', maxlength: 80, 'aria-label': 'Answer',
  });

  /** The last input that parsed, so a half-typed one does not blank the strip. */
  let lastGood = null;

  const paint = () => {
    const raw = input.value.trim();
    if (!raw) {
      preview.replaceChildren();
      hint.textContent = '';
      lastGood = null;
      return;
    }
    const result = draw(raw);
    if (result.ok) {
      lastGood = result.terms;
      hint.textContent = '';
    }
    // Keep the last good render while the current text is mid-keystroke.
    renderPrompt(preview, lastGood ?? []);
    preview.classList.toggle('is-stale', !result.ok);
  };

  input.addEventListener('input', paint);

  return {
    node: el('div.free', {}, preview, hint, input),
    value: () => input.value,
    clear() { input.value = ''; paint(); },
    focus() { input.focus(); },
    contains: (element) => element === input,
    setState(state) {
      input.classList.remove('is-right', 'is-wrong');
      if (state) input.classList.add(`is-${state}`);
      // Only once an answer is committed does an unreadable input become
      // something worth saying out loud.
      if (state === 'wrong') {
        const result = draw(input.value.trim());
        hint.textContent = result.ok ? '' : result.error;
      } else {
        hint.textContent = '';
      }
    },
  };
}
