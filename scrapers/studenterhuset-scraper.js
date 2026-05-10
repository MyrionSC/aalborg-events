const axios = require('axios');
const cheerio = require('cheerio');
const sqlite3 = require('sqlite3').verbose();

const URL = 'https://studenterhuset.dk/';
const DB_PATH = 'C:\\Users\\Marph\\source\\aalvents\\events.sqlite';

async function scrapeEvents() {
    try {
        const response = await axios.get(URL);
        const $ = cheerio.load(response.data);
        const events = [];

        $('.eventlist__listitem').each((index, element) => {
            const $item = $(element).find('.eventlist__item');
            const $wrapper = $item.find('.eventlist__wrapper');

            const id = $item.attr('id') || '';
            const title = $wrapper.find('.eventlist__title a').text().trim();
            const url = $wrapper.find('.eventlist__title a').attr('href');
            const fullUrl = url ? `https://studenterhuset.dk${url}` : '';
            const genre = $(element).attr('data-genre') || '';
            const date = $wrapper.find('.eventlist__date').text().trim();
            const startTime = $wrapper.find('.eventlist__starttime').text().replace('Start:', '').trim();
            const doors = $wrapper.find('.eventlist__doors').text().replace('[Døre:', '').replace(']', '').trim();

            // Combine date and start time
            const timeStart = `${date} ${startTime}`;

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

function initDatabase() {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(DB_PATH, (err) => {
            if (err) {
                reject(err);
            } else {
                console.log('Connected to SQLite database');
                resolve(db);
            }
        });
    });
}

function insertEvents(db, events) {
    return new Promise((resolve, reject) => {
        const stmt = db.prepare(`
            INSERT INTO events (id, title, url, description, time_start, type, venue_name)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        let inserted = 0;
        events.forEach((event) => {
            stmt.run(
                event.id,
                event.title,
                event.url,
                event.description,
                event.time_start,
                event.type,
                event.venue_name,
                (err) => {
                    if (err) {
                        console.error('Error inserting event:', err.message);
                    } else {
                        inserted++;
                    }
                }
            );
        });

        stmt.finalize((err) => {
            if (err) {
                reject(err);
            } else {
                console.log(`Inserted ${inserted} events`);
                resolve();
            }
        });
    });
}

async function main() {
    let db;

    try {
        console.log('Scraping events from', URL);
        const events = await scrapeEvents();
        console.log(`Found ${events.length} events`);

        db = await initDatabase();
        // await createTable(db);
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
