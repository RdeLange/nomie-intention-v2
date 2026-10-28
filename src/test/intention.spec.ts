import { describe, expect, it } from 'vitest';
import { SUGGESTIONS, addDays, dayKey, intentionNote, keptNote, prune, suggestionsForDay, weekSummary } from '../logic';

const day = (n: number) => addDays(new Date(2026, 9, 24), n);

describe('the suggestions', () => {
  it('gives three different suggestions', () => {
    const list = suggestionsForDay(day(0));
    expect(list).toHaveLength(3);
    expect(new Set(list).size).toBe(3);
  });

  it('changes from one day to the next', () => {
    expect(suggestionsForDay(day(0))).not.toEqual(suggestionsForDay(day(1)));
  });

  it('repeats after the whole list', () => {
    expect(suggestionsForDay(day(SUGGESTIONS.length))).toEqual(suggestionsForDay(day(0)));
  });
});

describe('the notes', () => {
  it('tags the intention, and leaves out a # in the text', () => {
    expect(intentionNote(' Be kind #work ')).toBe('Intention: Be kind work #intention');
    expect(keptNote('Be kind')).toBe('Kept my intention: Be kind #intention_kept');
  });
});

describe('the week', () => {
  it('counts the days set and kept in the last seven days', () => {
    const byDay = {
      [dayKey(day(0))]: { text: 'a', kept: false },
      [dayKey(day(-2))]: { text: 'b', kept: true },
      [dayKey(day(-6))]: { text: 'c', kept: true },
      [dayKey(day(-7))]: { text: 'd', kept: true },
    };
    expect(weekSummary(byDay, day(0))).toEqual({ set: 3, kept: 2 });
  });
});

describe('storage', () => {
  it('drops days older than 400 days', () => {
    const kept = prune({ [dayKey(day(-401))]: { text: 'a', kept: true }, [dayKey(day(-10))]: { text: 'b', kept: false } }, day(0));
    expect(Object.keys(kept)).toEqual([dayKey(day(-10))]);
  });
});
