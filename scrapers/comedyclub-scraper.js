const puppeteer = require('puppeteer');
const { initDatabase, deleteEventsByVenue, insertEvents } = require('./db-helper');

const URL = 'https://www.eventim-light.com/dk/a/5cb57be329179d0001326043/';
const VENUE_NAME = 'Comedy Club';

async function scrapeEvents() {
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: "new",
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        
        // Set a realistic User-Agent
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        console.log(`Navigating to ${URL}...`);
        await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });

        // Wait for the event cards to appear
        await page.waitForSelector('.card__content', { timeout: 10000 });

        const events = await page.evaluate((venueName, url) => {
            eventElements = document.querySelectorAll('.v-card--link');
            const results = [];

            for (const element of eventElements) {
                const titleEl = element.querySelector('.card__title');
                const subtitleEl = element.querySelector('.card__subtitle');
                const dateEl = element.querySelector('.event__date');
                const timeEl = element.querySelector('.event__time');
                const btnEl = element.querySelector('.card__btn a');

                if (titleEl) {
                    const title = titleEl.innerText.trim();
                    // const subtitle = subtitleEl ? subtitleEl.innerText.trim() : '';
                    const subtitle = ''
                    const date = dateEl ? dateEl.innerText.trim() : '';
                    const time = timeEl ? timeEl.innerText.trim() : '';
                    const eventUrl = btnEl ? new URL(btnEl.getAttribute('href'), url).href : url;

                    let timeStart = '';
                    if (date && time) {
                        const [day, month, year] = date.split('-');
                        timeStart = `${year}-${month}-${day}T${time}:00`;
                    }

                    results.push({
                        title,
                        description: subtitle,
                        date,
                        time,
                        timeStart,
                        url: eventUrl
                    });
                }
            }
            return results;
        }, VENUE_NAME, URL);

        const processedEvents = events.map(event => ({
            id: Buffer.from(`${event.title}-${event.timeStart}`).toString('base64'),
            title: event.title,
            url: event.url,
            description: event.description,
            time_start: event.timeStart,
            type: 'Event',
            venue_name: VENUE_NAME
        }));

        return processedEvents;
    } catch (error) {
        console.error(`Error scraping events for ${VENUE_NAME}:`, error.message);
        return [];
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

async function main() {
    let db;

    try {
        console.log('Scraping events from', URL);
        const events = await scrapeEvents();
        if (events.length === 0) throw new Error("No events, scraper probably broke or returned no results");
        console.log(`Found ${events.length} events`);

        db = await initDatabase();

        await deleteEventsByVenue(db, VENUE_NAME);

        await insertEvents(db, events);

        console.log('Done!');
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    } finally {
        if (db) {
            db.close();
        }
    }
}

module.exports = { scrapeEvents, VENUE_NAME };
if (require.main === module) {
    main();
}
