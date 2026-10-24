/**
 * Percents.
 *
 * A percent is a fraction whose denominator is always a hundred, and nearly
 * every mistake made with them comes from forgetting the second half of that
 * sentence: *a hundred of what*. So the levels keep asking what the whole is,
 * and the last of them asks it about a whole that has changed.
 *
 * Percent change is the one that matters beyond school. A 20% rise followed by
 * a 20% fall does not return you to where you started, and a student who
 * cannot say why will be misled by a graph or a price for the rest of their
 * life. Two levels are about exactly that. By What Percent? asks for the
 * change as a proportion of what it started from, which is the only reading
 * that makes 40 → 50 a rise of 25% rather than of 10. Working Backwards
 * recovers the original from the new figure, and it is here because the
 * intuitive move — take the percent back off — is wrong, and wrong in the
 * direction that costs money.
 */

export const LEVELS = [
  { name: 'Out of a Hundred', slug: 'out-of-a-hundred',
    blurb: 'Percent means hundredths. Read it straight off.' },
  { name: 'As a Decimal', slug: 'as-a-decimal',
    blurb: 'Move the point two places. Know why it is two.' },
  { name: 'Percent of a Number', slug: 'percent-of-a-number',
    blurb: 'A part of a whole, when the whole is not a hundred.' },
  { name: 'What Percent Is It', slug: 'what-percent-is-it',
    blurb: 'The question backwards: which part of the whole is this?' },
  { name: 'Up and Down', slug: 'up-and-down',
    blurb: 'Increase and decrease. Notice which whole each one is of.' },
  {
    name: 'By What Percent?', slug: 'by-what-percent',
    blurb: 'It went from 40 to 50. That is not a 10% rise — it is 25%.',
    // The change over the ORIGINAL, which is the same part-over-whole
    // question as What Percent Is It, asked about a difference.
    dependsOn: [{ skill: 'ratio', level: 3 }],
  },
  {
    name: 'Working Backwards', slug: 'working-backwards',
    blurb: 'It costs $60 after a 20% rise. Taking 20% off $60 is the wrong answer.',
    // Undoing a proportion rather than applying one: $60 is 120% of the
    // original, and finding the original from a known multiple of it is the
    // scaling move.
    dependsOn: [{ skill: 'ratio', level: 0 }],
  },
  {
    name: 'All Together', slug: 'all-together',
    blurb: 'Everything mixed. Clear this against the clock to finish the skill for the day.' },
];

export const LAST_LEVEL = LEVELS.length - 1;
export const PAR_SECONDS = [12, 14, 18, 20, 22, 22, 24, 20];

/**
 * The runtime definition of this skill: what the student sees and how the
 * app navigates it. Problems come from the pre-built library in
 * web/library/, never from code -- the generator that first produced that
 * library lives in tools/generators/ and does not ship.
 */
export default {
  id: 'percents',
  name: 'Percents',
  category: 'decimals',
  glyph: '%',
  blurb: 'Hundredths, and remembering a hundred of what.',
  answerInput: 'int',
  dependsOn: ['decimals', 'frac-equiv', 'ratio'],
  levels: LEVELS,
};
