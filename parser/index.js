/**
 * Парсер разделов.
 *
 * Из API / другого кода:
 *   import { Parser } from './parser/index.js';
 *   await new Parser().rabochieSpecialnosti();
 *   await new Parser().ohranaTruda();
 *
 * Из CLI:
 *   node parser/index.js rabochie-specialnosti
 *   node parser/index.js ohrana-truda
 */

import 'dotenv/config';
import { pathToFileURL } from 'url';
import { createBrowser } from './browser.js';
import { LinkList } from './helpers/LinkList.js';
import { parseOhranaTruda } from './scrapers/ohrana-truda.js';
import { parseRabochieSpecialnosti } from './scrapers/rabochie-specialnosti.js';
import { log } from './utils.js';

export class Parser {
  constructor() {
    this.linkList = new LinkList();
  }

  async ohranaTruda() {
    log('Parser: охрана труда');

    await this.#withBrowser(async (browser) => {
      const links = await this.linkList.getOhranaTrudaLinks();
      await parseOhranaTruda(browser, links);
    });
  }

  async rabochieSpecialnosti(linksList = null) {
    log('Parser: рабочие специальности');

    await this.#withBrowser(async (browser) => {
      let links = await this.linkList.getObuchenieLinks();
      if (linksList) {
        links = linksList;
      }
      await parseRabochieSpecialnosti(browser, links);
    });
  }

  // браузер открывается и закрывается внутри каждого метода парсинга
  async #withBrowser(fn) {
    const browser = await createBrowser();
    log('Parser: браузер запущен');

    try {
      return await fn(browser);
    } finally {
      await browser.close();
      log('Parser: браузер закрыт');
    }
  }
}

async function main() {
  const name = process.argv[2] || 'rabochie-specialnosti';
  const parser = new Parser();

  if (name === 'ohrana-truda') {
    await parser.ohranaTruda();
    return;
  }

  if (name === 'rabochie-specialnosti') {
    await parser.rabochieSpecialnosti();
    return;
  }

  throw new Error(`Неизвестный раздел: ${name}`);
}

// main только при прямом запуске файла, не при import из API
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
