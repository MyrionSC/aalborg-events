const axios = require('axios');
const { initDatabase, deleteEventsByVenue, insertEvents } = require('./db-helper');

const URL = 'https://musikkenshus.dk/dwapi/query?QueryName=All%20events&RepositoryName=Content&PageSize=1000';
const VENUE_NAME = 'Musikkens Hus';

/**
 * Strips HTML tags from a string.
 */
function stripHtml(html) {
    if (!html) return '';
    return html.replace(/<[^>]*>?/gm, '').trim();
}

async function scrapeEvents() {
    try {
        const response = await axios.get(URL, {
            headers: {
                'accept': '*/*',
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36'
            }
        });

        const data = response.data;
        if (!data || !data.results) {
            console.error('Invalid response format');
            return [];
        }

        const events = [];
        const now = new Date();
        const threeMonthAhead = new Date();
        threeMonthAhead.setMonth(now.getMonth() + 3);

        data.results.forEach(item => {
            // Extract the first date from Event_DateJson if available
            let timeStart = '';
            if (item.Event_DateJson) {
                try {
                    const dates = JSON.parse(item.Event_DateJson);
                    if (Array.isArray(dates) && dates.length > 0) {
                        timeStart = dates[0].CustomEventDate;
                    }
                } catch (e) {
                    console.error('Error parsing Event_DateJson for item:', item.PageId);
                }
            }
            
            // Fallback to PageCreatedDate if no event date found? 
            // Actually, the schema requires time_start to be not null.
            if (!timeStart) {
                // If there's no date, we might skip it or use a default. 
                // In this case, let's skip events without a valid date.
                return;
            }

            const eventDate = new Date(timeStart);
            if (eventDate < now || eventDate > threeMonthAhead) {
                return;
            }

            const title = item.Event_Name || item.PageMenuText || 'No Title';
            const id = item.PageIdString || item.PageUniqueId;
            const url = `https://musikkenshus.dk${item.Event_SearchFriendlyUrl || ''}`;
            const description = stripHtml(item.Event_ShortDescription || item.PageDescription || '');
            const type = item.PageItemType || 'Event';

            events.push({
                id,
                title,
                url,
                description,
                time_start: timeStart,
                type,
                venue_name: VENUE_NAME
            });
        });

        return events;
    } catch (error) {
        console.error('Error fetching events from Musikkens Hus:', error.message);
        throw error;
    }
}

async function main() {
    let db;
    try {
        console.log(`Starting scraper for ${VENUE_NAME}...`);
        const events = await scrapeEvents();
        console.log(`Found ${events.length} events.`);

        if (events.length === 0) {
            console.log('No events found. Exiting.');
            return;
        }

        db = await initDatabase();
        await deleteEventsByVenue(db, VENUE_NAME);
        await insertEvents(db, events);

        console.log(`Successfully updated events for ${VENUE_NAME}.`);
    } catch (error) {
        console.error('Scraper failed:', error);
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
