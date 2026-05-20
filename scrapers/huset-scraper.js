const axios = require('axios');
const cheerio = require('cheerio');
const { initDatabase, deleteEventsByVenue, insertEvents } = require('./db-helper');

const URL = 'https://huset.dk/kalender';

const monthMap = {
    'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04', 'maj': '05', 'jun': '06',
    'jul': '07', 'aug': '08', 'sep': '09', 'okt': '10', 'nov': '11', 'dec': '12'
};

async function scrapeEvents() {
    try {
        const response = await axios.get(URL);
        const $ = cheerio.load(response.data);
        const events = [];

        $('.views-row').each((index, element) => {
            const $node = $(element).find('.node-event');
            if ($node.length === 0) return;

            const title = $node.find('.field-name-title-field h3 a').text().trim();
            const relativeUrl = $node.find('.field-name-title-field h3 a').attr('href');
            const fullUrl = relativeUrl ? `https://huset.dk${relativeUrl}` : '';
            const id = $node.attr('id') || relativeUrl;
            
            const type = $node.find('.field-name-field-event-type .field-item').text().trim();
            const dateStr = $node.find('.date-display-single').text().trim(); // "ons 13. maj, 10.00"
            
            const ticketText = $node.find('.field-name-field-ticket .field-item a').text().trim();
            const description = `${type}${ticketText ? ' - ' + ticketText : ''}`;

            // Parse date "ons 13. maj, 10.00"
            let timeStart = '';
            if (dateStr) {
                try {
                    // Match pattern: day_name day. month, HH.mm
                    const match = dateStr.match(/\w+\s+(\d+)\.\s+(\w+),\s+(\d{2})\.(\d{2})/);
                    if (match) {
                        const day = match[1].padStart(2, '0');
                        const monthName = match[2].toLowerCase().substring(0, 3);
                        const month = monthMap[monthName];
                        const hour = match[3];
                        const minute = match[4];
                        
                        // Current year from system
                        const now = new Date();
                        let year = now.getFullYear();
                        
                        // If it's December and we see January/February, it's probably next year
                        if (now.getMonth() >= 10 && parseInt(month) <= 2) {
                            year++;
                        }
                        
                        timeStart = `${year}-${month}-${day}T${hour}:${minute}:00`;
                    }
                } catch (e) {
                    console.error('Error parsing date:', dateStr);
                }
            }

            if (title && relativeUrl) {
                events.push({
                    id: id || relativeUrl.replace(/\//g, ''),
                    title,
                    url: fullUrl,
                    description,
                    time_start: timeStart,
                    type,
                    venue_name: 'Huset'
                });
            }
        });

        return events;
    } catch (error) {
        console.error('Error scraping events:', error.message);
        throw error;
    }
}

async function main() {
    let db;

    try {
        console.log('Scraping events from', URL);
        const events = await scrapeEvents();
        if (events.length === 0) throw new Error("No events found, scraper probably broke");
        console.log(`Found ${events.length} events`);

        db = await initDatabase();

        await deleteEventsByVenue(db, 'Huset');

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

module.exports = { scrapeEvents, VENUE_NAME: 'Huset' };
if (require.main === module) {
    main();
}
