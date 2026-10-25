/**
 * Catalogue authoring tool: builds the problem library for logical
 * reasoning.
 *
 * NOT part of the running application. Nothing here is served to a browser
 * or imported by the server. It exists to produce web/library/ once, and to
 * regenerate it on the rare occasion a whole level needs rebuilding.
 *
 * Run via: node scripts/build-library.mjs
 *
 * A statement is "if p, then q" with p and q drawn from a domain: whole
 * numbers, quadrilaterals, triangles, or everyday clauses. Every `text`
 * writes the statement and each option as `p -> q` over the parts' ids,
 * with "not" where a part is negated, so scripts/check-answers.py can work
 * out the converse, inverse or contrapositive itself, and for the number
 * and shape domains test the truth of a statement over every case with its
 * own definitions of the parts.
 */
import * as T from '../terms.js';
import { LAST_LEVEL, PAR_SECONDS } from '../../web/skills/reasoning.js';

// ── Domains ─────────────────────────────────────────────────────────────

const NUMBERS = Array.from({ length: 200 }, (_, i) => i + 1);
const isPrime = (n) => n > 1 && [...Array(Math.floor(Math.sqrt(n)) - 1).keys()].every((k) => n % (k + 2) !== 0);
const NUM = {
  even: ['is even', 'is not even', (n) => n % 2 === 0],
  odd: ['is odd', 'is not odd', (n) => n % 2 === 1],
  div3: ['is divisible by 3', 'is not divisible by 3', (n) => n % 3 === 0],
  div4: ['is divisible by 4', 'is not divisible by 4', (n) => n % 4 === 0],
  div5: ['is divisible by 5', 'is not divisible by 5', (n) => n % 5 === 0],
  div6: ['is divisible by 6', 'is not divisible by 6', (n) => n % 6 === 0],
  div8: ['is divisible by 8', 'is not divisible by 8', (n) => n % 8 === 0],
  div9: ['is divisible by 9', 'is not divisible by 9', (n) => n % 9 === 0],
  div10: ['is divisible by 10', 'is not divisible by 10', (n) => n % 10 === 0],
  div12: ['is divisible by 12', 'is not divisible by 12', (n) => n % 12 === 0],
  prime: ['is prime', 'is not prime', isPrime],
  ends0: ['ends in 0', 'does not end in 0', (n) => n % 10 === 0],
  ends5: ['ends in 5', 'does not end in 5', (n) => n % 10 === 5],
  square: ['is a perfect square', 'is not a perfect square', (n) => Number.isInteger(Math.sqrt(n))],
  // Tests stated another way, so some statements are true in both directions.
  evenend: ['ends in 0, 2, 4, 6 or 8', 'does not end in 0, 2, 4, 6 or 8', (n) => [0, 2, 4, 6, 8].includes(n % 10)],
  oddend: ['ends in 1, 3, 5, 7 or 9', 'does not end in 1, 3, 5, 7 or 9', (n) => n % 2 === 1],
  ends05: ['ends in 0 or 5', 'does not end in 0 or 5', (n) => n % 5 === 0],
  digits3: ['has digits that add up to a multiple of 3', 'does not have digits that add up to a multiple of 3', (n) => n % 3 === 0],
  digits9: ['has digits that add up to a multiple of 9', 'does not have digits that add up to a multiple of 9', (n) => n % 9 === 0],
  by2and3: ['is divisible by both 2 and 3', 'is not divisible by both 2 and 3', (n) => n % 6 === 0],
  by3and4: ['is divisible by both 3 and 4', 'is not divisible by both 3 and 4', (n) => n % 12 === 0],
  twofactors: ['has exactly two factors', 'does not have exactly two factors', isPrime],
  div2: ['is divisible by 2', 'is not divisible by 2', (n) => n % 2 === 0],
  by2and5: ['is divisible by both 2 and 5', 'is not divisible by both 2 and 5', (n) => n % 10 === 0],
};
// Quadrilaterals by kind, each kind excluding the more special ones.
const QUAD_KINDS = {
  square: ['a square', ['sq', 'rect', 'rhom', 'para', 'eq4', 'right4', 'perp', 'diageq', 'oppang', 'par1', 'par2', 'bisect', 'rhomright', 'rectperp', 'paradiag']],
  rectangle: ['a rectangle that is not a square', ['rect', 'para', 'right4', 'diageq', 'oppang', 'par1', 'par2', 'bisect', 'paradiag']],
  rhombus: ['a rhombus that is not a square', ['rhom', 'para', 'eq4', 'perp', 'oppang', 'par1', 'par2', 'bisect']],
  parallelogram: ['a parallelogram with no right angle and unequal neighboring sides', ['para', 'oppang', 'par1', 'par2', 'bisect']],
  isotrap: ['an isosceles trapezoid', ['diageq', 'par1']],
  kite: ['a kite that is not a rhombus', ['perp']],
};
const QUAD = {
  sq: ['is a square', 'is not a square'],
  rect: ['is a rectangle', 'is not a rectangle'],
  rhom: ['is a rhombus', 'is not a rhombus'],
  para: ['is a parallelogram', 'is not a parallelogram'],
  eq4: ['has four equal sides', 'does not have four equal sides'],
  right4: ['has four right angles', 'does not have four right angles'],
  perp: ['has perpendicular diagonals', 'does not have perpendicular diagonals'],
  diageq: ['has diagonals of equal length', 'does not have diagonals of equal length'],
  oppang: ['has both pairs of opposite angles equal', 'does not have both pairs of opposite angles equal'],
  par1: ['has a pair of parallel sides', 'has no pair of parallel sides'],
  par2: ['has two pairs of parallel sides', 'does not have two pairs of parallel sides'],
  bisect: ['has diagonals that bisect each other', 'does not have diagonals that bisect each other'],
  rhomright: ['is a rhombus with a right angle', 'is not a rhombus with a right angle'],
  rectperp: ['is a rectangle with perpendicular diagonals', 'is not a rectangle with perpendicular diagonals'],
  paradiag: ['is a parallelogram with diagonals of equal length', 'is not a parallelogram with diagonals of equal length'],
};
const TRI_KINDS = {
  equilateral: ['an equilateral triangle', ['equi', 'iso', 'acute', 'ang3', 'ang2', 'ang60']],
  'isosceles-acute': ['an acute isosceles triangle that is not equilateral', ['iso', 'acute', 'ang2']],
  'isosceles-obtuse': ['an obtuse isosceles triangle', ['iso', 'obtuse', 'ang2']],
  'right-isosceles': ['a right isosceles triangle', ['iso', 'right', 'ang2', 'comp']],
  'right-scalene': ['a right scalene triangle', ['right', 'comp']],
  'acute-scalene': ['an acute scalene triangle', ['acute']],
  'obtuse-scalene': ['an obtuse scalene triangle', ['obtuse']],
};
const TRI = {
  equi: ['is equilateral', 'is not equilateral'],
  iso: ['has two equal sides', 'does not have two equal sides'],
  acute: ['has three acute angles', 'does not have three acute angles'],
  obtuse: ['has an obtuse angle', 'has no obtuse angle'],
  right: ['has a right angle', 'has no right angle'],
  ang3: ['has three equal angles', 'does not have three equal angles'],
  ang2: ['has two equal angles', 'does not have two equal angles'],
  comp: ['has two angles that add up to 90°', 'does not have two angles that add up to 90°'],
  ang60: ['has three 60° angles', 'does not have three 60° angles'],
};
const DOMAINS = {
  numbers: { subject: 'a whole number', it: 'it', atoms: NUM, cases: NUMBERS, holds: (id, n) => NUM[id][2](n), caseWords: (n) => `${n}` },
  quadrilaterals: { subject: 'a quadrilateral', it: 'it', atoms: QUAD, cases: Object.keys(QUAD_KINDS),
    holds: (id, k) => QUAD_KINDS[k][1].includes(id), caseWords: (k) => QUAD_KINDS[k][0] },
  triangles: { subject: 'a triangle', it: 'it', atoms: TRI, cases: Object.keys(TRI_KINDS),
    holds: (id, k) => TRI_KINDS[k][1].includes(id), caseWords: (k) => TRI_KINDS[k][0] },
};
// Everyday clauses: whole clauses, positive and negated, with no truth to test.
const LIFE = {
  rain: ['it rains', 'it does not rain'], cancel: ['the game is canceled', 'the game is not canceled'],
  study: ['you study', 'you do not study'], pass: ['you pass the test', 'you do not pass the test'],
  red: ['the light is red', 'the light is not red'], stop: ['the cars stop', 'the cars do not stop'],
  dry: ['the plant gets no water', 'the plant gets water'], wilt: ['the plant wilts', 'the plant does not wilt'],
  saturday: ['today is Saturday', 'today is not Saturday'], school: ['there is no school', 'there is school'],
  cold: ['the water is colder than 32°F (0°C)', 'the water is not colder than 32°F (0°C)'], ice: ['the water freezes', 'the water does not freeze'],
  save: ['you save $5 a week', 'you do not save $5 a week'], bike: ['you can buy the bike by June', 'you cannot buy the bike by June'],
  late: ['the bus is late', 'the bus is not late'], miss: ['you miss first period', 'you do not miss first period'],
  alarm: ['the alarm rings', 'the alarm does not ring'], wake: ['you wake up', 'you do not wake up'],
  homework: ['you finish your homework', 'you do not finish your homework'], tv: ['you can watch TV', 'you cannot watch TV'],
  sunny: ['it is sunny', 'it is not sunny'], beach: ['we go to the beach', 'we do not go to the beach'],
  charge: ['the phone is charged', 'the phone is not charged'], call: ['you can make a call', 'you cannot make a call'],
  ticket: ['you have a ticket', 'you do not have a ticket'], board: ['you can board the train', 'you cannot board the train'],
  practice: ['you practice every day', 'you do not practice every day'], team: ['you make the team', 'you do not make the team'],
};
const LIFE_PAIRS = [['rain', 'cancel'], ['study', 'pass'], ['red', 'stop'], ['dry', 'wilt'], ['saturday', 'school'], ['cold', 'ice'], ['save', 'bike'], ['late', 'miss'],
  ['alarm', 'wake'], ['homework', 'tv'], ['sunny', 'beach'], ['charge', 'call'], ['ticket', 'board'], ['practice', 'team']];

