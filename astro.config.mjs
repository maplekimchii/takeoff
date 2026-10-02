import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Set SITE_URL to the real domain before deploying (used for sitemap + Open Graph URLs).
const site = process.env.SITE_URL ?? 'https://sean-kim.kr';

export default defineConfig({
  site,
  trailingSlash: 'ignore',
  integrations: [sitemap()],
});
