#!/usr/bin/env bash

(cd ~/aalborg-events && /home/marand/.nvm/versions/node/v22.11.0/bin/node run-scrapers.js && /home/marand/.nvm/versions/node/v22.11.0/bin/node generate_static_event_list_html.js && /usr/bin/cp -v events.html /var/www/marand/aalborg-events/index.html && cp -v events.sqlite /var/www/marand/aalborg-events/)
