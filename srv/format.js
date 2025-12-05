export const sep = "\u00a0\u2014\u00a0";

export default class Format {
    constructor(data) {
        this.data = data;
    }

    track(position, d=null) {
        if (d === null) {
            d = this.data.findTrack(position);
        }
        return `${position}. ${d.artist} (${d.year})${sep}${d.title}`;
    }
}
