import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 60000,
  expect: { timeout: 10000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5173',
    // 用系统已安装的 Edge，免下载 Chromium；若本机无 Edge 可改回 chromium
    channel: 'msedge',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    // 验收要求：375 / 390 / 414 三种手机宽度
    { name: 'mobile-375', use: { viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true } },
    { name: 'mobile-390', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
    { name: 'mobile-414', use: { viewport: { width: 414, height: 896 }, isMobile: true, hasTouch: true } },
  ],
  webServer: [
    { command: 'node mock-server/index.js', url: 'http://localhost:3001/api/v1/health', reuseExistingServer: true, timeout: 30000 },
    { command: 'npm run dev', url: 'http://localhost:5173', reuseExistingServer: true, timeout: 30000 },
  ],
});
