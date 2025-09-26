// Playwright設定ファイル
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/results.xml' }]
  ],
  use: {
    baseURL: 'http://localhost:8080',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    timeout: 60000, // 60秒に延長
    navigationTimeout: 60000,
    actionTimeout: 30000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  webServer: [
    {
      command: 'mvn spring-boot:run -Dspring-boot.run.profiles=test',
      port: 8080,
      reuseExistingServer: !process.env.CI,
      timeout: 180 * 1000, // 3分に延長
      env: {
        SPRING_PROFILES_ACTIVE: 'test'
      }
    },
    {
      command: 'cd fastapi_pdf_service && python -m uvicorn main:app --host 0.0.0.0 --port 8081',
      port: 8081,
      reuseExistingServer: !process.env.CI,
      timeout: 60 * 1000,
    },
  ],
});
