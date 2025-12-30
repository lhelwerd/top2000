import * as d3 from "d3";

export default class Locale {
    constructor() {
        this.time = d3.timeFormatLocale({
            dateTime: "%H:%M %d-%m-%Y",
            date: "%d-%m-%Y",
            time: "%H:%M:%S",
            periods: [],
            days: ["zondag", "maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag"],
            shortDays: ["zo", "ma", "di", "wo", "do", "vr", "za"],
            months: ["Januari", "Februari", "Maart", "April", "Mei", "Juni", "Juli", "Augustus", "September", "Oktober", "November", "December"],
            shortMonths: ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"]
        });
        this.formatTimeShort = this.time.format("%d-%m %H:%M");
        this.formatTimeLong = this.time.format("%d-%m-'%y %H:%M");
        this.formatYear = this.time.format("'%y");
        this.formatTimerLong = this.time.utcFormat("%-j:%H:%M:%S");
        this.formatTimerShort = this.time.utcFormat("%H:%M:%S");
        this.formatDate = this.time.format("%-d %B %Y");
    }

    get code() {
        return "nl";
    }
}
