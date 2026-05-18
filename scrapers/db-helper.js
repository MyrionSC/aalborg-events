const sqlite3 = require('sqlite3').verbose();

const DB_PATH = '../events.sqlite';

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

function deleteEventsByVenue(db, venueName) {
    return new Promise((resolve, reject) => {
        db.run(
            `DELETE FROM events WHERE venue_name = ?`,
            [venueName],
            function (err) {
                if (err) {
                    reject(err);
                } else {
                    console.log(`Deleted ${this.changes} events for venue: ${venueName}`);
                    resolve();
                }
            }
        );
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

module.exports = {
    initDatabase,
    deleteEventsByVenue,
    insertEvents
};