// requiem: catalogue/content/reasoning-truth-only-when-testable
// Statements whose truth can be tested, each [domain, p, q].
const TESTED = [
  ['numbers', 'div4', 'even'], ['numbers', 'even', 'div4'], ['numbers', 'div6', 'div3'], ['numbers', 'div3', 'div6'],
  ['numbers', 'div10', 'ends0'], ['numbers', 'ends0', 'div10'], ['numbers', 'ends5', 'div5'], ['numbers', 'div5', 'ends5'],
  ['numbers', 'prime', 'odd'], ['numbers', 'odd', 'prime'], ['numbers', 'div9', 'div3'], ['numbers', 'div3', 'div9'],
  ['numbers', 'div12', 'div6'], ['numbers', 'div6', 'div12'], ['numbers', 'div8', 'div4'], ['numbers', 'div4', 'div8'],
  ['numbers', 'square', 'odd'], ['numbers', 'div12', 'div4'], ['numbers', 'even', 'div6'], ['numbers', 'div5', 'div10'],
  ['quadrilaterals', 'sq', 'rect'], ['quadrilaterals', 'rect', 'sq'], ['quadrilaterals', 'sq', 'rhom'], ['quadrilaterals', 'rhom', 'sq'],
  ['quadrilaterals', 'rect', 'para'], ['quadrilaterals', 'para', 'rect'], ['quadrilaterals', 'eq4', 'rhom'], ['quadrilaterals', 'rhom', 'eq4'],
  ['quadrilaterals', 'right4', 'rect'], ['quadrilaterals', 'perp', 'rhom'], ['quadrilaterals', 'rhom', 'perp'], ['quadrilaterals', 'diageq', 'rect'],
  ['quadrilaterals', 'rect', 'diageq'], ['quadrilaterals', 'par1', 'para'], ['quadrilaterals', 'para', 'oppang'], ['quadrilaterals', 'eq4', 'sq'],
  ['quadrilaterals', 'right4', 'sq'], ['quadrilaterals', 'sq', 'perp'],
  ['triangles', 'equi', 'iso'], ['triangles', 'iso', 'equi'], ['triangles', 'equi', 'acute'], ['triangles', 'iso', 'acute'],
  ['triangles', 'ang3', 'equi'], ['triangles', 'ang2', 'iso'], ['triangles', 'right', 'iso'], ['triangles', 'acute', 'equi'],
  ['triangles', 'iso', 'ang2'], ['triangles', 'obtuse', 'iso'], ['triangles', 'right', 'acute'],
  ['numbers', 'div10', 'div5'], ['numbers', 'div9', 'odd'], ['numbers', 'ends0', 'even'],
  ['quadrilaterals', 'rect', 'right4'], ['quadrilaterals', 'oppang', 'para'], ['quadrilaterals', 'para', 'par1'], ['quadrilaterals', 'rhom', 'para'],
  ['quadrilaterals', 'para', 'rhom'], ['quadrilaterals', 'sq', 'para'], ['quadrilaterals', 'sq', 'diageq'], ['quadrilaterals', 'eq4', 'para'],
  ['triangles', 'equi', 'ang3'], ['triangles', 'equi', 'ang2'], ['triangles', 'acute', 'iso'], ['triangles', 'iso', 'obtuse'],
  // True both ways: a property and the same test stated another way.
  ['numbers', 'evenend', 'even'], ['numbers', 'even', 'evenend'], ['numbers', 'oddend', 'odd'], ['numbers', 'odd', 'oddend'],
  ['numbers', 'ends05', 'div5'], ['numbers', 'div5', 'ends05'], ['numbers', 'digits3', 'div3'], ['numbers', 'div3', 'digits3'],
  ['numbers', 'digits9', 'div9'], ['numbers', 'div9', 'digits9'], ['numbers', 'by2and3', 'div6'], ['numbers', 'div6', 'by2and3'],
  ['numbers', 'by3and4', 'div12'], ['numbers', 'div12', 'by3and4'], ['numbers', 'twofactors', 'prime'], ['numbers', 'prime', 'twofactors'],
  ['quadrilaterals', 'par2', 'para'], ['quadrilaterals', 'para', 'par2'], ['quadrilaterals', 'bisect', 'para'], ['quadrilaterals', 'para', 'bisect'],
  ['quadrilaterals', 'rhomright', 'sq'], ['quadrilaterals', 'sq', 'rhomright'], ['quadrilaterals', 'rectperp', 'sq'], ['quadrilaterals', 'sq', 'rectperp'],
  ['quadrilaterals', 'paradiag', 'rect'], ['quadrilaterals', 'rect', 'paradiag'],
  ['triangles', 'comp', 'right'], ['triangles', 'right', 'comp'],
  ['numbers', 'div2', 'even'], ['numbers', 'even', 'div2'], ['numbers', 'div2', 'evenend'], ['numbers', 'evenend', 'div2'],
  ['numbers', 'by2and5', 'div10'], ['numbers', 'div10', 'by2and5'], ['numbers', 'by2and5', 'ends0'], ['numbers', 'ends0', 'by2and5'],
  ['quadrilaterals', 'rhomright', 'rectperp'], ['quadrilaterals', 'rectperp', 'rhomright'], ['quadrilaterals', 'par2', 'bisect'], ['quadrilaterals', 'bisect', 'par2'],
  ['quadrilaterals', 'paradiag', 'right4'], ['quadrilaterals', 'right4', 'paradiag'], ['triangles', 'ang60', 'equi'], ['triangles', 'equi', 'ang60'],
  // True one way only, or not at all.
  ['numbers', 'evenend', 'div4'], ['numbers', 'digits3', 'div9'], ['numbers', 'by2and3', 'div12'], ['numbers', 'square', 'even'],
  ['numbers', 'odd', 'ends5'], ['numbers', 'div3', 'odd'], ['numbers', 'div5', 'odd'], ['numbers', 'twofactors', 'odd'],
  ['numbers', 'div12', 'evenend'], ['numbers', 'oddend', 'div3'],
  ['quadrilaterals', 'par1', 'rect'], ['quadrilaterals', 'diageq', 'sq'], ['quadrilaterals', 'perp', 'sq'], ['quadrilaterals', 'oppang', 'rect'],
  ['quadrilaterals', 'par1', 'eq4'], ['quadrilaterals', 'bisect', 'rect'], ['quadrilaterals', 'par2', 'rhom'], ['quadrilaterals', 'rhom', 'bisect'],
  ['triangles', 'acute', 'ang2'], ['triangles', 'ang2', 'right'], ['triangles', 'obtuse', 'ang2'], ['triangles', 'comp', 'iso'],
  ['triangles', 'iso', 'comp'], ['triangles', 'equi', 'comp'],
];

