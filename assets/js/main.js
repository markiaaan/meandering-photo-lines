/*
 * Meandering Photo Lines
 * Copyright (c) 2026 Mark-Jan Bludau
 * Licensed under the MIT License. See LICENSE.
 *
 * Repository: https://github.com/markiaaan/meandering-photo-lines/
 * Project page: https://uclab.fh-potsdam.de/photolines/
 *
 * Created and developed by Mark-Jan Bludau.
 * Based on research by Mark-Jan Bludau, Christian Tominski, and Marian Dörk.
 *
 * Bludau, M.-J., Tominski, C., and Dörk, M. (2027). Meandering Photo Lines:
 * Fluid Multiscale Exploration of Photographic Archives. IEEE Transactions
 * on Visualization and Computer Graphics.
 */

import { config, getImageUrl } from "../../config.js";

import { buildHierarchyData } from "./hierarchy-transform.js";
import { initTimeline } from "./timeline.js";
import { createMissionPathSeriesTransform } from "./mission-path-series-transform.js";
import { createImageKeywordStream } from "./image-keyword-stream.js";
import { createGlobeFollower } from "./globe-follower.js";

const dataFields = config.dataFields;

d3.select("html").style("--highlightColor", config.highlightColor);

///////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////
//////////////////////SVG-Icons

const journeyIcons = {
  conversion_path:
    '<svg aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 32 32">\n  <path fill="currentColor" d="M12.5 9.25H19a3.75 3.75 0 1 1 0 7.5h-6a2.25 2.25 0 0 0 0 4.5h6.5V19.5h5v5h-5v-1.75H13a3.75 3.75 0 1 1 0-7.5h6a2.25 2.25 0 0 0 0-4.5h-6.5v1.75h-5v-5h5zM21 23h2v-2h-2zM9 11h2V9H9z"/>\n</svg>',
  grid_view:
    '<svg aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 32 32">\n  <path fill="currentColor" d="M15 24H8v-7h7zm9 0h-7v-7h7zM9.5 22.5h4v-4h-4zm9 0h4v-4h-4zM15 15H8V8h7zm9 0h-7V8h7zM9.5 13.5h4v-4h-4zm9 0h4v-4h-4z"/>\n</svg>',
  filter_alt:
    '<svg aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><path fill="currentColor" d="M13.5 7a6.5 6.5 0 0 1 6.5 6.5 6.469 6.469 0 0 1-1.406 4.033l5.436 5.437-1.06 1.06-5.437-5.436A6.469 6.469 0 0 1 13.5 20a6.5 6.5 0 1 1 0-13Zm0 1.5a5 5 0 1 0 0 10 5 5 0 0 0 0-10Z"/></svg>',
  settings:
    '<svg aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="22.694,13.953 24.863,14.437 24.863,17.563 22.694,18.047 22.181,19.286 23.372,21.162 21.162,23.372 19.286,22.181 18.047,22.694 17.563,24.863 14.437,24.863 13.953,22.694 12.714,22.181 10.838,23.372 8.628,21.162 9.819,19.286 9.306,18.047 7.137,17.563 7.137,14.437 9.306,13.953 9.819,12.714 8.628,10.838 10.838,8.628 12.714,9.819 13.953,9.306 14.437,7.137 17.563,7.137 18.047,9.306 19.286,9.819 21.162,8.628 23.372,10.838 22.181,12.714"/><circle cx="16" cy="16" r="3.25"/></svg>',
  closeIcon:
    '<svg aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><path fill="currentColor" d="M22.53 10.53 17.06 16l5.47 5.47-1.06 1.06L16 17.06l-5.47 5.47-1.06-1.06L14.94 16l-5.47-5.47 1.06-1.06L16 14.94l5.47-5.47 1.06 1.06Z"/></svg>',
  keyboard_arrow_down:
    '<svg aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" fill="currentColor"><path d="M480-344 240-584l56-56 184 184 184-184 56 56-240 240Z"/></svg>',
  keyboard_arrow_up:
    '<svg aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" fill="currentColor"><path d="M480-528 296-344l-56-56 240-240 240 240-56 56-184-184Z"/></svg>',
  south_east:
    '<svg aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" fill="currentColor"><path d="M360-200v-80h264L160-744l56-56 464 464v-264h80v400H360Z"/></svg>',
};

///////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////
//////////////////////Welcome-Popup

if (window.location.search === "" && window.location.hash === "") {
  const welcomeDialog = d3
    .select("body")
    .append("dialog")
    .attr("class", "welcomeDialog")
    .attr("aria-labelledby", "welcomeTitle")
    .attr("aria-describedby", "welcomeDescription welcomeNotice");

  welcomeDialog
    .append("button")
    .attr("class", "welcomeClose svgIcon")
    .attr("type", "button")
    .attr("aria-label", "Close welcome message")
    .html(journeyIcons.closeIcon)
    .on("click", closeWelcome);

  welcomeDialog
    .append("h2")
    .attr("id", "welcomeTitle")
    .text(config.welcome.title);
  welcomeDialog
    .append("p")
    .attr("id", "welcomeDescription")
    .text(config.welcome.description);
  welcomeDialog
    .append("p")
    .attr("id", "welcomeNotice")
    .html(config.welcome.notice);
  welcomeDialog
    .append("button")
    .attr("class", "welcomeStart")
    .attr("type", "button")
    .attr("autofocus", "")
    .text(config.welcome.buttonLabel)
    .on("click", closeWelcome);

  function closeWelcome() {
    welcomeDialog.node().close();
  }

  welcomeDialog.on("close", () => {
    d3.select("html").classed("welcomeOpen", false);
    welcomeDialog.remove();
  });
  d3.select("html").classed("welcomeOpen", true);
  welcomeDialog.node().showModal();
}

///////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////
//////////////////////Basic variables,

let pageWidth = window.innerWidth;
let pageHeight = window.innerHeight;

const tooltip = d3.select("body").append("div").attr("class", "tooltip");
let currentYear;
let granularity = "trips";

const lineGen = d3
  .line()
  .curve(d3.curveCatmullRom.alpha(0.5))
  .x((d) => d[0])
  .y((d) => d[1]);

let timeline = null;
window.arranged = false; //Start in Grid; true --> Path-view

///////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////
// scroll event set-up

window.lastScrollY =
  typeof window.lastScrollY === "number"
    ? window.lastScrollY
    : window.scrollY || 0;
window.scrollDir = 1; // +1 = downwards, -1 = upwards

d3.select(window).on(
  "wheel.horizontalScroll",
  function (event) {
    // only in path mode
    if (window.arranged == false) return;

    // do nothing while a path series is unfolded
    if (d3.selectAll(".mapDivs.seriesExpanded").empty() == false) return;

    const absX = Math.abs(event.deltaX || 0);
    const absY = Math.abs(event.deltaY || 0);

    // only translate clearly horizontal scrolling
    if (absX <= absY || absX === 0) return;

    event.preventDefault();
    window.scrollBy({
      top: event.deltaX,
      left: 0,
      behavior: "auto",
    });
  },
  { passive: false },
);

///////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////
//////////////////////Image preview slideshows in maps in grid

//images for the hover slideshow
function missionThumbUrls(missionDatum, keywordLower = null) {
  const urls = [];
  const seriesArr = missionDatum?.children || []; //Serien, falls vorhanden; sonst eine leere Liste

  for (const s of seriesArr) {
    const items = s?.children || [];
    for (const it of items) {
      if (keywordLower) {
        const keywordValue = it.data[dataFields.keywords.column];
        if (keywordValue == null || keywordValue == "") continue;

        const keywordList = keywordValue
          .split(";")
          .map((x) => x.trim())
          .filter(function (d, i) {
            return Boolean(d);
          });

        const matches = keywordList.some((k) =>
          k.toLowerCase().includes(keywordLower.toLowerCase()),
        );

        if (matches == false) continue;
      }

      urls.push(getImageUrl(it.data[dataFields.id.column]));
    }
  }

  return urls;
}

function pickRandom(items) {
  if (items.length == 0) {
    return "";
  } else {
    return items[Math.floor(Math.random() * items.length)];
  }
}

///////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////
//////////////////////Responsive settings on small screens

let mobileSettingsOpen = false;

function updateResponsiveSettings() {
  const isMobile = window.innerWidth < 800;
  d3.select("#settingsButton").style(
    "display",
    isMobile ? "inline-flex" : "none",
  );

  if (isMobile == false) {
    mobileSettingsOpen = false;
    d3.select("#buttons").classed("is-expanded", false);
    d3.select("#settingsButton").html(journeyIcons.settings);
  }
}

function toggleResponsiveSettings() {
  if (window.innerWidth >= 800 == true) return;
  mobileSettingsOpen = mobileSettingsOpen == false;
  d3.select("#buttons").classed("is-expanded", mobileSettingsOpen);
  d3.select("#settingsButton").html(
    mobileSettingsOpen ? journeyIcons.closeIcon : journeyIcons.settings,
  );
}

d3.select("#settingsButton")
  .on("click", toggleResponsiveSettings)
  .on("keydown", function (event) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    toggleResponsiveSettings();
  });

updateResponsiveSettings();

///////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////
//read hash from URL
const currentHash = window.location.hash || "";

