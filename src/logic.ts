// Rules for the intention plugin, as plain functions, so they can be tested without the app.
export type Intention = { text: string; kept: boolean };
export type IntentionsByDay = Record<string, Intention>;

import { t, type Key } from './i18n/index.svelte';

// The suggestion keys; the text is read in the app's language when it is shown
export const SUGGESTIONS: Key[] = ['sug1', 'sug2', 'sug3', 'sug4', 'sug5', 'sug6', 'sug7', 'sug8'];

// A day key such as 2026-10-24, in local time.
export const dayKey = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export const addDays = (date: Date, n: number): Date => new Date(date.getFullYear(), date.getMonth(), date.getDate() + n);

// Three suggestions for the day, a different set each day, so the list does not feel stuck.
export const suggestionsForDay = (date: Date, count = 3): string[] => {
  const start = Math.floor(new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() / 86400000);
  return Array.from({ length: count }, (_, i) => t(SUGGESTIONS[(start + i) % SUGGESTIONS.length]));
};

// The text that goes into the timeline. A # in the intention would make a tracker, so it is left out.
export const intentionNote = (text: string) => `Intention: ${text.replace(/#/g, '').trim()} #intention`;
export const keptNote = (text: string) => `Kept my intention: ${text.replace(/#/g, '').trim()} #intention_kept`;

// How many of the last seven days had an intention, and how many of those were kept.
export const weekSummary = (byDay: IntentionsByDay, today: Date) => {
  const days = Array.from({ length: 7 }, (_, i) => byDay[dayKey(addDays(today, -i))]).filter(Boolean);
  return { set: days.length, kept: days.filter((d) => d.kept).length };
};

// Keeps only the days from the last 400 days, so storage does not grow for ever.
export const prune = (byDay: IntentionsByDay, today: Date): IntentionsByDay => {
  const cutoff = dayKey(addDays(today, -400));
  return Object.fromEntries(Object.entries(byDay).filter(([day]) => day >= cutoff));
};