// ── Statements ──────────────────────────────────────────────────────────

/** A part of a statement: an atom, negated or not. */
const lit = (id, neg = false) => ({ id, neg });
const not = (l) => ({ id: l.id, neg: !l.neg });
const litText = (l) => `${l.neg ? 'not ' : ''}${l.id}`;
const condText = ([a, b]) => `${litText(a)} -> ${litText(b)}`;
const FORMS = {
  original: ([p, q]) => [p, q],
  converse: ([p, q]) => [q, p],
  inverse: ([p, q]) => [not(p), not(q)],
  contrapositive: ([p, q]) => [not(q), not(p)],
};
const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);

/** A clause, for the hypothesis (with its subject) or the conclusion (with "it"). */
function clause(domain, l, first) {
  if (domain === 'life') return LIFE[l.id][l.neg ? 1 : 0];
  const D = DOMAINS[domain];
  return `${first ? D.subject : D.it} ${D.atoms[l.id][l.neg ? 1 : 0]}`;
}
const sentence = (domain, [a, b]) => `If ${clause(domain, a, true)}, then ${clause(domain, b, false)}.`;
/** A sentence quoted inside a question, its own period dropped. */
const bare = (s) => s.replace(/\.$/, '');
/** A clause standing alone, as an option for the hypothesis or conclusion. */
const alone = (domain, l) => (domain === 'life' ? LIFE[l.id][l.neg ? 1 : 0] : `${DOMAINS[domain].subject} ${DOMAINS[domain].atoms[l.id][l.neg ? 1 : 0]}`);