const initialPathHash = currentHash
  .replace(/^#/, "")
  .split("&")
  .some((part) => part === "path" || part.startsWith("path:"));

///////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////
//////////////////////Data load

Promise.all([
  d3.csv(config.dataFile, (d) => {
    const raw = d[dataFields.date.column];
    const parsed = raw && /^\d{4}$/.test(raw) ? `${raw}-01-01` : raw;
    return { ...d, dateCreated: raw ? new Date(parsed) : null };
  }),
  d3.json("assets/data/land-110m.json"),
]).then(([dataset, landTopo]) => {
  ///////////////////////////////////////////////////////////////
  ///////////////////////////////////////////////////////////////
  //////////////////////Layout options via radio buttons

  //hierarchy mode (radio)
  const params = new URLSearchParams(window.location.search);
  const groupingParameter = (params.get("groupingBy") || "trips").toLowerCase();

  let responsiveResizeRunning = false;
  let responsiveResizeRevision = 0;

  //tiles per row (radio) === one place to change the available options later:
  let wideGridColumns = 4;
  let mediumGridColumns = 8;
  let denseGridColumns = 15;

  if (window.innerWidth < 800 == true) {
    wideGridColumns = 2;
    mediumGridColumns = 3;
    denseGridColumns = 4;
  }

  const tileOptionValues = [
    wideGridColumns,
    mediumGridColumns,
    denseGridColumns,
  ];
  d3.selectAll('#tilesPerRow input[name="cols"]').each(
    function (selectionData, index) {
      const input = this;
      const value = tileOptionValues[index];
      if (Number.isFinite(value) == false) return;
      d3.select(input).property("value", String(value));
      d3.select(input.closest("label")).attr("title", `${value} tiles per row`);
      const labelText = d3
        .select(input.closest("label"))
        .selectAll("span")
        .node();
      if (labelText) d3.select(labelText).text(String(value));
    },
  );

  const colsParamRaw = String(
    params.get("cols") || String(wideGridColumns),
  ).trim();
  const colsParamNum = +colsParamRaw;
  const columnsParameter =
    colsParamNum === denseGridColumns
      ? denseGridColumns
      : colsParamNum === mediumGridColumns
        ? mediumGridColumns
        : wideGridColumns; // allow only A/B/C

  // === Grid layout mode (radio): maps | images ===
  const mapBackground = "maps";
  const imageBackground = "images";

  const rawBackgroundParameter = String(params.get("bg") || mapBackground)
    .trim()
    .toLowerCase();
  const backgroundParameter =
    rawBackgroundParameter === imageBackground
      ? imageBackground
      : mapBackground;

  //grid dimensions
  let isMobileView = window.innerWidth < 800;
  let containerMargin = isMobileView ? 12 : 0; //mobil 12px Rand, sonst 0
  let marginRightSide = isMobileView ? 12 : 150;
  let divMargin = isMobileView ? 18 : 20;

  //hide details in smaller tiles via semantic zoom logic
  function applyDenseGridVisibility(colsNow) {
    const dense = colsNow >= denseGridColumns;
    const mediumOrDense = colsNow >= mediumGridColumns;

    // only affects grid view
    if (window.arranged == true) return;

    d3.selectAll(".tileBgImg").style("opacity", dense ? 0 : 0.75);
    d3.selectAll(".mapTitleCount").style(
      "display",
      mediumOrDense ? "none" : null,
    );
    d3.selectAll(".mapTitleYear").style("display", dense ? "none" : null);
    d3.selectAll(".mapTitleScopeIcon").style(
      "display",
      mediumOrDense ? "none" : "inline-flex",
    );
    d3.selectAll(".scaleArc, .scaleText").style(
      "display",
      mediumOrDense ? "none" : null,
    );
  }

  // sync radio state on load
  const groupingInputs = d3.selectAll(
    '#hierarchyMode input[name="groupingBy"]',
  );
  groupingInputs.each(function () {
    const inp = this;
    d3.select(inp).property(
      "checked",
      d3.select(inp).property("value") === groupingParameter,
    );
  });

  //reload when grouping option changes
  groupingInputs.each(function () {
    const inp = this;
    d3.select(inp).on("change.groupingBy", () => {
      const next = d3.select(inp).property("value");
      const nextParams = new URLSearchParams(window.location.search);
      nextParams.set("groupingBy", next);
      const nextUrl = `${window.location.pathname}?${nextParams.toString()}${window.location.hash || ""}`;
      window.location.href = nextUrl;
    });
  });

  // sync column radio state on load
  const colsInputs = d3.selectAll('#tilesPerRow input[name="cols"]');
  colsInputs.each(function () {
    const inp = this;
    d3.select(inp).property(
      "checked",
      String(d3.select(inp).property("value")) === String(columnsParameter),
    );
  });

  // sync grid layout radio state on load
  const backgroundInputs = d3.selectAll('#gridLayoutMode input[name="bg"]');
  backgroundInputs.each(function () {
    const inp = this;
    d3.select(inp).property(
      "checked",
      String(d3.select(inp).property("value")) === String(backgroundParameter),
    );
  });

  //set controls for a direct path access via URL hash
  if (initialPathHash) {
    const layoutSliderEl = d3.select("#layoutSlider").node();
    if (layoutSliderEl) {
      d3.select(layoutSliderEl).property("value", 1);
    }

    d3.select("#hierarchyMode")
      .style("opacity", 0)
      .style("pointer-events", "none");
    d3.select("#tilesPerRow")
      .style("opacity", 0)
      .style("pointer-events", "none");
    d3.select("#gridLayoutMode")
      .style("opacity", 0)
      .style("pointer-events", "none");
  }

  // remember current grid layout mode
  window.gridLayoutMode = backgroundParameter;

  //update URL without reloading
  function setUrlParam(key, value) {
    const nextParams = new URLSearchParams(window.location.search);
    nextParams.set(key, value);
    const nextUrl = `${window.location.pathname}?${nextParams.toString()}${window.location.hash || ""}`;
    window.history.replaceState(null, "", nextUrl);
  }

  ///////////////////////////////////////////////////////////////
  ///////////////////////////////////////////////////////////////
  //////////////////////Arrangement of map tiles in grid

  // animate grid layout when changing tiles per row
  const colsTransitionMs = 900;
  function applyGridColsTransition(nextColumnCount) {
    // only in grid view
    if (window.arranged == true) return;

    const availableWidth =
      pageWidth -
      containerMargin -
      marginRightSide -
      (nextColumnCount - 1) * divMargin;

    const nextDivWidth = availableWidth / nextColumnCount;
    const nextDivHeight = nextDivWidth;

    // update sizes + positions
    const mapTileSelection = d3.selectAll(".mapDivs");

    mapTileSelection
      .transition()
      .duration(colsTransitionMs)
      .style("width", nextDivWidth + "px")
      .style("height", nextDivHeight + "px")
      .style("left", (d, i) => {
        const row = Math.floor(i / nextColumnCount);
        const columnInRow = i % nextColumnCount;
        const col =
          row % 2 === 0 ? columnInRow : nextColumnCount - 1 - columnInRow;
        return col * (nextDivWidth + divMargin) + "px";
      })
      .style("top", (d, i) => {
        const row = Math.floor(i / nextColumnCount);
        return row * (nextDivHeight + 2.5 * divMargin) + "px";
      });

    // Resize maps and their layout spacers; label icons keep their dimensions.
    mapTileSelection.each(function () {
      const div = d3.select(this);

      div
        .selectAll("svg.mapSVGs, svg.mapTileSpacer")
        .transition()
        .duration(colsTransitionMs)
        .attr("width", nextDivWidth)
        .attr("height", nextDivHeight)
        .style("width", nextDivWidth + "px")
        .style("height", nextDivHeight + "px");
    });

    // remember (for any code that wants to know what the user picked)
    window.gridCols = nextColumnCount;
    window.gridDivWidth = nextDivWidth;
    window.gridDivHeight = nextDivHeight;
    columnCount = nextColumnCount;
    divWidth = nextDivWidth;
    divHeight = nextDivHeight;
    sharedMissionPathSeriesTransform.resizeLayout({
      divHeight,
      pageWidth,
      pageHeight,
      thumbnailSizePx: isMobileView ? 86 : 120,
    });
    mapTileSelection.each(function (d) {
      applyMapTileSizingProgress(d3.select(this).select(".mapSVGs"), d, 0);
    });
    applyDenseGridVisibility(nextColumnCount);
  }

  //switch tile background between maps and images
  function applyGridLayoutMode(mode) {
    window.gridLayoutMode = mode === "images" ? "images" : "maps";

    // only affects grid view
    if (window.arranged == true) return;

    const dense = window.gridCols >= denseGridColumns;

    const keywordLower = activeKeyword ? activeKeyword.toLowerCase() : null;

    d3.selectAll(".mapSVGs").each(function (d) {
      const svg = d3.select(this);
      const bg = svg.select(".tileBgImg");
      const slide = svg.select(".tileSlideshowImg");

      if (window.gridLayoutMode === "images") {
        bg.style("opacity", 0);

        const u = pickRandom(missionThumbUrls(d, keywordLower));

        if (u) {
          slide.attr("href", u);
          slide.interrupt().attr("opacity", 0.95);
        } else {
          slide.interrupt().attr("opacity", 0).attr("href", "");
        }
      } else {
        bg.style("opacity", dense ? 0 : 0.75);
        slide.interrupt().attr("opacity", 0).attr("href", "");
      }
    });

    applyDenseGridVisibility(window.gridCols);
  }
  ///////////////////////////////////////////////////////////////
  ///////////////////////////////////////////////////////////////
  //////////////////////Selection of country in grid (--> open country in path) function
  //open a country from the grid
  async function focusMapTileFlowByIndex(mapTileIndex) {
    //switch to 4 columns on desktop, 2 on mobile
    if (window.arranged == false) {
      const focusedColumnCount = isMobileView ? wideGridColumns : 4;
      if (window.gridCols !== focusedColumnCount) {
        // sync radio UI
        colsInputs.each(function () {
          const inp = this;
          d3.select(inp).property(
            "checked",
            String(d3.select(inp).property("value")) ===
              String(focusedColumnCount),
          );
        });

        applyGridColsTransition(focusedColumnCount);
        setUrlParam("cols", String(focusedColumnCount));

        // wait for the column transition to finish
        await waitMs(colsTransitionMs + 120);
      }
    }

    //switch to path view
    if (window.arranged == false) {
      await animateLayoutSliderTo(1, 1400);

      await new Promise(requestAnimationFrame);
      await transformView();
    }

    //scroll to the selected country
    const targetDiv = d3.selectAll(".mapDivs.in-path").nodes()[mapTileIndex];
    if (targetDiv) {
      await waitForElementLayoutSettle(targetDiv);
      updateExpandedSeriesResponsiveLayout();
      await new Promise(requestAnimationFrame);

      const targetRect = targetDiv.getBoundingClientRect();
      const targetY = Math.max(
        0,
        Math.min(
          document.documentElement.scrollHeight - window.innerHeight,
          window.scrollY +
            targetRect.top +
            targetRect.height / 2 -
            window.innerHeight / 2,
        ),
      );
      targetDiv.scrollIntoView({ behavior: "smooth", block: "center" });
      await waitForScrollSettle(targetY);
      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);
      updateExpandedSeriesResponsiveLayout();

      //unfold the selected country
      const routeEl = d3
        .select(targetDiv)
        .selectAll("svg.mapSVGs g.mapMarkersG path.routePathBase")
        .node();
      if (routeEl) {
        routeEl.dispatchEvent(new MouseEvent("click", { bubbles: true }));
        window.setTimeout(updateExpandedSeriesResponsiveLayout, 500);
      }
    }
  }

  //update columns and URL; reload in path view
  //////////////////////Wait until scrolling is finished to continue animation

  function waitMs(ms) {
    return new Promise((res) => window.setTimeout(res, ms));
  }

  function waitForScrollSettle(targetY, maxWaitMs = 3000) {
    return new Promise((resolve) => {
      const startedAt = performance.now();
      let previousY = window.scrollY;
      let stableFrames = 0;

      function check(now) {
        const currentY = window.scrollY;
        if (Math.abs(currentY - previousY) < 0.5 == true) stableFrames += 1;
        else stableFrames = 0;
        previousY = currentY;

        const reachedTarget =
          Number.isFinite(targetY) == false || Math.abs(currentY - targetY) < 2;
        if (
          (stableFrames >= 4 && reachedTarget) ||
          now - startedAt >= maxWaitMs
        ) {
          resolve();
          return;
        }
        requestAnimationFrame(check);
      }

      requestAnimationFrame(check);
    });
  }

  function waitForElementLayoutSettle(element, maxWaitMs = 1800) {
    return new Promise((resolve) => {
      const startedAt = performance.now();
      let previous = null;
      let stableFrames = 0;

      function check(now) {
        const rect = element?.getBoundingClientRect();
        const current = rect
          ? [rect.left, rect.top, rect.width, rect.height]
          : null;
        const stable =
          current &&
          previous &&
          current.every(
            (value, index) => Math.abs(value - previous[index]) < 0.5,
          );
        stableFrames = stable ? stableFrames + 1 : 0;
        previous = current;

        if (stableFrames >= 4 || now - startedAt >= maxWaitMs) {
          resolve();
          return;
        }
        requestAnimationFrame(check);
      }

      requestAnimationFrame(check);
    });
  }

  colsInputs.each(function () {
    const inp = this;
    d3.select(inp).on("change.tileColumns", () => {
      const next = +d3.select(inp).property("value");
      if (Number.isFinite(next) == false) return;

      if (window.arranged == true) {
        //rebuild the path after changing columns
        const nextParams = new URLSearchParams(window.location.search);
        nextParams.set("cols", String(next));
        const nextUrl = `${window.location.pathname}?${nextParams.toString()}${window.location.hash || ""}`;
        window.location.href = nextUrl;
        return;
      }

      applyGridColsTransition(next);
      setUrlParam("cols", String(next));
    });
  });

  backgroundInputs.each(function () {
    const inp = this;
    d3.select(inp).on("change.tileBackground", () => {
      const next = String(
        d3.select(inp).property("value") || "maps",
      ).toLowerCase();

      if (window.arranged == true) {
        const nextParams = new URLSearchParams(window.location.search);
        nextParams.set("bg", next);
        const nextUrl = `${window.location.pathname}?${nextParams.toString()}${window.location.hash || ""}`;
        window.location.href = nextUrl;
        return;
      }

      applyGridLayoutMode(next);
      setUrlParam("bg", next);
    });
  });

  //grouping options
  granularity = ["trips", "1y", "5y"].includes(groupingParameter)
    ? groupingParameter
    : "trips";

  const { missions, hierarchicalData } = buildHierarchyData(
    dataset,
    d3,
    granularity,
  );

  //collect places for the globe, without duplicates
  const globePlaces = new Map();

  hierarchicalData.data.children.forEach(function (mission) {
    mission.places.forEach(function (place) {
      if (Number.isFinite(place.lat) && Number.isFinite(place.lon)) {
        const placeKey = `${place.key}|${place.lat}|${place.lon}`;
        globePlaces.set(placeKey, {
          ...place,
        });
      }
    });
  });

  const places = Array.from(globePlaces.values());

  ///////////////////////////////////////////////////////////////
  ///////////////////////////////////////////////////////////////
  //////////////////////Keyword filter and keyword set-up

  const keywordCounts = new Map();

  //count keywords from the CSV
  dataset.forEach(function (photo) {
    if (photo[dataFields.keywords.column]) {
      const keywords = photo[dataFields.keywords.column].split(";");

      keywords.forEach(function (keyword) {
        keyword = keyword.trim();

        if (keyword != "") {
          if (keywordCounts.has(keyword) == true) {
            const count = keywordCounts.get(keyword);
            keywordCounts.set(keyword, count + 1);
          } else {
            keywordCounts.set(keyword, 1);
          }
        }
      });
    }
  });

  const globalKeywords = Array.from(keywordCounts, ([key, count]) => ({
    key,
    count,
  })).sort((a, b) => b.count - a.count);

  // active keyword var
  let activeKeyword = null;
  window.activeKeyword = null;

  ///////////////////////////////////////////////////////////////
  ///////////////////////////////////////////////////////////////
  //show active keyword button
  //check whether a mission, place or series contains the keyword

  const keywordInput = d3.select("#keywordPanelSearch");

  keywordInput.on("focus", function () {
    renderKeywordPanelList(globalKeywords);
  });

  keywordInput.on("input", function () {
    const term = d3.select(this).property("value").trim().toLowerCase();

    const filtered = term
      ? globalKeywords.filter(function (d, i) {
          return d.key.toLowerCase().includes(term);
        })
      : globalKeywords;

    renderKeywordPanelList(filtered);
  });

  let filterActive = false;

  d3.select("#filterButton").on("click", function () {
    filterActive = filterActive == false;

    if (filterActive == true) {
      d3.select("#filterButton").html(journeyIcons.closeIcon);
    } else {
      d3.select("#filterButton").html(journeyIcons.filter_alt);
    }

    d3.select("#keywordPanel").style(
      "display",
      filterActive ? "block" : "none",
    );

    if (filterActive == true) {
      renderKeywordPanelList(globalKeywords);
      const inputNode = d3.select("#keywordPanelSearch").node();
      if (inputNode) inputNode.focus();
    }
  });

  //reset-function
  async function resetKeywordFilter() {
    if (window.arranged == true) {
      d3.select("#arrangeButton").dispatch("click");
      await waitMs(1600);
      window.scrollTo({ top: 0, behavior: "smooth" });
      await waitMs(700);
    }

    activeKeyword = null;
    window.activeKeyword = null;

    // clear search
    d3.select("#keywordPanelSearch").property("value", "");

    // clear image and keyword stream
    imageKeywordStream.clear();

    // reset maps
    d3.selectAll(".mapDivs")
      .each(function (d) {
        if (d && "keywordMatch" in d) delete d.keywordMatch;
      })
      .style("opacity", 1)
      .style("pointer-events", "auto");

    //reset places in the mapTiles
    d3.selectAll("#mapContainer circle.place")
      .style("fill", "var(--highlightColor)")
      .style("opacity", 0.7);

    // reset main path
    d3.selectAll(".mapDivs").each(function () {
      const svg = d3.select(this).select(".mapSVGs");
      const markersG = svg.select(".mapMarkersG");
      if (markersG.empty() == true) return;

      const routeBase = markersG.select(".routePathBase");
      const routeProg = markersG.select(".routePathProgress");
      if (routeBase.empty() || routeProg.empty()) return;

      const coords = markersG
        .selectAll("circle.place")
        .nodes()
        .map((el) => [+d3.select(el).attr("cx"), +d3.select(el).attr("cy")])
        .filter(function (d, i) {
          return Number.isFinite(d[0]) && Number.isFinite(d[1]);
        });

      if (coords.length >= 2 == true) {
        const dPath = lineGen(coords);

        routeBase.attr("d", dPath).style("opacity", 1);
        routeProg.attr("d", dPath).style("opacity", 1);

        const nodePath = routeProg.node();
        if (nodePath) {
          const L = nodePath.getTotalLength();
          routeProg
            .attr("data-total-length", L)
            .style("stroke-dasharray", `${L} ${L}`)
            .style("stroke-dashoffset", L);
        }
      } else {
        // no path if less than 2 points
        routeBase.attr("d", null).style("opacity", 0);
        routeProg
          .attr("d", null)
          .attr("data-total-length", 0)
          .style("opacity", 0);
      }
    });

    // reset places in path
    if (window.arranged == true) {
      d3.selectAll(".mapDivs.in-path circle.place").style("display", null);

      if (window.mapScrollObserverCleanup) {
        window.mapScrollObserverCleanup();
      }
      initMapScrollObserver();
    }

    // reset keyword list
    renderKeywordPanelList(globalKeywords);
    updateActiveFilterBox();
    if (window.arranged == false) {
      applyGridLayoutMode(window.gridLayoutMode || "maps");
    }
  }

  // X-Button click
  d3.select("#keywordClearButton").on("click", async () => {
    await resetKeywordFilter();
  });

  d3.select("#activeFilterReset").on("click", async (event) => {
    event.stopPropagation();
    await resetKeywordFilter();
  });

  async function applyKeywordFilter(keyword) {
    if (keyword == null || keyword == "") {
      resetKeywordFilter();
      return;
    }

    if (window.arranged == true) {
      d3.select("#arrangeButton").dispatch("click");
      await waitMs(1600);
      window.scrollTo({ top: 0, behavior: "smooth" });
      await waitMs(700);
    }

    imageKeywordStream.clear();

    activeKeyword = keyword;
    window.activeKeyword = keyword;
    const keywordLowercase = keyword.toLowerCase();

    updateActiveFilterBox();

    //karten im grid nur abdunkeln, nicht verstecken
    d3.selectAll(".mapDivs").each(function (d) {
      const has = nodeHasKeyword(d, keywordLowercase);
      d.keywordMatch = has == true;

      d3.select(this)
        .style("opacity", has ? 1 : 0.15)
        .style("pointer-events", "auto");
    });

    //orte im grid highlighten – nur karten, nicht follower-globus
    d3.selectAll("#mapContainer circle.place")
      .style("fill", function (d) {
        return nodeHasKeyword(d, keywordLowercase)
          ? "var(--highlightColor)"
          : "white";
      })
      .style("opacity", function (d) {
        return nodeHasKeyword(d, keywordLowercase) ? 1 : 0.15;
      });

    //pfade in jeder karte an gefilterte punkte anpassen
    d3.selectAll(".mapDivs").each(function () {
      const svg = d3.select(this).select(".mapSVGs");
      const markersG = svg.select(".mapMarkersG");

      const routeBase = markersG.select(".routePathBase");
      const routeProg = markersG.select(".routePathProgress");
      if (routeBase.empty() || routeProg.empty()) return;

      const filteredCoords = markersG
        .selectAll("circle.place")
        .filter(function (d) {
          return nodeHasKeyword(d, keywordLowercase);
        })
        .nodes()
        .map((el) => [+d3.select(el).attr("cx"), +d3.select(el).attr("cy")]);

      if (filteredCoords.length >= 2 == true) {
        const newD = lineGen(filteredCoords);

        routeBase.attr("d", newD).style("opacity", 1);
        routeProg.attr("d", newD).style("opacity", 1);

        const nodePath = routeProg.node();
        if (nodePath) {
          const L = nodePath.getTotalLength();
          routeProg
            .attr("data-total-length", L)
            .style("stroke-dasharray", `${L} ${L}`)
            .style("stroke-dashoffset", L);
        }
      } else {
        routeBase.attr("d", null).style("opacity", 0);
        routeProg
          .attr("d", null)
          .style("opacity", 0)
          .attr("data-total-length", 0);
      }
    });

    // In der Pfadansicht: irrelevante Orte ausblenden
    if (window.arranged == true) {
      d3.selectAll(".mapDivs.in-path circle.place").style(
        "display",
        function (d) {
          return nodeHasKeyword(d, keywordLowercase) ? null : "none";
        },
      );
    }

    // Scroll-Observer & Follower an neue Pfade anpassen (nur in Pfadansicht)
    if (window.arranged == true) {
      if (window.mapScrollObserverCleanup) {
        window.mapScrollObserverCleanup();
      }
      initMapScrollObserver();
    } else {
      //update image tiles after filtering
      applyGridLayoutMode(window.gridLayoutMode || "maps");
    }
  }

  ///////////////////////////////////////////////////////////////
  ///////////////////////////////////////////////////////////////
  //////////////////////Anzeige und Hilfsfunktionen für den Keyword-Filter

  function updateActiveFilterBox() {
    const box = d3.select("#activeFilterBox");
    const label = d3.select("#activeFilterKeyword");

    if (box.empty() == true) return;

    if (activeKeyword && activeKeyword.trim()) {
      label.text(activeKeyword);
      box.style("display", "inline-flex").style("opacity", 1);
    } else {
      label.text("");
      box.style("opacity", 0).style("display", "none");
    }
  }

  function nodeHasKeyword(node, keywordLowercase) {
    if (node == null || Array.isArray(node.children) == false) return false;

    return node.children.some((series) =>
      (series.children || []).some((item) => {
        const keywordValue = item.data[dataFields.keywords.column];
        if (keywordValue == null || keywordValue == "") return false;

        const keywordList = keywordValue
          .split(";")
          .map((s) => s.trim())
          .filter(function (d, i) {
            return Boolean(d);
          });

        return keywordList.some((k) =>
          k.toLowerCase().includes(keywordLowercase.toLowerCase()),
        );
      }),
    );
  }

  function renderKeywordPanelList(listData) {
    const listSel = d3.select("#keywordPanelList");

    const rows = listSel.selectAll(".keywordRow").data(listData, (d) => d.key);

    rows.exit().remove();

    const rowsEnter = rows
      .enter()
      .append("div")
      .attr("class", "keywordRow")
      .on("click", async (event, d) => {
        const input = d3.select("#keywordPanelSearch");
        input.property("value", d.key);
        await applyKeywordFilter(d.key);

        filterActive = false;
        d3.select("#filterButton").html(journeyIcons.filter_alt);
        d3.select("#keywordPanel").style("display", "none");
      });

    rowsEnter.append("span").attr("class", "keywordLabel");
    rowsEnter.append("span").attr("class", "keywordCount");

    const rowsMerged = rowsEnter.merge(rows);

    rowsMerged.select(".keywordLabel").text((d) => d.key);
    rowsMerged.select(".keywordCount").text((d) => `(${d.count})`);
  }

  ///////////////////////////////////////////////////////////////
  ///////////////////////////////////////////////////////////////
  //////////////////////Maps and paths

  //layout

  d3.select("body")
    .append("div")
    .attr("id", "mapFollowerLayer")
    .style("position", "absolute")
    .style("top", 0)
    .style("left", 0)
    .style("width", "100%")
    .style("pointer-events", "none")
    .style("z-index", 100);

  const mapContainer = d3
    .select("body")
    .append("div")
    .attr("id", "mapContainer")
    .style("margin-left", containerMargin + "px")
    .style("margin-top", containerMargin + "px")
    .style("margin-bottom", containerMargin + "px")
    .style("margin-right", marginRightSide + "px");

  let columnCount = columnsParameter;

  const availableWidth =
    pageWidth -
    containerMargin -
    marginRightSide -
    (columnCount - 1) * divMargin;

  let divWidth = availableWidth / columnCount;
  let divHeight = divWidth;

  //store grid dimensions
  window.gridCols = columnCount;
  window.gridDivWidth = divWidth;
  window.gridDivHeight = divHeight;
  applyDenseGridVisibility(columnCount);
  setUrlParam("bg", backgroundParameter);

  //map coordinates match the 260px tiles from renderer: important to keep, because viewbox needs to be the same as in the rendered maps
  const tileViewBoxSize = 260;

  const maxItemCount = d3.max(missions, (m) => m.itemCount || 1) || 1;
  const minItemCount = d3.min(missions, (m) => m.itemCount || 1) || 1;

  const mapTileScaleByItems = d3
    .scaleSqrt()

    .domain([1, 2000])
    .range([0.5, 1])
    .clamp(true);

  function applyMapTileSizingProgress(svgMap, mission, progress) {
    if (svgMap.empty() == true) return;

    const t = Math.max(0, Math.min(1, Number(progress) || 0));
    const isDenseGrid = window.gridCols >= denseGridColumns;
    const gridScale = isDenseGrid
      ? 1
      : mapTileScaleByItems(mission?.itemCount || 1);
    const gridInvScale = 1 / (gridScale || 1);
    const gridWidth = tileViewBoxSize / gridScale;
    const gridHeight = tileViewBoxSize / gridScale;
    const gridX = (tileViewBoxSize - gridWidth) / 2;
    const gridY = (tileViewBoxSize - gridHeight) / 2;
    const interpolate = (from, to) => from + (to - from) * t;

    svgMap
      .attr(
        "viewBox",
        `${interpolate(gridX, 0)} ${interpolate(gridY, 0)} ${interpolate(
          gridWidth,
          tileViewBoxSize,
        )} ${interpolate(gridHeight, tileViewBoxSize)}`,
      )
      .attr("preserveAspectRatio", "xMidYMid meet")
      .attr("data-base-scale", gridScale);

    const isSinglePointMapTile = mission.places.length === 1;

    svgMap
      .selectAll("circle.place")
      .attr("r", function (place) {
        const baseRadius = d3.scaleLinear().domain([1, 1000]).range([3, 6])(
          place.count,
        );
        const gridRadius =
          isDenseGrid && isSinglePointMapTile
            ? Math.max(baseRadius * gridInvScale, 7 * gridInvScale)
            : baseRadius * gridInvScale;
        const pathRadius = gridRadius * gridScale;

        return interpolate(gridRadius, pathRadius);
      })
      .attr("stroke-width", interpolate(0.5 * gridInvScale, 0.5));
  }

  const strokeByItems = d3
    .scaleSqrt()
    .domain([1, maxItemCount])
    .range([0.75, 5])
    .clamp(true);

  ///////////////////////////////////////////////////////////////
  ///////////////////////////////////////////////////////////////
  ////////////////////////lazy loading for unfolded images
  const deferredPathImageObserver =
    typeof IntersectionObserver === "function"
      ? new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting == false) return;
              const image = entry.target;
              const src = d3.select(image).attr("data-src");
              if (src) {
                originalD3Attr.call(d3.select(image), "src", src);
                d3.select(image).attr("data-src", null);
              }
              deferredPathImageObserver.unobserve(image);
            });
          },
          { rootMargin: "800px 0px", threshold: 0.01 },
        )
      : null;

  const originalD3Attr = d3.selection.prototype.attr;
  d3.selection.prototype.attr = function (name, value) {
    if (name !== "src" || arguments.length < 2) {
      return originalD3Attr.apply(this, arguments);
    }

    let containsDeferredPathImage = false;
    this.each(function (datum, index, nodes) {
      if (
        this instanceof HTMLImageElement == false ||
        d3.select(this).classed("seriesThumb") == false
      ) {
        return;
      }

      containsDeferredPathImage = true;
      const src =
        typeof value === "function"
          ? value.call(this, datum, index, nodes)
          : value;
      if (src == null || src == "") return;

      d3.select(this).attr("loading", "lazy");
      d3.select(this).attr("decoding", "async");
      d3.select(this).attr("data-src", src);

      if (deferredPathImageObserver) {
        deferredPathImageObserver.observe(this);
      } else {
        originalD3Attr.call(d3.select(this), "src", src);
        d3.select(this).attr("data-src", null);
      }
    });

    if (containsDeferredPathImage) return this;
    return originalD3Attr.apply(this, arguments);
  };

  const sharedMissionPathSeriesTransform = createMissionPathSeriesTransform({
    d3,
    lineGen,
    divHeight,
    strokeByItems,
    pageWidth,
    pageHeight,
    thumbnailSizePx: window.innerWidth < 800 ? 86 : 120,
  });

  const missionPathSeriesTransform = Object.assign(function (
    event,
    datum,
    index,
  ) {
    const mapTile = this.closest(".mapDivs");
    const wasExpanded = d3.select(mapTile).classed("seriesExpanded");
    const responsiveResizeRevisionAtOpen = responsiveResizeRevision;
    const result = sharedMissionPathSeriesTransform.call(
      this,
      event,
      datum,
      index,
    );
    if (wasExpanded == false && d3.select(mapTile).classed("seriesExpanded")) {
      //scroll after unfolding finishes
      window.setTimeout(() => {
        if (
          responsiveResizeRevisionAtOpen !== responsiveResizeRevision ||
          mapTile.isConnected == false ||
          d3.select(mapTile).classed("seriesExpanded") == false
        )
          return;
        window.scrollTo({
          top: Math.max(
            0,
            window.scrollY + mapTile.getBoundingClientRect().top - 80,
          ),
          behavior: "smooth",
        });
      }, 650);
    }
    return result;
  }, sharedMissionPathSeriesTransform);

  ///////////////////////////////////////////////////////////////
  ///////////////////////////////////////////////////////////////
  //////////////////////Close-Button: keep the close button visible while scrolling
  const seriesActionTop = 80;
  const seriesActionBottomGap = 12;

  function updateExpandedSeriesResponsiveLayout() {
    if (responsiveResizeRunning) return;
    sharedMissionPathSeriesTransform.updateResponsiveBackgroundVisibility();
    constrainMobileSeriesThumbs();

    d3.selectAll(".seriesCloseButton").remove();

    const pathMapTiles = getPathMapTiles();
    const expandedMissionLabels = new Set();
    const yearOverlay = d3.select("#yearOverlay").node();
    const overlayRect = yearOverlay?.getBoundingClientRect();

    pathMapTiles.forEach((mapTile, mapTileIndex) => {
      if (d3.select(mapTile).classed("seriesExpanded") == false) return;
      const missionLabel =
        d3.selectAll("#yearOverlay p.missionLabel").nodes()[mapTileIndex] ||
        null;
      if (missionLabel == null || overlayRect == null) return;
      expandedMissionLabels.add(missionLabel);

      const actions = ensureSeriesActions(missionLabel);
      if (actions == null) return;

      const baseTop = Number.parseFloat(missionLabel.style.top);
      if (Number.isFinite(baseTop) == false) return;

      const mapTileRect = mapTile.getBoundingClientRect();
      const baseTopInViewport = overlayRect.top + baseTop;
      const maxTop =
        mapTileRect.bottom - actions.offsetHeight - seriesActionBottomGap;
      const targetTop = Math.max(
        seriesActionTop,
        Math.min(Math.max(baseTopInViewport, seriesActionTop), maxTop),
      );
      const translateY = Math.max(0, targetTop - baseTopInViewport);
      const transform = `translateY(${translateY}px)`;
      if (actions.style.transform !== transform) {
        d3.select(actions).style("transform", transform);
      }
    });

    d3.selectAll("#yearOverlay p.missionLabel").each(function () {
      const missionLabel = this;
      if (expandedMissionLabels.has(missionLabel) == false)
        restoreSeriesActions(missionLabel);
    });

    const imageBar = d3.select("#imageBar").node();
    if (imageBar) {
      const viewportY = window.innerHeight * 0.5;
      const insideExpandedSeries = pathMapTiles.some((mapTile) => {
        if (d3.select(mapTile).classed("seriesExpanded") == false) return false;
        const rect = mapTile.getBoundingClientRect();
        return viewportY >= rect.top && viewportY <= rect.bottom;
      });
      const display = insideExpandedSeries ? "none" : "";
      if (imageBar.style.display !== display) {
        d3.select(imageBar).style("display", display);
      }
    }
    syncOverlayDimensions();
  }

  function getPathMapTiles() {
    return d3.selectAll(".mapDivs.in-path").nodes();
  }

  function ensureSeriesActions(missionLabel) {
    const countryLabel = d3.select(missionLabel);
    const closeButton = countryLabel.select(".photoCountButton");
    if (closeButton.empty() == true) return null;

    if (
      closeButton.attr("data-orig-aria-label") == null ||
      closeButton.attr("data-orig-aria-label") == ""
    ) {
      closeButton.attr(
        "data-orig-aria-label",
        closeButton.attr("aria-label") || "",
      );
    }
    if (closeButton.attr("aria-label") != "Close series") {
      closeButton.attr("aria-label", "Close series");
    }
    if (countryLabel.classed("seriesCloseActive") == false) {
      countryLabel.classed("seriesCloseActive", true);
    }

    const buttonIcon = closeButton.select(".countArrow");
    if (
      buttonIcon.empty() == false &&
      buttonIcon.attr("data-icon") != "close"
    ) {
      buttonIcon
        .html(journeyIcons.closeIcon) //setzt das SVG-Kreuz ein; der Klick wird am Länderlabel behandelt
        .attr("data-icon", "close")
        .classed("closeIcon", true);
    }

    let stickyControls = countryLabel.select(".seriesStickyActions");
    if (stickyControls.empty() == true) {
      stickyControls = countryLabel
        .insert("span", ".photoCountButton")
        .attr("class", "seriesStickyActions");

      stickyControls.append(function () {
        return closeButton.node();
      });
    }

    return stickyControls.node();
  }

  function restoreSeriesActions(missionLabel) {
    const countryLabel = d3.select(missionLabel);
    const stickyControls = countryLabel.select(".seriesStickyActions");
    if (stickyControls.empty() == true) return;

    const photoButton = stickyControls.select(".photoCountButton");
    if (photoButton.empty() == false) {
      const originalLabel = photoButton.attr("data-orig-aria-label");
      if (originalLabel != null) {
        photoButton.attr("aria-label", originalLabel);
      }

      photoButton
        .select(".countArrow")
        .html(journeyIcons.south_east)
        .attr("data-icon", "south_east")
        .classed("closeIcon", false);

      countryLabel.insert(function () {
        return photoButton.node();
      }, ".seriesStickyActions");
    }

    stickyControls.remove();
    countryLabel
      .classed("seriesCloseActive", false)
      .attr("data-series-close-base-top", null);
  }

  let mobileSeriesTouchBindingReady = false;

  function syncOverlayDimensions() {
    const container = d3.select("#mapContainer").node();
    if (container == null) return;

    const mapTileBottom = d3
      .select(container)
      .selectAll(".mapDivs")
      .nodes()
      .reduce(
        (bottom, mapTile) =>
          Math.max(bottom, mapTile.offsetTop + mapTile.offsetHeight),
        0,
      );
    //leave some space below last place in path to make scrolling to that point possible
    const bottomSpace = window.arranged ? window.innerHeight * 0.6 : 0;
    const contentHeight = Math.ceil(mapTileBottom + bottomSpace);
    d3.select(container).style(
      "height",
      window.arranged ? contentHeight + "px" : null,
    );
    const connectorHeight = Math.ceil(
      Math.max(window.innerHeight, contentHeight),
    );
    const connector = d3.select("#mapConnectorOverlay").node();
    if (connector) {
      d3.select(connector).attr("height", String(connectorHeight));
      const height = `${connectorHeight}px`;
      if (connector.style.height !== height) {
        d3.select(connector).style("height", height);
      }
      if (connector.style.overflow !== "visible") {
        d3.select(connector).style("overflow", "visible");
      }
    }

    const containerTop = window.scrollY + container.getBoundingClientRect().top;
    const followerHeight = Math.ceil(
      Math.max(window.innerHeight, containerTop + connectorHeight),
    );
    const useViewportFollowerLayer =
      window.innerWidth < 800 &&
      d3.select(container).selectAll(".mapDivs.seriesExpanded").node();
    const effectiveFollowerHeight = useViewportFollowerLayer
      ? window.innerHeight
      : followerHeight;
    const followerLayer = d3.select("#mapFollowerLayer").node();
    if (followerLayer) {
      const height = `${effectiveFollowerHeight}px`;
      if (followerLayer.style.height !== height) {
        d3.select(followerLayer).style("height", height);
      }
      d3.select(followerLayer).style(
        "position",
        useViewportFollowerLayer ? "fixed" : "absolute",
      );
      d3.select(followerLayer).style("top", "0px");
      d3.select(followerLayer).style(
        "overflow",
        useViewportFollowerLayer ? "hidden" : "visible",
      );
    }

    const follower = d3.select("#mapFollowerOverlay").node();
    if (follower) {
      d3.select(follower).attr("height", String(effectiveFollowerHeight));
      const height = `${effectiveFollowerHeight}px`;
      if (follower.style.height !== height) {
        d3.select(follower).style("height", height);
      }
      d3.select(follower).style(
        "overflow",
        useViewportFollowerLayer ? "hidden" : "visible",
      );
    }
  }

  //////////////////////Bildstapel auf dem Handy

  function collapseMobileSeriesThumb(item) {
    if (item == null) return;

    let collapsedWidth = 0;
    d3.select(item)
      .selectAll("img.seriesThumb")
      .interrupt()
      .transition()
      .duration(150)
      .style("left", function () {
        const image = d3.select(this);
        const pileIndex = +image.attr("data-pile-index") || 0;
        const left = pileIndex * 3;
        const width = Number.parseFloat(image.style("width")) || 0;
        collapsedWidth = Math.max(collapsedWidth, left + width);
        return `${left}px`;
      })
      .style("opacity", function () {
        return d3.select(this).classed("seriesFirstImage") ? 1 : 0.35;
      });

    if (collapsedWidth > 0 == true)
      d3.select(item).style("width", `${collapsedWidth}px`);
    d3.select(item).attr("data-mobile-touch-expanded", null);
  }

  function expandMobileSeriesThumb(item) {
    if (item == null || window.innerWidth >= 800) return;

    const front = d3.select(item).selectAll("img.seriesFirstImage").node();
    const frontWidth =
      Number.parseFloat(front?.style.width) ||
      front?.getBoundingClientRect().width ||
      0;
    const piles = d3.select(item).selectAll("img.seriesThumbPile").nodes();
    const maxPileIndex = piles.reduce(
      (max, image) =>
        Math.max(max, +(d3.select(image).attr("data-pile-index") || 0)),
      0,
    );
    const itemLeft = item.getBoundingClientRect().left;
    const availableSpread = Math.max(
      0,
      window.innerWidth - 8 - itemLeft - frontWidth,
    );
    const step = maxPileIndex
      ? Math.min(frontWidth * 0.75, availableSpread / maxPileIndex)
      : 0;

    d3.select(item)
      .selectAll("img.seriesThumbPile")
      .interrupt()
      .transition()
      .duration(150)
      .style("left", function () {
        const pileIndex = +d3.select(this).attr("data-pile-index") || 0;
        return `${pileIndex * step}px`;
      })
      .style("opacity", 1);

    d3.select(item).style("width", `${frontWidth + maxPileIndex * step}px`);
  }

  function bindMobileSeriesTouchInteraction() {
    if (mobileSeriesTouchBindingReady) return;
    mobileSeriesTouchBindingReady = true;

    d3.select(document).on(
      "click.mobileSeriesTouch",
      (event) => {
        if (
          window.innerWidth >= 800 ||
          navigator.maxTouchPoints < 1 ||
          window.matchMedia("(pointer: coarse)").matches == false
        ) {
          return;
        }

        const item = event.target.closest?.(".seriesG");
        d3.selectAll(
          '.seriesG[data-mobile-touch-expanded="true"]',
        ).each(function () {
          const other = this;
          if (other !== item) collapseMobileSeriesThumb(other);
        });

        if (item == null) return;
        if (d3.select(item).selectAll("img.seriesThumbPile").node() == null)
          return;
        if (
          (d3.select(item).attr("data-mobile-touch-expanded") === "true") ==
          true
        ) {
          d3.select(item).attr("data-mobile-touch-expanded", null);
          return;
        }

        event.preventDefault();
        event.stopImmediatePropagation();
        d3.select(item).attr("data-mobile-touch-expanded", "true");
        expandMobileSeriesThumb(item);
      },
      true,
    );
  }

  function constrainMobileSeriesThumbs() {
    if (window.innerWidth >= 800 == true) return;

    bindMobileSeriesTouchInteraction();

    d3.selectAll(".seriesG").each(function () {
      const item = this;
      const front = d3.select(item).selectAll("img.seriesFirstImage").node();

      const badge = d3.select(item).selectAll(".seriesThumbBadge").node();
      if (front && badge) {
        const frontWidth = Number.parseFloat(front.style.width) || 0;
        const badgeWidth = badge.getBoundingClientRect().width;
        const badgeLeft = `${Math.max(2, frontWidth - badgeWidth - 2)}px`;
        if (badge.style.left !== badgeLeft)
          d3.select(badge).style("left", badgeLeft);
        if (badge.style.fontSize !== "8px")
          d3.select(badge).style("font-size", "8px");
      }

      let collapsedWidth = 0;
      d3.select(item)
        .selectAll("img.seriesThumb")
        .each(function () {
          const image = this;
          const pileIndex = +(d3.select(image).attr("data-pile-index") || 0);
          const left = pileIndex * 3;
          const width = Number.parseFloat(image.style.width) || 0;
          collapsedWidth = Math.max(collapsedWidth, left + width);
        });

      if (collapsedWidth > 0 == true) {
        const width = `${collapsedWidth}px`;
        if (item.style.width !== width) d3.select(item).style("width", width);
      }

      if (
        (d3.select(item).attr("data-mobile-touch-handlers") !== "true") ==
        true
      ) {
        d3.select(item).attr("data-mobile-touch-handlers", "true");
        d3.select(item)
          .on("mouseenter.mobileClamp", function () {
            expandMobileSeriesThumb(this);
          })
          .on("mouseleave.mobileClamp", function () {
            if (
              (d3.select(this).attr("data-mobile-touch-expanded") === "true") ==
              true
            ) {
              expandMobileSeriesThumb(this);
            }
          });
      }
    });

    ///////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////
    //////////////////Place labels in path mode
    const yearOverlay = d3.select("#yearOverlay").node();
    const overlayRect = yearOverlay?.getBoundingClientRect();
    if (yearOverlay == null || overlayRect == null) return;

    d3.select(yearOverlay)
      .selectAll("p.seriesPlaceLabel")
      .each(function () {
        const label = this;
        const mapTileIndex = d3.select(label).attr("data-map-tile-index");
        const fronts = d3
          .select(yearOverlay)
          .selectAll(
            `.seriesG[data-map-tile-index="${mapTileIndex}"] img.seriesFirstImage`,
          )
          .nodes();
        if (fronts.length == 0) return;
        const labelRect = label.getBoundingClientRect();
        const labelCenterY = labelRect.top + labelRect.height / 2;
        const front = fronts.reduce((nearest, candidate) => {
          if (nearest == null) return candidate;
          const candidateRect = candidate.getBoundingClientRect();
          const nearestRect = nearest.getBoundingClientRect();
          return Math.abs(candidateRect.top - labelCenterY) <
            Math.abs(nearestRect.top - labelCenterY)
            ? candidate
            : nearest;
        }, null);
        const imageRect = front.getBoundingClientRect();
        const labelRight = imageRect.left - 8;
        if (label.style.width) d3.select(label).style("width", null);
        const labelWidth = label.getBoundingClientRect().width;
        const left = `${labelRight - labelWidth - overlayRect.left}px`;
        if (label.style.left !== left) d3.select(label).style("left", left);
      });
  }

  //////////////////////Entfaltete Ansicht beim Scrollen und Resize aktualisieren

  d3.select(window).on(
    "scroll.expandedSeriesResponsiveLayout",
    updateExpandedSeriesResponsiveLayout,
    {
      passive: true,
    },
  );
  mapContainer.on(
    "transitionend.expandedSeriesResponsiveLayout",
    updateExpandedSeriesResponsiveLayout,
    true,
  );
  updateExpandedSeriesResponsiveLayout();

  ///////////////////////////////////////////////////////////////
  ///////////////////////////////////////////////////////////////
  //////////////////////Karten, Orte und Pfade zeichnen

  const mapDivs = mapContainer
    .selectAll(".mapDivs")
    .data(hierarchicalData.data.children)
    .join("div")
    .attr("class", "mapDivs")
    .style("position", "absolute")
    .style("width", divWidth + "px")
    .style("height", divHeight + "px")
    .style("left", (d, i) => {
      const row = Math.floor(i / columnCount);
      const columnInRow = i % columnCount;
      const col = row % 2 === 0 ? columnInRow : columnCount - 1 - columnInRow;
      return col * (divWidth + divMargin) + "px";
    })
    .style("top", (d, i) => {
      const row = Math.floor(i / columnCount);
      return row * (divHeight + 2.5 * divMargin) + "px";
    });

  //open a country from its tile
  mapDivs.on("click", function (event, d) {
    if (window.arranged == true) return; // only start the flow from grid

    const idx = Number.isFinite(d?.index) ? d.index : null;
    const mapTileIndex =
      idx != null ? idx : d3.selectAll(".mapDivs").nodes().indexOf(this);
    if (Number.isFinite(mapTileIndex) == false || mapTileIndex < 0) return;

    focusMapTileFlowByIndex(mapTileIndex);
  });

  mapDivs
    .append("svg")
    .attr("class", "mapTileSpacer")
    .style("width", divWidth + "px")
    .style("height", divHeight + "px");

  //map scale label (approx. diameter in km) --- note: this measures the *visible map extent* (diameter of the circular crop) using projection.invert() on left/right points of the circle.
  function haversineKm(lon1, lat1, lon2, lat2) {
    const R = 6371; // Earth radius in km
    const toRad = (deg) => (deg * Math.PI) / 180;

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  function roundKm(km) {
    if (Number.isFinite(km) == false || km <= 0) return null;
    if (km >= 100 == true) return Math.round(km / 10) * 10;
    return Math.round(km);
  }

  function scopeClassFromKm(km) {
    if (Number.isFinite(km) == false || km <= 0) return "continental";
    if (km < 25 == true) return "local";
    if (km < 1000 == true) return "regional";
    return "continental";
  }

  function scopeIconSvg(scope) {
    const stroke = "rgba(255,255,255,0.9)";
    const fill = "rgba(255,255,255,0.9)";

    const outerFill = scope === "continental" ? fill : "none";
    const middleFill = scope === "regional" ? fill : "none";
    const innerFill = scope === "local" ? fill : "none";

    return `
    <svg viewBox="0 0 18 18" width="12" height="12" aria-hidden="true">
      <circle cx="9" cy="9" r="7" fill="${outerFill}" stroke="${stroke}" stroke-width="1" />
      <circle cx="9" cy="9" r="4.7" fill="${middleFill}" stroke="${stroke}" stroke-width="1" />
      <circle cx="9" cy="9" r="2.4" fill="${innerFill}" stroke="${stroke}" stroke-width="1" />
    </svg>
  `;
  }

  const titlePs = d3
    .selectAll(".mapDivs")
    .append("p")
    .attr("class", "mapTitle");

  //open the selected country from its label
  titlePs.on("click", function (event) {
    event.stopPropagation();

    if (window.arranged == false) {
      focusMapTileFlowByIndex(
        d3.selectAll(".mapDivs").nodes().indexOf(this.parentNode),
      );
    }
  });

  //country label
  titlePs
    .append("span")
    .attr("class", "mapTitleCountry")
    .text(function (d) {
      return d && typeof d.countryLabel === "string" ? d.countryLabel : "";
    });

  //year label
  titlePs
    .append("span")
    .attr("class", "mapTitleYear")
    .text(function (d) {
      return d.yearLabel;
    });

  titlePs
    .append("span")
    .attr("class", "mapTitleScopeIcon")
    .html(scopeIconSvg("continental"));

  //photo count button
  titlePs
    .append("span")
    .attr("class", "mapTitleCount")
    .attr("aria-label", function (d) {
      const n = d.itemCount;
      return `${n.toLocaleString("en-US")} photos`;
    })
    .html(function (d) {
      const n = d.itemCount;
      return `
      <span class="countNum">${n.toLocaleString("en-US")} ${n === 1 ? "Photo" : "Photos"}</span>
      <span class="svgIcon countArrow"><svg aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" fill="currentColor"><path d="M360-200v-80h264L160-744l56-56 464 464v-264h80v400H360Z"/></svg></span>
    `;
    });

  let mapSVGs = mapDivs
    .append("svg")
    .attr("class", "mapSVGs")
    .attr("width", divWidth)
    .attr("height", divHeight)
    .style("width", divWidth + "px")
    .style("height", divHeight + "px");

  const landFeature =
    landTopo && landTopo.objects && landTopo.objects.land
      ? topojson.feature(landTopo, landTopo.objects.land)
      : null;

  mapSVGs.each(function (d, i) {
    const svgMap = d3.select(this);

    //keep map coordinates independent of the displayed tile size
    const width = tileViewBoxSize;
    const height = tileViewBoxSize;

    //tile size on screen
    const displayW = divWidth;
    const displayH = divHeight;

    //mapTile size scaling (grid + path), based on amount of images follower
    const baseScale = mapTileScaleByItems(d.itemCount || 1);
    const invScale = 1 / (baseScale || 1);

    svgMap.attr("data-base-scale", baseScale);

    svgMap
      .attr("width", displayW)
      .attr("height", displayH)
      .style("width", displayW + "px")
      .style("height", displayH + "px");

    //map viewBox
    const vbW = width / baseScale;
    const vbH = height / baseScale;
    const vbX = (width - vbW) / 2;
    const vbY = (height - vbH) / 2;

    svgMap
      .attr("viewBox", `${vbX} ${vbY} ${vbW} ${vbH}`)
      .attr("preserveAspectRatio", "xMidYMid meet");

    const fullMapG = svgMap
      .append("g")
      .classed("fullMapG", true)
      .style("opacity", 1);
    const mapG = fullMapG
      .append("g")
      .classed("mapG", true)
      .style("opacity", 1)
      .style("pointer-events", "none");
    const mapMarkersG = fullMapG
      .append("g")
      .classed("mapMarkersG", true)
      .style("opacity", 1);

    const projection = d3.geoTransverseMercator();
    const geoPath = d3.geoPath(projection);

    const nodePlaces = (d.places || []).filter(function (d, i) {
      return Number.isFinite(d.lon) && Number.isFinite(d.lat);
    });

    let avgLon = null,
      avgLat = null;
    if (nodePlaces.length > 0 == true) {
      avgLon = d3.mean(nodePlaces, (p) => p.lon);
      avgLat = d3.mean(nodePlaces, (p) => p.lat);
    }

    const mapPadding = 50;
    const singleSpanDeg = 0.6;

    function singlePointCloud(lon, lat, spanDeg) {
      const latRad = (lat * Math.PI) / 180;
      const lonSpan = spanDeg / Math.max(0.2, Math.cos(latRad));
      const dLat = spanDeg;
      const dLon = lonSpan;

      return {
        type: "MultiPoint",
        coordinates: [
          [lon, lat],
          [lon + dLon, lat],
          [lon - dLon, lat],
          [lon, lat + dLat],
          [lon, lat - dLat],
          [lon + dLon, lat + dLat],
          [lon + dLon, lat - dLat],
          [lon - dLon, lat + dLat],
          [lon - dLon, lat - dLat],
        ],
      };
    }

    let rotateDeg = 0;

    if (nodePlaces.length > 1 == true) {
      const mp = {
        type: "MultiPoint",
        coordinates: nodePlaces.map((p) => [p.lon, p.lat]),
      };

      projection
        .rotate([-avgLon, -avgLat, 0])
        .scale(1)
        .translate([0, 0])
        .fitExtent(
          [
            [mapPadding, mapPadding],
            [width - mapPadding, height - mapPadding],
          ],
          mp,
        );
    } else if (nodePlaces.length === 1) {
      const { lon, lat } = nodePlaces[0];

      const mp = singlePointCloud(lon, lat, singleSpanDeg);

      projection
        .rotate([-lon, -lat, 0])
        .scale(1)
        .translate([0, 0])
        .fitExtent(
          [
            [mapPadding, mapPadding],
            [width - mapPadding, height - mapPadding],
          ],
          mp,
        );
    } else {
      projection
        .scale(1)
        .translate([0, 0])
        .fitExtent(
          [
            [mapPadding, mapPadding],
            [width - mapPadding, height - mapPadding],
          ],
          landFeature,
        );
    }

    const tileIndex = Number.isFinite(d?.originalIndex) ? d.originalIndex : i;
    mapG
      .append("image")
      .attr("class", "tileBgImg")
      .attr(
        "href",
        `map-tiles/${granularity}/${String(tileIndex).padStart(4, "0")}.webp`,
      )
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", width)
      .attr("height", height)
      .attr("opacity", 0.75)
      .attr("preserveAspectRatio", "none");

    // Slideshow overlay images
    const slideshowImg = mapG
      .append("image")
      .attr("class", "tileSlideshowImg")
      .attr("href", "")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", width)
      .attr("height", height)
      .attr("opacity", 0)
      .attr("preserveAspectRatio", "xMidYMid slice");

    function getTileThumbs() {
      const keywordLower = activeKeyword ? activeKeyword.toLowerCase() : null;
      return missionThumbUrls(d, keywordLower);
    }

    let slideshowTimer = null;

    function startTileSlideshow() {
      // only in grid view
      if (window.arranged == true) return;

      const tileThumbs = getTileThumbs();
      if (tileThumbs.length == 0) {
        slideshowImg.interrupt().attr("opacity", 0).attr("href", "");
        return;
      }
      if (slideshowTimer) return;

      const firstUrl = pickRandom(tileThumbs);
      if (firstUrl) slideshowImg.attr("href", firstUrl);

      slideshowImg.interrupt().transition().duration(320).attr("opacity", 0.95);

      slideshowTimer = window.setInterval(() => {
        const currentThumbs = getTileThumbs();
        const u = pickRandom(currentThumbs);
        if (u == null || u == "") return;
        slideshowImg.attr("href", u);
      }, 1200);
    }

    function stopTileSlideshow() {
      if (slideshowTimer) {
        window.clearInterval(slideshowTimer);
        slideshowTimer = null;
      }

      if (window.gridLayoutMode === "images" && window.arranged == false) {
        const currentThumbs = getTileThumbs();
        const keepUrl =
          slideshowImg.attr("href") || pickRandom(currentThumbs) || "";

        if (keepUrl) {
          slideshowImg.attr("href", keepUrl);
          slideshowImg.interrupt().attr("opacity", 0.95);
        } else {
          slideshowImg.interrupt().attr("opacity", 0).attr("href", "");
        }
        return;
      }

      slideshowImg
        .interrupt()
        .transition()
        .duration(420)
        .attr("opacity", 0)
        .on("end", () => slideshowImg.attr("href", ""));
    }

    // Hover listeners on the tile SVG (mapG has pointer-events:none)
    svgMap
      .on("mouseenter", () => {
        if (window.arranged == true) {
          stopTileSlideshow();
          return;
        }
        startTileSlideshow();
      })
      .on("mouseleave", () => {
        stopTileSlideshow();
      });

    const defsSel = svgMap.select("defs").empty()
      ? svgMap.append("defs")
      : svgMap.select("defs");

    const clipId = `mapCircleClip_${i}`;

    defsSel
      .append("clipPath")
      .attr("id", clipId)
      .append("circle")
      .attr("cx", width / 2)
      .attr("cy", height / 2)
      .attr("r", width / 2);

    mapG.attr("clip-path", `url(#${clipId})`);

    //compute and render map scale label inside the circle (5 o'clock arc) --- note: this measures the *visible map extent* (diameter of the circular crop) using projection.invert() on left/right points of the circle.
    {
      const cx = width / 2;
      const cy = height / 2;

      //measure just inside the map edge
      const clipR = Math.min(width, height) / 2;
      const rMeasure = Math.max(5, clipR - mapPadding);

      //convert circle edges to coordinates
      const a = projection.invert([cx - rMeasure, cy]);
      const b = projection.invert([cx + rMeasure, cy]);

      let diameterKm = null;
      if (a && b && a.length === 2 && b.length === 2) {
        diameterKm = haversineKm(a[0], a[1], b[0], b[1]);
      }

      const rounded = roundKm(diameterKm);

      //replace the previous scale label
      svgMap.select(`#scaleArc_${i}`).remove();
      svgMap.select(`#scaleText_${i}`).remove();

      const scopeClass = scopeClassFromKm(diameterKm);
      d.scopeClass = scopeClass;
      d3.select(mapDivs.nodes()[i])
        .select(".mapTitleScopeIcon")
        .html(scopeIconSvg(scopeClass));
      if (rounded == null || rounded == 0) return;

      const labelText = `⌀ ≈ ${rounded} km`;

      //place the scale label along the lower-right arc
      const arcRadius = Math.max(5, clipR - 3);

      //arc angles
      const startAngle = (85 * Math.PI) / 180;
      const endAngle = (35 * Math.PI) / 180;

      const x0 = cx + arcRadius * Math.cos(startAngle);
      const y0 = cy + arcRadius * Math.sin(startAngle);
      const x1 = cx + arcRadius * Math.cos(endAngle);
      const y1 = cy + arcRadius * Math.sin(endAngle);

      //draw the short arc counterclockwise
      const arcPath = `M ${x0} ${y0} A ${arcRadius} ${arcRadius} 0 0 0 ${x1} ${y1}`;

      svgMap
        .append("path")
        .attr("id", `scaleArc_${i}`)
        .classed("scaleArc", true)
        .attr("d", arcPath)
        .attr("fill", "none")
        .style("pointer-events", "none");

      //keep the label size constant when scaling the map
      const scaleLabelPx = 9; // target screen px (constant)

      svgMap
        .append("text")
        .attr("id", `scaleText_${i}`)
        .classed("scaleText", true)
        .attr("fill", "#ccc")
        .style("font-family", "sans-serif")
        .style("font-size", scaleLabelPx * invScale + "px")
        .style("letter-spacing", "0.25px")
        .style("pointer-events", "none")
        // small nudge so it sits slightly inside the arc
        .attr("dy", "-2")
        .append("textPath")
        .attr("href", `#scaleArc_${i}`)
        .attr("startOffset", "50%")
        .attr("text-anchor", "middle")
        .text(labelText);
    }

    let zoomMult = 1;
    {
      const pts = (d.places || []).filter(function (d, i) {
        return Number.isFinite(d.lon) && Number.isFinite(d.lat);
      });
      if (pts.length >= 2 == true) {
        const lons = pts.map((p) => p.lon);
        const lats = pts.map((p) => p.lat);
        const spanLon = d3.max(lons) - d3.min(lons);
        const spanLat = d3.max(lats) - d3.min(lats);
        const spanDeg = Math.max(spanLon, spanLat);
        const raw = Math.pow(60 / Math.max(spanDeg, 1e-6), 0.5);
        zoomMult = Math.max(1, Math.min(3, raw));
      } else if (pts.length === 1) {
        zoomMult = 2.2;
      }
    }

    const lineCoords = (d.places || [])
      .filter(function (d, i) {
        return Number.isFinite(d.lon) && Number.isFinite(d.lat);
      })
      .map((p) => projection([p.lon, p.lat]))
      .filter(function (d, i) {
        return Boolean(d);
      });

    if (lineCoords.length >= 2 == true) {
      const [x0, y0] = lineCoords[0];
      const [x1, y1] = lineCoords[lineCoords.length - 1];
      const dx2 = x1 - x0;
      const dy2 = y1 - y0;
      const rotateDegLocal = (Math.atan2(dx2, dy2) * 180) / Math.PI; //Richtung vom ersten zum letzten Ort; Winkel von Bogenmaß in Grad umrechnen
      rotateDeg = rotateDegLocal;

      const gid = `pathGrad_${i}`;
      const defsSel2 = svgMap.select("defs").empty()
        ? svgMap.append("defs")
        : svgMap.select("defs");
      const grad = defsSel2
        .append("linearGradient")
        .attr("id", gid)
        .attr("gradientUnits", "userSpaceOnUse")
        .attr("x1", x0)
        .attr("y1", y0)
        .attr("x2", x1)
        .attr("y2", y1);

      grad
        .append("stop")
        .attr("offset", "0%")
        .attr("stop-color", "var(--highlightColor)");
      grad.append("stop").attr("offset", "100%").attr("stop-color", "#ffffff");

      const itemCount = d.itemCount || 1;
      const strokeW = strokeByItems(itemCount);

      const pathD = lineGen(lineCoords); //D3 macht aus den projizierten Orten den geschwungenen Länderpfad

      const routeBase = mapMarkersG
        .append("path")
        .attr("class", "routePath routePathBase")
        .attr("d", pathD)
        .attr("data-orig-d", pathD) // Original-Pfad speichern
        .attr("fill", "none")
        .attr("stroke", `url(#${gid})`)
        .attr("data-grad-id", gid)
        .attr("stroke-width", strokeW)
        .attr("vector-effect", "non-scaling-stroke")
        .attr("stroke-linecap", "round")
        .attr("stroke-linejoin", "round")
        .attr("opacity", 0.95);

      const routeProgress = mapMarkersG
        .append("path")
        .attr("class", "routePath routePathProgress")
        .attr("d", pathD)
        .attr("fill", "none")
        .attr("stroke", "var(--highlightColor)")
        .attr("stroke-width", strokeW + 0.5)
        .attr("vector-effect", "non-scaling-stroke")
        .attr("stroke-linecap", "round")
        .attr("stroke-linejoin", "round")
        .attr("opacity", 0.0)
        .style("pointer-events", "none");

      const nodePath = routeProgress.node();
      if (nodePath) {
        const L = nodePath.getTotalLength();
        routeProgress
          .attr("data-total-length", L)
          .attr("data-orig-total-length", L) // Originallänge speichern
          .style("stroke-dasharray", `${L} ${L}`)
          .style("stroke-dashoffset", L)
          .style("opacity", 1);
      }

      routeBase.on("click", function (event, datum) {
        if (window.arranged == false) return;
        missionPathSeriesTransform.call(this, event, datum, i);
      });
    }

    d.rotateDeg = rotateDeg;

    const circleSizeScale = d3.scaleLinear().domain([1, 1000]).range([3, 6]);

    mapMarkersG
      .selectAll(".place")
      .data((d) => d.places || [])
      .join("circle")
      .attr("class", "place")
      .attr("cx", (d) => (projection([d.lon, d.lat]) || [NaN, NaN])[0])
      .attr("cy", (d) => (projection([d.lon, d.lat]) || [NaN, NaN])[1])
      .attr("fill", (p) => "var(--highlightColor)")
      .attr("stroke", "#171717")
      .attr("r", function (d) {
        return circleSizeScale(d.count) * invScale;
      })
      .attr("stroke-width", 0.5 * invScale)
      .attr("vector-effect", "non-scaling-stroke")
      .style("opacity", 0.7)
      .style("cursor", "pointer")
      .on("click", function (event) {
        if (window.arranged == false) return;
        event.stopPropagation();

        const mapTileDiv = this.closest(".mapDivs.in-path");
        if (mapTileDiv == null) return;
        const routeNode = d3
          .select(mapTileDiv)
          .selectAll("path.routePathBase")
          .node();
        const missionDatum = d3.select(mapTileDiv).datum();
        const mapTileIndex = d3
          .selectAll(".mapDivs.in-path")
          .nodes()
          .indexOf(mapTileDiv);

        if (routeNode && missionDatum && mapTileIndex >= 0) {
          missionPathSeriesTransform.call(
            routeNode,
            event,
            missionDatum,
            mapTileIndex,
          );
        }
      })
      .on("mouseover", function (event, p) {
        if (window.arranged == true) {
          d3.select(this.parentNode.parentNode)
            .select(".mapG")
            .transition()
            .duration(800)
            .style("opacity", 1);

          d3.select("#globalPathFollower")
            .transition()
            .duration(800)
            .style("opacity", 0);
        }

        const i = (d.places || []).indexOf(p);
        tooltip
          .style("opacity", 1)
          .html(
            `<span class="tooltipHeading">${d.countryLabel} ${d.yearLabel} – Stay ${i + 1}</span><br><strong>${p.place_short || p.name}</strong>`,
          );
      })
      .on("mousemove", function (event) {
        tooltip
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY - 20 + "px");
      })
      .on("mouseout", function () {
        if (window.arranged == true) {
          d3.select(this.parentNode.parentNode)
            .select(".mapG")
            .transition()
            .duration(800)
            .style("opacity", 0);

          d3.select("#globalPathFollower")
            .transition()
            .duration(800)
            .style("opacity", 1);
        }

        tooltip.style("opacity", 0);
      });
  });

  // apply initial grid layout mode after all tiles exist
  if (window.arranged == false) {
    applyGridLayoutMode(backgroundParameter);
  }

  ///////////////////////////////////////////////////////////////
  ///////////////////////////////////////////////////////////////
  //////////////////////Image and keyword stream and globe

  const imageKeywordStream = createImageKeywordStream({
    d3,
    pathX: pageWidth / 3,
    onKeywordSelected: async (keyword) => {
      await applyKeywordFilter(keyword);
      d3.select("#keywordPanelSearch").property("value", keyword);
      filterActive = false;
      d3.select("#filterButton").html(journeyIcons.filter_alt);
      d3.select("#keywordPanel").style("display", "none");
    },
  });

  const globeFollower = createGlobeFollower({
    d3,
    landFeature,
    places,
    pageHeight,
    onPlaceChanged: (place) => {
      const keyword = activeKeyword ? activeKeyword.toLowerCase() : null;
      window.currentFollowerKeywords = imageKeywordStream.getKeywords(
        place,
        keyword,
      );
    },
  });

  ///////////////////////////////////////////////////////////////
  ///////////////////////////////////////////////////////////////
  //////////////////////Button event to change between grid and path
  d3.select("#arrangeButton").on("click", async () => {
    const s = d3.select("#layoutSlider").node();
    if (s == null) return;

    const tStart = parseFloat(d3.select(s).property("value")) || 0;
    const tTarget = tStart > 0.5 ? 0 : 1;

    const duration = 900;
    const t0 = performance.now();

    function ease(u) {
      return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
    }

    await new Promise((resolve) => {
      function step(now) {
        const u = Math.min(1, (now - t0) / duration);
        const t = tStart + (tTarget - tStart) * ease(u);

        d3.select(s).property("value", t);
        if (window.setLayoutT) window.setLayoutT(t);

        if (u < 1 == true) {
          requestAnimationFrame(step);
        } else {
          resolve();
        }
      }
      requestAnimationFrame(step);
    });

    if (tTarget === 1 && window.arranged == false) {
      await new Promise(requestAnimationFrame);
      transformView();
    } else if (tTarget === 0 && window.arranged) {
      missionPathSeriesTransform.closeAllSeriesViews({
        skipBackgroundUpdate: true,
      });
      await waitMs(495);
      await new Promise(requestAnimationFrame);
      transformView();
    }

    d3.select("#arrangeButton").html(
      tTarget === 1 ? journeyIcons.grid_view : journeyIcons.conversion_path,
    );
  });

  window.mapScrollObserverCleanup = null;

  ///////////////////////////////////////////////////////////////
  ///////////////////////////////////////////////////////////////
  //////////////////////Update path/globe via scroll observer (it checks if a map passes an invisible line as a trigger)

  function initMapScrollObserver() {
    let activeMapTileIndex = -1;
    window.followerActiveMapTileIndex = -1;

    const overlaySvgSel = d3.select("#mapConnectorOverlay");

    let followerSvgSel = d3.select("#mapFollowerOverlay");
    if (followerSvgSel.empty() == true) {
      const containerEl = d3.select("#mapContainer").node();
      followerSvgSel = d3
        .select("#mapFollowerLayer")
        .append("svg")
        .attr("id", "mapFollowerOverlay")
        .style("position", "absolute")
        .style("top", "0px")
        .style("left", "0px")
        .style("width", window.innerWidth + "px")
        .style("pointer-events", "none")
        .style("z-index", 5)
        .attr(
          "height",
          containerEl ? containerEl.scrollHeight : window.innerHeight,
        );
    }

    const keywordLowercase = activeKeyword ? activeKeyword.toLowerCase() : null;

    const mapTiles = d3
      .selectAll(".mapDivs.in-path")
      .nodes()
      .map((div, index) => {
        const svg = d3.select(div).selectAll("svg.mapSVGs").node();
        let progressPath = null;
        let totalLength = 0;
        let placesForMapTile = [];

        if (svg) {
          progressPath = d3
            .select(svg)
            .selectAll("g.mapMarkersG path.routePathProgress")
            .node();
          if (progressPath) {
            const stored = Number(
              d3.select(progressPath).attr("data-total-length"),
            );
            if (Number.isFinite(stored) && stored > 0) {
              totalLength = stored;
            } else {
              try {
                totalLength = progressPath.getTotalLength();
              } catch (e) {
                totalLength = 0;
              }
            }
            d3.select(progressPath).style(
              "stroke-dasharray",
              `${totalLength} ${totalLength}`,
            );
            d3.select(progressPath).style("stroke-dashoffset", totalLength);
          }

          const placeEls = d3
            .select(svg)
            .selectAll("g.mapMarkersG circle.place")
            .nodes();
          placesForMapTile = Array.from(placeEls).map((el) =>
            d3.select(el).datum(),
          );
        }

        if (keywordLowercase) {
          placesForMapTile = placesForMapTile.filter(function (d, i) {
            return nodeHasKeyword(d, keywordLowercase);
          });
        }

        return {
          div,
          svg,
          index,
          progressPath,
          totalLength,
          places: placesForMapTile,
          lastSpawnedPlaceIndex: -1,
        };
      });

    const connectors = d3
      .selectAll("svg#mapConnectorOverlay path.connLineProgress")
      .nodes()
      .map((el) => {
        const type = d3.select(el).attr("data-connector-type") || "between";
        const upperIndex = +d3.select(el).attr("data-upper-index");
        const lowerIndex = +d3.select(el).attr("data-lower-index");
        const totalLength =
          Number(d3.select(el).attr("data-total-length")) ||
          el.getTotalLength();

        d3.select(el).style(
          "stroke-dasharray",
          `${totalLength} ${totalLength}`,
        );
        d3.select(el).style("stroke-dashoffset", totalLength);

        return {
          el,
          type,
          upperIndex,
          lowerIndex,
          totalLength,
          currF: 0,
        };
      });

    let globalFollowerG = followerSvgSel.select("#globalPathFollower");
    if (globalFollowerG.empty() == true) {
      globalFollowerG = followerSvgSel
        .append("g")
        .attr("id", "globalPathFollower");

      globeFollower.init(globalFollowerG);
    }

    globalFollowerG.style("cursor", "pointer").on("click", function (event) {
      event.stopPropagation();

      const idx =
        typeof window.followerActiveMapTileIndex === "number"
          ? window.followerActiveMapTileIndex
          : -1;
      if (idx < 0 == true) return;

      const mapTileInfo = mapTiles[idx];
      if (mapTileInfo == null || mapTileInfo.div == null) return;

      const mapTileDiv = mapTileInfo.div;
      let routeSel = d3.select(mapTileDiv).select("path.routePathBase");

      if (routeSel.empty() == true) {
        const svgSel = d3.select(mapTileDiv).select("svg.mapSVGs");
        const markersG = svgSel.select("g.mapMarkersG");
        if (markersG.empty() == true) return;

        const coords = [];
        markersG.selectAll("circle.place").each(function () {
          const c = d3.select(this);
          const cx = +c.attr("cx");
          const cy = +c.attr("cy");
          if (Number.isFinite(cx) && Number.isFinite(cy)) {
            coords.push([cx, cy]);
          }
        });

        if (coords.length == 0) return;

        if (coords.length === 1) {
          const [cx, cy] = coords[0];
          coords.splice(0, 1, [cx, cy - 1], [cx, cy + 1]);
        }

        const missionDatum = d3.select(mapTileDiv).datum();
        const itemCount = (missionDatum && missionDatum.itemCount) || 1;
        const strokeW = strokeByItems(itemCount);

        routeSel = markersG
          .append("path")
          .attr("class", "routePath routePathBase")
          .attr("d", lineGen(coords))
          .attr("fill", "none")
          .attr("stroke", "#ffffff")
          .attr("stroke-width", strokeW)
          .attr("stroke-linecap", "round")
          .attr("stroke-linejoin", "round")
          .attr("opacity", 0.95)
          .datum(missionDatum);

        const progSel = markersG
          .append("path")
          .attr("class", "routePath routePathProgress")
          .attr("d", lineGen(coords))
          .attr("fill", "none")
          .attr("stroke", "var(--highlightColor)")
          .attr("stroke-width", strokeW + 0.5)
          .attr("stroke-linecap", "round")
          .attr("stroke-linejoin", "round")
          .style("pointer-events", "none");

        const nodePath = progSel.node();
        if (nodePath) {
          const L = nodePath.getTotalLength();
          progSel
            .attr("data-total-length", L)
            .style("stroke-dasharray", `${L} ${L}`)
            .style("stroke-dashoffset", L)
            .style("opacity", 1);
        }

        routeSel.on("click", function (ev) {
          missionPathSeriesTransform.call(this, ev, missionDatum, idx);
        });
      }

      const routeNode = routeSel.node();
      const routeDatum = routeSel.datum();
      if (routeNode && routeDatum) {
        missionPathSeriesTransform.call(routeNode, event, routeDatum, idx);
      }
    });

    const globalSegments = [];

    connectors
      .filter(function (d, i) {
        return d.type === "top" && d.totalLength > 0;
      })
      .forEach((c) => {
        globalSegments.push({ kind: "connector", conn: c });
      });

    mapTiles.forEach((mapTile, idx) => {
      if (mapTile.progressPath && mapTile.totalLength > 0) {
        globalSegments.push({ kind: "mapTile", mapTile });
      }

      const afterConn = connectors.find(
        (c) =>
          c.type === "between" && c.upperIndex === idx && c.totalLength > 0,
      );
      if (afterConn) {
        globalSegments.push({ kind: "connector", conn: afterConn });
      }
    });

    const state = new WeakMap();

    const getCenterLineY = () => window.innerHeight * 0.6;

    function computeState(mapTile) {
      const targetEl = mapTile.svg || mapTile.div;
      const rect = targetEl.getBoundingClientRect();
      const lineY = getCenterLineY();

      const top = rect.top;
      const bottom = rect.bottom;
      const height = rect.height || 1;

      const centerInside = top <= lineY && bottom >= lineY;

      let scrollProgress;
      if (lineY <= top == true) {
        scrollProgress = 0;
      } else if (lineY >= bottom == true) {
        scrollProgress = 1;
      } else {
        scrollProgress = (lineY - top) / height;
      }
      scrollProgress = Math.max(0, Math.min(1, scrollProgress));

      const direction = top + height / 2 < lineY ? "up" : "down";

      return { rect, centerInside, scrollProgress, direction };
    }

    let ticking = false;

    function update() {
      const lineY = getCenterLineY();

      let currentActiveIndex = -1;

      const mapTileStates = mapTiles.map((mapTile, idx) => {
        const targetEl = mapTile.svg || mapTile.div;
        const prev = state.get(targetEl) || {
          centerInside: false,
          scrollProgress: 0,
        };

        const scrollState = computeState(mapTile);

        if (mapTile.progressPath && mapTile.totalLength) {
          let f = scrollState.scrollProgress;
          f = Math.max(0, Math.min(1, f));

          const L = mapTile.totalLength;
          const progressPath = d3.select(mapTile.progressPath);
          let dashLength = L;

          //non-scaling-stroke
          //die Pfadlänge aus dem SVG deshalb mit dessen Skalierung umrechnen
          if (progressPath.attr("vector-effect") === "non-scaling-stroke") {
            const pathTransform = mapTile.progressPath.getScreenCTM();
            const pathScale = Math.hypot(pathTransform.a, pathTransform.b);
            dashLength = L * pathScale;
          }

          progressPath
            .style(
              "stroke-dasharray",
              f === 1 ? "none" : `${dashLength} ${dashLength}`,
            )
            .style("stroke-dashoffset", dashLength * (1 - f));
          mapTile.currF = f;
        } else {
          mapTile.currF = 0;
        }

        if (scrollState.centerInside && currentActiveIndex === -1) {
          currentActiveIndex = idx;
        }

        state.set(targetEl, scrollState);

        const svgRect = (mapTile.svg || mapTile.div).getBoundingClientRect();
        return { mapTile, scrollState, svgRect };
      });

      connectors.forEach((conn) => {
        let yStart, yEnd;

        if (conn.type === "between") {
          const upper = mapTileStates[conn.upperIndex];
          const lower = mapTileStates[conn.lowerIndex];
          if (upper == null || lower == null) return;

          yStart = upper.svgRect.bottom;
          yEnd = lower.svgRect.top;
        } else if (conn.type === "top") {
          const lower = mapTileStates[conn.lowerIndex];
          if (lower == null) return;
          yStart = 0;
          yEnd = lower.svgRect.top;
        } else {
          return;
        }

        let fc;
        if (yEnd <= yStart == true) {
          fc = 1;
        } else if (lineY <= yStart == true) {
          fc = 0;
        } else if (lineY >= yEnd == true) {
          fc = 1;
        } else {
          fc = (lineY - yStart) / (yEnd - yStart);
        }
        fc = Math.max(0, Math.min(1, fc));

        const Lc = conn.totalLength;
        const drawLenC = Lc * fc;
        const offsetC = Lc - drawLenC;

        d3.select(conn.el).style("stroke-dashoffset", offsetC);
        conn.currF = fc;
      });

      const scrollY = window.scrollY || window.pageYOffset || 0;
      const prevScrollY = window.lastScrollY || scrollY;
      const dir = scrollY >= prevScrollY ? 1 : -1;

      window.lastScrollY = scrollY;
      window.scrollDir = dir;

      const mapTileAtScrollLine =
        currentActiveIndex !== -1 ? mapTileStates[currentActiveIndex] : null;

      imageKeywordStream.updateFromMapTile(
        mapTileAtScrollLine,
        scrollY,
        dir,
        activeKeyword,
      );
      imageKeywordStream.updatePositions(scrollY);

      if (mapTileAtScrollLine) {
        globeFollower.updateFromMapTile(
          mapTileAtScrollLine.mapTile,
          mapTileAtScrollLine.scrollState.scrollProgress,
        );
      }

      updateGlobalFollower();

      if (window.arranged == true) {
        if (currentActiveIndex <= 0 == true) {
          updateJourneyHint("bottom");
        } else {
          updateJourneyHint("both");
        }
      } else {
        updateJourneyHint(null);
      }

      if (
        currentActiveIndex !== -1 &&
        currentActiveIndex !== activeMapTileIndex
      ) {
        activeMapTileIndex = currentActiveIndex;
        window.followerActiveMapTileIndex = currentActiveIndex;

        const mapTileDiv = mapTileStates[activeMapTileIndex].mapTile.div;
        const missionDatum = d3.select(mapTileDiv).datum();
        const missionYear = missionDatum && missionDatum.year;

        if (Number.isFinite(missionYear) == true) {
          timeline?.updateYear(missionYear);
        }

        // Hash auf aktuelle Mission setzen: #path:Country_Year
        if (missionDatum) {
          const missionKey = missionKeyFromDatum(missionDatum);
          if (missionKey) {
            const newHash = `#path:${encodeURIComponent(missionKey)}`;
            if (window.location.hash !== newHash) {
              try {
                history.replaceState(null, "", newHash);
              } catch (e) {
                window.location.hash = newHash;
              }
            }
          }
        }
      }

      ticking = false;
    }

    function updateGlobalFollower() {
      if (globalFollowerG == null || globalSegments.length == 0) return;

      const overlayNode = overlaySvgSel.node();
      const followerNode = followerSvgSel.node();
      if (overlayNode == null || followerNode == null) return;

      const overlayRect = overlayNode.getBoundingClientRect();
      const followerRect = followerNode.getBoundingClientRect();

      const radiusPx = globeFollower.getRadius();
      const maxDiam = (2 / 3) * window.innerHeight;
      const followerTooBig = 2 * radiusPx > maxDiam;

      if (followerTooBig) {
        const centerXv = window.innerWidth / 3;
        const centerYv = window.innerHeight / 2;

        const x = centerXv - followerRect.left;
        const y = centerYv - followerRect.top;

        globalFollowerG.attr("data-x", x).attr("data-y", y);

        globeFollower.updateTransform(globalFollowerG);
        return;
      }

      let totalDrawn = 0;

      globalSegments.forEach((seg) => {
        let L = 0;
        let f = 0;

        if (seg.kind === "mapTile") {
          L = seg.mapTile.totalLength || 0;
          f = seg.mapTile.currF ?? 0;
        } else {
          L = seg.conn.totalLength || 0;
          f = seg.conn.currF ?? 0;
        }

        totalDrawn += L * Math.max(0, Math.min(1, f));
      });

      let remaining = totalDrawn;

      for (const seg of globalSegments) {
        let L = 0;
        let pathEl;

        if (seg.kind === "mapTile") {
          L = seg.mapTile.totalLength || 0;
          pathEl = seg.mapTile.progressPath;
        } else {
          L = seg.conn.totalLength || 0;
          pathEl = seg.conn.el;
        }

        if (pathEl == null || L <= 0) continue;

        if (remaining > L == true) {
          remaining -= L;
          continue;
        }

        const pt = pathEl.getPointAtLength(remaining);

        let vx, vy;

        if (seg.kind === "mapTile") {
          const svgNode = seg.mapTile.svg;
          if (svgNode == null) break;

          const svgSel = d3.select(svgNode);
          const svgRect = svgNode.getBoundingClientRect();

          const viewW =
            (svgNode.viewBox &&
              svgNode.viewBox.baseVal &&
              svgNode.viewBox.baseVal.width) ||
            +svgSel.attr("width") ||
            svgRect.width;

          const viewH =
            (svgNode.viewBox &&
              svgNode.viewBox.baseVal &&
              svgNode.viewBox.baseVal.height) ||
            +svgSel.attr("height") ||
            svgRect.height;

          const scaleX = svgRect.width / viewW;
          const scaleY = svgRect.height / viewH;

          vx = svgRect.left + pt.x * scaleX;
          vy = svgRect.top + pt.y * scaleY;
        } else {
          vx = overlayRect.left + pt.x;
          vy = overlayRect.top + pt.y;
        }

        const x = vx - followerRect.left;
        const y = vy - followerRect.top;

        globalFollowerG.attr("data-x", x).attr("data-y", y);

        globeFollower.updateTransform(globalFollowerG);
        break;
      }
    }

    function updateGlobeOnScroll() {
      globeFollower.resizeForViewport(globalFollowerG);

      if (ticking == false) {
        ticking = true;
        requestAnimationFrame(update);
      }
    }

    d3.select(window).on("scroll.updateGlobeOnScroll", updateGlobeOnScroll);

    update();

    window.mapScrollObserverCleanup = () => {
      d3.select(window).on("scroll.updateGlobeOnScroll", null);

      window.mapScrollObserverCleanup = null;
    };
  }

  //////////////////////Jump to selected year in timeline

  function scrollToYear(year) {
    const tiles = d3.selectAll(".mapDivs").nodes();

    let tileClosestToSelectedYear = null;
    let smallestYearDifference = Infinity; //kleinster bisher gefundener Abstand zum ausgewählten Jahr; anfangs noch unbegrenzt

    tiles.forEach((tile) => {
      const d = d3.select(tile).datum();
      const missionYear = d.year;

      const yearDifference = Math.abs(missionYear - year);
      if (yearDifference < smallestYearDifference == true) {
        smallestYearDifference = yearDifference;
        tileClosestToSelectedYear = tile;
      }
    });

    const rect = tileClosestToSelectedYear.getBoundingClientRect();
    const currentScroll = window.scrollY || window.pageYOffset || 0;

    const targetY =
      currentScroll + rect.top + rect.height / 2 - window.innerHeight * 0.5;

    window.scrollTo({
      top: Math.max(0, targetY),
      behavior: "smooth",
    });
  }

  ///////////////////////////////////////////////////////////////
  ///////////////////////////////////////////////////////////////
  //////////////////// //////////////////// ////////////////////
  //////////////////////blinking scroll indicator arrows in path view

  const journeyHint = d3
    .select("body")
    .append("div")
    .attr("id", "journeyHint")
    .style("display", "none")
    .style("opacity", 0);

  const journeyHintArrow = journeyHint
    .append("div")
    .attr("class", "journeyHintArrow svgIcon")
    .html(journeyIcons.keyboard_arrow_down);

  const journeyHintTop = d3
    .select("body")
    .append("div")
    .attr("id", "journeyHintTop")
    .style("display", "none")
    .style("opacity", 0);

  const journeyHintTopArrow = journeyHintTop
    .append("div")
    .attr("class", "journeyHintArrow svgIcon is-up")
    .html(journeyIcons.keyboard_arrow_up);

  function updateJourneyHint(mode) {
    if (window.arranged == false || mode == null || mode == "") {
      journeyHint.interrupt().style("display", "none").style("opacity", 0);

      journeyHintTop.interrupt().style("display", "none").style("opacity", 0);

      return;
    }

    const firstPathMapTile = d3.select(".mapDivs.in-path").node();
    const firstPathMapTileRect = firstPathMapTile?.getBoundingClientRect();
    const x = firstPathMapTileRect
      ? firstPathMapTileRect.left + firstPathMapTileRect.width / 2
      : window.innerWidth / 2;
    journeyHint.style("left", x + "px");
    journeyHintTop.style("left", x + "px");

    if (mode === "bottom") {
      journeyHint
        .style("display", "flex")
        .style("top", "auto")
        .style("bottom", "18px")
        .interrupt()
        .transition()
        .duration(responsiveResizeRunning ? 0 : 120)
        .style("opacity", 1);

      journeyHintArrow
        .classed("is-up", false)
        .classed("is-down", true)
        .html(journeyIcons.keyboard_arrow_down);

      journeyHintTop.interrupt().style("display", "none").style("opacity", 0);
    } else if (mode === "both") {
      journeyHint
        .style("display", "flex")
        .style("top", "auto")
        .style("bottom", "18px")
        .interrupt()
        .transition()
        .duration(responsiveResizeRunning ? 0 : 120)
        .style("opacity", 1);

      journeyHintArrow
        .classed("is-up", false)
        .classed("is-down", true)
        .html(journeyIcons.keyboard_arrow_down);

      journeyHintTop
        .style("display", "flex")
        .style("top", "18px")
        .style("bottom", "auto")
        .interrupt()
        .transition()
        .duration(responsiveResizeRunning ? 0 : 120)
        .style("opacity", 1);
    } else if (mode === "top") {
      journeyHint.interrupt().style("display", "none").style("opacity", 0);

      journeyHintTop
        .style("display", "flex")
        .style("top", "18px")
        .style("bottom", "auto")
        .interrupt()
        .transition()
        .duration(responsiveResizeRunning ? 0 : 120)
        .style("opacity", 1);
    } else {
      journeyHint.interrupt().style("display", "none").style("opacity", 0);

      journeyHintTop.interrupt().style("display", "none").style("opacity", 0);
    }
  }

  ///////////////////////////////////////////////////////////////
  ///////////////////////////////////////////////////////////////
  ///////////////////////////////////////////////////////////////
  ///////////////////////////////////////////////////////////////
  //////////////////////Function to switch between grid and path

  async function transformView(rebuildPath = false) {
    const vGap = 60;
    const labelPad = 10;

    //stop running transitions before changing layout
    d3.selectAll("*").interrupt();

    const containerSel = d3.select("#mapContainer");
    const containerEl = containerSel.node();

    //timeline
    timeline = initTimeline(missions, {
      onYearSelected: (year) => {
        scrollToYear(year);
      },
    });

    function centerInDiv(el, containerEl) {
      if (el == null || containerEl == null) return { xInDiv: 0, yInDiv: 0 };
      const rect = el.getBoundingClientRect();
      const divRect = containerEl.getBoundingClientRect();
      const cx = rect.left + rect.width / 2; //Mitte des Elements im Browserfenster
      const cy = rect.top + rect.height / 2; //oben + halbe Höhe ergibt die Mitte
      return { xInDiv: cx - divRect.left, yInDiv: cy - divRect.top }; //Position relativ zur Karte statt zum Browserfenster
    }

    //create follower overlay
    let followerSvg = d3.select("#mapFollowerOverlay");
    if (followerSvg.empty() == true) {
      followerSvg = d3
        .select("#mapFollowerLayer")
        .append("svg")
        .attr("id", "mapFollowerOverlay")
        .style("position", "absolute")
        .style("top", "0px")
        .style("left", "0px")
        .style("width", window.innerWidth + "px")
        .style("pointer-events", "none")
        .style("z-index", 5);
    }
    followerSvg.attr(
      "height",
      containerEl ? containerEl.scrollHeight : window.innerHeight,
    );

    //create connector overlay
    let overlaySvg = d3.select("#mapConnectorOverlay");
    if (overlaySvg.empty() == true) {
      overlaySvg = containerSel
        .append("svg")
        .attr("id", "mapConnectorOverlay")
        .style("position", "absolute")
        .style("top", "0px")
        .style("left", "0px")
        .style("width", window.innerWidth + "px")
        .style("pointer-events", "none")
        .style("z-index", 20);
    }
    overlaySvg.attr(
      "height",
      containerEl ? containerEl.scrollHeight : window.innerHeight,
    );

    const allDivSel = d3.selectAll(".mapDivs");
    let nodes = allDivSel.nodes();

    const keywordLowercase = activeKeyword ? activeKeyword.toLowerCase() : null;

    if (keywordLowercase) {
      nodes = nodes.filter(function (d, i) {
        const nodeData = d3.select(d).datum();
        if (nodeData == null || Array.isArray(nodeData.places) == false)
          return false;
        return (nodeData.places || []).some((p) =>
          nodeHasKeyword(p, keywordLowercase),
        );
      });
    }

    if (nodes.length == 0) nodes = allDivSel.nodes();

    //grid to path
    if (window.arranged == false || rebuildPath) {
      // show only the nodes in path
      allDivSel.classed("in-path", false).style("display", "none");
      d3.selectAll(nodes).classed("in-path", true).style("display", "block");
      d3.selectAll(nodes).each(function (d) {
        applyMapTileSizingProgress(d3.select(this).select(".mapSVGs"), d, 1);
      });

      //keep SVGs untransformed for follower positioning
      d3.selectAll(".mapDivs.in-path .mapSVGs")
        .style("transform", null)
        .style("transform-origin", null)
        .style("transform-box", null);

      // in path view hide irrelevant places
      if (keywordLowercase) {
        d3.selectAll(".mapDivs.in-path circle.place").style(
          "display",
          function (d) {
            return nodeHasKeyword(d, keywordLowercase) ? null : "none";
          },
        );
      } else {
        d3.selectAll(".mapDivs.in-path circle.place").style("display", null);
      }

      //wait for the new dimensions
      await new Promise(requestAnimationFrame);

      const pre = nodes.map((node) => {
        const svgSel = d3.select(node).select("svg.mapSVGs");
        const allPlaces = svgSel.selectAll("circle.place").nodes();
        let placeNodes = allPlaces;

        if (keywordLowercase) {
          placeNodes = allPlaces.filter(function (d, i) {
            return nodeHasKeyword(d3.select(d).datum(), keywordLowercase);
          });
        }

        const first = placeNodes[0] || null;
        const last = placeNodes.length
          ? placeNodes[placeNodes.length - 1]
          : null;

        const firstPos = first
          ? centerInDiv(first, node)
          : { xInDiv: divWidth / 2, yInDiv: divHeight / 2 };

        const lastPos = last
          ? centerInDiv(last, node)
          : { xInDiv: divWidth / 2, yInDiv: divHeight / 2 };

        return { node, first, last, firstPos, lastPos };
      });

      //mapTile positions along the path
      const baseMapTileHeight = divHeight;
      const pageWidthNow = window.innerWidth;
      const centerX =
        (pageWidthNow - divWidth) / 4 - (window.innerWidth < 800 ? 10 : 0);
      const firstCenterY = 3 * (pageHeight / 4);

      const targets = pre.map((m, i) => {
        const centerY = firstCenterY + i * (baseMapTileHeight + vGap);
        const topNow = centerY - baseMapTileHeight / 2;
        return { node: m.node, left: centerX, top: topNow };
      });

      //position mapTiles
      targets.forEach((t) => {
        d3.select(t.node)
          .style("position", "absolute")
          .style("will-change", "left, top, transform")
          .style("left", t.left + "px")
          .style("top", divMargin + t.top + "px")
          .style("opacity", 1);
      });

      d3.selectAll(".mapDivs.in-path .mapSVGs")
        .style("transform", null)
        .style("transform-origin", null)
        .style("transform-box", null);

      //hide maps and titles
      d3.selectAll(".mapG").style("opacity", 0);
      d3.selectAll(".mapTitle").style("opacity", 0);
      d3.selectAll(".scaleText").style("opacity", 0);
      d3.selectAll(".scaleArc").style("opacity", 0);

      // rebuild connectors
      overlaySvg.selectAll(".connLine.preview").remove();

      const finals = nodes.map((node) => {
        const svgSel = d3.select(node).select("svg.mapSVGs");

        const allPlaces = svgSel.selectAll("circle.place").nodes();
        let placeNodes = allPlaces;

        if (keywordLowercase) {
          placeNodes = allPlaces.filter(function (d, i) {
            return nodeHasKeyword(d3.select(d).datum(), keywordLowercase);
          });
        }

        const firstEl = placeNodes[0] || null;
        const lastEl = placeNodes.length
          ? placeNodes[placeNodes.length - 1]
          : null;

        const firstPos = firstEl
          ? centerInContainer(firstEl, containerEl)
          : null;
        const lastPos = lastEl ? centerInContainer(lastEl, containerEl) : null;

        const routePathEl =
          svgSel.select("path.routePathProgress").node() ||
          svgSel.select("path.routePathBase").node();

        const titleText =
          d3.select(node).select(".mapTitleCountry").text() || "";
        const m = titleText.match(/^(.*)\s+\((\d{4})\)\s*$/);
        const countryLabel = m ? m[1].trim() : titleText.trim();
        const year = m ? +m[2] : null;

        return {
          node,
          firstEl,
          lastEl,
          firstPos,
          lastPos,
          routePathEl,
          countryLabel,
          year,
        };
      });

      // top connector
      const first = finals[0];
      const topConnectorPath = createTopMapTileConnectorPath(first);
      if (topConnectorPath != null) {
        overlaySvg
          .append("path")
          .attr("class", "connLine connLineBase connLineTopBase")
          .attr("d", topConnectorPath)
          .attr("fill", "none")
          .attr("stroke", "#fff")
          .attr("stroke-opacity", 1)
          .attr("stroke-width", 1.5)
          .attr("stroke-linecap", "round")
          .attr("stroke-dasharray", "0,5")
          .attr("data-connector-type", "top")
          .attr("data-lower-index", 0)
          .style("opacity", 1);

        const topProg = overlaySvg
          .append("path")
          .attr("class", "connLine connLineProgress connLineTopProgress")
          .attr("d", topConnectorPath)
          .attr("fill", "none")
          .attr("stroke", "var(--highlightColor)")
          .attr("stroke-opacity", 1)
          .attr("stroke-width", 4)
          .attr("stroke-linecap", "round")
          .attr("data-connector-type", "top")
          .attr("data-lower-index", 0)
          .style("opacity", 1);

        const nodeTop = topProg.node();
        if (nodeTop) {
          const L = nodeTop.getTotalLength();
          topProg
            .attr("data-total-length", L)
            .style("stroke-dasharray", `${L} ${L}`)
            .style("stroke-dashoffset", L);
        }
      }

      // between connectors
      finals.forEach((curr, i) => {
        if (i === 0) return;
        const prev = finals[i - 1];
        const connectorPath = createMapTileConnectorPath(prev, curr);
        if (connectorPath == null) return;

        overlaySvg
          .append("path")
          .attr("class", "connLine connLineBase")
          .attr("d", connectorPath)
          .attr("fill", "none")
          .attr("stroke", "#fff")
          .attr("stroke-opacity", 1)
          .attr("stroke-width", 1.5)
          .attr("stroke-linecap", "round")
          .attr("stroke-dasharray", "0,5")
          .attr("data-connector-type", "between")
          .attr("data-upper-index", i - 1)
          .attr("data-lower-index", i)
          .style("opacity", 1);

        const progressPath = overlaySvg
          .append("path")
          .attr("class", "connLine connLineProgress")
          .attr("d", connectorPath)
          .attr("fill", "none")
          .attr("stroke", "var(--highlightColor)")
          .attr("stroke-opacity", 1)
          .attr("stroke-width", 4)
          .attr("stroke-linecap", "round")
          .attr("data-connector-type", "between")
          .attr("data-upper-index", i - 1)
          .attr("data-lower-index", i)
          .style("opacity", 1);

        const node = progressPath.node();
        if (node) {
          const L = node.getTotalLength();
          progressPath
            .attr("data-total-length", L)
            .style("stroke-dasharray", `${L} ${L}`)
            .style("stroke-dashoffset", L);
        }
      });

      //country and year labels
      d3.select("#yearOverlay").remove();

      const contRect2 = containerEl.getBoundingClientRect();
      const contDocLeft = window.scrollX + contRect2.left;
      const contDocTop = window.scrollY + contRect2.top;

      const yearOverlay = d3
        .select("body")
        .append("div")
        .attr("id", "yearOverlay")
        .style("position", "absolute")
        .style("left", contDocLeft + "px")
        .style("top", contDocTop + "px")
        .style("opacity", 1);

      const mapTileInfoRows = [];

      finals.forEach((f, idx) => {
        if (f.firstPos == null) return; //ohne sichtbaren Startort kann das Länderlabel nicht positioniert werden
        const country = f.countryLabel ?? "";
        const y = f.firstPos.y;
        const x = f.firstPos.x;
        const itemCount = Number.isFinite(d3.select(f.node).datum()?.itemCount)
          ? d3.select(f.node).datum().itemCount
          : 0;

        mapTileInfoRows.push({ y, x, country, index: idx, itemCount });
      });

      const missionLabels = yearOverlay
        .selectAll("p.missionLabel")
        .data(mapTileInfoRows, (d) => d.index)
        .enter()
        .append("p")
        .attr("class", "missionLabel")
        .style("position", "absolute")
        .style("top", (d) => d.y - 10 + "px")
        .style("left", "0px")
        .style("width", (d) => Math.max(0, d.x - labelPad - 10) + "px")
        .style("margin", "0")
        .style("padding", "0")
        .style("line-height", "1")
        .style("text-align", "right")
        .style("white-space", "nowrap")
        .style("pointer-events", "none")
        .on("click", function (event, d) {
          if (event.target.closest(".photoCountButton") == null) return;
          const idx = d.index;
          const allDivs = d3.selectAll(".mapDivs.in-path").nodes();
          const mapTileDiv = allDivs[idx];
          if (mapTileDiv == null) return;

          let routeSel = d3.select(mapTileDiv).select("path.routePathBase");

          if (routeSel.empty() == true) {
            const svgSel = d3.select(mapTileDiv).select("svg.mapSVGs");
            const markersG = svgSel.select("g.mapMarkersG");
            if (markersG.empty() == true) return;

            const coords = [];
            markersG.selectAll("circle.place").each(function () {
              const c = d3.select(this);
              const cx = +c.attr("cx");
              const cy = +c.attr("cy");
              if (Number.isFinite(cx) && Number.isFinite(cy))
                coords.push([cx, cy]);
            });

            if (coords.length == 0) return;

            if (coords.length === 1) {
              const [cx, cy] = coords[0];
              coords.splice(0, 1, [cx, cy - 1], [cx, cy + 1]);
            }

            const missionDatum = d3.select(mapTileDiv).datum();
            const itemCount = (missionDatum && missionDatum.itemCount) || 1;
            const strokeW = strokeByItems(itemCount);

            routeSel = markersG
              .append("path")
              .attr("class", "routePath routePathBase")
              .attr("d", lineGen(coords))
              .attr("fill", "none")
              .attr("stroke", "#ffffff")
              .attr("stroke-width", strokeW)
              .attr("stroke-linecap", "round")
              .attr("stroke-linejoin", "round")
              .attr("opacity", 0.95)
              .datum(missionDatum);

            const progSel = markersG
              .append("path")
              .attr("class", "routePath routePathProgress")
              .attr("d", lineGen(coords))
              .attr("fill", "none")
              .attr("stroke", "var(--highlightColor)")
              .attr("stroke-width", strokeW + 0.5)
              .attr("stroke-linecap", "round")
              .attr("stroke-linejoin", "round")
              .style("pointer-events", "none");

            const nodePath = progSel.node();
            if (nodePath) {
              const L = nodePath.getTotalLength();
              progSel
                .attr("data-total-length", L)
                .style("stroke-dasharray", `${L} ${L}`)
                .style("stroke-dashoffset", L)
                .style("opacity", 1);
            }

            routeSel.on("click", function (ev) {
              missionPathSeriesTransform.call(this, ev, missionDatum, idx);
            });
          }

          const routeNode = routeSel.node();
          const routeDatum = routeSel.datum();
          if (routeNode && routeDatum) {
            missionPathSeriesTransform.call(routeNode, event, routeDatum, idx);
          }
        });

      missionLabels
        .append("span")
        .attr("class", "photoCountButton")
        .style("pointer-events", "auto")
        .style("cursor", "pointer")
        .attr("aria-label", function (d) {
          const n = d.itemCount;
          return `${n.toLocaleString("en-US")} photos`;
        })
        .html(function (d) {
          const n = d.itemCount;
          return `
      <span class="countNum">${n.toLocaleString("en-US")} ${n === 1 ? "Photo" : "Photos"}</span>
      <span class="svgIcon countArrow"><svg aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" fill="currentColor"><path d="M360-200v-80h264L160-744l56-56 464 464v-264h80v400H360Z"/></svg></span>
    `;
        });

      missionLabels
        .append("span")
        .attr("class", "yearSpan")
        .style("display", "inline-block")

        .style(
          "text-shadow",
          `
          0 1px 1px rgba(0,0,0,1),
          0 2px 2px rgba(0,0,0,0.85)
        `,
        )
        .style("max-width", "20ch")
        .style("letter-spacing", "0.5px")
        .style("color", "white")

        .text((d) => d.country);

      //show path controls
      d3.select("#imageBar")
        .style("pointer-events", "auto")
        .style("opacity", 1);
      d3.selectAll(".routePathProgress").style("opacity", 1);
      d3.select("#globalPathFollower")
        .style("pointer-events", "auto")
        .style("opacity", 1);
      d3.selectAll(".routePathBase").attr("stroke", "#fff");
      d3.select("#timeline").style("opacity", 1);

      overlaySvg.attr("height", containerEl.scrollHeight);
      followerSvg.attr("height", containerEl.scrollHeight);

      window.arranged = true;
      syncOverlayDimensions();
      if (window.innerWidth < 800 && document.scrollingElement) {
        document.scrollingElement.scrollLeft = 0;
      }

      updateJourneyHint("bottom");

      d3.select("#arrangeButton").html(journeyIcons.grid_view);
      if (
        window.location.hash == "" ||
        window.location.hash.startsWith("#path:") == false
      ) {
        try {
          history.replaceState(null, "", "#path");
        } catch (e) {
          window.location.hash = "#path";
        }
      }

      await new Promise(requestAnimationFrame);

      getPlaceCirclePositions();

      if (window.mapScrollObserverCleanup) window.mapScrollObserverCleanup();
      if (rebuildPath == false) initMapScrollObserver();

      return;
    }

    //path to grid

    if (window.mapScrollObserverCleanup) {
      window.mapScrollObserverCleanup();
    }

    //remove path overlays
    d3.selectAll(".connLine").remove();
    d3.select("#yearOverlay").remove();
    d3.selectAll(".overlayImages").remove();

    //hide path controls
    d3.select("#imageBar").style("pointer-events", "none").style("opacity", 0);
    d3.select("#globalPathFollower")
      .style("pointer-events", "none")
      .style("opacity", 0);
    d3.select("#timeline").style("opacity", 0).style("pointer-events", "none");

    //show maps and titles
    d3.selectAll(".mapG").style("opacity", 1);
    d3.selectAll(".mapTitle").style("opacity", 1);
    d3.selectAll(".scaleText").style("opacity", 1);
    d3.selectAll(".scaleArc").style("opacity", 1);
    d3.selectAll(".mapDivs").each(function (d) {
      applyMapTileSizingProgress(d3.select(this).select(".mapSVGs"), d, 0);
    });

    // restore route base stroke gradient
    d3.selectAll(".routePathBase").attr("stroke", function () {
      const gid = d3.select(this).attr("data-grad-id");
      return gid ? `url(#${gid})` : "#ffffff";
    });

    //keep SVGs untransformed for follower positioning
    d3.selectAll(".mapDivs .mapSVGs")
      .style("transform", null)
      .style("transform-origin", null)
      .style("transform-box", null);

    // show all mapTiles again
    d3.selectAll(".mapDivs")
      .classed("in-path", false)
      .style("display", "block");

    //show places again; keep keyword opacity
    d3.selectAll(".mapDivs circle.place").style("display", null);

    //scroll to top
    window.scrollTo(0, 0);

    //position mapTiles in the grid
    d3.selectAll(".mapDivs")
      .style("position", "absolute")
      .style("left", (d, i) => {
        const row = Math.floor(i / columnCount);
        const columnInRow = i % columnCount;
        const col = row % 2 === 0 ? columnInRow : columnCount - 1 - columnInRow;
        return col * (divWidth + divMargin) + "px";
      })
      .style("top", (d, i) => {
        const row = Math.floor(i / columnCount);
        return row * (divHeight + 2.5 * divMargin) + "px";
      });

    // hide progress paths in grid
    d3.selectAll(".routePathProgress").style("opacity", 0);

    //clear will-change
    d3.selectAll(".mapDivs").style("will-change", null);

    window.arranged = false;

    applyGridLayoutMode(window.gridLayoutMode);
    syncOverlayDimensions();
    updateJourneyHint(null);

    // Button-Icon & Hash für Grid
    d3.select("#arrangeButton").html(journeyIcons.conversion_path);
    try {
      history.replaceState(null, "", "#grid");
    } catch (e) {
      window.location.hash = "#grid";
    }
  }

  //////////////////////Layout-Regler animieren

  async function animateLayoutSliderTo(tTarget, duration = 1200) {
    const s = d3.select("#layoutSlider").node();
    if (s == null) return;

    const tStart = parseFloat(d3.select(s).property("value")) || 0;
    const t0 = performance.now();

    function ease(u) {
      return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
    }

    await new Promise((resolve) => {
      function step(now) {
        const u = Math.min(1, (now - t0) / duration);
        const t = tStart + (tTarget - tStart) * ease(u);

        d3.select(s).property("value", t);
        if (window.setLayoutT) window.setLayoutT(t);

        if (u < 1 == true) requestAnimationFrame(step);
        else resolve();
      }
      requestAnimationFrame(step);
    });
  }

  function getPlaceCirclePositions() {
    d3.selectAll("circle.place").each(function (d) {
      const r = this.getBoundingClientRect();
      d.vx = r.left + r.width / 2;
      d.vy = r.top + r.height / 2;
      d.docX = d.vx + window.scrollX;
      d.docY = d.vy + window.scrollY;
    });
  }

  const svgOverlay = d3
    .select("body")
    .append("svg")
    .classed("svgOverlay", true)
    .attr("id", "svgOverlay")
    .attr("width", pageWidth + "px")
    .attr("height", 0)
    .style("position", "absolute")
    .style("left", "0px")
    .style("top", "0px")
    .style("pointer-events", "none")
    .style("z-index", 99);

  let justPlaces = [];
  (hierarchicalData.children || []).forEach((missionNode) => {
    const mapKey = missionNode.data.id;
    (missionNode.data.places || []).forEach((p) => {
      p.mapKey = mapKey;
      justPlaces.push(p);
    });
  });

  //////////////////////Layout-Regler und Vorschau vorbereiten

  const layoutSliderEl = d3.select("#layoutSlider").node();

  d3.select("#layoutSlider").on("pointerdown", async function () {
    missionPathSeriesTransform.closeAllSeriesViews({
      skipBackgroundUpdate: true,
    });
    await waitMs(495);
  });

  let sliderDragging = false;
  //////////////////////Vorschau beim Ziehen des Layout-Reglers

  let previewActive = false;
  let previewModel = null;

  //preview positions
  const clamp01 = (t) => Math.max(0, Math.min(1, t));
  const lerp = (a, b, t) => a + (b - a) * t;

  function applyPreviewT(t) {
    t = clamp01(t);
    if (previewModel == null) return;

    //stop transitions during the preview
    d3.selectAll(
      ".mapDivs, .mapSVGs, .mapG, .mapTitle, #timeline, #imageBar",
    ).interrupt();

    const M = previewModel;
    const inSet = new Set(M.pathNodes);

    // show all nodes during preview (dim non-path)
    d3.selectAll(".mapDivs").style("display", "block");

    M.allNodes.forEach((node) => {
      const g = M.gridPos.get(node);
      if (g == null) return;

      const isPath = inSet.has(node);

      let left = g.left,
        top = g.top;
      if (isPath) {
        const p = M.pathPos.get(node);
        if (p) {
          left = lerp(g.left, p.left, t);
          top = lerp(g.top, p.top, t);
        }
      }

      const mapTileSelection = d3.select(node);
      mapTileSelection
        .style("position", "absolute")
        .style("left", left + "px")
        .style("top", top + "px")
        .style("opacity", isPath ? 1 : 1 - 0.65 * t);

      applyMapTileSizingProgress(
        mapTileSelection.select(".mapSVGs"),
        mapTileSelection.datum(),
        isPath ? t : 0,
      );

      //fade maps and titles while entering path view
      if (isPath) {
        mapTileSelection.selectAll(".mapG").style("opacity", 1 - t);
        mapTileSelection.selectAll(".mapTitle").style("opacity", 1 - t);
        d3.selectAll(".scaleText").style("opacity", 1 - t);
        d3.selectAll(".scaleArc").style("opacity", 1 - t);
        d3.select("#hierarchyMode")
          .style("opacity", 1 - t)
          .style("pointer-events", t > 0.98 ? "none" : "auto");

        d3.select("#tilesPerRow")
          .style("opacity", 1 - t)
          .style("pointer-events", t > 0.98 ? "none" : "auto");

        d3.select("#gridLayoutMode")
          .style("opacity", 1 - t)
          .style("pointer-events", t > 0.98 ? "none" : "auto");
      } else {
        mapTileSelection.selectAll(".mapG").style("opacity", 1);
        mapTileSelection.selectAll(".mapTitle").style("opacity", 1);
        d3.selectAll(".scaleText").style("opacity", 1);
        d3.selectAll(".scaleArc").style("opacity", 1);
        d3.select("#hierarchyMode")
          .style("opacity", 1)
          .style("pointer-events", "auto");
        d3.select("#tilesPerRow")
          .style("opacity", 1)
          .style("pointer-events", "auto");
        d3.select("#gridLayoutMode")
          .style("opacity", 1)
          .style("pointer-events", "auto");
      }
    });

    //fade path controls
    d3.select("#timeline")
      .style("opacity", t)
      .style("pointer-events", t > 0.98 ? "auto" : "none");
    d3.select("#imageBar")
      .style("opacity", t)
      .style("pointer-events", t > 0.98 ? "auto" : "none");

    d3.select("#mapConnectorOverlay").style("opacity", t);
    d3.select("#yearOverlay").style("opacity", t);

    d3.selectAll(".routePathProgress").style("opacity", t);
    d3.selectAll("#globalPathFollower").style("opacity", t);

    //update connectors after mapTile positions
    updatePreviewConnectors(M);

    // button icon preview
    d3.select("#arrangeButton").html(
      t > 0.5 ? journeyIcons.grid_view : journeyIcons.conversion_path,
    );
  }

  function buildPreviewModel() {
    const containerEl = d3.select("#mapContainer").node();
    const allNodes = d3.selectAll(".mapDivs").nodes();
    allNodes.forEach((n, i) => (n.gridIndex = i));

    const pathNodes = getPathNodesForCurrentFilter();

    const gridPos = new Map();
    allNodes.forEach((n) => gridPos.set(n, gridLeftTopByIndex(+n.gridIndex)));

    const pathPos = new Map();
    pathNodes.forEach((n, orderIndex) =>
      pathPos.set(n, pathLeftTopByOrder(orderIndex)),
    );

    const keywordLowercase = activeKeyword ? activeKeyword.toLowerCase() : null;

    //get mapTile endpoints for the connectors
    const mapTilesInfo = pathNodes.map((node) => {
      const svg = d3.select(node).selectAll("svg.mapSVGs").node();
      if (svg == null) {
        return {
          node,
          svg: null,
          firstEl: null,
          lastEl: null,
          routePathEl: null,
        };
      }

      let placeEls = d3
        .select(svg)
        .selectAll("g.mapMarkersG circle.place")
        .nodes();
      if (keywordLowercase) {
        placeEls = placeEls.filter(function (d, i) {
          return nodeHasKeyword(d3.select(d).datum(), keywordLowercase);
        });
      }

      const firstEl = placeEls[0] || null;
      const lastEl = placeEls.length ? placeEls[placeEls.length - 1] : null;

      const routePathEl =
        d3
          .select(svg)
          .selectAll("g.mapMarkersG path.routePathProgress")
          .node() ||
        d3.select(svg).selectAll("g.mapMarkersG path.routePathBase").node();

      return { node, svg, firstEl, lastEl, routePathEl };
    });

    return {
      containerEl,
      allNodes,
      pathNodes,
      gridPos,
      pathPos,
      mapTilesInfo,
    };
  }

  function buildPreviewConnectorDom(model, overlaySvg) {
    overlaySvg.selectAll(".connLine").remove();

    model.topConnector = {
      base: overlaySvg
        .append("path")
        .attr("class", "connLine connLineBase connLineTopBase preview")
        .attr("fill", "none")
        .attr("stroke", "#fff")
        .attr("stroke-opacity", 1)
        .attr("stroke-width", 1.5)
        .attr("stroke-linecap", "round")
        .attr("stroke-dasharray", "0,5")
        .style("opacity", 1),
      prog: overlaySvg
        .append("path")
        .attr("class", "connLine connLineProgress connLineTopProgress preview")
        .attr("fill", "none")
        .attr("stroke", "var(--highlightColor)")
        .attr("stroke-opacity", 1)
        .attr("stroke-width", 4)
        .attr("stroke-linecap", "round")
        .style("opacity", 0),
    };

    const pairs = [];
    for (let i = 1; i < model.mapTilesInfo.length; i++)
      pairs.push({ iPrev: i - 1, iCurr: i });

    model.betweenConnectors = pairs.map((p) => {
      const base = overlaySvg
        .append("path")
        .attr("class", "connLine connLineBase preview")
        .attr("data-preview", "1")
        .attr("data-connector-type", "between")
        .attr("data-upper-index", p.iPrev)
        .attr("data-lower-index", p.iCurr)
        .attr("fill", "none")
        .attr("stroke", "#fff")
        .attr("stroke-opacity", 1)
        .attr("stroke-width", 1.5)
        .attr("stroke-linecap", "round")
        .attr("stroke-dasharray", "0,5")
        .style("opacity", 1);

      const prog = overlaySvg
        .append("path")
        .attr("class", "connLine connLineProgress preview")
        .attr("data-preview", "1")
        .attr("data-connector-type", "between")
        .attr("data-upper-index", p.iPrev)
        .attr("data-lower-index", p.iCurr)
        .attr("fill", "none")
        .style("stroke", "var(--highlightColor)")
        .style("stroke-opacity", 1)
        .style("stroke-width", "4px")
        .style("stroke-linecap", "round")
        .style("stroke-linejoin", "round")
        .style("pointer-events", "none")
        .style("opacity", 0);

      return { ...p, base, prog };
    });
  }

  function updatePreviewConnectors(model) {
    const containerEl = model?.containerEl;
    const overlayNode = d3.select("#mapConnectorOverlay").node();
    if (containerEl == null || overlayNode == null) return;

    //read current mapTile positions
    const infos = model.mapTilesInfo.map((c) => {
      const firstPos = c.firstEl
        ? centerInContainer(c.firstEl, containerEl)
        : null;
      const lastPos = c.lastEl
        ? centerInContainer(c.lastEl, containerEl)
        : null;
      return { ...c, firstPos, lastPos };
    });

    // Top connector
    if (model.topConnector) {
      const dTop = createTopMapTileConnectorPath(infos[0]);
      if (dTop) {
        model.topConnector.base.attr("d", dTop);
        model.topConnector.prog.attr("d", dTop);
      } else {
        model.topConnector.base.attr("d", null);
        model.topConnector.prog.attr("d", null);
      }
    }

    // Between connectors
    (model.betweenConnectors || []).forEach((c) => {
      const prev = infos[c.iPrev];
      const curr = infos[c.iCurr];
      const dPath = createMapTileConnectorPath(prev, curr);
      if (dPath) {
        c.base.attr("d", dPath);
        c.prog.attr("d", dPath);
      } else {
        c.base.attr("d", null);
        c.prog.attr("d", null);
      }
    });
  }

  function gridLeftTopByIndex(i) {
    const row = Math.floor(i / columnCount);
    const columnInRow = i % columnCount;
    const col = row % 2 === 0 ? columnInRow : columnCount - 1 - columnInRow;
    return {
      left: col * (divWidth + divMargin),
      top: row * (divHeight + 2.5 * divMargin),
    };
  }

  function pathLeftTopByOrder(orderIndex) {
    const vGap = 60; // keep in sync with transformView
    const baseMapTileHeight = divHeight;
    const pageWidthNow = window.innerWidth;
    const centerX =
      (pageWidthNow - divWidth) / 4 - (window.innerWidth < 800 ? 10 : 0);
    const firstCenterY = 3 * (pageHeight / 4);

    const centerY = firstCenterY + orderIndex * (baseMapTileHeight + vGap);
    const topNow = centerY - baseMapTileHeight / 2;
    return { left: centerX, top: divMargin + topNow };
  }

  function getPathNodesForCurrentFilter() {
    const all = d3.selectAll(".mapDivs").nodes();
    const keywordLowercase = activeKeyword ? activeKeyword.toLowerCase() : null;

    if (keywordLowercase == null || keywordLowercase == "") return all;

    const filtered = all.filter(function (d, i) {
      const nodeData = d3.select(d).datum();
      if (nodeData == null || Array.isArray(nodeData.places) == false)
        return false;
      return (nodeData.places || []).some((p) =>
        nodeHasKeyword(p, keywordLowercase),
      );
    });

    return filtered.length ? filtered : all;
  }

  function ensurePreviewOverlays() {
    const containerSel = d3.select("#mapContainer");
    const containerEl = containerSel.node();
    if (containerEl == null) return { overlaySvg: null, yearOverlay: null };

    let overlaySvg = d3.select("#mapConnectorOverlay");
    if (overlaySvg.empty() == true) {
      overlaySvg = containerSel
        .append("svg")
        .attr("id", "mapConnectorOverlay")
        .style("position", "absolute")
        .style("top", 0)
        .style("left", 0)
        .style("width", window.innerWidth + "px")
        .style("pointer-events", "none")
        .style("z-index", 20);
    }
    overlaySvg.attr("height", containerEl.scrollHeight);

    let yearOverlay = d3.select("#yearOverlay");
    if (yearOverlay.empty() == true) {
      const contRect = containerEl.getBoundingClientRect();
      const contDocLeft = window.scrollX + contRect.left;
      const contDocTop = window.scrollY + contRect.top;

      yearOverlay = d3
        .select("body")
        .append("div")
        .attr("id", "yearOverlay")
        .style("position", "absolute")
        .style("left", contDocLeft + "px")
        .style("top", contDocTop + "px")
        .style("opacity", 0);
    }

    return { overlaySvg, yearOverlay };
  }
  ///////////////////////////////////////////////////////////////
  ///////////////////////////////////////////////////////////////
  ///////////////////////////////////////////////////////////////
  ///////////////////////////////////////////////////////////////
  // Calculate the geometry for path and preview path (for transition)
  // Mittelpunkt eines Elements, gemessen relativ zum Map-Container.
  function centerInContainer(el, containerEl) {
    if (el == null || containerEl == null) return null;
    const rect = el.getBoundingClientRect();
    const cont = containerEl.getBoundingClientRect();
    const cx = rect.left + rect.width / 2; //Mitte des Elements im Browserfenster
    const cy = rect.top + rect.height / 2; //oben + halbe Höhe ergibt die Mitte
    return { x: cx - cont.left, y: cy - cont.top }; //Container-Position abziehen, damit die Verbindung im Overlay sitzt
  }

  // Misst zwei nahe Punkte am Anfang oder Ende eines Pfads. Aus deren Abstand
  // entsteht ein Richtungsvektor mit der Länge 1. Er bestimmt, in welcher
  // Richtung die Verbindung aus einem Map-Tile heraus- oder hineinläuft.
  function getEndpointTangent(pathEl, atEnd = false, epsPx = 2) {
    if (pathEl == null) return null;

    const L = pathEl.getTotalLength(); //L ist die gesamte Länge des Länderpfads
    if (L == null || L == 0 || isFinite(L) == false) return null;

    const e = Math.max(0.5, Math.min(epsPx, L / 10)); //kleiner Messabstand im SVG; bei kurzen Pfaden entsprechend kleiner

    const lA = atEnd ? Math.max(0, L - 2 * e) : 0; //erste Messstelle; atEnd wählt das Ende statt den Anfang
    const lB = atEnd ? Math.max(0, L - e) : e; //zweite Messstelle etwas weiter auf dem Pfad

    const pA = pathEl.getPointAtLength(lA); //Position der ersten Messstelle
    const pB = pathEl.getPointAtLength(lB); //Position der zweiten Messstelle

    let tx = pB.x - pA.x; //Richtung des Pfads in x
    let ty = pB.y - pA.y; //Richtung des Pfads in y

    const len = Math.hypot(tx, ty) || 1; //Länge dieser Richtung; hypot ist die Wurzel aus tx² + ty²
    tx /= len; //auf Länge 1 bringen, damit später nur die Richtung zählt
    ty /= len;

    return { tx, ty };
  }

  // Verbindet den letzten Ort eines Map-Tiles mit dem ersten Ort des nächsten.
  // Das Ergebnis ist der Inhalt des SVG-Attributs "d" für eine Bézier-Kurve.
  function createMapTileConnectorPath(prev, curr) {
    if (
      prev?.lastPos == null ||
      curr?.firstPos == null ||
      prev.lastEl == null ||
      curr.firstEl == null
    )
      return null;

    const x1 = prev.lastPos.x; //letzter Ort im vorherigen Land
    const y1 = prev.lastPos.y; //dessen y-Position
    const x2 = curr.firstPos.x; //erster Ort im nächsten Land
    const y2 = curr.firstPos.y; //dessen y-Position

    const r1 = parseFloat(d3.select(prev.lastEl).attr("r")) || 0; //Radius des letzten Punkts
    const r2 = parseFloat(d3.select(curr.firstEl).attr("r")) || 0; //Radius des nächsten Punkts

    //Richtung am Ende des alten und am Anfang des neuen Länderpfads
    const tPrev = prev.routePathEl
      ? getEndpointTangent(prev.routePathEl, true, 2)
      : null;
    const tCurr = curr.routePathEl
      ? getEndpointTangent(curr.routePathEl, false, 2)
      : null;

    const dx = x2 - x1; //horizontaler Abstand zwischen den Orten
    const dy = y2 - y1; //vertikaler Abstand zwischen den Orten
    const dist = Math.hypot(dx, dy) || 1; //direkter Abstand zwischen beiden Orten
    const ux = dx / dist; //x-Richtung der direkten Verbindung, auf Länge 1 gerechnet
    const uy = dy / dist; //zugehörige y-Richtung

    const outTx = tPrev ? tPrev.tx : ux; //ausgehende Richtung; ohne Pfad die direkte Verbindung nehmen
    const outTy = tPrev ? tPrev.ty : uy; //y-Anteil der ausgehenden Richtung
    const inTx = tCurr ? -tCurr.tx : -ux; //am Ziel rückwärts gegen die Pfadrichtung rechnen
    const inTy = tCurr ? -tCurr.ty : -uy; //so liegt der zweite Kontrollpunkt vor dem Ziel

    const sx = x1 + outTx * r1; //sx/sy: Start am Punktrand statt in der Punktmitte
    const sy = y1 + outTy * r1;
    const ex = x2 + inTx * r2; //ex/ey: Ende am Rand des nächsten Punkts
    const ey = y2 + inTy * r2;

    const baseDist = Math.hypot(ex - sx, ey - sy) || 1; //Abstand zwischen diesen beiden Rändern
    const handleLen = Math.min(baseDist / 3, 60); //Kontrollpunkte um ein Drittel dieses Abstands versetzen, höchstens 60

    const c1x = sx + outTx * handleLen; //c1x/c1y: erster Kontrollpunkt bestimmt die Richtung am Start
    const c1y = sy + outTy * handleLen;
    const c2x = ex + inTx * handleLen; //c2x/c2y: zweiter Kontrollpunkt bestimmt die Richtung am Ende
    const c2y = ey + inTy * handleLen;

    //M setzt den Start; C zeichnet die Kurve über zwei Kontrollpunkte bis zum Ende
    return `M ${sx} ${sy} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${ex} ${ey}`;
  }

  // Zeichnet die einleitende Verbindung vom oberen Rand zum ersten Map-Tile.
  // Die Zwischenpunkte lassen die Linie zunächst nach unten und danach zum
  // ersten Ort laufen. D3 glättet diese Punkte zu einer Kurve.
  function createTopMapTileConnectorPath(firstInfo) {
    if (firstInfo?.firstPos == null || firstInfo.firstEl == null) return null;

    const x = firstInfo.firstPos.x;
    const y = firstInfo.firstPos.y;
    const r = parseFloat(d3.select(firstInfo.firstEl).attr("r")) || 0;

    const yTop = 0;

    const sx =
      (pageWidth - divWidth) / 4 +
      divWidth / 2 -
      (window.innerWidth < 800 ? 10 : 0);
    const sy = yTop; //Start der Verbindung am oberen Rand

    const mx =
      (pageWidth - divWidth) / 4 +
      divWidth / 2 -
      (window.innerWidth < 800 ? 10 : 0);
    const my = pageHeight / 2 - divHeight / 2; //Höhe des Zwischenpunkts vor der ersten Karte

    const ex = x; //x-Position des ersten Ortes
    const ey = y - r; //oberer Rand des ersten Punktes

    //sx/sy = Start, mx/my = Zwischenpunkt, ex/ey = Ende
    //die zusätzlichen Mittelpunkte führen die Kurve erst nach unten und dann zum ersten Ort
    const points = [
      [sx, sy],
      [sx, (sy + my) / 2],
      [mx, my],
      [(mx + ex) / 2, (my + ey) / 2],
      [ex, ey],
    ];

    const topLineGen = d3
      .line()
      .x((d) => d[0])
      .y((d) => d[1])
      .curve(d3.curveCatmullRom.alpha(0.5));

    return topLineGen(points);
  }

  ///////////////////////////////////////////////////////////////
  ///////////////////////////////////////////////////////////////
  ///////////////////////////////////////////////////////////////
  ////////////////////////////////Slider interaction
  window.setLayoutT = (t) => {
    const { overlaySvg } = ensurePreviewOverlays();
    if (overlaySvg == null) return;

    //prepare a new preview
    if (previewActive == false || previewModel == null) {
      if (window.mapScrollObserverCleanup) window.mapScrollObserverCleanup();

      previewModel = buildPreviewModel();
      previewActive = true;

      // mark path subset
      d3.selectAll(".mapDivs").classed("in-path", false);
      d3.selectAll(previewModel.pathNodes).classed("in-path", true);

      buildPreviewConnectorDom(previewModel, overlaySvg);
    }

    applyPreviewT(parseFloat(t) || 0);
  };

  //slider events
  if (layoutSliderEl) {
    d3.select(layoutSliderEl).on("pointerdown.layoutPreview", () => {
      sliderDragging = true;

      //pause the scroll observer during preview
      if (window.mapScrollObserverCleanup) window.mapScrollObserverCleanup();

      const { overlaySvg } = ensurePreviewOverlays();
      if (overlaySvg == null) return;

      previewModel = buildPreviewModel();
      previewActive = true;

      //create preview connectors
      buildPreviewConnectorDom(previewModel, overlaySvg);

      // mark path subset
      d3.selectAll(".mapDivs").classed("in-path", false);
      d3.selectAll(previewModel.pathNodes).classed("in-path", true);

      // apply current value immediately
      applyPreviewT(
        parseFloat(d3.select(layoutSliderEl).property("value")) || 0,
      );
    });

    d3.select(layoutSliderEl).on("input.layoutPreview", (e) => {
      if (previewActive == false) return;
      applyPreviewT(parseFloat(d3.select(e.target).property("value")) || 0);
    });

    const finish = () => {
      if (sliderDragging == false) return;
      sliderDragging = false;

      const tNow = parseFloat(d3.select(layoutSliderEl).property("value")) || 0;
      const tSnap = tNow > 0.5 ? 1 : 0;
      d3.select(layoutSliderEl).property("value", String(tSnap));
      applyPreviewT(tSnap);

      //finish preview and apply the layout
      previewActive = false;
      previewModel = null;

      d3.select("#mapConnectorOverlay").selectAll(".connLine.preview").remove();

      if (tSnap === 1 && window.arranged == false) {
        transformView(); // builds overlays, follower, observer etc.
      } else if (tSnap === 0 && window.arranged) {
        transformView(); // back to grid
      } else {
        //restart the scroll observer in path view
        if (window.arranged == true) {
          if (window.mapScrollObserverCleanup)
            window.mapScrollObserverCleanup();
          initMapScrollObserver();
        } else {
          applyGridLayoutMode(window.gridLayoutMode || "maps");
        }
      }
    };

    d3.select(layoutSliderEl).on("pointerup.finish", finish);
    d3.select(layoutSliderEl).on("pointercancel.finish", finish);
    d3.select(window)
      .on("pointerup.layoutSlider", finish)
      .on("pointercancel.layoutSlider", finish);
  }

  ///////////////////////////////////////////////////////////////
  ///////////////////////////////////////////////////////////////
  //////////////////////hash loading of country via url

  function missionKeyFromDatum(d) {
    if (d == null) return null;
    const name = d.name;
    const m = name.match(/^(.*)\s+\((\d{4})\)\s*$/);
    if (m) {
      const country = m[1].trim().replace(/\s+/g, "_");
      const year = m[2];
      return `${country}_${year}`;
    }
    return String(d.id).replace(/\|\|/g, "_").replace(/\s+/g, "_");
  }

  function parseHash() {
    const raw = window.location.hash;
    if (raw == "") return { mode: null, missionKey: null };
    const h = raw.slice(1); // ohne '#'
    let mode = null;
    let missionKey = null;

    if (h.startsWith("path") == true) {
      mode = "path";
      const parts = h.split(":");
      if (parts.length > 1 && parts[1]) {
        missionKey = decodeURIComponent(parts.slice(1).join(":"));
      }
    } else if (h.startsWith("grid") == true) {
      mode = "grid";
    }
    return { mode, missionKey };
  }

  function scrollToMissionByKey(missionKey) {
    if (missionKey == null || missionKey == "") return;
    let targetNode = null;

    d3.selectAll(".mapDivs").each(function (d) {
      const key = missionKeyFromDatum(d);
      if (key === missionKey) {
        targetNode = this;
      }
    });

    if (targetNode == null) return;

    const rect = targetNode.getBoundingClientRect();
    const targetY =
      (window.scrollY || window.pageYOffset || 0) +
      rect.top +
      rect.height / 2 -
      window.innerHeight / 2;

    window.scrollTo({
      top: Math.max(0, targetY),
      behavior: "smooth",
    });
  }

  ///////////////////////////////////////////////////////////////
  ///////////////////////////////////////////////////////////////
  //////////////////////Responsiveness

  let responsiveResizeRequested = false;

  async function handleResponsiveResize() {
    if (window.innerWidth === pageWidth && window.innerHeight === pageHeight)
      return;
    if (responsiveResizeRunning) {
      responsiveResizeRequested = true;
      return;
    }
    responsiveResizeRunning = true;
    try {
      do {
        responsiveResizeRequested = false;
        await resizeResponsiveLayout();
      } while (
        responsiveResizeRequested ||
        window.innerWidth !== pageWidth ||
        window.innerHeight !== pageHeight
      );
    } finally {
      responsiveResizeRunning = false;
    }
    if (window.arranged == true) {
      updateJourneyHint(activeMapTileIndex <= 0 ? "bottom" : "both");
    }
    updateExpandedSeriesResponsiveLayout();
  }

  function updateResponsiveMeasurements() {
    updateResponsiveSettings();
    const selectedOption = colsInputs
      .nodes()
      .findIndex((input) => d3.select(input).property("checked"));
    pageWidth = window.innerWidth;
    pageHeight = window.innerHeight;
    isMobileView = pageWidth < 800;
    containerMargin = isMobileView ? 12 : 0;
    marginRightSide = isMobileView ? 12 : 150;
    divMargin = isMobileView ? 18 : 20;
    wideGridColumns = isMobileView ? 2 : 4;
    mediumGridColumns = isMobileView ? 3 : 8;
    denseGridColumns = isMobileView ? 4 : 15;
    const optionValues = [wideGridColumns, mediumGridColumns, denseGridColumns];
    columnCount = optionValues[Math.max(0, selectedOption)];
    divWidth =
      (pageWidth -
        containerMargin -
        marginRightSide -
        (columnCount - 1) * divMargin) /
      columnCount;
    divHeight = divWidth;
    window.gridCols = columnCount;
    window.gridDivWidth = divWidth;
    window.gridDivHeight = divHeight;

    colsInputs.each(function (d, index) {
      const input = d3
        .select(this)
        .property("value", String(optionValues[index]));
      const label = d3.select(this.closest("label"));
      label.attr("title", optionValues[index] + " tiles per row");
      label.selectAll("span").text(optionValues[index]);
      input.property("checked", index === Math.max(0, selectedOption));
    });
    setUrlParam("cols", columnCount);
    mapContainer
      .style("margin-left", containerMargin + "px")
      .style("margin-right", marginRightSide + "px")
      .style("margin-top", containerMargin + "px")
      .style("margin-bottom", containerMargin + "px");
    d3.selectAll(".mapDivs")
      .style("width", divWidth + "px")
      .style("height", divHeight + "px");
    d3.selectAll("svg.mapSVGs, svg.mapTileSpacer")
      .attr("width", divWidth)
      .attr("height", divHeight)
      .style("width", divWidth + "px")
      .style("height", divHeight + "px");
    d3.select("#svgOverlay").attr("width", pageWidth);
    d3.selectAll("#mapConnectorOverlay, #mapFollowerOverlay").style(
      "width",
      pageWidth + "px",
    );
  }

  function resizeResponsiveGridLayout() {
    responsiveResizeRevision += 1;
    d3.selectAll(".mapDivs, .mapSVGs, .mapTileSpacer").interrupt();
    updateResponsiveMeasurements();

    d3.selectAll(".mapDivs").each(function (d, index) {
      const position = gridLeftTopByIndex(index);
      const mapTile = d3
        .select(this)
        .style("left", position.left + "px")
        .style("top", position.top + "px");
      applyMapTileSizingProgress(mapTile.select(".mapSVGs"), d, 0);
    });
    applyGridLayoutMode(window.gridLayoutMode);
    sharedMissionPathSeriesTransform.resizeLayout({
      divHeight,
      pageWidth,
      pageHeight,
      thumbnailSizePx: isMobileView ? 86 : 120,
    });
    imageKeywordStream.resizeLayout(pageWidth / 3);
    globeFollower.resizeLayout(pageHeight);
    syncOverlayDimensions();
  }

  async function resizeResponsiveLayout() {
    if (window.arranged == false) {
      resizeResponsiveGridLayout();
      return;
    }
    responsiveResizeRevision += 1;
    const wasPath = window.arranged;
    const expandedMapTiles = d3.selectAll(".mapDivs.seriesExpanded").nodes();
    const visibleMapTiles = d3
      .selectAll(wasPath ? ".mapDivs.in-path" : ".mapDivs")
      .filter(function () {
        return d3.select(this).style("display") !== "none";
      })
      .nodes();

    //Die gleiche Stelle der sichtbaren Karte nach dem Resize wieder zeigen
    const viewportCenter = pageHeight / 2;
    let anchorMapTile = null;
    let nearestDistance = Infinity;
    visibleMapTiles.forEach((mapTile) => {
      const rect = mapTile.getBoundingClientRect();
      const distance = Math.abs(rect.top + rect.height / 2 - viewportCenter);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        anchorMapTile = mapTile;
      }
    });
    const anchorRect = anchorMapTile?.getBoundingClientRect();
    const anchorProgress = anchorRect
      ? (viewportCenter - anchorRect.top) / anchorRect.height
      : 0;
    const wasAtTop = window.scrollY < 2;

    sharedMissionPathSeriesTransform.setResizing(true);
    globeFollower.setResizing(true);
    if (window.mapScrollObserverCleanup) window.mapScrollObserverCleanup();
    d3.selectAll("*").interrupt();
    sharedMissionPathSeriesTransform.closeAllSeriesViews({
      skipBackgroundUpdate: true,
    });
    d3.timerFlush();
    await new Promise(requestAnimationFrame);

    updateResponsiveMeasurements();
    sharedMissionPathSeriesTransform.resizeLayout({
      divHeight,
      pageWidth,
      pageHeight,
      thumbnailSizePx: isMobileView ? 86 : 120,
    });
    imageKeywordStream.resizeLayout(pageWidth / 3);
    globeFollower.resizeLayout(pageHeight);
    if (wasPath)
      globeFollower.resizeForViewport(d3.select("#globalPathFollower"));
    previewActive = false;
    previewModel = null;

    if (wasPath) {
      d3.select("#mapConnectorOverlay").selectAll(".connLine").remove();
      await transformView(true);
      expandedMapTiles.forEach((mapTile) => {
        const route = d3.select(mapTile).selectAll(".routePathBase").node();
        sharedMissionPathSeriesTransform.call(
          route,
          null,
          d3.select(mapTile).datum(),
          getPathMapTiles().indexOf(mapTile),
        );
      });
      d3.timerFlush();
      await new Promise(requestAnimationFrame);
      d3.selectAll(".routePathProgress, .connLineProgress").each(function () {
        d3.select(this).attr("data-total-length", this.getTotalLength());
      });
    } else {
      d3.selectAll(".mapDivs").each(function (d, index) {
        const position = gridLeftTopByIndex(index);
        const mapTile = d3
          .select(this)
          .style("left", position.left + "px")
          .style("top", position.top + "px");
        applyMapTileSizingProgress(mapTile.select(".mapSVGs"), d, 0);
      });
      applyGridLayoutMode(window.gridLayoutMode);
    }

    syncOverlayDimensions();
    if (anchorMapTile && wasAtTop == false) {
      const rect = anchorMapTile.getBoundingClientRect();
      window.scrollTo({
        top: Math.max(
          0,
          window.scrollY +
            rect.top +
            rect.height * anchorProgress -
            pageHeight / 2,
        ),
        left: 0,
        behavior: "instant",
      });
    } else {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }
    if (wasPath) initMapScrollObserver();
    d3.timerFlush();
    sharedMissionPathSeriesTransform.setResizing(false);
    globeFollower.setResizing(false);
  }

  d3.select(window).on("resize.responsiveLayout", handleResponsiveResize);

  //////////////////////Startansicht anwenden und auf URL-Wechsel reagieren

  const initialHashState = parseHash();
  if (initialHashState.mode === "path") {
    transformView().then(() => {
      if (initialHashState.missionKey) {
        scrollToMissionByKey(initialHashState.missionKey);
      }
    });
  }

  d3.select(window).on("hashchange.urlView", () => {
    const { mode, missionKey } = parseHash();

    if (mode === "path") {
      if (window.arranged == false) {
        transformView().then(() => {
          if (missionKey) {
            scrollToMissionByKey(missionKey);
          }
        });
      } else if (missionKey) {
        scrollToMissionByKey(missionKey);
      }
    } else if (mode === "grid") {
      if (window.arranged == true) {
        transformView();
      }
    }
  });
});
