/**
 * Парсинг раздела «Рабочие специальности».
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
import { TrainingProps } from '../dom/trainingProps.js';

import RabSpecRepository from '../../repositories/parser/rab_spec.js';

const EMPTY_PAGE_DELAY_MS = 1 * 60 * 1000;
const RETRY_DELAY_MS = 30 * 1000;

const field = (value, weight, description) => ({ value, weight, description });

// хоть одно поле пустое — считаем страницу битой
function isEmptyPage(data) {
  const seo = data.seo?.value;
  return (
    data.title?.value == null ||
    seo?.title == null ||
    seo?.meta_description == null ||
    seo?.slug == null
  );
}

async function scrapePage(page, url) {
  await goTo(page, url);

  const fields = await page.evaluate(() => {
    // каталог / сайдбар-раздел — не карточка профессии
    if (document.querySelector('.a111.sidebar, .a111 .sidebar')) {
      return { skip: true, sourceUrl: location.href };
    }

    const meta = (sel) => document.querySelector(sel)?.content?.trim() || null;

    return {
      title: document.querySelector('.banners-big__title h1')?.innerText?.trim() || null,
      seo: {
        title: document.title?.trim() || null,
        meta_description: meta('meta[name="description"]') || null,
        slug:
          location.pathname.replace(/\/+$/, '').split('/').filter(Boolean).pop() || null,
        og_title: meta('meta[property="og:title"]') || null,
        og_type: meta('meta[property="og:type"]') || null,
        og_image: meta('meta[property="og:image"]') || null,
        og_url: meta('meta[property="og:url"]') || null,
        og_description: meta('meta[property="og:description"]') || null,
      },
      price: {
        current_price: document.querySelector('.price__new_div .price__new-val')?.getAttribute('content')?.trim() || null,
        old_price: document.querySelector('.price__old_div .price__old .price__old-val')?.innerText?.trim() || null,
      },
      faq: [...document.querySelectorAll('.detail-block.faq .item-accordion-wrapper')]
        .map((el) => ({
          question: el.querySelector('.accordion-head')?.innerText?.replace(/\s+/g, ' ').trim() || null,
          answer: el.querySelector('.accordion-body')?.innerText?.replace(/\s+/g, ' ').trim() || null,
        }))
        .filter((item) => item.question),
      sourceUrl: location.href,
    };
  });

  if (fields?.skip) {
    log(fields);
    return fields;
  }

  const data = {
    title: field(fields.title, 1, 'Заголовок страницы'),
    sourceUrl: field(fields.sourceUrl, 2, 'Адрес спарсенной страницы'),
    seo: field(fields.seo, 3, 'SEO из head: title, description, slug и Open Graph'),
    price: field(fields.price, 4, 'Текущая и старая цена'),
    training: field(
      {
        qualification: await TrainingProps.qualification(page),
        rank: await TrainingProps.rank(page),
        duration: await TrainingProps.duration(page),
      },
      5,
      'Квалификация, разряд и срок обучения',
    ),
    faq: field(fields.faq, 6, 'Вопросы и ответы'),
    price_variants: field(await TrainingProps.priceVariants(page), 7, 'Варианты стоимости курса'),
    tariffs: field(await TrainingProps.tariffs(page), 8, 'Тарифы: стикер, название, текст и цены'),
    popular: field(await TrainingProps.popular(page), 9, 'Популярные специальности'),
    recommended: field(await TrainingProps.recommended(page), 10, 'Блок «Интересуются также»'),
    recommend: field(await TrainingProps.recommend(page), 11, 'Блок «Рекомендуем»'),
    seo_text: field(await TrainingProps.seoText(page), 12, 'Текстовый SEO-блок, HTML сохранён'),
    footer_text: field(await TrainingProps.footerText(page), 13, 'Нижний текстовый блок, HTML сохранён'),
    skip: field(false, 14, 'Служебный флаг пропуска страницы'),
  };

  log(data);
  return data;
}

export async function parseRabochieSpecialnosti(browser, links = [], { skipExisting = false } = {}) {
  if (!links.length) {
    log('rabochie-specialnosti: список ссылок пуст');
    return;
  }

  const page = await browser.newPage();
  const rabSpec = new RabSpecRepository();
  log(`rabochie-specialnosti: карточек ${links.length}`);

  let nextBreakAt = randomBetween(50, 100);

  try {

    let count = 0;

    // if(links.length > 10){
    //   count = 10;
    // }
    // else{
    //   count = links.length;
    // }
    count = links.length;

    // с конца списка (последние ссылки sitemap первыми)
    for (let i = 0; i < count; i++) {
      const url = links[links.length - 1 - i];

      // режим «только недостающие»: уже сохранённый url не открываем
      if (skipExisting && await rabSpec.existsByUrl(url)) {
        log('уже в базе, пропуск:', url);
        continue;
      }

      let data = await scrapePage(page, url);

      // .a111 .sidebar — не карточка, в БД не пишем
      // skip у карточки — объект { value: false }, его нельзя считать пропуском
      if (data?.skip === true || data?.skip?.value === true) {
        log('пропуск (sidebar):', data.sourceUrl?.value || data.sourceUrl || url);
        const pagePause = await sleepBetweenPages();
        log(`пауза ${pagePause} мс (${i + 1}/${links.length})`);
        continue;
      }

      // пусто — одна повторная попытка через 30 сек, иначе пропускаем
      if (isEmptyPage(data)) {
        log('пустые данные, повтор через 30 сек');
        await sleep(RETRY_DELAY_MS);
        data = await scrapePage(page, url);

        if (data?.skip === true || data?.skip?.value === true) {
          log('пропуск (sidebar):', data.sourceUrl?.value || data.sourceUrl || url);
          const pagePause = await sleepBetweenPages();
          log(`пауза ${pagePause} мс (${i + 1}/${links.length})`);
          continue;
        }

        if (isEmptyPage(data)) {
          log('повтор не помог, пропускаем');
        }
      }

      const empty = isEmptyPage(data);
      const postUrl = data.sourceUrl?.value || url;
      const existing = await rabSpec.getByUrl(postUrl);
      const payload = {
        title: data.title?.value ?? null,
        parser_load: !empty,
        post_data: data,
        parser_logs: empty ? 'пустые данные / капча / блок' : null,
      };

      if (existing) {
        await rabSpec.updateById(existing.id, payload);
        log('пост обновлён', existing.id);
      } else {
        const created = await rabSpec.create({ url: postUrl, ...payload });
        log('пост создан', created.id);
      }

      // пустая страница (капча/блок) — ждём 5 мин перед следующей ссылкой
      if (empty && i < links.length - 1 && i != 0) {
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
