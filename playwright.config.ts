import { defineConfig, devices } from '@playwright/test';

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: './tests',
  use: {
    baseURL: 'http://localhost:4173',
  },
  projects: [
    {
      name: 'chromium-desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
    },
    {
      name: 'chromium-mobile',
      use: {
        ...devices['Pixel 5'],
      },
    },
  ],
  webServer: {
    command: isCI
      ? 'npm run preview -- --host --port 4173'
      : 'npm run dev -- --host --port 4173',
    url: 'http://localhost:4173',
    reuseExistingServer: !isCI,
    timeout: 120000,
  },
});
