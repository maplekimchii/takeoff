import { getCollection } from 'astro:content';
import profileData from '../content/profile.json';
import skillsData from '../content/skills.json';
import interestsData from '../content/interests.json';

export const profile = profileData;
export const skills = skillsData;

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/** "2026-01" -> "JAN 2026" */
export function formatMonth(ym: string): string {
  const [y, m] = ym.split('-');
  return `${MONTHS[Number(m) - 1]} ${y}`;
}

/** "JAN – APR 2026", "SEP 2023 – MAR 2025", "SEP 2026 – PRESENT" */
export function formatRange(start: string, end: string | null): string {
  if (!end) return `${formatMonth(start)} – PRESENT`;
  const [sy] = start.split('-');
  const [ey] = end.split('-');
  return sy === ey
    ? `${MONTHS[Number(start.split('-')[1]) - 1]} – ${formatMonth(end)}`
    : `${formatMonth(start)} – ${formatMonth(end)}`;
}

/** "Winter 2026" -> "W26" */
export function termCode(term: string): string {
  const [season, year] = term.split(' ');
  return `${season[0].toUpperCase()}${year.slice(2)}`;
}

/** 2025-01-15 -> "15 JAN 2025" */
export function formatDate(d: Date): string {
  return `${String(d.getUTCDate()).padStart(2, '0')} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export async function getExperience() {
  const all = await getCollection('experience');
  return all.sort((a, b) => b.data.start.localeCompare(a.data.start));
}

export async function getProjects() {
  const all = await getCollection('projects');
  return all.sort((a, b) => a.data.code.localeCompare(b.data.code));
}

export async function getCities() {
  const all = await getCollection('cities');
  return all.sort((a, b) => a.data.km - b.data.km);
}

/** Keeps the order of interests.json (the file loader sorts by id). */
export async function getInterests() {
  const order = interestsData.map((i) => i.id);
  const all = await getCollection('interests');
  return all.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
}

/** Drafts only appear in `astro dev`; production builds ship published posts only. */
export async function getPosts() {
  // Skip the lookup (and Astro's "collection is empty" warning on every page) when there are no posts yet.
  if (Object.keys(import.meta.glob('../content/posts/*.md')).length === 0) return [];
  const all = await getCollection('posts', (p) => import.meta.env.DEV || !p.data.draft);
  return all.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}
