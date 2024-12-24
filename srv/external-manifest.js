import {json} from "d3-fetch";
import data from "../output-sorted.json";

const baseUrl = data.web_url || "https://lhelwerd.github.io/top2000";
const loadManifest = (manifest) => {
    for (const [name, asset] of Object.entries(manifest)) {
        if (name.endsWith(".css")) {
            const link = document.createElement("link");
            link.setAttribute("rel", "stylesheet");
            link.setAttribute("href", new URL(asset, baseUrl));
            document.head.appendChild(link);
        }
        else if (name !== "data.js") {
            const script = document.createElement("script");
            script.setAttribute("defer", "defer");
            script.setAttribute("src", new URL(asset, baseUrl));
            document.head.appendChild(script);
        }
    }
};

(self.webpackChunktop2000 = self.webpackChunktop2000 || []).push(
    [[543],{415:e=>{e.exports=data;}}]
);
if (data.web_jsonp) {
    window.jsonptop2000 = loadManifest;
    const manifestUrl = new URL("manifest.jsonp", baseUrl);
    const manifestScript = document.createElement("script");
    manifestScript.setAttribute("src", manifestUrl);
    document.head.appendChild(manifestScript);
}
else {
    const manifestUrl = new URL("manifest.json", baseUrl);
    loadManifest(await json(manifestUrl)); // jshint ignore: line
}
