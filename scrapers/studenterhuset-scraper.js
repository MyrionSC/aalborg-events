const axios = require('axios');
const cheerio = require('cheerio');
const { initDatabase, deleteEventsByVenue, insertEvents } = require('./db-helper');

const URL = 'https://studenterhuset.dk/';

async function scrapeEvents() {
    try {
        const response = await axios.get(URL);
        const $ = cheerio.load(response.data);
        const events = [];

        $('.eventlist__listitem').each((index, element) => {
            const $item = $(element).find('.eventlist__item');
            const $wrapper = $item.find('.eventlist__wrapper');

            const title = $wrapper.find('.eventlist__title a').text().trim();
            const url = $wrapper.find('.eventlist__title a').attr('href');
            const id = url;
            const fullUrl = url ? `https://studenterhuset.dk${url}` : '';
            const genre = $(element).attr('data-genre') || '';
            const date = $wrapper.find('.eventlist__date').text().trim();
            const startTime = $wrapper.find('.eventlist__starttime').text().replace('Start:', '').trim();
            const doors = $wrapper.find('.eventlist__doors').text().replace('[Døre:', '').replace(']', '').trim();

            // Parse date (DD.MM.YY) and time (HH:mm) to ISO format
            let timeStart = '';
            if (date && startTime) {
                const [day, month, year] = date.split('.');
                const fullYear = year.length === 2 ? `20${year}` : year;
                timeStart = `${fullYear}-${month}-${day}T${startTime}:00`;
            }

            if (title && url) {
                events.push({
                    id: id || url.replace(/\//g, ''),
                    title,
                    url: fullUrl,
                    description: `Genre: ${genre}. Doors: ${doors}`,
                    time_start: timeStart,
                    type: genre,
                    venue_name: 'Studenterhuset'
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
        console.log(`Found ${events.length} events`);

        db = await initDatabase();

        await deleteEventsByVenue(db, 'Studenterhuset');

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

main();
