import RabSpecRepository from '../../repositories/parser/rab_spec.js';
import ApiErrors from '../exeptions/apiErrors.js';
import OpenAI from "openai";

const parseAiJson = (content) => {
    const text = String(content).trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    return JSON.parse(text);
};

class AiService {
    constructor() {
        this.rabSpecRepository = new RabSpecRepository();
        this.openai = new OpenAI({
            baseURL: 'https://api.deepseek.com',
            apiKey: process.env.AI_API_KEY_DEEPSEEK,
            timeout: 2 * 60 * 1000,
        });
        this.statusLoad = null;
    }

    getStatus() {
        return {
            statusLoad: this.statusLoad,
        };
    }

    async enrichAllRabSpec() {
        if (this.statusLoad === 'loading') {
            return this.getStatus();
        }

        this.statusLoad = 'loading';

        this.runEnrichAll()
            .then(() => {
                this.statusLoad = 'everything is loaded';
            })
            .catch((error) => {
                console.error(error);
                this.statusLoad = 'error loading';
            });

        return this.getStatus();
    }

    async runEnrichAll() {
        const posts = await this.rabSpecRepository.getAllWithPostData();

        for (const post of posts) {
            if (post.post_data == null || post.post_data === '') continue;
            try {
                await this.deepseekRequest(post.id, post.post_data);
            } catch (error) {
                console.error(`[ai] пост ${post.id}:`, error.message);
            }
        }
    }

    async testRequest(id, data) {
        const myHeaders = new Headers();
        myHeaders.append("Authorization", `Bearer ${process.env.AI_API_KEY}`);
        myHeaders.append("Content-Type", "application/json");

        const raw = JSON.stringify({
        "messages": [
            {
                "role": "system",
                "content": `Ты редактор текстов страниц рабочих специальностей. На входе один JSON страницы. Верни только валидный JSON, без markdown и без пояснений.

                Каждое поле верхнего уровня имеет вид { value, weight, description }.
                weight и description не меняй ни у одного поля. Ключи не добавляй и не удаляй. null и пустые массивы оставь как есть.

                Ключевые слова бери только из исходного текста: название профессии, «обучение», «курсы», город, документы (удостоверение, свидетельство, корочка), формат (дистанционно, очно, практика), разряд, цену. Новые ключевые темы не придумывай. Эти слова в переписанном тексте оставь. Название профессии склоняй правильно.

                Перепиши заново каждое предложение в полях ниже. Формулировку меняй целиком. Замена одного слова («Обучение» на «Курсы») — это не переписывание, такой ответ не принимается. Дословное предложение из источника — ошибка. Ответ, где изменены только первые абзацы, а хвост скопирован, — ошибка.
                - title.value — весь текст
                - seo.value.title — весь текст
                - seo.value.og_title — весь текст
                - seo.value.og_description — весь текст, он не должен совпасть с источником
                - seo.value.meta_description — весь текст, он не должен совпасть с источником
                - faq.value[].question — каждый вопрос, с первого элемента массива до последнего
                - faq.value[].answer — каждый ответ, каждое предложение, с первого элемента массива до последнего
                - seo_text.value — каждое предложение внутри HTML, включая последние абзацы и пункты списков
                - footer_text.value — каждое предложение внутри HTML, включая последние абзацы и цитату

                В seo_text.value и footer_text.value теги оставь те же: те же h2, h3, p, ul, ol, li, blockquote, то же число пунктов. Атрибуты тегов не добавляй. Меняется только текст между тегами, и меняется он весь.

                Число вопросов в faq.value не меняй, порядок не меняй.

                Факты не добавляй и не выбрасывай: документы, законы, номера статей, даты, сроки, разряды, часы, цены, город, название учебного центра, числа. Слова не коверкай и не подменяй кириллицу латиницей. «Свидетельство» остаётся «свидетельством».

                Поля ниже вставь символ в символ, без правок и без опечаток:
                - skip
                - sourceUrl.value
                - seo.value.slug, seo.value.og_url, seo.value.og_type, seo.value.og_image
                - price целиком
                - training целиком
                - tariffs целиком
                - popular, recommended, recommend, price_variants целиком`
            },
            {
                "role": "user",
                "content": `${JSON.stringify(data)}

Перед ответом проверь: переписаны все элементы faq.value от первого до последнего, весь текст seo_text.value и footer_text.value, title.value, seo.value.title, og_title, og_description и meta_description. Совпадение предложения с источником — ошибка. Запрещённые поля вставлены без изменений.`
            }
        ],
        "model": "grok-3-latest",
        "stream": false,
        "temperature": 0.8
        });

        const requestOptions = {
        method: "POST",
        headers: myHeaders,
        body: raw,
        redirect: "follow"
        };

        const response = await fetch("https://api.x.ai/v1/chat/completions", requestOptions);
        const result = await response.json();

        if (!response.ok) {
            const message = result?.error?.message || 'Нейросеть вернула ошибку';
            throw ApiErrors.BadRequest(message);
        }

        const content = result?.choices?.[0]?.message?.content;
        if (typeof content !== 'string' || !content.trim()) {
            throw ApiErrors.BadRequest('Нейросеть не вернула текст');
        }

        let aiData;
        try {
            aiData = parseAiJson(content);
        } catch {
            throw ApiErrors.BadRequest('Нейросеть вернула не JSON');
        }

        const updated = await this.rabSpecRepository.updateAiData(id, aiData);
        if (!updated) {
            throw ApiErrors.NotFound('Пост не найден');
        }

        return updated;
    }