/** Does `if a then b` hold over every case of the domain? Returns the first case where it fails, or null. */
function failure(domain, [a, b]) {
  const D = DOMAINS[domain];
  const val = (l, c) => D.holds(l.id, c) !== l.neg;
  return D.cases.find((c) => val(a, c) && !val(b, c)) ?? null;
}
const LETTERS = ['a', 'b', 'c', 'd'];

function pickStatement(rng, tested = rng.chance(0.65)) {
  if (tested) {
    const [domain, p, q] = rng.pick(TESTED);
    return { domain, st: [lit(p), lit(q)] };
  }
  const [p, q] = rng.pick(LIFE_PAIRS);
  return { domain: 'life', st: [lit(p), lit(q)] };
}

/** Four sentences, one per form, lettered in a shuffled order. */
function formOptions(rng, domain, st, forms) {
  const order = rng.shuffle([...forms]);
  return order.map((form, i) => ({ id: LETTERS[i], form, cond: FORMS[form](st), label: sentence(domain, FORMS[form](st)) }));
}
const optionsText = (opts) => opts.map((o) => `${o.id}=${condText(o.cond)}`).join(', ');
const domainOf = (domain) => (domain === 'life' ? 'life' : domain);

const HOW = {
  converse: 'The converse swaps the hypothesis and the conclusion: if q, then p.',
  inverse: 'The inverse keeps them in place and negates both: if not p, then not q.',
  contrapositive: 'The contrapositive swaps them and negates both: if not q, then not p.',
};

