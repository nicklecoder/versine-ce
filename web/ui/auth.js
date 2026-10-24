import { api } from '../engine/api.js';
import { el, mount } from './dom.js';
import { ICONS, ACCENTS } from './icons.js';
import { state, go } from './router.js';

function wordmark() {
  return el('div.wordmark', {}, el('b', {}, 'MATH'), el('span.slash', {}, '/'), 'TRAINER');
}

async function enter(me) {
  state.me = me;
  state.progress = await api.progress();
  go({ name: me.role === 'teacher' ? 'teacher' : 'map' }, { replace: true });
}

/**
 * Icon + color picker. Returns the node plus a live `value` getter, so the
 * caller doesn't have to track the selection itself.
 */
function identityPicker() {
  let icon = ICONS[Math.floor(Math.random() * ICONS.length)];
  let accent = ACCENTS[Math.floor(Math.random() * ACCENTS.length)];

  const preview = el('div.avatar.avatar--lg.identity-preview', { style: { '--accent': accent } }, icon);

  const iconGrid = el('div.icon-grid', {}, ICONS.map((glyph) =>
    el('button.icon-opt', {
      type: 'button',
      class: glyph === icon ? 'is-active' : '',
      onclick: (e) => {
        icon = glyph;
        preview.textContent = glyph;
        e.currentTarget.parentElement.querySelectorAll('.icon-opt')
          .forEach((b) => b.classList.toggle('is-active', b === e.currentTarget));
      },
    }, glyph)));

  const colorRow = el('div.color-row', {}, ACCENTS.map((hex) =>
    el('button.color-opt', {
      type: 'button',
      class: hex === accent ? 'is-active' : '',
      style: { background: hex },
      'aria-label': `Color ${hex}`,
      onclick: (e) => {
        accent = hex;
        preview.style.setProperty('--accent', hex);
        e.currentTarget.parentElement.querySelectorAll('.color-opt')
          .forEach((b) => b.classList.toggle('is-active', b === e.currentTarget));
      },
    })));

  const node = el('div.stack--sm', {},
    el('div.center', {}, preview),
    el('div.eyebrow', {}, 'Pick an icon'), iconGrid,
    el('div.eyebrow', {}, 'Pick a color'), colorRow);

  return { node, get value() { return { icon, accent }; } };
}

const pinField = (placeholder) => el('input.input.pin-field', {
  type: 'password', inputmode: 'numeric', maxlength: 4,
  autocomplete: 'off', placeholder,
  oninput: (e) => { e.target.value = e.target.value.replace(/\D/g, ''); },
});

/** First run only: no accounts exist, so the first one is the teacher. */
export function setupScreen() {
  const name = el('input.input', { placeholder: 'Your name', maxlength: 16 });
  const pin = pinField('PIN');
  const pin2 = pinField('Repeat PIN');
  const picker = identityPicker();
  const err = el('div.feedback.is-wrong');

  async function submit() {
    err.textContent = '';
    if (!name.value.trim()) { err.textContent = 'Enter a name.'; return; }
    if (!/^\d{4}$/.test(pin.value)) { err.textContent = 'PIN must be exactly 4 digits.'; return; }
    if (pin.value !== pin2.value) { err.textContent = 'The two PINs don’t match.'; return; }
    try {
      const { me } = await api.setup(name.value, pin.value, picker.value);
      await enter(me);
    } catch (e) { err.textContent = e.message; }
  }

  return el('div.shell', { style: { maxWidth: '460px', marginTop: '5vh' } },
    el('div.center.stack--sm', {}, wordmark(),
      el('p.muted', {}, 'First run. This account is the teacher — it can see everyone’s progress.')),
    el('div.card.stack', {},
      picker.node,
      el('div.field', {}, el('label', {}, 'Name'), name),
      el('div.field', {}, el('label', {}, 'PIN'), el('div.row-flex', {}, pin, pin2)),
      err,
      el('button.btn.btn--primary.btn--block', { onclick: submit }, 'Create teacher account')));
}

