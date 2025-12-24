import * as d3 from "d3";
import { EXPECTED_POSITIONS } from "../data.js";

const CHART_COUNT = 10;
const stroke = d3.scaleOrdinal(d3.schemeTableau10);
const cycle = stroke.range().length;

export default class Charts {
    constructor(locale, data, format) {
        this.locale = locale;
        this.data = data;
        this.format = format;

        this.sources = [
            {
                id: "max_artist",
                name: "Artiesten met meeste nummers",
                type: "bar",
                source: () => d3.sort(Object.keys(data.artists),
                    d => -data.artists[d].length
                ),
                min: _ => 0,
                max: _ => d3.max(Object.values(data.artists), chart => chart.length),
                y: d => data.artists[d].length,
                x: d => this.getArtistName(d),
                yFormat: y => y
            },
            {
                id: "artist_collab",
                name: "Meeste samenwerkingen",
                type: "bar",
                source: () => d3.sort(Object.keys(data.artists),
                    d => -this.countCollabs(d)
                ),
                min: _ => 0,
                max: x => this.countCollabs(x.domain()[0]),
                y: d => this.countCollabs(d),
                x: d => this.getArtistName(d)
            },
            {
                id: "artist_name",
                name: "Langste artiestennamen",
                type: "bar",
                swap: true,
                source: () => d3.sort(Object.keys(data.artists),
                    d => this.isCollab(d) ? 0 : -d.length
                ),
                min: _ => 0,
                max: x => x.domain()[0].length,
                y: d => d.length,
                x: d => this.getArtistName(d)
            },
            {
                type: "divider"
            },
            {
                id: "new",
                name: "Hoogste binnenkomers",
                type: "bar",
                swap: true,
                source: () => {
                    const positions = d3.filter(data.positions,
                        (_, i) => d3.every(d3.range(data.first_year, data.year),
                            year => !(year in data.tracks[i]) ||
                                data.tracks[i][year] > data.start
                        )
                    );
                    return data.reverse ? d3.reverse(positions) : positions;
                },
                min: _ => data.front,
                max: x => x.domain()[0],
                y: d => d,
                x: d => format.track(d),
                yFormat: y => y
            },
            {
                id: "rise",
                name: "Sterkste stijgers",
                type: "bar",
                swap: true,
                source: () => d3.sort(d3.zip(data.positions, data.tracks),
                    p => p[1][data.year - 1] <= EXPECTED_POSITIONS ?
                        p[0] - p[1][data.year - 1] : 0
                ),
                min: _ => 0,
                max: x => x.domain()[0][1][data.year - 1] - x.domain()[0][0],
                count: domain => d3.bisector((p, c) => c - (p[1][data.year - 1] - p[0])).left(domain, 0),
                y: p => p[1][data.year - 1] - p[0],
                x: p => format.track(...p),
                yFormat: y => `\u25b2${y}`
            },
            {
                id: "extra500",
                name: "Doorbraak uit De Extra 500",
                type: "bar",
                swap: true,
                enabled: () => d3.some(data.tracks, d => d[data.year - 1] > EXPECTED_POSITIONS),
                source: () => d3.sort(d3.zip(data.positions, data.tracks),
                    p => p[1][data.year - 1] > EXPECTED_POSITIONS ?
                        p[0] - p[1][data.year - 1] : 0
                ),
                min: _ => 0,
                max: x => x.domain()[0][1][data.year - 1] - x.domain()[0][0],
                y: p => p[1][data.year - 1] - p[0],
                x: p => format.track(...p),
                yFormat: y => `\u25b2${y}`
            },
            {
                id: "fall",
                name: "Sterkste dalers",
                type: "bar",
                swap: true,
                source: () => d3.sort(d3.zip(data.positions, data.tracks),
                    p => p[1][data.year - 1] - p[0]
                ),
                min: _ => 0,
                max: x => x.domain()[0][0] - x.domain()[0][1][data.year - 1],
                count: domain => d3.bisector((p, c) => c - (p[0] - p[1][data.year - 1])).left(domain, 0),
                y: p => p[0] - p[1][data.year - 1],
                x: p => format.track(...p),
                yFormat: y => `\u25bc${y}`
            },
            {
                id: "return",
                name: "Terugkerende nummers",
                type: "bar",
                swap: true,
                source: () => d3.sort(d3.map(d3.zip(data.positions, data.tracks), p => {
                    for (let year = data.year - 1; year >= data.first_year; year--) {
                        if (year in p[1] && p[1][year] <= EXPECTED_POSITIONS) {
                            return [...p, year - data.year];
                        }
                    }
                    return [...p, 0];
                }), t => t[2]),
                min: _ => data.year,
                max: x => data.year + x.domain()[0][2],
                y: t => data.year + t[2],
                x: t => format.track(t[0], t[1]),
                yFormat: y => y
            },
            {
                type: "divider"
            },
            {
                id: "old",
                name: "Oudste nummers",
                type: "bar",
                swap: true,
                source: () => d3.sort(d3.zip(data.positions, data.tracks),
                    p => p[1].year
                ),
                min: _ => data.year,
                max: x => x.domain()[0][1].year,
                y: p => p[1].year,
                x: p => format.track(...p),
                yFormat: y => y
            },
            {
                id: "old_new",
                name: "Oudste binnenkomers",
                type: "bar",
                swap: true,
                source: () => d3.sort(d3.filter(d3.zip(data.positions, data.tracks),
                    p => d3.every(d3.range(data.first_year, data.year),
                        year => !(year in p[1]) || p[1][year] > EXPECTED_POSITIONS
                    )
                ), p => p[1].year),
                min: _ => data.year,
                max: x => x.domain()?.[0]?.[1]?.year || data.latest_year,
                y: p => p[1].year,
                x: p => format.track(...p),
                yFormat: y => y
            },
            {
                type: "divider"
            },
            {
                id: "long_title",
                name: "Langste titels",
                type: "bar",
                swap: true,
                source: () => d3.sort(d3.zip(data.positions, data.tracks),
                    p => -this.getTitleLength(p[1])
                ),
                min: _ => 0,
                max: x => this.getTitleLength(x.domain()[0][1]),
                y: p => this.getTitleLength(p[1]),
                x: p => format.track(...p)
            },
            {
                type: "divider",
                enabled: () => data.tracks[0].timestamp
            },
            {
                id: "long_track",
                name: "Langste nummers",
                type: "bar",
                enabled: () => data.tracks[0].timestamp,
                swap: true,
                source: () => d3.sort(d3.range(data.positions.length),
                    i => -this.getTrackTime(i)
                ),
                min: _ => 0,
                max: x => this.getTrackTime(x.domain()[0]),
                y: i => this.getTrackTime(i),
                x: i => format.track(data.positions[i], data.tracks[i]),
                yFormat: locale.time.utcFormat("%M:%S"),
                xFormat: (_, i) => i + 1
            },
            {
                id: "daily_tracks",
                name: "Nummers per dag",
                type: "hist",
                enabled: () => data.tracks[0].timestamp,
                source: () => d3.map(data.tracks,
                    track => new Date(track.timestamp).getDate()
                ),
                binCount: 7,
                x: bin => `${bin.x0}\u2014${bin.x1 > 31 ? 1 : bin.x1}`
            },
            {
                id: "hourly_tracks",
                name: "Nummers per uur",
                type: "hist",
                enabled: () => data.tracks[0].timestamp,
                source: () => d3.map(data.tracks,
                    track => new Date(track.timestamp).getHours()
                ),
                binCount: 24,
                xFormat: bin => bin.x0
            },
            {
                type: "divider"
            },
            {
                id: "start",
                name: "Nummers per binnenkomst",
                type: "hist",
                source: () => d3.map(data.tracks, track => {
                    let startYear = data.year;
                    for (let year = data.first_year; year < data.year; year++) {
                        if (year in track && track[year] <= EXPECTED_POSITIONS) {
                            startYear = year;
                            break;
                        }
                    }
                    return startYear;
                }),
                binCount: data.year - data.first_year + 1,
                yScale: d3.scaleLog,
                min: _ => 1,
                x: bin => bin.x0
            },
            {
                id: "decade",
                name: "Nummers per decennium",
                type: "hist",
                source: () => d3.map(data.tracks, track => track.year),
                binSize: 10,
            }
        ];
    }

