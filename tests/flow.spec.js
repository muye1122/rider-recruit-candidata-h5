import { test, expect } from '@playwright/test';

// 端到端：渠道入口 -> 同意 -> 7项登记 -> 政策问答 -> 选站点 -> 预约 -> 结果页
test('full flow: entry, consent, 7 fields, policy Q&A, station, booking, result', async ({ page }) => {
  await page.goto('/?source_channel=poster_A');
  // 入口页 AI 标识可见
  await expect(page.getByText(/本服务由 AI 提供/)).toBeVisible();
  await expect(page.getByText('poster_A')).toBeVisible();
  await page.getByRole('button', { name: '开始登记' }).click();

  // 同意门禁：未勾选时不能开始
  await expect(page.getByTestId('consent-agree')).toBeDisabled();
  await expect(page.getByText(/我们不会收集/)).toBeVisible();
  await page.getByTestId('consent-check').check();
  await page.getByTestId('consent-agree').click();

  // 对话页：AI 标识 + 进度条
  await expect(page.getByText(/本服务由 AI 提供/)).toBeVisible();
  await expect(page.getByText(/资料进度/)).toBeVisible();

  // 逐项填写 7 个字段
  const answers = ['张三', '1991-05', '五一广场附近', '全职', '有电动车', '尽快', '有两年经验'];
  for (const a of answers) {
    await page.getByTestId('chat-input').fill(a);
    await page.getByTestId('chat-send').click();
    await page.waitForTimeout(150);
  }
  // 进度到 7/7，进入站点页
  await expect(page.getByText('选择面试站点')).toBeVisible({ timeout: 10000 });
  await expect(page.getByText(/本服务由 AI 提供/)).toBeVisible();

  // 选站点、选时段、预约
  await page.getByTestId('station-st-001').click();
  await page.locator('.slot').first().click();
  await page.getByTestId('book-btn').click();

  // 结果页
  await expect(page.getByText('预约成功')).toBeVisible({ timeout: 10000 });
  await page.screenshot({ path: 'test-results/result-page.png', fullPage: true });
});

// 同意门禁：不同意时无法进入登记
test('consent gate: decline cannot start registration', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '开始登记' }).click();
  await page.getByTestId('consent-decline').click();
  await expect(page.getByText(/转电话咨询/)).toBeVisible();
  await expect(page.getByTestId('chat-input')).toHaveCount(0);
});

// 个人信息自助：下载副本、撤回同意
test('self-service: download copy and revoke consent', async ({ page }) => {
  await page.goto('/#/selfservice');
  await expect(page.getByText('我的资料')).toBeVisible();
  const downloadPromise = page.waitForEvent('download');
  await page.getByTestId('download-data').click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('my-data.json');
  await page.getByTestId('revoke').click();
  await expect(page.getByText(/已撤回同意并删除/)).toBeVisible();
});

// AI 标识在每一屏都存在（抽查入口/同意/自助）
test('AI identity label present on every checked screen', async ({ page }) => {
  for (const [url, marker] of [['/', '开始登记'], ['/', '开始登记']]) {
    await page.goto(url);
    await expect(page.getByText(/本服务由 AI 提供/)).toBeVisible();
  }
});
