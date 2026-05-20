const axios = require('axios');
const cheerio = require('cheerio');
const {initDatabase, deleteEventsByVenue, insertEvents} = require('./db-helper');

const URL = 'https://www.1000fryd.dk/index.php';
const BASE_URL = 'https://www.1000fryd.dk';

const monthsMap = {
    'january': '01', 'february': '02', 'march': '03', 'april': '04', 'may': '05', 'june': '06',
    'july': '07', 'august': '08', 'september': '09', 'october': '10', 'november': '11', 'december': '12',
    'januar': '01', 'februar': '02', 'marts': '03', 'maj': '05', 'juni': '06', 'juli': '07',
    'august': '08', 'september': '09', 'oktober': '10', 'november': '11', 'december': '12'
};

async function scrapeEvents() {
    const response = await axios.get(URL);
    const $ = cheerio.load(response.data);
    const events = [];

    let currentMonth = '';
    const now = new Date();
    let currentYear = now.getFullYear();

    for (const element of $('.calendar_entry').toArray()) {
        const $el = $(element);

        // Find forrige søskende-elementer for at finde den seneste måned
        let $prev = $el.prevAll('.calendar_month').first();
        if ($prev.length) {
            currentMonth = $prev.text().trim().toLowerCase();
        }

        if ($el.is('a') && $el.hasClass('calendar_entry')) {
            const url = $el.attr('href');
            const fullUrl = url.startsWith('http') ? url : `${BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
            const id = url.includes('id=') ? url.split('id=')[1].split('&')[0] : url;

            const day = $el.find('.calendar_day').text().trim().padStart(2, '0');
            const price = $el.find('.calendar_price').text().trim();
            let title = $el.find('.col:not(.text-center)').text().trim();

            // Clean title: remove leading numbers and prices that might be scraped incorrectly
            // Often matches "21 FREE ...", "21 80 kr ...", "21 TBA ..."
            title = title.replace(/^\d+\s+(FREE|\d+\s+kr)\s+/, '');
            title = title.replace(/^\d+\s+/, '');
            title = title.replace(/\s+/g, ' ').trim();

            const monthNum = monthsMap[currentMonth] || '01';

            // Hvis vi er sidst på året og ser en måned fra starten af året, antag næste år
            if (now.getMonth() > 9 && parseInt(monthNum) < 3) {
                currentYear = now.getFullYear() + 1;
            }

            let time = `20:00:00`;
            try {
                console.log('following ' + fullUrl)
                const eventRes = await axios.get(fullUrl);
                const eventParsed = cheerio.load(eventRes.data);
                const info = eventParsed('.dato').text().trim();
                time = info.split("/")[1].trim().split(" ")[1]
            } catch (e) {
                console.log(e)
            }
            let timeStart = `${currentYear}-${monthNum}-${day}T${time}`; // Standardtid da det ikke er i snippet

            events.push({
                id: id,
                title: title,
                url: fullUrl,
                description: `Price: ${price}`,
                time_start: timeStart,
                type: 'Event',
                venue_name: '1000Fryd'
            });
        }
    }

    return events;
}

async function main() {
    let db;

    try {
        console.log('Scraping events from', URL);
        const events = await scrapeEvents();
        if (events.length === 0) throw new Error("No events, scraper probably broke")
        console.log(`Found ${events.length} events`);

        db = await initDatabase();

        await deleteEventsByVenue(db, '1000Fryd');

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

module.exports = {scrapeEvents, VENUE_NAME: '1000Fryd'};
if (require.main === module) {
    main();
}