    getArtistName(d) {
        const filterName = (artist) => artist.toLowerCase() === d;
        for (const position of this.data.artists[d]) {
            const track = this.data.findTrack(position);
            if (filterName(track.artist)) {
                return track.artist;
            }
            if (this.data.artist_links) {
                const name = Object.values(this.data.findTrack(position, "artist_links") || []).find(filterName);
                if (name) {
                    return name;
                }
            }
        }
        return d;
    }

    isOverlap(chart, key) {
        return chart.isSubsetOf(new Set(this.data.artists[key]));
    }

    isCollab(d) {
        const chart = new Set(this.data.artists[d]);
        return d3.some(this.data.artists[d], pos => {
            if (d3.some(this.data.findTrack(pos, "keys"),
                key => key[0] !== d && this.isOverlap(chart, key[0])
            )) {
                return true;
            }
            const track = this.data.findTrack(pos);
            if (track.artist_keys) {
                if (track.artist_keys.length > 1) {
                    return true;
                }
                return d3.some(Object.values(track.artist_keys),
                    artist => artist.toLowerCase() !== d &&
                        artist.toLowerCase() in this.data.artists &&
                        this.isOverlap(chart, artist.toLowerCase())
                );
            }
            return false;
        });
    }

    countCollabs(d) {
        const chart = new Set(this.data.artists[d]);
        const collabs = new Set(d3.merge(d3.map(this.data.artists[d], pos => {
            const track = this.data.findTrack(pos);
            const charts = new Map();
            d3.map(this.data.findTrack(pos, "keys"), key => {
                if (!this.isOverlap(chart, key[0])) {
                    charts.set(this.data.artists[key[0]].toString(), key[0]);
                }
            });
            if (track.artist_keys) {
                d3.map(Object.values(track.artist_keys), artist => {
                    const key = artist.toLowerCase();
                    if (key in this.data.artists && !this.isOverlap(chart, key)) {
                        charts.set(this.data.artists[key].toString(), key);
                    }
                });
            }
            return charts.values();
        })));
        return collabs.size;
    }

