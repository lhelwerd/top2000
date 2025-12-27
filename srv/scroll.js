import * as d3 from "d3";
import { EXPECTED_POSITIONS } from "./data.js";

const rowsSelector = "table.main > tbody > tr:not(.info)";
const currentDisplayDelay = 10000;
const currentUpdateDelay = 1000;
const pagesCount = 20;

export default class Scroll {
    constructor(locale, data, format, state) {
        this.locale = locale;
        this.data = data;
        this.format = format;
        this.state = state;

        this.title = d3.select("title");
        this.originalTitle = this.title.text();
        this.container = d3.select("#container");
        this.head = d3.select("#head");

        this.nav = d3.select("#pagination");
        this.pagination = d3.select("#pagination-list");
        this.nextPage = d3.select("#pagination-next");

        this.currentTimer = null;
        this.currentTimerParams = null;
        this.startTimer = null;
        this.startPos = null;
    }

    create() {
        this.nav = this.head.append("div")
            .attr("id", "pagination")
            .classed("column is-full-mobile is-full-desktop-only is-full-widescreen-only", true)
            .append("nav")
            .classed("pagination is-centered is-flex-wrap-nowrap", true);
        this.pagination = this.nav.append("ul")
            .attr("id", "pagination-list")
            .classed("pagination-list is-flex-wrap-nowrap", true);
        this.nextPage = this.nav.append("a")
            .attr("id", "pagination-next")
            .classed("pagination-next has-background-danger-dark is-hidden", true);
        this.nextPage.on("click", (_, d) => {
            this.scrollPage(d, d);
        });

        this.input = this.nav.append("input")
            .attr("id", "pagination-input")
            .classed("pagination-next", true)
            .attr("type", "number")
            .attr("min", Math.min(this.data.end, this.data.front))
            .attr("max", Math.max(this.data.end, this.data.front))
            .on("change", (event) => {
                if (event.target.validity.valid) {
                    this.scrollPage(Number(event.target.value));
                    event.target.blur();
                }
            });

        d3.select(document).on("visibilitychange", () => {
            if (!document.hidden && this.currentTimer !== null) {
                const previousTimer = this.currentTimer;
                d3.timerFlush();
                if (this.currentTimer !== null && this.currentTimer === previousTimer) {
                    this.currentTimer.stop();
                    this.setNextCurrent(...this.currentTimerParams,
                        this.container.selectAll(rowsSelector).nodes(), this.getCurrentDate()
                    );
                }
                if (this.startTimer !== null && this.startPos !== null) {
                    this.startTimer.stop();
                    this.createNextTimer(this.startPos,
                        this.data.tracks[this.startPos].timestamp,
                        this.getCurrentDate()
                    );
                }
            }
        });
    }

    scrollPage(d, current = null) {
        const posNode = this.scrollPositionRow(d);
        if (posNode) {
            this.pagination.selectAll(".pagination-link")
                .classed("is-current", pos => d === pos);
            this.container.selectAll(rowsSelector)
                .classed("is-link", false);
            d3.select(posNode)
                .classed("is-selected", d === current)
                .classed("is-link", d !== current);
            this.state.autoscroll = (d === current);
        }
    }

    scrollPositionRow(d) {
        if (d === null && this.state.autoscroll) {
            d = this.nextPage.datum();
        }
        const data = this.data;
        const posCell = this.container.selectAll(`${rowsSelector} > td:first-child`)
            .select(function(pos) {
                return d === data.positions[pos] ? this : null;
            })
            .node();
        if (posCell) {
            posCell.scrollIntoView({
                behavior: "smooth", block: "center"
            });
            return posCell.parentNode;
        }
        return null;
    }

    scrollYearHash(d, hash) {
        this.scrollPositionRow(hash.startsWith(`#/${d}/`) ?
            Number(hash.slice(`#/${d}/`.length)) : null
        );
    }

