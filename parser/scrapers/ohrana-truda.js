/**
 * Парсинг раздела «Охрана труда».
 * Список ссылок приходит снаружи (LinkList → Parser).
 */

import {
  goTo,
  randomBetween,
  sleep,
  sleepBetweenBatches,
  sleepBetweenPages,
} from '../browser.js';
import { log } from '../utils.js';

const EMPTY_PAGE_DELAY_MS = 5 * 60 * 1000;

// хоть одно поле пустое — считаем страницу битой
function isEmptyPage(data) {
  return (
    data.title == null ||
    data.description == null ||
    data.seo_title == null ||
    data.seo_meta_description == null
  );
}

export async function parseOhranaTruda(browser, links = []) {
  if (!links.length) {
    log('ohrana-truda: список ссылок пуст');
    return;
  }

  const page = await browser.newPage();
  log(`ohrana-truda: карточек ${links.length}`);

  let nextBreakAt = randomBetween(50, 100);

  try {
    for (let i = 0; i < links.length; i++) {
      const url = links[i];
      await goTo(page, url);

      const data = await page.evaluate(() => ({
        title: document.querySelector('.detail-banner-conent h1')?.innerText?.trim() || null,
        description: document.querySelector('.detail-banner-conent')?.innerText?.trim() || null,
        seo_title: document.title?.trim() || null,
        seo_meta_description:
          document.querySelector('meta[name="description"]')?.content?.trim() || null,
        sourceUrl: location.href,
      }));

      log(data);
      // await saveToDb(data);

      // пустая страница (капча/блок) — ждём 5 мин перед следующей ссылкой
      if (isEmptyPage(data) && i < links.length - 1) {
        log('пустые данные, пауза 5 мин перед следующей ссылкой');
        await sleep(EMPTY_PAGE_DELAY_MS);
      } else {
        const pagePause = await sleepBetweenPages();
        log(`пауза ${pagePause} мс (${i + 1}/${links.length})`);
      }

      if (i + 1 >= nextBreakAt && i < links.length - 1) {
        const batchPause = await sleepBetweenBatches();
        log(`батч-пауза ${Math.round(batchPause / 60000)} мин после ${i + 1} ссылок`);
        nextBreakAt = i + 1 + randomBetween(50, 100);
      }
    }
  } finally {
    await page.close();
  }
}