    getTitleLength(d) {
        return d.title?.replaceAll(/(?: |^)\([^)]+\)(?: |$)/g, "").length;
    }

    getTrackTime(i) {
        const next = i + this.data.direction;
        if (!(next in this.data.tracks)) {
            return new Date(this.data.year + 1, 0) - this.data.tracks[i].timestamp;
        }
        const nextDate = new Date(this.data.tracks[next].timestamp);
        let diff = 0;
        if (nextDate.getHours() != new Date(this.data.tracks[i].timestamp).getHours()) {
            diff += (nextDate.getMinutes() * 60 + nextDate.getSeconds()) * 1000;
            if (nextDate.getHours() == 0 || nextDate.getHours() >= 6) {
                diff *= 2;
            }
        }
        return this.data.tracks[next].timestamp - this.data.tracks[i].timestamp - diff;
    };

    createHistChart(chart) {
        const source = () => {
            const values = chart.source();
            return d3.bin().thresholds(chart.binCount ? chart.binCount :
                d3.range(...d3.nice(...d3.extent(values), chart.binSize),
                    chart.binSize
                )
            )(values);
        };
        chart.min = chart.min || (_ => 0);
        chart.max = chart.max || (x => d3.max(x.domain(), bin => bin.length));
        chart.y = chart.y || (bin => bin.length);
        chart.x = chart.x || (bin => `${bin.x0}\u2014${bin.x1}`);
        chart.count = chart.count || chart.binCount;
        return source;
    }

    getDomainCount(chart, source) {
        const fixedCount = Number.isInteger(chart.count) ? chart.count : CHART_COUNT;
        const domain = source().slice(0, fixedCount);
        const count = Math.min(domain.length, typeof chart.count === "function" ? chart.count(domain) : fixedCount);
        return [domain.slice(0, count), count];
    }

    createChart(column, chart) {
        // Stats chart
        const width = 800;
        const height = 500;
        const marginTop = 20;
        const marginRight = 20;
        const marginBottom = 30;
        const marginLeft = 40;
        const barWidth = 30;

        const textSize = chart.swap ? -25 : 10;

        let source = chart.source;
        if (chart.type === "hist") {
            source = this.createHistChart(chart);
        }

        const hExtent = [marginLeft, width - marginRight];
        const vExtent = [height - marginBottom, marginTop];
        const [domain, count] = this.getDomainCount(chart, source);
        const x = d3.scaleOrdinal()
            .domain(domain)
            .range(chart.swap ?
                d3.range(vExtent[1] + barWidth / 2, vExtent[0] + barWidth / 2,
                    (height - marginTop - marginBottom) / count
                ) :
                d3.range(hExtent[0] + barWidth / 2, hExtent[1] + barWidth / 2,
                    (width - marginLeft - marginRight) / count
                )
            );
        const yMin = chart.min(x);
        const y = (chart.yScale || d3.scaleLinear)()
            .domain([yMin, chart.max(x)])
            .range(chart.swap ? hExtent : vExtent);
        const min = y(yMin);

        column.html("");
        column.append("h1")
            .classed("title is-4 has-text-centered", true)
            .text(chart.name);
        const svg = column.append("svg")
            .attr("width", width)
            .attr("height", height);
        svg.append("g")
            .attr("transform", `translate(0,${height - marginBottom})`)
            .call(d3.axisBottom(chart.swap ? y : x)
                .tickFormat(chart.swap ? chart.yFormat :
                    (chart.xFormat || chart.x)
                ));
        svg.append("g")
            .attr("transform", `translate(${marginLeft},0)`)
            .call(d3.axisLeft(chart.swap ? x : y)
                .tickFormat((d, i) => {
                    if (chart.swap && chart.xFormat) {
                        return chart.xFormat(d, i);
                    }
                    return Number.isInteger(d) ? d : i + 1;
                }));
        const bar = svg.selectAll("g.bars")
            .data(x.domain())
            .join("g")
            .classed("bars", true)
            .attr("font-family", "sans-serif")
            .attr("text-anchor", "middle");
        const makeRect = (x, y) => {
            const path = d3.path();
            const offset = x - barWidth / 2;
            const size = y - min;
            if (chart.swap) {
                path.rect(min, offset, size, barWidth);
            }
            else {
                path.rect(offset, min, barWidth, size);
            }
            return path.toString();
        };
        bar.append("path")
            .attr("fill", (_, i) => stroke(i % cycle))
            .attr("d", d => makeRect(x(d), y(chart.y(d))));
        bar.append("text")
            .attr(chart.swap ? "y" : "x", d => x(d))
            .attr(chart.swap ? "x" : "y", d => y(chart.y(d)) + textSize)
            .attr("dy", "0.32em")
            .text(d => chart.yFormat ? chart.yFormat(chart.y(d)) : chart.y(d));
        bar.append("g")
            .attr("clip-path", d =>
                `path('${makeRect(x(d), y(chart.y(d)) + 2 * textSize)}') view-box`
            )
            .append("text")
            .attr(chart.swap ? "y" : "x", d => x(d))
            .attr(chart.swap ? "x" : "y", d => (y(chart.y(d)) + min) / 2)
            .attr("dx", textSize)
            .attr("dy", "0.32em")
            .attr("font-size", 10)
            .attr("transform", d => chart.swap ? null :
                `rotate(90 ${x(d)} ${(y(chart.y(d)) + min) / 2})`
            )
            .text(d => chart.x(d));
    }

    create() {
        const columns = d3.select("#container")
            .append("div")
            .attr("id", "charts")
            .classed("container is-overlay is-hidden", true)
            .append("div")
            .attr("id", "current")
            .classed("section", true)
            .append("div")
            .classed("columns is-multiline is-centered", true);
        const dropdownColumn = columns.append("div")
            .classed("column is-narrow", true);
        columns.append("div")
            .classed("column is-narrow chart", true);

        const dropdown = dropdownColumn.append("div")
            .classed("dropdown is-hoverable-widescreen is-right-widescreen", true);
        const button = dropdown.append("div")
            .classed("dropdown-trigger", true)
            .append("button")
            .classed("button", true)
            .attr("aria-haspopup", true)
            .attr("aria-controls", "chart-dropdown");
        button.append("span")
            .text("Charts");
        const buttonIcon = button.append("span")
            .classed("icon", true)
            .text("\u25b8");
        button.on("click", () => {
            const active = dropdown.classed("is-active");
            buttonIcon.text(active ? "\u25b8" : "\u25be");
            dropdown.classed("is-active", !active);
        });
        dropdown.append("div")
            .classed("dropdown-menu", true)
            .attr("id", "chart-dropdown")
            .attr("role", "menu")
            .append("div")
            .classed("dropdown-content", true)
            .selectAll("a, hr")
            .data(d3.filter(this.sources,
                chart => chart.enabled ? chart.enabled() : true
            ))
            .join(enter => enter.append(
                d => document.createElement(d.type === "divider" ? "hr" : "a")
            )
                .attr("href", d => d.id ? `#/charts/${this.data.year}/${d.id}` : null)
                .classed("dropdown-item", d => d.type !== "divider")
                .classed("dropdown-divider", d => d.type === "divider")
                .on("click", function(event, chart) {
                    if (chart.type === "divider") {
                        event.stopPropagation();
                        return;
                    }
                    dropdown.classed("is-active", false);
                    buttonIcon.text("\u25b8");
                })
                .text(d => d.name ? d.name : null)
            );
    }

    select(id) {
        const columns = d3.select("#container")
            .select("#charts .columns");
        columns.select("#chart-dropdown")
            .selectAll(".dropdown-item")
            .classed("is-active", d => {
                if (d.id === id) {
                    this.createChart(columns.select(".column.chart"), d);
                }
                return d.id === id;
            });
    }
}