// ── Hypothesis and conclusion ───────────────────────────────────────────

function parts(rng) {
  const picked = pickStatement(rng, rng.chance(0.55));
  const { domain } = picked;
  // requiem: catalogue/content/fixed-menu-key-moves
  // Some statements are worded with both parts negated ("If you do not
  // study, then you do not pass the test"), so the key is a negated clause
  // as often as a plain one is a decoy: with every statement positive, the
  // two "not" options were never right and could be struck unread.
  const negated = rng.chance(0.45);
  const st = picked.st.map((l) => lit(l.id, negated));
  const [p, q] = st;
  const ask = rng.chance(0.55) ? 'hypothesis' : 'conclusion';
  // The same statement, worded four ways; the hypothesis is p in every one.
  const P = alone(domain, p), Q = alone(domain, q);
  const said = (l) => DOMAINS[domain].atoms[l.id][l.neg ? 1 : 0];
  const wordings = [
    ['if-then', `If ${clause(domain, p, true)}, then ${clause(domain, q, false)}.`],
    ['q-if-p', `${cap(domain === 'life' ? Q : `${DOMAINS[domain].subject} ${said(q)}`)} if ${domain === 'life' ? P : `${DOMAINS[domain].it} ${said(p)}`}.`],
    ['p-only-if-q', `${cap(P)} only if ${domain === 'life' ? Q : `${DOMAINS[domain].it} ${said(q)}`}.`],
  ];
  // "p only if q" reads naturally about numbers and shapes ("a number is
  // divisible by 4 only if it is even") and backward about events, so
  // everyday statements are only worded the other two ways.
  const [form, words] = rng.pick(domain === 'life' ? wordings.slice(0, 2) : wordings);
  const opts = rng.shuffle([[p, P], [q, Q], [not(p), alone(domain, not(p))], [not(q), alone(domain, not(q))]])
    .map(([l, label], i) => ({ id: LETTERS[i], l, label: cap(label) }));
  const want = opts.find((o) => o.l === (ask === 'hypothesis' ? p : q)).id;
  const how = form === 'if-then' ? 'The hypothesis follows “if”, and the conclusion follows “then”.'
    : form === 'q-if-p' ? 'Written “q if p”, the part after “if” is still the hypothesis, even though it comes second.'
      : 'Written “p only if q”, the part before “only if” is the hypothesis: p cannot happen without q, so p leads to q.';
  return {
    prompt: [T.prose(`“${words}” What is its ${ask}?`)],
    text: `${ask} of ${form}: ${domainOf(domain)} ${condText(st)}; options ${opts.map((o) => `${o.id}=${litText(o.l)}`).join(', ')}`,
    answer: { type: 'choice', value: want, options: opts.map(({ id, label }) => ({ id, label })) },
    visual: null,
    explain: `${how} As “if p, then q”: ${sentence(domain, st)} `
      + (negated
        ? `(Both parts are negated as the statement says them: the “not” stays with each part, and dropping it names a different clause.) `
        : `(Neither part is negated: “not” only appears when the statement says it.) `)
      + `So the ${ask} is “${ask === 'hypothesis' ? P : Q}”.`,
  };
}

// ── Converse, inverse, contrapositive ───────────────────────────────────

function truthWord(domain, cond) {
  const c = failure(domain, cond);
  return c === null ? ['true', null] : ['false', DOMAINS[domain].caseWords(c)];
}

function formLevel(rng, form) {
  const tested = rng.chance(0.4);
  if (tested) {
    // Is the converse (or inverse, or contrapositive) true?
    // Sometimes the statement given is already negated on both sides, so the
    // form has to be built from it as worded rather than from a familiar fact.
    const [domain, p, q] = rng.pick(TESTED), neg = rng.chance(0.35);
    const st = [lit(p, neg), lit(q, neg)], made = FORMS[form](st);
    const [truth, counter] = truthWord(domain, made);
    const [orig, oc] = truthWord(domain, st);
    return {
      prompt: [T.prose(`“${sentence(domain, st)}” Is its ${form} true?`)],
      text: `truth of ${form}: ${domain} ${condText(st)}`,
      answer: { type: 'choice', value: truth, options: [{ id: 'true', label: 'True' }, { id: 'false', label: 'False' }] },
      visual: null,
      explain: `${HOW[form]} Here: ${sentence(domain, made)} `
        + (truth === 'true' ? `That holds every time: no case makes the first part true and the second false. `
          : `That fails for ${counter}: its hypothesis holds there, but its conclusion does not. `)
        + `(The statement itself is ${orig}${oc ? `, as ${oc} shows` : ''}${form === 'contrapositive' ? ', and a contrapositive always agrees with it.' : `, but its ${form} need not agree.`}) `
        + `So the ${form} is ${truth}.`,
    };
  }
  // requiem: catalogue/library/strategy-not-from-surface
  // Some statements are worded with both parts negated, so the inverse and
  // the contrapositive drop their "not"s: from positive statements only they
  // were the two longest options every time, and the key half the time.
  const picked = pickStatement(rng), domain = picked.domain;
  const st = rng.chance(0.45) ? picked.st.map((l) => not(l)) : picked.st;
  const forms = ['converse', 'inverse', 'contrapositive', 'original'];
  // The original is replaced by a near miss: only one part negated, a common slip.
  // For the inverse it is sometimes swapped as well, so it does not always sit
  // one word from the key, which made the key the option nearest the rest.
  const slipSwapped = form !== 'inverse' || rng.chance(0.5);
  const opts = formOptions(rng, domain, st, forms).map((o) => (o.form === 'original'
    ? { ...o, form: 'slip', cond: slipSwapped ? [st[1], not(st[0])] : [not(st[0]), st[1]], label: '' } : o));
  for (const o of opts) if (o.form === 'slip') o.label = sentence(domain, o.cond);
  const want = opts.find((o) => o.form === form).id;
  return {
    prompt: [T.prose(`What is the ${form} of “${bare(sentence(domain, st))}”?`)],
    text: `${form} of: ${domainOf(domain)} ${condText(st)}; options ${optionsText(opts)}`,
    answer: { type: 'choice', value: want, options: opts.map(({ id, label }) => ({ id, label })) },
    visual: null,
    explain: `${HOW[form]} With p = “${alone(domain, st[0])}” and q = “${alone(domain, st[1])}”: ${sentence(domain, FORMS[form](st))} `
      + `(${form === 'converse' ? 'Negating the parts makes the inverse or the contrapositive, not the converse.'
        : form === 'inverse' ? 'Swapping them as well makes the contrapositive; negating only one part makes neither.'
          : 'Negating without swapping makes the inverse; swapping without negating makes the converse.'}) `
      + `So it is “${sentence(domain, FORMS[form](st))}”`,
  };
}

