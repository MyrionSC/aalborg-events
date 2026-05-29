
some event scrapers for venues in Aalborg and script to generate html list of events, designed to be mobile friendly. 
The thought is that you can "install" the page on mobile front screen and use it when looking for something spontaneous.

currently scrapers for:
- 1000Fryd
- Huset
- Musikkens Hus
- Skråen
- Studenterhuset
- Comedy Club

=== TODO: 

Go through https://www.bandsintown.com/c/aalborg-denmark/this-month/genre/all-genres and add missing venues

=== Development

I use node 22.11.0. I suggest using [nvm](https://github.com/nvm-sh/nvm) to manage your node version.

1: clone repo
2: run 'npm install'
3: run 'node run-scrapers' (it will also create sqlite db)
4: run 'node generate_static_event_list_html.js'

the resulting html file can then be copied to someplace that serves static files. See 'crontab-script.sh' for example of what could go in a crontab on the server.
