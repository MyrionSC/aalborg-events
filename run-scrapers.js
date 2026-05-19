const { initDatabase, deleteEventsByVenue, insertEvents } = require('./scrapers/db-helper');
const frydScraper = require('./scrapers/1000fryd-scraper');
const husetScraper = require('./scrapers/huset-scraper');
const musikkenshusScraper = require('./scrapers/musikkenshus-scraper');
const studenterhusetScraper = require('./scrapers/studenterhuset-scraper');
const skraaenScraper = require('./scrapers/skraaen-scraper');

const scrapers = [
    frydScraper,
    husetScraper,
    musikkenshusScraper,
    studenterhusetScraper,
    skraaenScraper
];

async function runAll() {
    let db;
    try {
        db = await initDatabase();
        console.log('Starting all scrapers...');

        for (const scraper of scrapers) {
            console.log(`--- Running scraper for ${scraper.VENUE_NAME} ---`);
            try {
                const events = await scraper.scrapeEvents();
                console.log(`Found ${events.length} events for ${scraper.VENUE_NAME}`);

                await deleteEventsByVenue(db, scraper.VENUE_NAME);
                if (events.length > 0) {
                    await insertEvents(db, events);
                } else {
                    console.log(`No events to insert for ${scraper.VENUE_NAME}`);
                }
            } catch (error) {
                console.error(`Error running scraper for ${scraper.VENUE_NAME}:`, error.message);
            }
        }

        console.log('--- All scrapers finished ---');
    } catch (error) {
        console.error('Fatal error:', error.message);
    } finally {
        if (db) {
            db.close();
            console.log('Database connection closed');
        }
    }
}

runAll();
