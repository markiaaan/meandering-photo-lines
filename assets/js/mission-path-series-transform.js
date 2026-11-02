//////////////////////Fotoserien im Pfad entfalten und wieder schließen
import { openSeriesLightbox } from "./series-lightbox.js";
import { config, getImageUrl } from "../../config.js";

const dataFields = config.dataFields;

//Erstellt die Funktion, mit der eine Karte im Pfad entfaltet und wieder geschlossen wird
export function createMissionPathSeriesTransform({
  d3,
  lineGen,
  divHeight,
  pageWidth,
  pageHeight,
  thumbnailSizePx = 120,
}) {
  let resizing = false;

  //Schaltet Animationen während eines Resize aus, damit der Neuaufbau sofort erfolgt
  function getDuration(duration) {
    if (resizing) return 0;
    return duration;
  }

  //Gibt die Karten in der Reihenfolge zurück, in der sie im Pfad liegen
  function getPathDivs() {
    return d3.selectAll(".mapDivs.in-path").nodes();
  }

  //Findet das Mission-Label, das zu einer bestimmten Karte gehört
  function getMissionLabel(yearOverlaySel, mapTileIndex) {
    return yearOverlaySel.selectAll("p.missionLabel").filter(function (d, i) {
      return i === mapTileIndex;
    });
  }

  //Ersetzt die Fotoanzahl der entfalteten Karte durch CLOSE und merkt sich die Anzahl
  function showCloseInMissionLabel(mapTileIndex) {
    if (mapTileIndex < 0) return;

    const countSel = getMissionLabel(
      d3.select("#yearOverlay"),
      mapTileIndex,
    ).select(".countNum");
    if (countSel.empty()) return;

    if (countSel.attr("data-orig-text") == null) {
      countSel.attr("data-orig-text", countSel.text());
    }

    countSel.text("CLOSE");
  }

  //Stellt beim Schließen die zuvor gespeicherte Fotoanzahl wieder her
  function restoreCountInMissionLabel(mapTileIndex) {
    if (mapTileIndex < 0) return;

    const countSel = getMissionLabel(
      d3.select("#yearOverlay"),
      mapTileIndex,
    ).select(".countNum");
    if (countSel.empty()) return;

    const originalCount = countSel.attr("data-orig-text");
    if (originalCount != null) countSel.text(originalCount);
  }

  //Liest aus der CSS-Transformation, wie stark eine Karte gerade skaliert ist
  function getElementScale(el) {
    if (!el) return 1;
    const tr = window.getComputedStyle(el).transform;
    if (!tr || tr === "none") return 1;

    const m = tr.match(/matrix\(([^)]+)\)/);
    if (!m) return 1;

    const parts = m[1].split(",").map((x) => parseFloat(x.trim()));
    if (parts.length < 6) return 1;

    const [a, b, c, d] = parts;
    const scaleX = Math.sqrt(a * a + b * b);
    const scaleY = Math.sqrt(c * c + d * d);
    const s = (scaleX + scaleY) / 2;
    return Number.isFinite(s) && s > 0 ? s : 1;
  }

  //Liest den sichtbaren SVG-Ausschnitt und nutzt Breite und Höhe nur als Ersatzwerte
  function getSvgViewBox(svgEl, fallbackW = 0, fallbackH = 0) {
    const vb =
      svgEl.viewBox && svgEl.viewBox.baseVal ? svgEl.viewBox.baseVal : null;

    if (
      vb &&
      Number.isFinite(vb.width) &&
      vb.width > 0 &&
      Number.isFinite(vb.height) &&
      vb.height > 0
    ) {
      return { x: vb.x, y: vb.y, w: vb.width, h: vb.height };
    }

    const w = +d3.select(svgEl).attr("width") || fallbackW;
    const h = +d3.select(svgEl).attr("height") || fallbackH;
    return { x: 0, y: 0, w, h };
  }

  //Prüft, ob ein Foto zum aktuell ausgewählten Keyword gehört
  function itemMatchesActiveKeyword(item) {
    const keyword = window.activeKeyword;
    if (!keyword) return true;

    const keywords = item.data[dataFields.keywords.column];
    if (!keywords) return false;

    return keywords.toLowerCase().includes(keyword.toLowerCase());
  }

  //Blendet Stream und Globe aus, wenn eine entfaltete Karte die Bildschirmmitte erreicht
  function updateExpandedBackgroundVisibility() {
    const expanded = d3.selectAll(".mapDivs.seriesExpanded");
    if (!window.arranged) return;
    const hasExpanded = expanded.size() > 0;

    let shouldHide = false;
    if (hasExpanded) {
      const viewportY = window.innerHeight * 0.5;
      expanded.each(function () {
        if (shouldHide) return;
        const r = this.getBoundingClientRect();
        if (viewportY >= r.top && viewportY <= r.bottom) {
          shouldHide = true;
        }
      });
    }

    d3.select("#imageBar")
      .interrupt()
      .style("pointer-events", hasExpanded && shouldHide ? "none" : "auto")
      .transition()
      .duration(getDuration(200))
      .style("opacity", hasExpanded && shouldHide ? 0 : 1);

    d3.select("#globalPathFollower")
      .interrupt()
      .style("pointer-events", hasExpanded && shouldHide ? "none" : "auto")
      .transition()
      .duration(getDuration(200))
      .style("opacity", hasExpanded && shouldHide ? 0 : 1);
  }

  //Setzt die Verbindungen ab dieser Karte auf ihre ursprüngliche Pfadform zurück
  function recomputeConnectorsFrom(mapTileIndex) {
    const overlay = d3.select("#mapConnectorOverlay");
    if (overlay.empty() || mapTileIndex < 0) return;

    overlay
      .selectAll("path.connLine")
      .filter(function () {
        const type = d3.select(this).attr("data-connector-type");
        const upper = +d3.select(this).attr("data-upper-index");
        const lower = +d3.select(this).attr("data-lower-index");
        if (type === "top") return lower >= mapTileIndex;
        return upper >= mapTileIndex || lower >= mapTileIndex;
      })
      .each(function () {
        const sel = d3.select(this);
        const origD = sel.attr("data-orig-d");
        if (!origD) return;
        sel
          .interrupt()
          .transition()
          .duration(getDuration(400))
          .attr("d", origD);
      });
  }

  //Schließt eine entfaltete Karte und stellt Pfad, Höhe, Bilder und Beschriftungen wieder her
  function closeSeriesViewForMapTile(mapDiv, options = {}) {
    const { skipBackgroundUpdate = false } = options;
    if (!mapDiv) return;

    const divSel = d3.select(mapDiv);
    const svgSel = divSel.select("svg.mapSVGs");
    if (svgSel.empty()) return;

    const mapTileIndex = getPathDivs().indexOf(mapDiv);
    const containerEl = d3.select("#" + "mapContainer").node();

    const basePathSel = svgSel.select("path.routePathBase");
    const progPathSel = svgSel.select("path.routePathProgress");

    //Pfad und Fortschrittslinie wieder in ihre ursprüngliche Form bringen
    if (!basePathSel.empty()) {
      const origD = basePathSel.attr("data-orig-d");
      const gradId = basePathSel.attr("data-grad-id");

      if (origD) {
        basePathSel
          .interrupt()
          .transition()
          .duration(getDuration(400))
          .attr("d", origD)
          .style("stroke", gradId ? `url(#${gradId})` : "#ffffff")
          .on("end", function () {
            if (!progPathSel.empty()) {
              progPathSel.interrupt().attr("d", origD);

              const node = progPathSel.node();
              if (node) {
                const L = node.getTotalLength();
                progPathSel
                  .attr("data-total-length", L)
                  .attr("data-orig-total-length", L)
                  .style("stroke-dasharray", `${L} ${L}`)
                  .style("stroke-dashoffset", L);
              }
            }
          });
      }
    }

    if (!progPathSel.empty()) {
      const origOpacity = progPathSel.attr("data-orig-opacity");
      if (origOpacity != null && origOpacity !== "") {
        progPathSel
          .interrupt()
          .transition()
          .duration(getDuration(400))
          .style("opacity", +origOpacity);
      }
    }

    //Ortsmarkierungen zurückbewegen
    svgSel.selectAll("circle.place").each(function () {
      const c = d3.select(this);
      const ox = c.attr("data-orig-cx");
      const oy = c.attr("data-orig-cy");
      if (ox != null && oy != null) {
        c.interrupt()
          .transition()
          .duration(getDuration(400))
          .attr("cx", ox)
          .attr("cy", oy);
      }
    });

    //Serienbilder entfernen
    svgSel.selectAll("g.seriesThumbGroup").remove();
    d3.select("#yearOverlay")
      .selectAll(".seriesG")
      .filter(function () {
        return (
          d3.select(this).attr("data-map-tile-index") === String(mapTileIndex)
        );
      })
      .remove();

    //Ursprünglichen SVG-Ausschnitt wiederherstellen
    const origVB = svgSel.attr("data-orig-viewbox");
    if (origVB) svgSel.attr("viewBox", origVB);

    //Ortsnamen entfernen und Länderzeile zurücksetzen
    const yearOverlaySel = d3.select("#yearOverlay");
    if (!yearOverlaySel.empty() && mapTileIndex >= 0) {
      yearOverlaySel
        .selectAll("p.seriesPlaceLabel")
        .filter(function () {
          return (
            d3.select(this).attr("data-map-tile-index") === String(mapTileIndex)
          );
        })
        .remove();

      const missionLabel = getMissionLabel(yearOverlaySel, mapTileIndex);
      const missionLabelNode = missionLabel.node();
      if (missionLabelNode) {
        const origLeft = missionLabel.attr("data-orig-left");
        const origTop = missionLabel.attr("data-orig-top");
        if (origLeft != null && origTop != null) {
          missionLabel
            .interrupt()
            .transition()
            .duration(getDuration(300))
            .style("left", origLeft)
            .style("top", origTop);
        }
      }
    }

    // Layout reset (CSS/layout px)
    if (mapTileIndex >= 0) {
      const origHeight =
        parseFloat(divSel.attr("data-orig-height")) || divHeight;
      const deltaCssPx = parseFloat(divSel.attr("data-expanded-deltaH")) || 0;

      divSel
        .interrupt()
        .transition()
        .duration(getDuration(400))
        .style("height", origHeight + "px");

      //Karten-SVG wieder auf die ursprüngliche Höhe setzen
      divSel
        .select("svg.mapSVGs")
        .interrupt()
        .transition()
        .duration(getDuration(400))
        .attr("height", origHeight)
        .style("height", origHeight + "px");

      if (deltaCssPx !== 0) {
        // pull mapTiles below back up
        d3.selectAll(".mapDivs.in-path")
          .filter(function (d, i) {
            return i > mapTileIndex;
          })
          .interrupt()
          .transition()
          .duration(getDuration(400))
          .style("top", function () {
            const t = parseFloat(d3.select(this).style("top")) || 0;
            return t - deltaCssPx + "px";
          });

        //Die folgenden Mission-Labels wieder nach oben ziehen
        d3.selectAll("#yearOverlay .missionLabel")
          .filter(function (d, i) {
            return i > mapTileIndex;
          })
          .interrupt()
          .transition()
          .duration(getDuration(400))
          .style("top", function () {
            const t = parseFloat(d3.select(this).style("top")) || 0;
            return t - deltaCssPx + "px";
          });

        if (containerEl) {
          d3.select("#mapConnectorOverlay").attr(
            "height",
            containerEl.scrollHeight,
          );
          d3.select("#mapFollowerOverlay").attr(
            "height",
            containerEl.scrollHeight,
          );
        }
      }
    }

    recomputeConnectorsFrom(mapTileIndex);

    //Schließen-Button und gespeicherte Werte entfernen
    divSel.selectAll(".seriesCloseButton").remove();
    d3.select("#yearOverlay")
      .selectAll(".seriesCloseButton")
      .filter(function () {
        return (
          d3.select(this).attr("data-map-tile-index") === String(mapTileIndex)
        );
      })
      .remove();
    restoreCountInMissionLabel(mapTileIndex);
    divSel.classed("seriesExpanded", false);
    divSel.attr("data-orig-height", null);
    divSel.attr("data-expanded-deltaH", null);

    if (window.arranged && !skipBackgroundUpdate) {
      updateExpandedBackgroundVisibility();
    }
  }

  //Entfaltet oder schließt die angeklickte Karte im Pfad
  function missionPathSeriesTransform(event, d, i) {
    const duration = getDuration(600);
    const paddingY = 10;

    const countryLabelYOffset = -8;
    const placeLabelYOffset = -4;

    const pathSel = d3.select(this);
    const svgNode = pathSel.node()?.ownerSVGElement;
    const mapDiv = this.closest(".mapDivs");

    const pathDivs = getPathDivs();
    const mapTileIndex = pathDivs.indexOf(mapDiv);

    const containerEl = d3.select("#" + "mapContainer").node();

    if (mapDiv && mapTileIndex >= 0)
      d3.select(mapDiv).attr("data-map-tile-index", mapTileIndex);

    //Ein weiterer Klick schließt die entfaltete Karte
    if (mapDiv && d3.select(mapDiv).classed("seriesExpanded")) {
      closeSeriesViewForMapTile(mapDiv);
      return;
    }

    const otherExpanded = d3
      .selectAll(".mapDivs.seriesExpanded")
      .filter(function () {
        return this !== mapDiv;
      });

    if (!otherExpanded.empty()) {
      missionPathSeriesTransform.closeAllSeriesViews();

      window.setTimeout(() => {
        if (mapDiv && typeof mapDiv.scrollIntoView === "function") {
          mapDiv.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }

        window.setTimeout(() => {
          missionPathSeriesTransform.call(pathSel.node(), event, d, i);
        }, 250);
      }, 430);

      return;
    }

    // Expand
    pathSel.style("stroke", "var(--highlightColor)");
    showCloseInMissionLabel(mapTileIndex);

    const mapTileScale = getElementScale(mapDiv);

    const svgSel = d3.select(svgNode);
    const vb0 = getSvgViewBox(svgNode, pageWidth, divHeight);
    const viewH = vb0.h > 0 ? vb0.h : divHeight;

    //Den ursprünglichen SVG-Ausschnitt für das spätere Schließen merken (viewbox not equal px)
    if (!svgSel.attr("data-orig-viewbox")) {
      const vbStr = svgSel.attr("viewBox");
      if (vbStr) svgSel.attr("data-orig-viewbox", vbStr);
      else svgSel.attr("data-orig-viewbox", `0 0 ${vb0.w} ${vb0.h}`);
    }

    const currentCssMapTileHeightPx = mapDiv.offsetHeight || divHeight;

    //Bildschirm-Pixel pro SVG-Einheit; Kartengröße und Skalierung berücksichtigen
    let pxPerSvgUnit = (currentCssMapTileHeightPx * mapTileScale) / viewH;
    if (!Number.isFinite(pxPerSvgUnit) || pxPerSvgUnit <= 0) pxPerSvgUnit = 1;

    //Bildgröße in SVG-Einheiten umrechnen
    const thumbPx = thumbnailSizePx;
    const thumbSvg = thumbPx / pxPerSvgUnit;

    const places = d3
      .select(this.parentNode)
      .selectAll(".place")
      .filter(function () {
        return d3.select(this).style("display") !== "none";
      });
    const amountPlaces = places.size();
    if (!amountPlaces) return;

    const startCoords = [];
    places.each(function (place, placeIndex) {
      const placeCircle = d3.select(this);
      const cx = +placeCircle.attr("cx");
      const cy = +placeCircle.attr("cy");
      startCoords[placeIndex] = [cx, cy];

      if (!placeCircle.attr("data-orig-cx"))
        placeCircle.attr("data-orig-cx", cx);
      if (!placeCircle.attr("data-orig-cy"))
        placeCircle.attr("data-orig-cy", cy);
    });

    //Die ursprüngliche Pfadform für das spätere Schließen merken
    if (!pathSel.attr("data-orig-d"))
      pathSel.attr("data-orig-d", pathSel.attr("d") || "");

    //Fortschrittslinie wird beim Entfalten verändert
    const progSel = d3.select(this.parentNode).select("path.routePathProgress");
    if (!progSel.empty() && !progSel.attr("data-orig-d")) {
      const node = progSel.node();
      const L = node ? node.getTotalLength() : 0;
      progSel
        .attr("data-orig-d", progSel.attr("d") || "")
        .attr("data-orig-total-length", L)
        .attr("data-total-length", L)
        .style("stroke-dasharray", `${L} ${L}`)
        .style("stroke-dashoffset", L);

      const currentOpacity = progSel.style("opacity") || "1";
      if (!progSel.attr("data-orig-opacity"))
        progSel.attr("data-orig-opacity", currentOpacity);
    }

    const series = d.children;
    const filteredSeries = series.filter(function (d, i) {
      const matchingItems = d.children.filter(function (d, i) {
        return itemMatchesActiveKeyword(d);
      });
      return matchingItems.length > 0;
    });
    const seriesCount = Math.max(1, filteredSeries.length);

    const rawLineHeightSvg = seriesCount > 1 ? thumbSvg * (seriesCount - 1) : 0; //Abstand vom ersten bis zum letzten Bildanfang; Bilder liegen direkt aneinander
    const neededHeightSvg = rawLineHeightSvg + thumbSvg + 2 * paddingY; //letztes Bild und Platz oben/unten kommen noch dazu

    const currentSvgHeight = viewH;
    let newSvgHeight = Math.max(currentSvgHeight, neededHeightSvg);

    const maxSpanSvg = Math.max(0, newSvgHeight - 2 * paddingY - thumbSvg);
    const lineHeightSvg =
      seriesCount > 1 ? Math.min(rawLineHeightSvg, maxSpanSvg) : 0;
    const actualSpacingSvg =
      seriesCount > 1 ? lineHeightSvg / (seriesCount - 1) : 0; //Abstand zwischen zwei Serienanfängen

    const startY = paddingY;

    const svgWidthLocal = vb0.w || pageWidth;
    const targetX = svgWidthLocal / 2; //entfalteter Pfad liegt mittig im SVG

    const endCoords = startCoords.map((p, idx) => {
      const t = amountPlaces > 1 ? idx / (amountPlaces - 1) : 0.5; //Ort auf der Linie verteilen: 0 ist oben, 1 unten; einzelner Ort in der Mitte
      const y = startY + t * lineHeightSvg; //Startposition plus den jeweiligen Anteil der Linienhöhe
      return [targetX, y];
    });

    //Berechnet für jeden Animationsschritt die Position zwischen Karte und entfalteter Linie
    function interpPlace(t, idx) {
      const x0 = startCoords[idx][0];
      const y0 = startCoords[idx][1];
      const x1 = endCoords[idx][0];
      const y1 = endCoords[idx][1];
      return { x: x0 + (x1 - x0) * t, y: y0 + (y1 - y0) * t }; //t ist der Animationsfortschritt: bei 0 alte Position, bei 1 neue Position
    }

    //////////////////////Karte verlängern und die folgenden Karten nach unten schieben

    if (svgNode && mapDiv && mapTileIndex >= 0) {
      const divSel = d3.select(mapDiv);

      if (window.getComputedStyle(mapDiv).position === "static") {
        divSel.style("position", "relative");
      }

      // Convert required SVG height -> VISUAL px -> CSS px (divide by mapTileScale)
      const newVisualHeightPx = newSvgHeight * pxPerSvgUnit;
      const newCssHeightPx = newVisualHeightPx / mapTileScale;

      const deltaCssPx = newCssHeightPx - currentCssMapTileHeightPx;

      if (Math.abs(deltaCssPx) > 0.5) {
        divSel
          .attr("data-orig-height", currentCssMapTileHeightPx)
          .attr("data-expanded-deltaH", deltaCssPx)
          .classed("seriesExpanded", true);
        updateExpandedBackgroundVisibility();

        //Die Karte auf die benötigte Höhe verlängern
        divSel
          .transition()
          .duration(duration)
          .style("height", newCssHeightPx + "px");

        //Karten-SVG auf die Höhe der entfalteten Serien verlängern
        divSel
          .select("svg.mapSVGs")
          .interrupt()
          .transition()
          .duration(duration)
          .attr("height", newCssHeightPx)
          .style("height", newCssHeightPx + "px");

        //SVG-Ausschnitt genauso stark verlängern wie die angezeigte Höhe
        //so bleiben Bilder und Punkte gleich groß
        const vbOrig = getSvgViewBox(svgNode, svgWidthLocal, currentSvgHeight);
        const ratio = newCssHeightPx / Math.max(1, currentCssMapTileHeightPx);
        const vbNew = {
          x: vbOrig.x,
          y: vbOrig.y,
          w: vbOrig.w,
          h: vbOrig.h * ratio,
        };
        svgSel.attr("viewBox", `${vbNew.x} ${vbNew.y} ${vbNew.w} ${vbNew.h}`);

        //Die folgenden Karten nach unten schieben
        d3.selectAll(".mapDivs.in-path")
          .filter(function (d, i) {
            return i > mapTileIndex;
          })
          .transition()
          .duration(duration)
          .style("top", function () {
            const t = parseFloat(d3.select(this).style("top")) || 0;
            return t + deltaCssPx + "px";
          });

        //Die folgenden Mission-Labels ebenfalls nach unten schieben
        d3.selectAll("#yearOverlay .missionLabel")
          .filter(function (d, i) {
            return i > mapTileIndex;
          })
          .transition()
          .duration(duration)
          .style("top", function () {
            const t = parseFloat(d3.select(this).style("top")) || 0;
            return t + deltaCssPx + "px";
          });

        if (containerEl) {
          d3.select("#mapConnectorOverlay").attr(
            "height",
            containerEl.scrollHeight,
          );
          d3.select("#mapFollowerOverlay").attr(
            "height",
            containerEl.scrollHeight,
          );
        }
      } else {
        divSel.classed("seriesExpanded", true);
        updateExpandedBackgroundVisibility();
      }
    }

    places
      .transition()
      .duration(duration)
      .attrTween("cx", function (place, placeIndex) {
        return function (t) {
          return interpPlace(t, placeIndex).x;
        };
      })
      .attrTween("cy", function (place, placeIndex) {
        return function (t) {
          return interpPlace(t, placeIndex).y;
        };
      });

    //Den Kartenpfad zu einer senkrechten Linie entfalten
    pathSel
      .transition()
      .duration(duration)
      .attrTween("d", function () {
        return function (t) {
          const interpCoords = startCoords.map((p, idx) => {
            const pt = interpPlace(t, idx);
            return [pt.x, pt.y];
          });
          return lineGen(interpCoords);
        };
      })
      .on("end", function () {
        if (!seriesCount) return;

        const g = d3.select(pathSel.node().parentNode);
        g.selectAll("g.seriesThumbGroup").remove();

        //Serien mit sichtbaren Bildern sammeln
        const seriesWithImages = filteredSeries
          .map((s) => {
            const itemsWithThumb = s.children.filter(function (d, i) {
              return itemMatchesActiveKeyword(d);
            });
            if (!itemsWithThumb.length) return null;

            itemsWithThumb.forEach((it) => {
              it.series = s;
            });

            const firstItem = itemsWithThumb[0];

            const thumbWidthSvg = thumbSvg;
            const thumbHeightSvg = thumbSvg;
            const thumbWidthPx = thumbPx;
            const thumbHeightPx = thumbPx;

            const frames = itemsWithThumb.map((it) =>
              getImageUrl(it.data[dataFields.id.column], "XS"),
            );
            const count =
              typeof s.count === "number" && s.count > 0
                ? s.count
                : itemsWithThumb.length;

            const countStr = String(count || 0);
            const badgeWidth = 10 + 6 * countStr.length;

            const placeName =
              s.places && s.places.length
                ? String(s.places[0].name || "").split(",")[0]
                : "";

            return {
              series: s,
              item: firstItem,
              thumbWidthSvg,
              thumbHeightSvg,
              thumbWidthPx,
              thumbHeightPx,
              count,
              countStr,
              badgeWidth,
              frames,
              placeName,
            };
          })
          .filter(function (d, i) {
            return Boolean(d);
          });

        if (!seriesWithImages.length) return;

        const yearOverlaySel = d3.select("#yearOverlay");
        const overlayNode = yearOverlaySel.node();
        if (!overlayNode) return;

        const overlayRect = overlayNode.getBoundingClientRect();
        const svgRectNow = svgNode.getBoundingClientRect();
        const vbNow = getSvgViewBox(svgNode, svgWidthLocal, newSvgHeight);
        const svgPxPerUnitX = svgRectNow.width / vbNow.w;
        const svgPxPerUnitY = svgRectNow.height / vbNow.h;

        yearOverlaySel
          .selectAll(".seriesG")
          .filter(function () {
            return (
              d3.select(this).attr("data-map-tile-index") ===
              String(mapTileIndex)
            );
          })
          .remove();

        const maxLayers = 50;
        const offsetSvg = 3;
        const offsetHoverFactor = 0.75;
        const thumbNodes = [];

        seriesWithImages.forEach((dd, idx) => {
          const layers = Math.min(dd.count, maxLayers);
          const yTop = startY + idx * actualSpacingSvg;
          const targetXPx = (targetX - vbNow.x) * svgPxPerUnitX;
          const targetYPx = (yTop - vbNow.y) * svgPxPerUnitY;
          const leftRel =
            svgRectNow.left +
            targetXPx -
            dd.thumbWidthPx / 2 -
            overlayRect.left;
          const topRel = svgRectNow.top + targetYPx - overlayRect.top;

          const itemSel = yearOverlaySel
            .append("div")
            .attr("class", "seriesG")
            .attr("data-map-tile-index", String(mapTileIndex))
            .style("left", leftRel + "px")
            .style("top", topRel + "px")
            .style(
              "width",
              dd.thumbWidthPx +
                dd.thumbWidthPx * offsetHoverFactor * Math.max(0, layers - 1) +
                "px",
            )
            .style("height", dd.thumbHeightPx + "px");

          for (let pileIdx = layers - 1; pileIdx >= 1; pileIdx--) {
            const frameIdx = Math.min(dd.frames.length - 1, pileIdx);
            const frameHref = dd.frames[frameIdx];

            itemSel
              .append("img")
              .attr("class", "seriesThumb seriesThumbPile")
              .attr("data-pile-index", pileIdx)
              .attr("src", frameHref)
              .style("width", dd.thumbWidthPx + "px")
              .style("height", dd.thumbHeightPx + "px")
              .style("left", pileIdx * offsetSvg + "px");
          }

          itemSel
            .append("img")
            .attr("class", "seriesThumb seriesFirstImage")
            .attr("src", dd.frames[0])
            .style("width", dd.thumbWidthPx + "px")
            .style("height", dd.thumbHeightPx + "px");

          //Fächert die Bilder einer Serie beim Darüberfahren auf
          function expandThumbStack(containerNode) {
            d3.select(containerNode)
              .selectAll("img.seriesThumbPile")
              .interrupt()
              .transition()
              .duration(getDuration(150))
              .style("left", function () {
                const k = +d3.select(this).attr("data-pile-index") || 0;
                return k * dd.thumbWidthPx * offsetHoverFactor + "px";
              })
              .style("opacity", 1);

            d3.select(containerNode)
              .selectAll("img.seriesFirstImage")
              .interrupt()
              .transition()
              .duration(getDuration(150))
              .style("opacity", 1);
          }

          //Schiebt die aufgefächerten Bilder wieder zu einem Stapel zusammen
          function collapseThumbStack(containerNode) {
            d3.select(containerNode)
              .selectAll("img.seriesThumbPile")
              .interrupt()
              .transition()
              .duration(getDuration(150))
              .style("left", function () {
                const k = +d3.select(this).attr("data-pile-index") || 0;
                return k * offsetSvg + "px";
              })
              .style("opacity", 0.35);

            d3.select(containerNode)
              .selectAll("img.seriesFirstImage")
              .interrupt()
              .transition()
              .duration(getDuration(150))
              .style("opacity", 1);
          }

          itemSel
            .on("click", (ev) => {
              ev.stopPropagation();

              openSeriesLightbox({ item: dd.item });
            })
            .on("mouseenter", function () {
              expandThumbStack(this);
            })
            .on("mouseleave", function () {
              collapseThumbStack(this);
            });

          //Anzahl der Fotos in der Serie
          const badgeTotalWidth = dd.badgeWidth + 8;
          itemSel
            .append("div")
            .attr("class", "seriesThumbBadge")
            .style(
              "left",
              Math.max(0, dd.thumbWidthPx - badgeTotalWidth - 2) + "px",
            )
            .style("min-width", dd.badgeWidth + "px")
            .text(dd.countStr);

          itemSel.transition().duration(getDuration(300)).style("opacity", 1);
          thumbNodes.push(itemSel.node());
        });

        const firstThumbNode = thumbNodes[0]
          ? d3.select(thumbNodes[0]).selectAll("img.seriesFirstImage").node()
          : null;

        //Länder- und Ortsnamen neben den Serienbildern ausrichten
        if (!yearOverlaySel.empty() && mapTileIndex >= 0) {
          //Die Länderzeile am ersten Serienbild ausrichten
          if (firstThumbNode) {
            const missionLabel = getMissionLabel(yearOverlaySel, mapTileIndex);
            const missionLabelNode = missionLabel.node();

            if (missionLabelNode) {
              if (!missionLabel.attr("data-orig-left")) {
                missionLabel.attr(
                  "data-orig-left",
                  missionLabel.style("left") || "0px",
                );
                missionLabel.attr(
                  "data-orig-top",
                  missionLabel.style("top") || "0px",
                );
              }

              const imgRect = firstThumbNode.getBoundingClientRect();
              const missionLabelRect = missionLabelNode.getBoundingClientRect();
              const gap = 10;

              const missionLabelRight = imgRect.left - gap;
              const missionLabelLeft =
                missionLabelRight - missionLabelRect.width;
              const missionLabelTop = imgRect.top + countryLabelYOffset;

              const leftRel = missionLabelLeft - overlayRect.left;
              const topRel = missionLabelTop - overlayRect.top;

              missionLabel
                .style("left", leftRel + "px")
                .style("top", topRel + "px")
                .transition()
                .duration(getDuration(300))
                .style("opacity", 1);
            }
          }

          //Einen Ortsnamen nur beim ersten Bild dieses Ortes zeigen
          yearOverlaySel
            .selectAll("p.seriesPlaceLabel")
            .filter(function () {
              return (
                d3.select(this).attr("data-map-tile-index") ===
                String(mapTileIndex)
              );
            })
            .remove();

          let lastPlace = null;
          const labelGapX = 10;

          seriesWithImages.forEach((entry, sIdx) => {
            const placeName = entry.placeName;
            if (!placeName) return;
            if (placeName === lastPlace) return;
            lastPlace = placeName;

            const groupNode = thumbNodes[sIdx];
            if (!groupNode) return;

            const frontImgNode = d3
              .select(groupNode)
              .selectAll("img.seriesFirstImage")
              .node();
            if (!frontImgNode) return;

            const imgRect = frontImgNode.getBoundingClientRect();

            const labelSel = yearOverlaySel
              .append("p")
              .attr("class", "seriesPlaceLabel")
              .attr("data-map-tile-index", String(mapTileIndex))
              .text(placeName);

            const labelNode = labelSel.node();
            const labelRect = labelNode.getBoundingClientRect();

            const labelRightDoc = imgRect.left - labelGapX;
            const labelLeftDoc = labelRightDoc - labelRect.width;
            const labelTopDoc = imgRect.top + placeLabelYOffset;

            const leftRel = labelLeftDoc - overlayRect.left;
            const topRel = labelTopDoc - overlayRect.top;

            labelSel
              .style("left", leftRel + "px")
              .style("top", topRel + "px")
              .transition()
              .duration(getDuration(300))
              .style("opacity", 1);
          });
        }

        //Schließen-Button oben rechts auf der entfalteten Karte
        if (mapDiv && mapTileIndex >= 0) {
          const yearOverlaySel = d3.select("#yearOverlay");
          const overlayNode = yearOverlaySel.node();

          if (!yearOverlaySel.empty() && overlayNode) {
            yearOverlaySel
              .selectAll(".seriesCloseButton")
              .filter(function () {
                return (
                  d3.select(this).attr("data-map-tile-index") ===
                  String(mapTileIndex)
                );
              })
              .remove();

            const mapRect = mapDiv.getBoundingClientRect();
            const overlayRect = overlayNode.getBoundingClientRect();

            yearOverlaySel
              .append("div")
              .attr("class", "seriesCloseButton")
              .attr("data-map-tile-index", String(mapTileIndex))
              .style("top", mapRect.top - overlayRect.top + 8 + "px")
              .style("left", mapRect.right - overlayRect.left - 30 + "px")
              .text("×")
              .on("click", (ev) => {
                ev.stopPropagation();
                closeSeriesViewForMapTile(mapDiv);
              });
          }
        }
      });

    //Die Fortschrittslinie zusammen mit dem Kartenpfad entfalten
    if (!progSel.empty()) {
      progSel
        .transition()
        .duration(duration)
        .attrTween("d", function () {
          return function (t) {
            const interpCoords = startCoords.map((p, idx) => {
              const pt = interpPlace(t, idx);
              return [pt.x, pt.y];
            });
            return lineGen(interpCoords);
          };
        });
    }

    //Die Verbindungen an die neuen Positionen der Karten anpassen
    if (mapTileIndex >= 0 && containerEl) {
      const overlay = d3.select("#mapConnectorOverlay");

      //Findet den oberen oder unteren Anschlusspunkt einer Karte für die Verbindungslinie
      function getMapTileConnectionPoint(targetMapTileIndex, endpoint) {
        const div = pathDivs[targetMapTileIndex];
        if (!div) return null;

        const svg = d3.select(div).selectAll("svg.mapSVGs").node();
        if (!svg) return null;

        const contRect = containerEl.getBoundingClientRect();

        if (endpoint === "last") {
          const overlayThumbs = d3
            .selectAll(
              `.seriesG[data-map-tile-index="${targetMapTileIndex}"] img.seriesFirstImage`,
            )
            .nodes();
          if (overlayThumbs.length) {
            const lastImg = overlayThumbs[overlayThumbs.length - 1];
            const r = lastImg.getBoundingClientRect();
            return {
              x: r.left + r.width / 2 - contRect.left,
              y: r.bottom - contRect.top + 4, //Verbindung 4 Pixel unter dem letzten Bild ansetzen
            };
          }
        }

        const circles = d3
          .select(svg)
          .selectAll("g.mapMarkersG circle.place")
          .nodes()
          .filter(function (d, i) {
            return window.getComputedStyle(d).display !== "none";
          });
        if (!circles.length) return null;

        const el =
          endpoint === "first" ? circles[0] : circles[circles.length - 1];

        const cRect = el.getBoundingClientRect();

        return {
          x: cRect.left + cRect.width / 2 - contRect.left,
          y: cRect.top + cRect.height / 2 - contRect.top,
        };
      }

      overlay
        .selectAll("path.connLine")
        .filter(function () {
          const type = d3.select(this).attr("data-connector-type");
          const upper = +d3.select(this).attr("data-upper-index");
          const lower = +d3.select(this).attr("data-lower-index");
          if (type === "top") return lower >= mapTileIndex;
          return upper >= mapTileIndex || lower >= mapTileIndex;
        })
        .each(function () {
          const sel = d3.select(this);
          if (!sel.attr("data-orig-d"))
            sel.attr("data-orig-d", sel.attr("d") || "");
        })
        .transition()
        .duration(duration)
        .style("opacity", function () {
          const type = d3.select(this).attr("data-connector-type");
          const upper = +d3.select(this).attr("data-upper-index");
          const lower = +d3.select(this).attr("data-lower-index");

          if (type === "top") {
            return getMapTileConnectionPoint(lower, "first") ? 1 : 0;
          }

          return getMapTileConnectionPoint(upper, "last") &&
            getMapTileConnectionPoint(lower, "first")
            ? 1
            : 0;
        })
        .attrTween("d", function () {
          const node = this;
          const type = d3.select(node).attr("data-connector-type");
          const upper = +d3.select(node).attr("data-upper-index");
          const lower = +d3.select(node).attr("data-lower-index");

          return function () {
            const contRect = containerEl.getBoundingClientRect();

            let connectionStart;
            let connectionEnd;
            if (type === "top") {
              connectionStart = getMapTileConnectionPoint(lower, "first");
              if (!connectionStart) return "";
              connectionEnd = { x: pageWidth / 2 - contRect.left, y: 0 };
            } else {
              connectionStart = getMapTileConnectionPoint(upper, "last");
              connectionEnd = getMapTileConnectionPoint(lower, "first");
              if (!connectionStart || !connectionEnd) return "";
            }

            const ctrlX = (connectionStart.x + connectionEnd.x) / 2;
            const ctrlY = (connectionStart.y + connectionEnd.y) / 2 - 40;

            return `M ${connectionStart.x},${connectionStart.y} Q ${ctrlX},${ctrlY} ${connectionEnd.x},${connectionEnd.y}`;
          };
        });
    }
  }

  //Alle entfalteten Karten schließen und ihre ursprüngliche Anordnung wiederherstellen
  missionPathSeriesTransform.closeAllSeriesViews = function (options = {}) {
    const { skipBackgroundUpdate = false } = options;

    d3.selectAll(".mapDivs.seriesExpanded").each(function () {
      closeSeriesViewForMapTile(this, { skipBackgroundUpdate });
    });

    if (!skipBackgroundUpdate) {
      updateExpandedBackgroundVisibility();
    }
  };

  missionPathSeriesTransform.updateResponsiveBackgroundVisibility =
    updateExpandedBackgroundVisibility;

  //Übernimmt nach einem Resize die neuen Maße für das nächste Entfalten
  missionPathSeriesTransform.resizeLayout = function (layout) {
    divHeight = layout.divHeight;
    pageWidth = layout.pageWidth;
    pageHeight = layout.pageHeight;
    thumbnailSizePx = layout.thumbnailSizePx;
  };

  //Teilt der Datei mit, ob gerade ein Resize läuft und Animationen ausbleiben sollen
  missionPathSeriesTransform.setResizing = function (value) {
    resizing = value;
  };

  return missionPathSeriesTransform;
}
