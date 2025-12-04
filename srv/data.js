export default class Data {
    constructor(data) {
        Object.assign(this, data);
        this.direction = this.reverse ? 1 : -1;
        this.front = this.positions[this.positions.length - 1];
        this.end = this.positions[0];
        this.start = this.reverse ? this.end : this.front;

        this.columns = ["position", "artist", "title"];
        this.artistColumns = ["position", "title", "year"];
        if (this.tracks[0].timestamp) {
            this.columns.push("timestamp");
            this.artistColumns.push("timestamp");
        }
        this.fields = {
            position: {
                column: data.columns.position,
                field: (_, i) => `${i}.`
            },
            artist: {
                column: data.columns.artist,
                field: d => `${d.artist} (${d.year})`
            },
            title: {
                column: data.columns.title,
                field: (d, i, keys) => `${d.title}${d.album_version ? " \u29be" : ""} (${this.formatRankChange(d, i)}${this.formatArtistChart(d, i, keys)})`
            },
            year: {
                column: data.columns.year,
                field: d => d.year
            },
            timestamp: {
                column: data.columns.timestamp,
                field: d => d.timestamp ? locale.formatTime(new Date(d.timestamp)) : ""
            }
        };
    }

    findTrack(pos, field="tracks") {
        return this[field][this.reverse ? this.tracks.length - pos : pos - 1];
    }

    formatRankChange(d, position) {
        const previousYear = this.year - 1;
        if (previousYear in d) {
            const previousPosition = d[previousYear];
            const diff = Math.abs(position - previousPosition);
            if (position < previousPosition) {
                return `\u25b2${diff}`;
            }
            if (position > previousPosition) {
                return `\u25bc${diff}`;
            }
            return "\u21c4";
        }
        for (let year = this.year - 2; year >= this.first_year; year--) {
            if (year in d) {
                return `\u27f2${year}`;
            }
        }
        return "\u2234";
    }

    formatArtistChart(d, position, keys) {
        const artistTracks = this.artists[d.max_artist_key] ?
            this.artists[d.max_artist_key] : this.artists[keys[0][0]];
        if (artistTracks) {
            const artistPos = artistTracks.indexOf(position) + 1;
            return ` ${artistPos}/${artistTracks.length}`;
        }
        return "";
    }

    getWikiUrl(page) {
        return `${this.wiki_url}${encodeURIComponent(page.replaceAll(" ", "_"))}`;
    }
}
