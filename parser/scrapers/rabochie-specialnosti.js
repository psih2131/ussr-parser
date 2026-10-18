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

import RabSpecRepository from '../../repositories/parser/rab_spec.js';

const EMPTY_PAGE_DELAY_MS = 1 * 60 * 1000;
const RETRY_DELAY_MS = 30 * 1000;

// хоть одно поле пустое — считаем страницу битой
function isEmptyPage(data) {
  return (
    data.title == null ||
    data.seo_title == null ||
    data.seo_meta_description == null ||
    data.seo_slug == null
  );
}

async function scrapePage(page, url) {
  await goTo(page, url);

  const data = await page.evaluate(() => {
    // каталог / сайдбар-раздел — не карточка профессии
    if (document.querySelector('.a111.sidebar, .a111 .sidebar')) {
      return { skip: true, sourceUrl: location.href };
    }

    const clean = (t) => (t || '').replace(/\s+/g, ' ').trim();
    const meta = (sel) => document.querySelector(sel)?.content?.trim() || null;

    const findHeading = (re) =>
      [...document.querySelectorAll('h2, h3')].find((h) => re.test(clean(h.innerText)));

    /** Текст/списки сразу после заголовка до следующего h2/h3 */
    const sectionAfterHeading = (re) => {
      const h = findHeading(re);
      if (!h) return { heading: null, text: null, items: [] };

      const texts = [];
      const items = [];
      let el = h.nextElementSibling;
      let guard = 0;

      while (el && guard++ < 40) {
        if (/^H[1-3]$/.test(el.tagName)) break;
        if (el.tagName === 'P') {
          const t = clean(el.innerText);
          if (t) texts.push(t);
        }
        if (el.tagName === 'UL' || el.tagName === 'OL') {
          items.push(
            ...[...el.querySelectorAll(':scope > li')]
              .map((li) => clean(li.innerText))
              .filter(Boolean),
          );
        }
        el = el.nextElementSibling;
      }

      return {
        heading: clean(h.innerText) || null,
        text: texts.length ? texts.join('\n\n') : null,
        items,
        paragraphs: texts,
      };
    };

    /** Карточки .tizers-list__item в следующем блоке после заголовка */
    const tizerCardsAfterHeading = (re) => {
      const h = findHeading(re);
      if (!h) return [];
      const block = h.closest('.detail-block');
      const scopes = [block, block?.nextElementSibling].filter(Boolean);
      const cards = [];

      for (const scope of scopes) {
        for (const item of scope.querySelectorAll('.tizers-list__item')) {
          const title = clean(item.querySelector('.tizers-list__item-name')?.innerText);
          const description = clean(item.querySelector('.tizers-list__item-descr')?.innerText);
          if (title) cards.push({ title, description: description || null });
        }
        if (cards.length) break;
      }
      return cards;
    };

    // --- sections (ncpo.ru) ---
    const description = sectionAfterHeading(/Как стать/i);
    const specialist = sectionAfterHeading(/Кто такой/i);
    const duties = sectionAfterHeading(/Обязанности/i);
    const audience = sectionAfterHeading(/востребованную профессию/i);
    const format = sectionAfterHeading(/Сроки обучения/i);
    const curriculumHeading = findHeading(/Чему вы научитесь/i);
    const curriculumCards = tizerCardsAfterHeading(/Чему вы научитесь/i);
    const benefits = sectionAfterHeading(/лицензией Минобразования/i);
    const benefitsCards = tizerCardsAfterHeading(/лицензией Минобразования/i);
    const documents = sectionAfterHeading(/Какие документы нужны/i);
    const documentsCards = tizerCardsAfterHeading(/Какие документы нужны/i);
    const enrollHeading = findHeading(/Как пройти обучение/i);
    const enrollCards = tizerCardsAfterHeading(/Как пройти обучение/i);

    const faqBlock = document.querySelector('.detail-block.faq');
    const faqItems = faqBlock
      ? [...faqBlock.querySelectorAll('.item-accordion-wrapper')]
          .map((el) => ({
            question: clean(el.querySelector('.accordion-head')?.innerText) || null,
            answer: clean(el.querySelector('.accordion-body')?.innerText) || null,
          }))
          .filter((x) => x.question)
      : [];

    const benefitsItems = [
      ...benefits.items,
      ...benefitsCards
        .map((c) => [c.title, c.description].filter(Boolean).join('. '))
        .filter(Boolean),
    ].filter((t) => t.length > 40);

    const documentsText =
      documents.text ||
      (documentsCards.length
        ? documentsCards
            .map((c) => [c.title, c.description].filter(Boolean).join(' — '))
            .join('\n')
        : null);

    return {
      title: document.querySelector('.banners-big__title h1')?.innerText?.trim() || null,
      description: document.querySelector('.detail-banner-conent')?.innerText?.trim() || null,
      seo_title: document.title?.trim() || null,
      seo_meta_description: meta('meta[name="description"]'),
      seo_slug:
        location.pathname.replace(/\/+$/, '').split('/').filter(Boolean).pop() || null,
      seo_og_title: meta('meta[property="og:title"]'),
      seo_og_type: meta('meta[property="og:type"]'),
      seo_og_image: meta('meta[property="og:image"]'),
      seo_og_url: meta('meta[property="og:url"]'),
      seo_og_description: meta('meta[property="og:description"]'),
      sections: {
        description_heading: description.heading,
        description_text: description.text,
        specialist_heading: specialist.heading,
        specialist_text: specialist.text,
        duties_heading: duties.heading,
        duties_items: duties.items.length ? duties.items : duties.paragraphs,
        audience_heading: audience.heading,
        audience_text: audience.text,
        format_heading: format.heading,
        format_text: format.text,
        curriculum_heading: curriculumHeading
          ? clean(curriculumHeading.innerText)
          : null,
        curriculum_items: curriculumCards,
        benefits_heading: benefits.heading,
        benefits_items: benefitsItems,
        documents_heading: documents.heading,
        documents_text: documentsText,
        enroll_heading: enrollHeading ? clean(enrollHeading.innerText) : null,
        enroll_steps: enrollCards.map((c) =>
          [c.title, c.description].filter(Boolean).join('. '),
        ),
        faq_heading: faqBlock
          ? clean(
              faqBlock.querySelector('.ordered-block__title, .switcher-title, h2, h3')
                ?.innerText,
            ) || 'Вопросы'
          : null,
        faq_items: faqItems,
      },
      sourceUrl: location.href,
      skip: false,
    };
  });

  log(data);
  return data;
}

