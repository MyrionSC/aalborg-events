const axios = require('axios');
const cheerio = require('cheerio');
const { initDatabase, deleteEventsByVenue, insertEvents } = require('./db-helper');

const BASE_URL = 'https://skraaen.dk/arrangementer/?sf_data=results&sf_paged=';
const VENUE_NAME = 'Skråen';

async function scrapePage(page) {
    const url = `${BASE_URL}${page}`;
    try {
        const response = await axios.get(url);
        const $ = cheerio.load(response.data);
        const events = [];

        $('article.event-item').each((index, element) => {
            const $item = $(element);
            
            const title = $item.find('.event-info h2 a').text().trim();
            const url = $item.find('.event-info h2 a').attr('href');
            const id = url ? url.split('/').filter(Boolean).pop() : null;
            
            const dateStr = $item.find('.event-type h4').first().text().trim(); // 20.05.2026
            const price = $item.find('.event-price h4').text().trim();
            const status = $item.find('.status').text().trim();
            
            const eventType = $item.find('.event-item-label .capitalize').text().trim();

            // Parse date (DD.MM.YYYY) to ISO format
            let timeStart = '';
            if (dateStr) {
                const [day, month, year] = dateStr.split('.');
                if (day && month && year) {
                    timeStart = `${year}-${month}-${day}T00:00:00`;
                }
            }

            if (title && url) {
                events.push({
                    id: id || url,
                    title,
                    url,
                    description: `Pris: ${price}. Status: ${status}. Dag: ${eventType}`,
                    time_start: timeStart,
                    type: eventType,
                    venue_name: VENUE_NAME
                });
            }
        });

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
