import { openSeriesLightbox } from "./series-lightbox.js";
import { config, getImageUrl } from "../../config.js";


const dataFields = config.dataFields;

export function createImageKeywordStream({ d3, pathX, onKeywordSelected }) {
  let spawnedPlaces = new Set();
  let streamItems = [];

  //////////////////////Bilder und Keywords im Stream

  const streamSpeed = 2;

  //vertical band for the image stream
  const imageBarZoneTopVh = 20;
  const imageBarZoneHeightVh = 70;

  //positions within the stream band, in percent
  const topMin = 10;
  const topMax = 95;

  // Größe der "quadratischen Box" in Prozent des #imageBar
  const sizeMin = 4;
  const sizeMax = 30;

  const keywordTopN = 1;

  // Bild + Keywords für einen Place in der ImageBar spawnen
  function spawnImageForPlace(mapTile, place, scrollY, scrollDir, keyword) {
    const barSel = d3.select("#imageBar");
    if (barSel.empty() || (place == null)) return;

    const keywordLowercase = keyword
      ? keyword.toLowerCase()
      : null;

    const item = getPhotoForPlace(place, keywordLowercase);
    if (item == null) return;

    const id = `${mapTile.index}|${place.key}`;
    if (spawnedPlaces.has(id) == true) return;
    spawnedPlaces.add(id);

    // Pfad-Linie: gleiche wie in updateImageBarPositions
    const centerX = pathX;

    const imgTopVh =
      imageBarZoneTopVh +
      ((topMin + Math.random() * (topMax * 0.5 - topMin)) / 100) *
        imageBarZoneHeightVh;

    // maximale Kantenlänge (größere Seite des Bildes wird darauf begrenzt)
    const size = sizeMin + Math.random() * (sizeMax - sizeMin);

    let baseX;
    if (scrollDir >= 0) {
      // beim Runterscrollen direkt auf der Pfad-Linie spawnen
      baseX = centerX;
    } else {
      // beim Hochscrollen wie gehabt von rechts reinlaufen
      baseX = window.innerWidth + 200;
    }

    const imgSel = barSel
      .append("img")
      .classed("imageBarImg", true)
      .attr("src", getImageUrl(item.data[dataFields.id.column]))
      .attr("data-id", id)
      .attr("data-spawn-scroll", scrollY)
      .attr("data-speed", streamSpeed)
      .attr("data-target-size", size) // statt target-height
      .attr("data-base-x", baseX)
      .attr("data-x", baseX)
      .attr("data-is-keyword", "0")
      .style("position", "absolute")
      .style("left", baseX + "px")
      .style("top", imgTopVh + "vh")
      // starten mit 0, wachsen über Scroll in updateImageBarPositions()
      .style("max-width", "0%")
      .style("max-height", "0%")
      .style("pointer-events", "auto")
      .attr("data-map-key", place.mapKey || "")
      .attr("data-place-key", place.key || "")
      .style("pointer-events", "auto")
      .datum(item)
      .on("click", function (event) {
        event.stopPropagation();

        const item = d3.select(this).datum();
        openSeriesLightbox({ item: item });
      });

    streamItems.push(imgSel.node());

    // Keywords für diesen Place
    const allKeywords = extractKeywordsFromPlace(place, keywordLowercase);
    const topKeywords = allKeywords.slice(0, keywordTopN);
    if ((topKeywords.length == 0)) return;

    const maxCount = d3.max(topKeywords, (d) => d.count) || 1;
    const minCount = d3.min(topKeywords, (d) => d.count) || 1;

    const fontScale = d3
      .scaleLinear()
      .domain([minCount, maxCount])
      .range([0.4, 1]);

    topKeywords.forEach((keywordValue, idx) => {
      const kwBaseX =
        centerX + (Math.random() - 0.5) * window.innerWidth * 0.2;

      const kwTop = 50 + Math.random() * 30;
      const kwTopVh =
        imageBarZoneTopVh + (kwTop / 100) * imageBarZoneHeightVh;

      const fontTarget = fontScale(keywordValue.count);

      const kwSel = barSel
        .append("span")
        .classed("keywordBarText", true)
        .attr("data-id", `${id}|kw|${idx}`)
        .attr("data-spawn-scroll", scrollY)
        .attr("data-speed", streamSpeed * 0.95)
        .attr("data-base-x", kwBaseX)
        .attr("data-x", kwBaseX)
        .attr("data-is-keyword", "1")
        .attr("data-font-target", fontTarget)
        .style("position", "absolute")
        .style("left", kwBaseX + "px")
        .style("top", kwTopVh + "vh")
        .style("font-size", "0rem")
        .style("opacity", 0)
        .style("pointer-events", "auto")
        .style("cursor", "pointer")
        .on("click", async (event) => {
          event.stopPropagation();
          await onKeywordSelected(keywordValue.key);
        });

      kwSel.text(keywordValue.key);

      streamItems.push(kwSel.node());
    });
  }

  // Position + Größe der ImageBar-Items beim Scrollen updaten
  function updateImageBarPositions(scrollY) {
    const items = streamItems || [];
    if ((items.length == 0)) return;

    // selbe Pfad-Linie wie beim Spawn
    const centerX = pathX;

    items.forEach((el) => {
      const speed = parseFloat(d3.select(el).attr("data-speed")) || 0.4;
      const baseX = parseFloat(d3.select(el).attr("data-base-x"));
      const spawnScroll = parseFloat(
        d3.select(el).attr("data-spawn-scroll"),
      );

      const effectiveBaseX = Number.isFinite(baseX) ? baseX : centerX;
      const effectiveS = Number.isFinite(spawnScroll)
        ? spawnScroll
        : scrollY;

      const x = effectiveBaseX + (scrollY - effectiveS) * speed;

      d3.select(el).attr("data-x", x);
      d3.select(el).style("left", x + "px");

      let f;
      if (x <= centerX) {
        f = 0;
      } else {
        const distRight = x - centerX;
        const maxDistFullSize = window.innerWidth * 0.25;
        f = distRight / maxDistFullSize;
        if (f > 1) f = 1;
        if (f < 0) f = 0;
      }

      if (d3.select(el).attr("data-is-keyword") === "1") {
        const fontTarget = parseFloat(
          d3.select(el).attr("data-font-target"),
        );
        if (Number.isFinite(fontTarget) == true) {
          const sizeRem = fontTarget * f;
          d3.select(el).style("font-size", sizeRem + "rem");
          d3.select(el).style("opacity", f);
        }
      } else {
        // Bilder: größere Seite wird auf currentSize% der ImageBar begrenzt
        const targetSize =
          parseFloat(d3.select(el).attr("data-target-size")) || 10;
        const currentSize = targetSize * f;

        d3.select(el).style("max-width", currentSize + "%");
        d3.select(el).style("max-height", currentSize + "%");
      }
    });
  }

  function updateImageBarFromMapTile(
    mapTileAtScrollLine,
    scrollY,
    scrollDir,
    keyword,
  ) {
    if ((mapTileAtScrollLine == null)) return;

    const mapTile = mapTileAtScrollLine.mapTile;
    const places = mapTile.places || [];
    if ((places.length == 0)) return;

    let f =
      typeof mapTileAtScrollLine.scrollState.scrollProgress === "number"
        ? mapTileAtScrollLine.scrollState.scrollProgress
        : 0;
    f = Math.max(0, Math.min(1, f));

    const maxIdx = places.length - 1;
    if (maxIdx < 0) return;

    const idx = Math.min(maxIdx, Math.floor(f * maxIdx));

    if (mapTile.lastPlaceIndex == null) {
      mapTile.lastPlaceIndex = idx;
      const place = places[idx];
      if (place) {
        spawnImageForPlace(mapTile, place, scrollY, scrollDir, keyword);
      }
      return;
    }

    if (idx === mapTile.lastPlaceIndex) return;

    if (idx > mapTile.lastPlaceIndex) {
      for (let i = mapTile.lastPlaceIndex + 1; i <= idx; i++) {
        const place = places[i];
        if (place) {
          spawnImageForPlace(mapTile, place, scrollY, +1, keyword);
        }
      }
    } else {
      for (let i = mapTile.lastPlaceIndex - 1; i >= idx; i--) {
        const place = places[i];
        if (place) {
          spawnImageForPlace(mapTile, place, scrollY, -1, keyword);
        }
      }
    }

    mapTile.lastPlaceIndex = idx;
  }

  //////////////////////Keywords und Bilder für den Stream auswählen

  function extractKeywordsFromPlace(place, keywordLower = null) {
    if ((place == null) || (Array.isArray(place.children) == false)) return [];

    const counts = new Map();

    place.children.forEach((series) => {
      (series.children || []).forEach((item) => {
        const keywordValue = item.data[dataFields.keywords.column];
        if ((keywordValue == null || keywordValue == "")) return;

        const keywordList = keywordValue
          .split(";")
          .map((s) => s.trim())
          .filter(function (d, i) {
            return Boolean(d);
          });

        const matchesFilter =
          (keywordLower == null || keywordLower == "") ||
          keywordList.some((k) =>
            k.toLowerCase().includes(keywordLower.toLowerCase()),
          );
        if ((matchesFilter == false)) return;

        keywordList.forEach((k) => {
          counts.set(k, (counts.get(k) || 0) + 1);
        });
      });
    });

    return Array.from(counts, ([key, count]) => ({ key, count })).sort(
      (a, b) => b.count - a.count,
    );
  }

  function getPhotoForPlace(place, keyword = null) {
    const matchingPhotos = [];

    for (const series of place.children) {
      for (const photo of series.children) {
        let matchesFilter = true;

        if (keyword) {
          const keywords = photo.data[dataFields.keywords.column] || "";
          matchesFilter = keywords
            .toLowerCase()
            .includes(keyword.toLowerCase());
        }

        if (matchesFilter == true) {
          photo.series = series;
          matchingPhotos.push(photo);
        }
      }
    }

    if (matchingPhotos.length == 0) {
      return null;
    } else {
      return matchingPhotos[
        Math.floor(Math.random() * matchingPhotos.length)
      ];
    }
  }

  function clear() {
    d3.select("#imageBar").selectAll("*").remove();
    d3.selectAll(streamItems).remove();
    streamItems = [];
    spawnedPlaces = new Set();
  }

  function resizeLayout(nextPathX) {
    pathX = nextPathX;
    clear();
  }

  return {
    resizeLayout,
    updateFromMapTile: updateImageBarFromMapTile,
    updatePositions: updateImageBarPositions,
    getKeywords: extractKeywordsFromPlace,
    clear,
  };
}