    async deepseekRequest(id, data) {
        let completion;
        try {
            completion = await this.openai.chat.completions.create({
                messages: [
                    {
                        role: "system",
                        content: `Ты редактор текстов страниц рабочих специальностей. На входе один JSON страницы. Верни только валидный JSON, без markdown и без пояснений.

                Каждое поле верхнего уровня имеет вид { value, weight, description }.
                weight и description не меняй ни у одного поля. Ключи не добавляй и не удаляй. null и пустые массивы оставь как есть.

                Ключевые слова бери только из исходного текста: название профессии, «обучение», «курсы», город, документы (удостоверение, свидетельство, корочка), формат (дистанционно, очно, практика), разряд, цену. Новые ключевые темы не придумывай. Эти слова в переписанном тексте оставь. Название профессии склоняй правильно.

                Перепиши заново каждое предложение в полях ниже. Формулировку меняй целиком. Замена одного слова («Обучение» на «Курсы») — это не переписывание, такой ответ не принимается. Дословное предложение из источника — ошибка. Ответ, где изменены только первые абзацы, а хвост скопирован, — ошибка.
                - title.value — весь текст
                - seo.value.title — весь текст
                - seo.value.og_title — весь текст
                - seo.value.og_description — весь текст, он не должен совпасть с источником
                - seo.value.meta_description — весь текст, он не должен совпасть с источником
                - faq.value[].question — каждый вопрос, с первого элемента массива до последнего
                - faq.value[].answer — каждый ответ, каждое предложение, с первого элемента массива до последнего
                - seo_text.value — каждое предложение внутри HTML, включая последние абзацы и пункты списков
                - footer_text.value — каждое предложение внутри HTML, включая последние абзацы и цитату

                В seo_text.value и footer_text.value теги оставь те же: те же h2, h3, p, ul, ol, li, blockquote, то же число пунктов. Атрибуты тегов не добавляй. Меняется только текст между тегами, и меняется он весь.

                Число вопросов в faq.value не меняй, порядок не меняй.

                Факты не добавляй и не выбрасывай: документы, законы, номера статей, даты, сроки, разряды, часы, цены, город, название учебного центра, числа. Слова не коверкай и не подменяй кириллицу латиницей. «Свидетельство» остаётся «свидетельством».

                Поля ниже вставь символ в символ, без правок и без опечаток:
                - skip
                - sourceUrl.value
                - seo.value.slug, seo.value.og_url, seo.value.og_type, seo.value.og_image
                - price целиком
                - training целиком
                - tariffs целиком
                - popular, recommended, recommend, price_variants целиком`
                    },
                    {
                        role: "user",
                        content: `${JSON.stringify(data)}

Перед ответом проверь: переписаны все элементы faq.value от первого до последнего, весь текст seo_text.value и footer_text.value, title.value, seo.value.title, og_title, og_description и meta_description. Совпадение предложения с источником — ошибка. Запрещённые поля вставлены без изменений.`
                    }
                ],
                model: "deepseek-flash",
                thinking: { type: "enabled" },
                reasoning_effort: "high",
                stream: false,
                temperature: 0.8,
            });
        } catch (error) {
            const message = error?.error?.message || error?.message || 'Нейросеть вернула ошибку';
            console.error(`[ai] DeepSeek пост ${id}:`, message);
            await this.rabSpecRepository.updateAiLoad(id, false);
            throw ApiErrors.BadRequest(message);
        }

        const content = completion?.choices?.[0]?.message?.content;
        console.log(`[ai] DeepSeek ответил, пост ${id}`);
        if (typeof content !== 'string' || !content.trim()) {
            await this.rabSpecRepository.updateAiLoad(id, false);
            throw ApiErrors.BadRequest('Нейросеть не вернула текст');
        }

        let aiData;
        try {
            aiData = parseAiJson(content);
        } catch {
            await this.rabSpecRepository.updateAiLoad(id, false);
            throw ApiErrors.BadRequest('Нейросеть вернула не JSON');
        }

        const updated = await this.rabSpecRepository.updateAiData(id, aiData);
        if (!updated) {
            throw ApiErrors.NotFound('Пост не найден');
        }

        return updated;
    }
}

export default AiService;