// ── Which is equivalent ─────────────────────────────────────────────────

/** How `b` is made from `a`: the converse, the inverse or the contrapositive of it. */
function relation(a, b) {
  const same = (x, y) => x[0].id === y[0].id && x[0].neg === y[0].neg && x[1].id === y[1].id && x[1].neg === y[1].neg;
  return ['converse', 'inverse', 'contrapositive'].find((f) => same(FORMS[f](a), b));
}

function equivalent(rng) {
  if (rng.chance(0.34)) {
    // Told one sentence's truth, what follows for another made from it?
    const truth = rng.pick(['true', 'false']);
    if (rng.chance(0.15)) {
      // requiem: catalogue/content/fixed-menu-key-moves
      // The partner is asked two times in three, so true, false and "it
      // could be either" are each keyed about a third of the time: drawn
      // evenly among the other three forms, two of them unrelated, "either"
      // was the key in 68-75% of these rows.
      const known = rng.pick(['original', 'converse', 'inverse', 'contrapositive']);
      const partner = { original: 'contrapositive', contrapositive: 'original', converse: 'inverse', inverse: 'converse' };
      const asked = rng.chance(2 / 3) ? partner[known]
        : rng.pick(['original', 'converse', 'inverse', 'contrapositive'].filter((f) => f !== known && f !== partner[known]));
      const want = partner[known] === asked ? truth : 'unknown';
      const name = (f) => (f === 'original' ? 'the statement' : `its ${f}`);
      // Two forms that are not partners are each other's converse or inverse.
      const swapped = [['original', 'converse'], ['inverse', 'contrapositive']].some((pair) => pair.includes(known) && pair.includes(asked));
      const rel = swapped ? 'converse' : 'inverse';
      return {
        prompt: [T.prose(`${known === 'original' ? 'A conditional statement' : `The ${known} of a conditional statement`} is ${truth}. What can be said about ${asked === 'original' ? 'the statement itself' : name(asked)}?`)],
        text: `truth follows: ${known} ${truth}; find ${asked}`,
        answer: { type: 'choice', value: want, options: [{ id: 'true', label: 'It is true' }, { id: 'false', label: 'It is false' }, { id: 'unknown', label: 'It could be either' }] },
        visual: null,
        explain: `A statement and its contrapositive always share their truth value, and so do the converse and the inverse (the inverse is the converse’s contrapositive). `
          + (want === 'unknown'
            ? `${cap(name(asked))} is the ${rel} of ${name(known)}, not its partner, so it is not tied to it: “every square is a rectangle” is true and its ${rel} false, while “a number divisible by 10 ends in 0” is true and so is its ${rel}. `
            : `${cap(name(asked))} is the partner of ${name(known)}, so it is ${truth} too. `)
          + `So ${want === 'unknown' ? 'it could be either' : `it is ${truth}`}.`,
      };
    }
    // The same question with two everyday sentences, so the form has to be recognized first.
    const [p, q] = rng.pick(LIFE_PAIRS), neg = rng.chance(0.3);
    const st = [lit(p, neg), lit(q, neg)];
    const known = FORMS[rng.pick(['original', 'converse', 'inverse', 'contrapositive'])](st);
    const asked = FORMS[rng.chance(0.8) ? 'contrapositive' : rng.pick(['converse', 'inverse'])](known);
    const how = relation(known, asked);
    const want = how === 'contrapositive' ? truth : 'unknown';
    return {
      prompt: [T.prose(`Suppose “${bare(sentence('life', known))}” is ${truth}. What can be said about “${bare(sentence('life', asked))}”?`)],
      text: `truth follows: life ${condText(known)} is ${truth}; find ${condText(asked)}`,
      answer: { type: 'choice', value: want, options: [{ id: 'true', label: 'It is true' }, { id: 'false', label: 'It is false' }, { id: 'unknown', label: 'It could be either' }] },
      visual: null,
      explain: `The second sentence ${{ converse: 'swaps the two parts of the first', inverse: 'negates both parts of the first, in place', contrapositive: 'swaps the two parts of the first and negates both' }[how]}: it is the first one’s ${how}. `
        + (how === 'contrapositive'
          ? `A statement and its contrapositive always share their truth value, so it is ${truth} too.`
          : `A statement and its ${how} need not share their truth value: “every square is a rectangle” is true and its ${how} is false, while “a number divisible by 10 ends in 0” is true and so is its ${how}.`)
        + ` So ${want === 'unknown' ? 'it could be either' : `it is ${truth}`}.`,
    };
  }
  // requiem: catalogue/library/strategy-not-from-surface
  // Some statements are negated on both sides, so the key loses its "not"s:
  // from positive statements only, the key and its swap were the two longest
  // options in every row.
  const picked = pickStatement(rng), domain = picked.domain;
  const st = rng.chance(0.45) ? picked.st.map((l) => not(l)) : picked.st;
  const of = rng.chance(0.65) ? 'original' : 'converse';
  const shown = FORMS[of](st);
  const target = of === 'original' ? 'contrapositive' : 'inverse';
  // requiem: catalogue/content/decoys-cross-two-slips
  // The other three forms of the shown sentence put the key in the middle:
  // the converse and the inverse are each one step from the contrapositive
  // and two from each other. Instead two slips are crossed on the key: its
  // parts swapped back (the inverse for the contrapositive, and back), and
  // one of its two negations left off -- alone and together.
  const key = FORMS.contrapositive(shown);
  const side = rng.int(0, 1);
  const swap = ([a, b]) => [b, a];
  const oneNot = (c) => c.map((l, i) => (i === side ? not(l) : l));
  const conds = [key, swap(key), oneNot(key), oneNot(swap(key))];
  const opts = rng.shuffle(conds.map((cond, k) => ({ k, cond }))).map((o, i) => ({ id: LETTERS[i], form: o.k === 0 ? target : 'slip', cond: o.cond, label: sentence(domain, o.cond) }));
  const want = opts.find((o) => o.form === target).id;
  return {
    prompt: [T.prose(`Which statement is always true exactly when “${bare(sentence(domain, shown))}” is?`)],
    text: `same truth as ${of}: ${domainOf(domain)} ${condText(st)}; options ${optionsText(opts)}`,
    answer: { type: 'choice', value: want, options: opts.map(({ id, label }) => ({ id, label })) },
    visual: null,
    // requiem: catalogue/content/reasoning-explanations-true
    explain: (of === 'original'
      ? `A statement is logically equivalent to its contrapositive: if p always brings q, then without q there can be no p. `
      : `This is the converse of “${bare(sentence(domain, st))}”, and the converse is equivalent to the inverse, its contrapositive. `)
      + `(${of === 'original' ? 'The inverse keeps the parts in place, and negating only one part says something else: either can differ from the statement.'
        : 'The contrapositive of the original statement is tied to the original, not to the converse, and negating only one part says something else.'}) `
      + `So “${sentence(domain, FORMS[target](st))}”`,
  };
}

