import { defineConfig } from 'astro/config';

// Published with GitHub Pages at https://sayhien.github.io/portfolio/
export default defineConfig({
  site: 'https://sayhien.github.io',
  base: '/portfolio/',
  build: { format: 'directory', assets: 'assets' },
});
