/**
 * Всё про Puppeteer в одном месте:
 * — открыть браузер
 * — открыть страницу / перейти по url
 * — пауза
 */

import puppeteer from 'puppeteer';

/** Запуск браузера */
export async function createBrowser() {
  return puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
}

/** Переход на url: ждём полную загрузку + readyState === complete */
export async function goTo(page, url) {
  await page.goto(url, {
    waitUntil: ['domcontentloaded', 'load'],
    timeout: 90000,
  });

  await page.waitForFunction(() => document.readyState === 'complete', {
    timeout: 90000,
  });
}

/** Пауза в мс */
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Случайное целое в диапазоне [min, max] */
export function randomBetween(min, max) {
  return Math.floor(min + Math.random() * (max - min + 1));
}

/**
 * Пауза между страницами.
 * Обычный режим: 2.25–5.25 сек
 * PARSER_SLOW=true: 4.5–9 сек
 */
export async function sleepBetweenPages() {
  const slow = process.env.PARSER_SLOW === 'true';
  const ms = slow ? randomBetween(4500, 9000) : randomBetween(2250, 5250);
  await sleep(ms);
  return ms;
}

/**
 * Пауза между батчами: 5–15 мин
 */
export async function sleepBetweenBatches() {
  const ms = randomBetween(5 * 60 * 1000, 15 * 60 * 1000);
  await sleep(ms);
  return ms;
}