    updatePagination(current = null) {
        const count = Math.min(Math.max(this.data.end, this.data.front), pagesCount);
        const pages = d3.ticks(...d3.nice(this.data.end, this.data.front, count), count);
        if (current) {
            const currentIndex = this.data.reverse ? d3.bisectLeft(pages, current) :
                d3.bisectRight(pages, current);
            const page = Math.max(Math.min(this.data.end, this.data.front),
                pages[currentIndex + this.data.direction]
            );
            if (page !== current) {
                pages.splice(currentIndex, 0, current);
            }
            const d = this.data.findTrack(current);
            const track = this.format.track(current, d);
            this.nextPage.datum(current)
                .attr("href", d => `#/${this.data.year}/${d}`)
                .classed("is-hidden", false)
                .classed("track", true)
                .text(track);
            this.pagination.classed("is-hidden-tablet", true);
            this.input.classed("is-hidden-tablet", true);
            this.title.text(`${String.fromCodePoint(0x1f534)} ${track}`);
            d3.timeout(() => {
                this.nextPage.classed("is-hidden", true).text("");
                this.pagination.classed("is-hidden-tablet", false);
                this.input.classed("is-hidden-tablet", false);
                this.title.text(this.originalTitle);
            }, currentDisplayDelay);
        }
        this.pagination.selectAll("li")
            .data(d3.map(pages, d => d3.median([d, this.data.end, this.data.front]))) // Clamp
            .join(
                enter => enter.append("li")
                    .append("a")
                    .classed("pagination-link", true),
                update => update.select("a"),
                exit => exit.remove()
            )
            .attr("href", d => `#/${this.data.year}/${d}`)
            .on("click", (_, d) => {
                this.scrollPage(d, current);
            })
            .classed("has-background-primary has-text-dark", d => d === current)
            .classed("is-hidden-desktop-only",
                (d, i) => i !== 0 && d !== current && d % 200 !== 0
            )
            .classed("is-hidden-touch",
                (d, i) => i !== 0 && d !== current && d % 500 !== 0
            )
            .classed("is-hidden-fullhd",
                (d, i) => pages.length > pagesCount && i !== 0 && d !== current && d > EXPECTED_POSITIONS && d % 500 !== 0
            )
            .text(d => d);
    }

    isInView(node) {
        const rect = node.getBoundingClientRect();
        return rect.top >= 0 && rect.left >= 0 &&
            rect.bottom <= document.documentElement.clientHeight &&
            rect.right <= document.documentElement.clientWidth;
    }

    getCurrentDate() {
        return Date.now();
    }

    setCurrent(d, i, nodes) {
        const now = this.getCurrentDate();
        const previous = i - this.data.direction;
        const next = i + this.data.direction;
        const isCurrent = d.timestamp <= now && (
            next in this.data.tracks ? this.data.tracks[next].timestamp > now :
                new Date(this.data.year + 1, 0) > now
        );
        d3.select(nodes[i]).classed("is-selected", isCurrent);
        if (isCurrent) {
            this.updatePagination(this.data.positions[i]);
            if (!this.state.autoscroll && this.isInView(nodes[i])) {
                // Check twice if the next is in view to reenable autoscroll
                this.state.autoscroll = (this.state.autoscroll === null ? true : null);
            }
            if (this.state.autoscroll) {
                globalThis.requestAnimationFrame(() => {
                    nodes[i].scrollIntoView({ behavior: "smooth", block: "center" });
                });
            }
            this.setNextCurrent(next, i, nodes, now);
        }
        else if (!(previous in this.data.tracks) && d.timestamp > now) {
            this.setNextCurrent(i, i, nodes, now);
            this.createNextTimer(i, d.timestamp, now);
        }
        else if (!(next in this.data.tracks)) {
            this.currentTimer = null;
        }
        return isCurrent;
    }

    setNextCurrent(next, i, nodes, now) {
        if (!(next in this.data.tracks)) {
            return;
        }
        this.currentTimerParams = [next, i];
        this.currentTimer = d3.timeout(() => {
            const d = d3.select(nodes[i]).datum();
            if (this.setCurrent(d, i, nodes)) {
                return;
            }
            while (next in this.data.tracks) {
                if (this.setCurrent(d3.select(nodes[next]).datum(), next, nodes)) {
                    break;
                }
                next += this.data.direction;
            }
        }, Math.max(this.data.tracks[next].timestamp - now, 0) + currentUpdateDelay);
    }

    createNextTimer(pos, timestamp, now) {
        const diff = timestamp - now + currentUpdateDelay;
        const day = 24 * 60 * 60 * 1000;
        this.nextPage.datum(this.data.positions[pos])
            .attr("href", d => `#/${this.data.year}/${d}`)
            .classed("is-hidden", false)
            .text(diff > day ? this.locale.formatTimerLong(new Date(diff - day)) :
                this.locale.formatTimerShort(new Date(diff))
            );
        this.startPos = pos;
        this.startTimer = d3.interval((elapsed) => {
            if (diff < elapsed) {
                this.startTimer.stop();
                this.startPos = null;
                this.nextPage.classed("is-hidden", true);
            }
            else {
                globalThis.requestAnimationFrame(() => {
                    this.nextPage.text(diff - elapsed > day ?
                        this.locale.formatTimerLong(new Date(diff - elapsed - day)) :
                        this.locale.formatTimerShort(new Date(diff - elapsed))
                    );
                });
            }
        }, 1000);
    };
}
