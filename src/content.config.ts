import { defineCollection } from 'astro:content';
import { file, glob } from 'astro/loaders';
import { z } from 'astro/zod';

const yearMonth = z.string().regex(/^\d{4}-\d{2}$/, 'Use YYYY-MM');

const experience = defineCollection({
  loader: file('src/content/experience.json'),
  schema: z.object({
    term: z.string(),
    start: yearMonth,
    end: yearMonth.nullable(), // null = present
    type: z.string(), // empty string = not stated
    role: z.string(),
    organisation: z.string(),
    location: z.string(),
    details: z.array(z.string()).max(2),
    featured: z.boolean(),
  }),
});

const projects = defineCollection({
  loader: file('src/content/projects.json'),
  schema: z.object({
    code: z.string(),
    type: z.string(),
    year: z.number().nullable(),
    title: z.string(),
    summary: z.string(),
    role: z.string(),
    stack: z.array(z.string()),
    links: z.array(z.object({ label: z.string(), href: z.url() })),
    thumbnail: z.string().nullable(),
    featured: z.boolean(),
    caseStudy: z
      .object({
        problem: z.string(),
        whatIDid: z.array(z.string()),
        outcome: z.array(z.string()),
      })
      .optional(),
  }),
});

const cities = defineCollection({
  loader: file('src/content/cities.json'),
  schema: z.object({
    city: z.string(),
    country: z.string(),
    lon: z.number(),
    lat: z.number(),
    label: z.enum(['right', 'left', 'right-below', 'right-above']),
    km: z.number(),
  }),
});

const interests = defineCollection({
  loader: file('src/content/interests.json'),
  schema: z.object({
    title: z.string(),
    blurb: z.string().nullable(),
    bag: z.enum(['suitcase', 'duffel', 'backpack', 'briefcase']),
  }),
});

const posts = defineCollection({
  loader: glob({ pattern: '*.md', base: 'src/content/posts' }),
  schema: z.object({
    code: z.string(),
    title: z.string(),
    topic: z.string(),
    date: z.coerce.date(),
    readMinutes: z.number().nullable(),
    summary: z.string(),
    draft: z.boolean(),
  }),
});

export const collections = { experience, projects, cities, interests, posts };
