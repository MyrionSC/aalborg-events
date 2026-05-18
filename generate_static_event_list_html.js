const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const DB_PATH = 'events.sqlite';
const OUTPUT_PATH = path.join(__dirname, 'events.html');

async function generateHtml() {
    const db = new sqlite3.Database(DB_PATH);

    const getEvents = () => {
        return new Promise((resolve, reject) => {
            db.all('SELECT * FROM events ORDER BY time_start ASC', (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    };

    try {
        const rows = await getEvents();

        // Group events by date
        const groupedEvents = {};
        rows.forEach(event => {
            // Assuming time_start is an ISO string or similar that starts with YYYY-MM-DD
            const date = event.time_start.split('T')[0];
            if (!groupedEvents[date]) {
                groupedEvents[date] = [];
            }
            groupedEvents[date].push(event);
        });

        let html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Aalborg events</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; background-color: #f4f4f4; }
        h1 { text-align: center; color: #333; }
        .date-group { margin-bottom: 30px; }
        .date-header { background-color: #333; color: #fff; padding: 10px; border-radius: 5px; margin-bottom: 10px; }
        .event-card { background: #fff; padding: 15px; margin-bottom: 10px; border-radius: 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
        .event-title { margin-top: 0; color: #007BFF; text-decoration: none; font-size: 1.2em; display: block; }
        .event-details { font-size: 0.9em; color: #666; margin-top: 5px; }
        .event-description { margin-top: 10px; }
    </style>
</head>
<body>
`;

        const today = new Date().toISOString().split("T")[0] // 2025-05-12

        for (const date in groupedEvents) {
            html += `    <div class="date-group">\n`;
            html += `        <h2 class="date-header">${date === today ? 'I dag' : date}</h2>\n`;
            groupedEvents[date].forEach(event => {
                const time = event.time_start.includes('T') ? event.time_start.split('T')[1].substring(0, 5) : event.time_start;
                html += `        <div class="event-card">
            <a href="${event.url}" class="event-title">${event.title}</a>
            <div class="event-details">
                <strong>Time:</strong> ${time} | 
                <strong>Venue:</strong> ${event.venue_name} | 
                <strong>Type:</strong> ${event.type}
            </div>
            <div class="event-description">${event.description}</div>
        </div>\n`;
            });
            html += `    </div>\n`;
        }

        html += `
</body>
</html>
`;

        fs.writeFileSync(OUTPUT_PATH, html);
        console.log(`Static HTML page generated at: ${OUTPUT_PATH}`);

    } catch (err) {
        console.error('Error generating HTML:', err);
    } finally {
        db.close();
    }
}

generateHtml();
