import "./style.scss";
import * as d3 from "d3";
import currentData from "../output-sorted.json" with { type: "json" };

import Data from "./data.js";
import Format from "./format.js";
import Locale from "./locale.js";
import Scroll from "./scroll.js";
import Search from "./modal/search.js";
import Tabs from "./tabs/index.js";
import Charts from "./tabs/charts.js";
import Info from "./tabs/info.js";
import Changelog from "./tabs/changelog.js";
import Table from "./tabs/table.js";

const locale = new Locale();
const theme = globalThis.matchMedia('(prefers-color-scheme: dark)');
const state = {
    autoscroll: true,
    theme: theme.matches ? "dark" : "light",
};

theme.addEventListener('change', event => {
    state.theme = event.matches ? "light" : "dark";
    // Toggle the actual theme via tab
    document.location.hash = "#/theme";
});

const defaultData = new Data(currentData, locale);
const yearData = {};
try {
    const rawData = globalThis.localStorage.getItem("data");
    if (rawData !== null) {
        for (const [year, data] of Object.entries(JSON.parse(rawData))) {
            yearData[year] = data;
        }
    }
}
catch (error) {
    console.error(error);
}

const load = (data = defaultData) => {
    d3.select("#container").remove();
    d3.select("body")
        .append("div")
        .attr("id", "container")
        .append("div")
        .attr("id", "head-container")
        .append("div")
        .attr("id", "head")
        .classed("columns is-multiline is-gapless is-centered", true);

    const format = new Format(data);

    const scroll = new Scroll(locale, data, format, state);
    const search = new Search(locale, data, state, scroll);

    const charts = new Charts(locale, data, format);
    const info = new Info(data);
    const changelog = new Changelog(locale);
    const table = new Table(locale, data, search, scroll, state);

    const tabs = new Tabs(locale, data, state, search, scroll, charts);

    tabs.create();
    scroll.create();

    scroll.updatePagination();
    table.create();
    charts.create();
    info.create();
    changelog.create();

    search.createModal();

    return tabs;
};

load(yearData[defaultData.year] ?
    new Data(yearData[defaultData.year], locale) :
    defaultData
).enable(load, yearData);