// ── Counterexample ──────────────────────────────────────────────────────

const FALSE_TESTED = TESTED.filter(([d, p, q]) => failure(d, [lit(p), lit(q)]) !== null);

// requiem: catalogue/content/fixed-menu-key-moves
// False claims with a negated conclusion: "a rectangle is not a rhombus" is
// broken by the square. With every conclusion positive, a square has every
// property a quadrilateral statement can ask for, so "A square" was offered
// in a quarter of the rows and never the key; a student could strike it
// unread. These are false generalizations students do make, and the most
// special case is what breaks them.
const NOT_FALSE = [
  ['quadrilaterals', 'rect', 'rhom'], ['quadrilaterals', 'right4', 'eq4'], ['quadrilaterals', 'rhom', 'right4'],
  ['quadrilaterals', 'diageq', 'perp'], ['quadrilaterals', 'rect', 'perp'], ['quadrilaterals', 'eq4', 'diageq'],
  ['quadrilaterals', 'para', 'perp'], ['quadrilaterals', 'par2', 'diageq'],
  ['numbers', 'prime', 'even'], ['numbers', 'even', 'div3'], ['numbers', 'odd', 'square'], ['numbers', 'div4', 'div3'],
  ['triangles', 'iso', 'acute'], ['triangles', 'right', 'iso'], ['triangles', 'ang2', 'acute'],
].filter(([d, p, q]) => failure(d, [lit(p), lit(q, true)]) !== null);

