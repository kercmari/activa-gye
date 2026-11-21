import { defineConfig, devices } from '@playwright/test';
const PORT = Number(process.env.E2E_PORT ?? 4173);
export default defineConfig({
  testDir: 'e2e',
  timeout: 30_000,
  retries: 0,
  workers: 2,
  use: { baseURL: `http://127.0.0.1:${PORT}`, trace: 'off', screenshot: 'only-on-failure' },
  webServer: { command: `npm run -s build && npx vite preview --port ${PORT} --strictPort --host 127.0.0.1`, url: `http://127.0.0.1:${PORT}`, reuseExistingServer: true, timeout: 120_000 },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
    { name: 'mobile', use: { ...devices['Pixel 7'], viewport: { width: 360, height: 780 } } },
  ],
});
