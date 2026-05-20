
some event scrapers for venues in Aalborg and script to generate html list of events

currently scrapers for:
- 1000Fryd
- Huset
- Musikkens Hus
- Skråen
- Studenterhuset

== Development

I use node 22.11.0. I suggest using [nvm](https://github.com/nvm-sh/nvm) to manage your node version.

1: clone repo
2: run 'npm install'
3: run 'node run-scrapers' (it will also create sqlite db)
4: run 'node generate_static_event_list_html.js'