/** Pick a face, punch in a PIN — or make yourself a new profile. */
export function loginScreen() {
  const container = el('div.shell', { style: { maxWidth: '560px', marginTop: '5vh' } });

  const chooser = () => el('div.stack', {},
    el('div.center.stack--sm', {}, wordmark(), el('p.muted', {}, 'Who’s practising?')),
    el('div.grid.grid--people', {}, [
      ...state.users.map((u) =>
        el('button.tile', { onclick: () => mount(container, pinPad(u)) },
          el('div.tile__head', {},
            el('div.avatar.avatar--lg', { style: { '--accent': u.accent } }, u.icon),
            el('div', {},
              el('div.tile__name', {}, u.name),
              el('div.eyebrow', {}, u.role === 'teacher' ? 'Teacher' : 'Student'))))),
      el('button.tile.tile--new', { onclick: () => mount(container, createScreen()) },
        el('div.tile__head', {},
          el('div.avatar.avatar--lg.avatar--ghost', {}, '+'),
          el('div', {},
            el('div.tile__name', {}, 'New profile'),
            el('div.eyebrow', {}, 'Set yourself up')))),
    ]));

  /** Anyone can make themselves a profile — no grown-up required. */
  function createScreen() {
    const name = el('input.input', { placeholder: 'Your name', maxlength: 16 });
    const pin = pinField('PIN');
    const pin2 = pinField('Repeat PIN');
    const picker = identityPicker();
    const err = el('div.feedback.is-wrong');

    async function submit() {
      err.textContent = '';
      if (!name.value.trim()) { err.textContent = 'Enter a name.'; return; }
      if (!/^\d{4}$/.test(pin.value)) { err.textContent = 'PIN must be exactly 4 digits.'; return; }
      if (pin.value !== pin2.value) { err.textContent = 'The two PINs don’t match.'; return; }
      try {
        const { me } = await api.createProfile({
          name: name.value, pin: pin.value, ...picker.value,
        });
        await enter(me);
      } catch (e) { err.textContent = e.message; }
    }

    return el('div.stack', {},
      el('div.center.stack--sm', {}, wordmark(), el('p.muted', {}, 'Make yourself a profile')),
      el('div.card.stack', {},
        picker.node,
        el('div.field', {}, el('label', {}, 'Name'), name),
        el('div.field', {},
          el('label', {}, 'Choose a PIN'),
          el('div.row-flex', {}, pin, pin2),
          el('p.tiny.muted', {}, 'Four digits. You’ll type this every time you sign in.')),
        err,
        el('button.btn.btn--go.btn--block', { onclick: submit }, 'Create profile')),
      el('button.btn.btn--ghost.btn--sm', {
        onclick: () => mount(container, chooser()),
      }, '← Back'));
  }

  function pinPad(user) {
    const err = el('div.feedback.is-wrong');
    const input = el('input.answer.pin-input', {
      type: 'password', inputmode: 'numeric', maxlength: 4,
      autocomplete: 'off', placeholder: '••••',
      oninput: () => {
        input.value = input.value.replace(/\D/g, '');
        err.textContent = '';
        if (input.value.length === 4) setTimeout(attempt, 100);
      },
      onkeydown: (e) => {
        if (e.key === 'Enter' && input.value.length === 4) attempt();
        if (e.key === 'Escape') exit();
      },
    });

    async function attempt() {
      try {
        const { me } = await api.login(user.id, input.value);
        await enter(me);
      } catch (e) {
        err.textContent = e.message;
        input.classList.add('is-wrong');
        setTimeout(() => {
          input.classList.remove('is-wrong');
          input.value = '';
          input.focus();
        }, 420);
      }
    }

    const exit = () => mount(container, chooser());
    queueMicrotask(() => input.focus());

    return el('div.stack', {},
      el('div.center.stack--sm', {},
        el('div.avatar.avatar--lg', {
          style: { '--accent': user.accent, margin: '0 auto' },
        }, user.icon),
        el('h2', {}, user.name),
        el('p.muted.tiny', {}, 'Enter your PIN')),
      el('div.card.stack', {}, el('div.center', {}, input), err),
      el('button.btn.btn--ghost.btn--sm', { onclick: exit }, '← Someone else'));
  }

  return mount(container, chooser());
}