export async function parseRabochieSpecialnosti(browser, links = []) {
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

    if(links.length > 10){
      count = 10;
    }
    else{
      count = links.length;
    }
    // с конца списка (последние ссылки sitemap первыми)
    for (let i = 0; i < count; i++) {
      const url = links[links.length - 1 - i];
      let data = await scrapePage(page, url);

      // .a111 .sidebar — не карточка, в БД не пишем
      if (data?.skip) {
        log('пропуск (sidebar):', data.sourceUrl || url);
        const pagePause = await sleepBetweenPages();
        log(`пауза ${pagePause} мс (${i + 1}/${links.length})`);
        continue;
      }

      // пусто — одна повторная попытка через 30 сек, иначе пропускаем
      if (isEmptyPage(data)) {
        log('пустые данные, повтор через 30 сек');
        await sleep(RETRY_DELAY_MS);
        data = await scrapePage(page, url);

        if (data?.skip) {
          log('пропуск (sidebar):', data.sourceUrl || url);
          const pagePause = await sleepBetweenPages();
          log(`пауза ${pagePause} мс (${i + 1}/${links.length})`);
          continue;
        }

        if (isEmptyPage(data)) {
          log('повтор не помог, пропускаем');
        }
      }

      const empty = isEmptyPage(data);
      const postUrl = data.sourceUrl || url;
      const existing = await rabSpec.getByUrl(postUrl);
      const payload = {
        title: data.title,
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
