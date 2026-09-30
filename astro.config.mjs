import { defineConfig } from 'astro/config';

// Replace `site` with the final domain once it is chosen.
export default defineConfig({
  site: 'https://sayhien.github.io',
  build: { format: 'directory', assets: 'assets' },
});
