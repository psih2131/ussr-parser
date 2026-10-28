/**
 * Свойства обучения из .catalog-detail__bottom-info.
 * value выполняется в браузере: его передают в page.evaluate.
 */

export class TrainingProps {
  static value(label) {
    return (
      [...document.querySelectorAll('.catalog-detail__bottom-info .properties__item')]
        .find((el) => el.querySelector('.js-prop-title')?.textContent?.includes(label))
        ?.querySelector('.js-prop-value')
        ?.innerText?.trim() || null
    );
  }

  static qualification(page) {
    return page.evaluate(TrainingProps.value, 'Присваиваемая квалификация');
  }

  static rank(page) {
    return page.evaluate(TrainingProps.value, 'Разряды');
  }

  static duration(page) {
    return page.evaluate(TrainingProps.value, 'Срок обучения');
  }

  static readPriceVariants() {
    const sku = document.querySelector('#sku');
    if (!sku) return [];

    const itemProp = (item, label) =>
      [...item.querySelectorAll('.js-prop-replace')]
        .find((el) => el.querySelector('.js-prop-title')?.innerText?.trim() === label)
        ?.querySelector('.js-prop-value')
        ?.innerText?.trim() || null;

    return [...sku.querySelectorAll('.catalog-table__item')].map((item) => ({
      title: item.querySelector('.js-popup-title')?.innerText?.trim() || null,
      current_price: item.querySelector('.price__new-val')?.innerText?.trim() || null,
      old_price: item.querySelector('.price__old-val')?.innerText?.trim() || null,
      issued_document: itemProp(item, 'Выдаваемый документ'),
      format: itemProp(item, 'Формат'),
      level: itemProp(item, 'Уровень'),
      duration: itemProp(item, 'Продолжительность (ак.ч)'),
    }));
  }

  static priceVariants(page) {
    return page.evaluate(TrainingProps.readPriceVariants);
  }

  static readTariffs() {
    const root = document.querySelector('#tariffs');
    if (!root) return [];

    return [...root.querySelectorAll('.tariffs-list__item')]
      .filter((item) => !item.closest('.owl-item.cloned'))
      .map((item) => ({
        sticker: item.querySelector('.sticker--upper')?.innerText?.trim() || null,
        subtitle: item.querySelector('.tariffs-list__item-section')?.innerText?.trim() || null,
        title: item.querySelector('.tariffs-list__item-title')?.innerText?.trim() || null,
        text: item.querySelector('.tariffs-list__item-preview')?.innerText?.trim() || null,
        current_price: item.querySelector('.price__new-val')?.innerText?.trim() || null,
        old_price: item.querySelector('.price__old-val')?.innerText?.trim() || null,
      }));
  }

  static tariffs(page) {
    return page.evaluate(TrainingProps.readTariffs);
  }

  static readPopular() {
    const root = document.querySelector('.detail-block.ordered-block.goods');
    if (!root) return [];

    return [...root.querySelectorAll('.catalog-block__item')].map((item) => ({
      title: item.querySelector('.js-popup-title')?.innerText?.trim() || null,
      current_price: item.querySelector('.price__new-val')?.innerText?.trim() || null,
      old_price: item.querySelector('.price__old-val')?.innerText?.trim() || null,
    }));
  }

  static popular(page) {
    return page.evaluate(TrainingProps.readPopular);
  }

  static readSeoText() {
    const root = document.querySelector('.detail-block.ordered-block.text_uniq');
    return root?.innerHTML?.trim() || null;
  }

  static seoText(page) {
    return page.evaluate(TrainingProps.readSeoText);
  }

  static readFooterText() {
    const root = document.querySelector('.detail-block.ordered-block.dop-foot .content');
    return root?.innerHTML?.trim() || null;
  }

  static footerText(page) {
    return page.evaluate(TrainingProps.readFooterText);
  }

  static readCatalogCards(analytics) {
    const root = document.querySelector(
      `.detail-block.ordered-block.rec_filter[data-analytics="${analytics}"]`,
    );
    if (!root) return [];

    return [...root.querySelectorAll('.catalog-block__item')].map((item) => {
      const href = item.querySelector('.js-popup-title')?.getAttribute('href') || null;
      const url = href ? new URL(href, location.origin).href : null;
      const slug = url
        ? new URL(url).pathname.replace(/\/+$/, '').split('/').filter(Boolean).pop() || null
        : null;

      return {
        title: item.querySelector('.js-popup-title')?.innerText?.trim() || null,
        current_price: item.querySelector('.price__new-val')?.innerText?.trim() || null,
        old_price: item.querySelector('.price__old-val')?.innerText?.trim() || null,
        url,
        slug,
      };
    });
  }

  static recommended(page) {
    return page.evaluate(TrainingProps.readCatalogCards, 'carousel-also-interested');
  }

  static recommend(page) {
    return page.evaluate(TrainingProps.readCatalogCards, 'carousel-recommended');
  }
}