function counterexample(rng) {
  for (;;) {
    const negated = rng.chance(0.18);
    const [domain, p, q] = rng.pick(negated ? NOT_FALSE : FALSE_TESTED);
    const D = DOMAINS[domain], st = [lit(p), lit(q, negated)];
    // 2 is the counterexample: the hypothesis holds and the conclusion, as stated, does not.
    const kind = (c) => (D.holds(p, c) ? 1 : 0) * 2 + (D.holds(q, c) !== negated ? 1 : 0);
    const byKind = [0, 1, 2, 3].map((k) => D.cases.filter((c) => kind(c) === k));
    if (!byKind[2].length) continue;
    // The counterexample, and a case for each kind that is not one; fill up from both-true.
    const others = [3, 1, 0].filter((k) => byKind[k].length).map((k) => rng.pick(byKind[k]));
    while (others.length < 3) {
      const extra = rng.pick([...byKind[3], ...byKind[1], ...byKind[0]].filter((c) => !others.includes(c)));
      if (extra === undefined) break;
      others.push(extra);
    }
    if (others.length < 3) continue;
    const right = rng.pick(byKind[2]);
    const cases = rng.shuffle([right, ...others.slice(0, 3)]);
    const opts = cases.map((c, i) => ({ id: LETTERS[i], c, label: cap(D.caseWords(c)) }));
    const want = opts.find((o) => o.c === right).id;
    const why = (c) => `${D.caseWords(c)} ${D.holds(p, c) ? D.atoms[p][0] : D.atoms[p][1]} and ${D.holds(q, c) ? D.atoms[q][0] : D.atoms[q][1]}`;
    return {
      prompt: [T.prose(`Which is a counterexample to “${bare(sentence(domain, st))}”?`)],
      text: `counterexample: ${domain} ${condText(st)}; options ${opts.map((o) => `${o.id}=${o.c}`).join(', ')}`,
      answer: { type: 'choice', value: want, options: opts.map(({ id, label }) => ({ id, label })) },
      visual: null,
      explain: `A counterexample makes the hypothesis true and the conclusion false. Check each: ${opts.map((o) => why(o.c)).join('; ')}. `
        + `Of these, only ${D.caseWords(right)} meets the hypothesis and misses the conclusion. `
        + `(A case where the hypothesis fails says nothing about the statement, whatever the conclusion does.) So ${D.caseWords(right)}.`,
    };
  }
}

// ── Biconditional ───────────────────────────────────────────────────────

// Balanced: about half the statements asked are true in both directions,
// and the rest are true in exactly one, the near miss a biconditional is
// about. A statement false both ways is no question here.
const holdsWay = ([d, p, q]) => failure(d, [lit(p), lit(q)]) === null;
const BOTH_WAYS = TESTED.filter(([d, p, q]) => holdsWay([d, p, q]) && holdsWay([d, q, p]));
const ONE_WAY = TESTED.filter(([d, p, q]) => holdsWay([d, p, q]) !== holdsWay([d, q, p]));

function biconditional(rng) {
  const [domain, p, q] = rng.pick(rng.chance(0.5) ? BOTH_WAYS : ONE_WAY);
  const st = [lit(p), lit(q)], D = DOMAINS[domain];
  const forward = failure(domain, st), back = failure(domain, [st[1], st[0]]);
  const yes = forward === null && back === null;
  const bi = `${cap(D.subject)} ${D.atoms[p][0]} if and only if ${D.it} ${D.atoms[q][0]}`;
  const askDef = rng.chance(0.4);
  return {
    prompt: [T.prose(askDef
      ? `Is “${bi}” a true biconditional?`
      : `Can “${bare(sentence(domain, st))}” be written as a true biconditional, “p if and only if q”?`)],
    text: `biconditional: ${domain} ${condText(st)}`,
    answer: { type: 'choice', value: yes ? 'yes' : 'no', options: [{ id: 'yes', label: 'Yes' }, { id: 'no', label: 'No' }] },
    visual: null,
    explain: `“p if and only if q” claims both “if p, then q” and its converse “if q, then p”. `
      + `${sentence(domain, st)} ${forward === null ? 'That is true.' : `That is false: ${D.caseWords(forward)} breaks it.`} `
      + `${sentence(domain, [st[1], st[0]])} ${back === null ? 'That is true.' : `That is false: ${D.caseWords(back)} breaks it.`} `
      + `(${yes ? 'Both directions hold, so the two parts are true of exactly the same cases.' : 'One true direction is not enough: both must hold.'}) So ${yes ? 'yes' : 'no'}.`,
  };
}

const CONTENT = [parts, (rng) => formLevel(rng, 'converse'), (rng) => formLevel(rng, 'inverse'), (rng) => formLevel(rng, 'contrapositive'),
  equivalent, counterexample, biconditional];

/** @param {import('../../web/engine/rng.js').Rng} rng @param {number} level */
export function generate(rng, level) {
  const p = CONTENT[level >= LAST_LEVEL ? rng.int(0, LAST_LEVEL - 1) : level](rng);
  p.parSeconds = PAR_SECONDS[level];
  return p;
}
