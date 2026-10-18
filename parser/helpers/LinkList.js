/**
 * Сбор списков ссылок из локальных sitemap / других источников.
 * Каждый метод — свой набор ссылок.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { log } from '../utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '../data');

const OBUCHENIE_PREFIX = 'https://ncpo.ru/rabochie-spetsialnosti';

export class LinkList {
  // Рабочие специальности: sitemap.xml → ссылки с /rabochie-spetsialnosti
  async getObuchenieLinks() {
    const sitemapPath = path.join(DATA_DIR, 'sitemap.xml');
    log('LinkList: читаем', sitemapPath);

    const xml = await fs.readFile(sitemapPath, 'utf8');
    const urls = [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map((m) => m[1].trim());
    const links = [...new Set(urls.filter((url) => url.includes(OBUCHENIE_PREFIX)))];

    log(`LinkList: найдено ${links.length} ссылок /rabochie-spetsialnosti`);
    return links;
  }

  // Охрана труда — источник ссылок добавим позже
  async getOhranaTrudaLinks() {
    throw new Error('LinkList.getOhranaTrudaLinks: источник ссылок ещё не задан');
  }
}
