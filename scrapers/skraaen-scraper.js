const axios = require('axios');
const cheerio = require('cheerio');
const { initDatabase, deleteEventsByVenue, insertEvents } = require('./db-helper');

const BASE_URL = 'https://skraaen.dk/arrangementer/?sf_data=results&sf_paged=';
const VENUE_NAME = 'Skråen';

async function scrapeEventTime(url) {
    try {
        const response = await axios.get(url);
        const $ = cheerio.load(response.data);
        const timeText = $('.event-info h2').next('div').text().trim(); // "Kl. 20:00"
        const timeMatch = timeText.match(/(\d{2}:\d{2})/);
        return timeMatch ? timeMatch[1] : '00:00';
    } catch (error) {
        console.error(`Error scraping event time from ${url}:`, error.message);
        return '00:00';
    }
}

async function scrapePage(page) {
    const url = `${BASE_URL}${page}`;
    try {
        const response = await axios.get(url);
        const $ = cheerio.load(response.data);
        const eventElements = $('article.event-item').toArray();
        const events = [];

        for (const element of eventElements) {
            const $item = $(element);
            
            const title = $item.find('.event-info h2 a').text().trim();
            const eventUrl = $item.find('.event-info h2 a').attr('href');
            const id = eventUrl ? eventUrl.split('/').filter(Boolean).pop() : null;
            if (events.some(event => event.id === id)) {
                continue;
            }

            const dateStr = $item.find('.event-type h4').first().text().trim(); // 20.05.2026
            const price = $item.find('.event-price h4').text().trim();
            const status = $item.find('.status').text().trim();
            
            // const eventType = $item.find('.event-item-label .capitalize').text().trim();

            console.log(`  Scraping details for: ${title}`);
            const startTimeStr = eventUrl ? await scrapeEventTime(eventUrl) : '00:00';

            // Parse date (DD.MM.YYYY) and time (HH:mm) to ISO format
            let timeStart = '';
            if (dateStr) {
                const [day, month, year] = dateStr.split('.');
                if (day && month && year) {
                    timeStart = `${year}-${month}-${day}T${startTimeStr}:00`;
                }
            }

            if (title && eventUrl) {
                events.push({
                    id: id || eventUrl,
                    title,
                    url: eventUrl,
                    description: `Pris: ${price}. Status: ${status}`,
                    time_start: timeStart,
                    type: '',
                    venue_name: VENUE_NAME
                });
            }
        }

        return events;
    } catch (error) {
        console.error(`Error scraping page ${page}:`, error.message);
        return [];
    }
}

async function scrapeEvents() {
    let allEvents = [];
    for (let i = 1; i <= 5; i++) {
        console.log(`Scraping page ${i}...`);
        const events = await scrapePage(i);
        allEvents = allEvents.concat(events);
    }
    return allEvents;
}

async function main() {
    let db;

    try {
        const events = await scrapeEvents();
        if (events.length === 0) throw new Error("No events, scraper probably broke")
        console.log(`Found ${events.length} events in total`);

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
