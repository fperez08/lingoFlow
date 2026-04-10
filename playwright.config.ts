import { defineConfig, devices } from '@playwright/test'
import os from 'os'
import path from 'path'
import crypto from 'crypto'

const e2eDataDir = path.join(os.tmpdir(), `lingoflow-e2e-${crypto.randomUUID()}`)

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: ['**/*.spec.ts'],
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'E2E_STUB_YOUTUBE=true pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    env: {
      E2E_STUB_YOUTUBE: 'true',
      LINGOFLOW_DATA_DIR: e2eDataDir,
    },
  },
})
