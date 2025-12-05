import "./style.scss";
import * as d3 from "d3";
import currentData from "../output-sorted.json" with { type: "json" };

import Data from "./data.js";
import Format from "./format.js";
import Locale from "./locale.js";
import Scroll from "./scroll.js";
import Search from "./search.js";
import Tabs from "./tabs/index.js";
import Charts from "./tabs/charts.js";
import Info from "./tabs/info.js";
import Table from "./tabs/table.js";

d3.select("body")
    .append("div")
    .attr("id", "container")
    .append("div")
    .attr("id", "head-container")
    .append("div")
    .attr("id", "head")
    .classed("columns is-multiline is-gapless is-centered", true);

class State {
    constructor() {
        this.autoscroll = true;
    }
}

const locale = new Locale();
const data = new Data(currentData);
const format = new Format(data);
const state = new State();

const scroll = new Scroll(locale, data, format, state);
const search = new Search(locale, data, state, scroll);

const charts = new Charts(locale, data, format);
const info = new Info(data);
const table = new Table(locale, data, search, scroll, state);

const tabs = new Tabs(data, scroll, charts);

tabs.create();
scroll.create();

scroll.updatePagination();
table.create();
charts.create();
info.create();
search.createModal();

tabs.enable();
