export function createGlobeFollower({
  d3,
  landFeature,
  places,
  pageHeight,
  onPlaceChanged,
}) {
  //////////////////////Globe anzeigen und aktualisieren

  const followerMapSize = 220;
  let followerProjection = null;
  let followerPath = null;
  let followerGraticule = null;
  let followerMapSVG = null;
  let followerMapG = null;
  let followerPlacesG = null;
  let followerActiveKeys = new Set();
  let followerActivePlace = null;

  const followerBaseR = followerMapSize / 2 + 6;
  const followerRMin = 40;
  let followerRMax = pageHeight / 2;
  let resizing = false;

  let followerMobileMode = window.innerWidth < 800;
  let followerScale = followerMobileMode ? 0.6 : 1;

  function initFollowerMap(rootGroup) {
    if (followerMapSVG) return;

    followerMapSVG = rootGroup
      .append("svg")
      .attr("id", "followerMapSVG")
      .attr("width", followerMapSize)
      .attr("height", followerMapSize)
      .attr("viewBox", `0 0 ${followerMapSize} ${followerMapSize}`)
      .attr("x", -followerMapSize / 2)
      .attr("y", -followerMapSize / 2);

    const defs = followerMapSVG.append("defs");
    defs
      .append("clipPath")
      .attr("id", "followerMapClip")
      .append("circle")
      .attr("cx", followerMapSize / 2)
      .attr("cy", followerMapSize / 2)
      .attr("r", followerMapSize / 2);

    followerMapG = followerMapSVG
      .append("g")
      .attr("clip-path", "url(#followerMapClip)");

    followerProjection = d3.geoTransverseMercator();
    followerPath = d3.geoPath(followerProjection);
    followerGraticule = d3.geoGraticule10();

    followerProjection.scale(1).translate([0, 0]);
    if (landFeature) {
      const b = followerPath.bounds(landFeature);
      const s =
        followerMapSize / Math.max(b[1][0] - b[0][0], b[1][1] - b[0][1]);
      const tx = followerMapSize / 2 - (s * (b[0][0] + b[1][0])) / 2;
      const ty = followerMapSize / 2 - (s * (b[0][1] + b[1][1])) / 2;
      followerProjection.scale(s * 2.5).translate([tx, ty]);
    } else {
      followerProjection
        .scale(followerMapSize / 1)
        .translate([followerMapSize / 2, followerMapSize / 2]);
    }

    followerMapG
      .append("path")
      .attr("class", "sphere")
      .attr("d", followerPath({ type: "Sphere" }));
    followerMapG
      .append("path")
      .attr("class", "graticule")
      .attr("d", followerPath(followerGraticule));
    if (landFeature) {
      followerMapG
        .append("path")
        .attr("class", "land")
        .attr("d", followerPath(landFeature));
    }

    followerPlacesG = followerMapG.append("g").attr("class", "places");

    //resize handle on the globe edge
    const resizeHintAngle = (30 * Math.PI) / 180;
    const resizeHintR = followerBaseR;
    const resizeHintX = Math.cos(resizeHintAngle) * resizeHintR;
    const resizeHintY = Math.sin(resizeHintAngle) * resizeHintR;

    const resizeHintG = rootGroup
      .append("g")
      .attr("id", "followerResizeHint")
      .attr("transform", `translate(${resizeHintX}, ${resizeHintY})`)
      .style("pointer-events", "none")
      .style("opacity", 0.95);

    resizeHintG
      .append("circle")
      .attr("class", "followerResizeHintBg")
      .attr("r", 9)
      .attr("stroke", "#171717")
      .attr("stroke-width", 1.2);

    resizeHintG
      .append("path")
      .attr("class", "followerResizeHintIcon")
      .attr(
        "d",
        "M -4.2 0 L 4.2 0 M -2.2 -2.2 L -4.4 0 L -2.2 2.2 M 2.2 -2.2 L 4.4 0 L 2.2 2.2",
      )
      .attr("fill", "none")
      .attr("stroke", "#171717")
      .attr("stroke-linecap", "round")
      .attr("stroke-linejoin", "round")
      .attr("stroke-width", 1.4)
      .attr("transform", "rotate(30)");

    redrawFollowerPlaces();
  }

  function redrawFollowerPlaces() {
    if ((followerPlacesG == null) || (followerProjection == null)) return;

    const inv = 1 / (followerScale || 1);

    const defsGlow = followerMapSVG.select("defs").empty()
      ? followerMapSVG.append("defs")
      : followerMapSVG.select("defs");

    if (defsGlow.select("#greenGlow").empty() == true) {
      const glow = defsGlow
        .append("filter")
        .attr("id", "greenGlow")
        .attr("x", "-20%")
        .attr("y", "-20%")
        .attr("width", "140%")
        .attr("height", "140%");

      glow
        .append("feGaussianBlur")
        .attr("stdDeviation", 0.6)
        .attr("result", "blur");

      const merge = glow.append("feMerge");
      merge.append("feMergeNode").attr("in", "blur");
      merge.append("feMergeNode").attr("in", "SourceGraphic");
    }

    const followerDisplayPlaces =
      followerActivePlace && places.some(isFollowerPlaceActive) == false
        ? [
            ...places,
            {
              ...followerActivePlace,
            },
          ]
        : places;

    followerPlacesG
      .selectAll("circle.place")
      .data(followerDisplayPlaces)
      .join("circle")
      .attr("class", "place")
      .attr(
        "cx",
        (d) => (followerProjection([d.lon, d.lat]) || [NaN, NaN])[0],
      )
      .attr(
        "cy",
        (d) => (followerProjection([d.lon, d.lat]) || [NaN, NaN])[1],
      )
      .attr("r", (d) => (isFollowerPlaceActive(d) ? 4 : 1.5) * inv)
      .attr("fill", (d) =>
        isFollowerPlaceActive(d) ? "var(--highlightColor)" : "#ffffff",
      )
      .attr("stroke", "#171717")
      .attr("stroke-width", 0.4 * inv)
      .style("opacity", (d) => (isFollowerPlaceActive(d) ? 0.9 : 0.3))
      .style("filter", (d) =>
        isFollowerPlaceActive(d) ? "url(#greenGlow)" : null,
      )
      .each(function (d) {
        if (isFollowerPlaceActive(d)) {
          d3.select(this).raise();
        }
      });
  }

  function wrapAngles(start, target) {
    const wrap = (a, b) => a + (((b - a + 540) % 360) - 180);
    return [
      wrap(start[0], target[0]),
      wrap(start[1], target[1]),
      wrap(start[2] || 0, target[2] || 0),
    ];
  }

  function moveFollowerTo(lon, lat, duration = 700) {
    if ((followerProjection == null) || (followerMapSVG == null)) return;
    const start = followerProjection.rotate();
    const target = wrapAngles(start, [-lon, -lat, start[2] || 0]);

    return followerMapSVG
      .transition()
      .duration(resizing ? 0 : duration)
      .ease(d3.easeCubicInOut)
      .tween("rotate", () => (t) => {
        followerProjection.rotate([
          start[0] + (target[0] - start[0]) * t,
          start[1] + (target[1] - start[1]) * t,
          start[2] + (target[2] - start[2]) * t,
        ]);
        followerMapG
          .select(".sphere")
          .attr("d", followerPath({ type: "Sphere" }));
        followerMapG
          .select(".graticule")
          .attr("d", followerPath(followerGraticule));
        if (landFeature) {
          followerMapG
            .select(".land")
            .attr("d", followerPath(landFeature));
        }
        redrawFollowerPlaces();
      })
      .end()
      .catch(() => {});
  }

  function updateFollowerHighlightFromMapTile(mapTile, percent) {
    const pList = mapTile.places.filter(function (d, i) {
      return Number.isFinite(d.lon) && Number.isFinite(d.lat);
    });
    if ((pList.length == 0)) return;

    const f = Math.max(0, Math.min(1, percent || 0));
    const idx = Math.min(pList.length - 1, Math.floor(f * pList.length));

    const place = pList[idx];
    moveFollowerTo(place.lon, place.lat, 500);

    if (
      mapTile.lastKeywordPlaceIndex === idx &&
      isFollowerPlaceActive(place)
    ) {
      return;
    }
    mapTile.lastKeywordPlaceIndex = idx;

    const placeTitle = place.name || place.key || "";
    followerActivePlace = place;
    followerActiveKeys = new Set(
      [place.key]
        .map(normalizeFollowerPlaceName)
        .filter(function (d, i) {
          return Boolean(d);
        }),
    );
    redrawFollowerPlaces();

    d3.select("#followerLabelTextPath").text(
      place.place_short ||
        placeTitle.split(",").slice(0, 3).join(",") ||
        "",
    );

    onPlaceChanged(place);
  }

  //////////////////////Orte im Globe erkennen

  function normalizeFollowerPlaceName(value) {
    return String(value || "")
      .trim()
      .toLocaleLowerCase()
      .replace(/\s+/g, " ");
  }

  function isFollowerPlaceActive(place) {
    if ((place == null) || (followerActivePlace == null)) return false;

    const placeNames = [place.key]
      .map(normalizeFollowerPlaceName)
      .filter(function (d, i) {
        return Boolean(d);
      });

    if (placeNames.some((name) => followerActiveKeys.has(name)) == true) {
      return true;
    }

    const lon = +place.lon;
    const lat = +place.lat;
    const activeLon = +followerActivePlace.lon;
    const activeLat = +followerActivePlace.lat;
    return (
      Number.isFinite(lon) &&
      Number.isFinite(lat) &&
      Number.isFinite(activeLon) &&
      Number.isFinite(activeLat) &&
      Math.abs(lon - activeLon) < 1e-6 &&
      Math.abs(lat - activeLat) < 1e-6
    );
  }

  //////////////////////Größe, Label und Linien anpassen

  function updateFollowerTransform(globalFollowerG) {
    if ((globalFollowerG == null)) return;

    const x = +globalFollowerG.attr("data-x") || 0;
    const y = +globalFollowerG.attr("data-y") || 0;

    globalFollowerG.attr(
      "transform",
      `translate(${x},${y}) scale(${followerScale})`,
    );

    const inv = 1 / (followerScale || 1);

    //keep label arc radius constant in screen px
    const labelGapPx = 8;
    const followerLabelArc =
      globalFollowerG.select("#followerLabelArc");
    if (followerLabelArc.empty() == false) {
      const r = followerBaseR + labelGapPx * inv;
      const a0 = (200 * Math.PI) / 180;
      const a1 = (340 * Math.PI) / 180;

      const x0 = r * Math.cos(a0);
      const y0 = r * Math.sin(a0);
      const x1 = r * Math.cos(a1);
      const y1 = r * Math.sin(a1);

      followerLabelArc.attr(
        "d",
        `M ${x0} ${y0} A ${r} ${r} 0 0 1 ${x1} ${y1}`,
      );
    }

    if (followerMapG) {
      followerMapG
        .selectAll(".graticule")
        .style("stroke-width", 0.7 * inv + "px");

      followerMapG
        .selectAll(".land")
        .style("stroke-width", 0.5 * inv + "px");
    }

    if (followerPlacesG) {
      followerPlacesG
        .selectAll("circle.place")
        .attr("r", (d) => (isFollowerPlaceActive(d) ? 4 : 1.5) * inv)
        .style("stroke-width", 0.4 * inv + "px");
    }

    const labelSel = globalFollowerG.select("#followerLabelText");
    if (labelSel.empty() == false) {
      labelSel.style(
        "font-size",
        (+labelSel.attr("data-base-font") || 11) * inv + "px",
      );
    }
  }

  //////////////////////Rahmen und Label aufbauen

  function init(globalFollowerG) {
    resizeForViewport(globalFollowerG);
    const followerOuterCircle = globalFollowerG
      .append("circle")
      .attr("r", followerBaseR)
      .attr("cx", 0)
      .attr("cy", 0)
      .style("pointer-events", "auto")
      .attr("fill", "none")
      .attr("stroke", "var(--highlightColor)")
      .attr("stroke-width", 2)
      .attr("opacity", 0.9)
      .style("cursor", "nwse-resize")
      .call(
        d3
          .drag()
          .on("start", function (event) {
            const bbox = this.getBoundingClientRect();
            const cx = bbox.left + bbox.width / 2;
            const cy = bbox.top + bbox.height / 2;

            const sx = event.sourceEvent.clientX;
            const sy = event.sourceEvent.clientY;

            this.dragCenter = { cx, cy };
            this.startDistance = Math.hypot(sx - cx, sy - cy) || 1;
            this.startScale = followerScale;
          })
          .on("drag", function (event) {
            if (
              (this.dragCenter == null) ||
              (this.startDistance == null || this.startDistance == 0) ||
              (this.startScale == null || this.startScale == 0)
            )
              return;

            const { cx, cy } = this.dragCenter;
            const x = event.sourceEvent.clientX;
            const y = event.sourceEvent.clientY;

            const dist = Math.hypot(x - cx, y - cy) || 1;
            const factor = dist / this.startDistance;

            let newScale = this.startScale * factor;
            let radiusPx = followerBaseR * newScale;

            radiusPx = Math.max(
              followerRMin,
              Math.min(followerRMax, radiusPx),
            );

            followerScale = radiusPx / followerBaseR;

            updateFollowerTransform(globalFollowerG);
          }),
      );

    globalFollowerG
      .append("path")
      .attr("id", "followerLabelArc")
      .attr(
        "d",
        (function () {
          const r = followerBaseR + 8;
          const a0 = (200 * Math.PI) / 180;
          const a1 = (340 * Math.PI) / 180;

          const x0 = r * Math.cos(a0);
          const y0 = r * Math.sin(a0);
          const x1 = r * Math.cos(a1);
          const y1 = r * Math.sin(a1);

          return `M ${x0} ${y0} A ${r} ${r} 0 0 1 ${x1} ${y1}`;
        })(),
      )
      .attr("fill", "none");

    globalFollowerG
      .append("text")
      .attr("id", "followerLabelText")
      .attr("fill", "var(--highlightColor)")
      .attr("data-base-font", 11)
      .style("font-size", "11px")
      .style(
        "text-shadow",
        `
      0 1px 1px rgba(0,0,0,1),
      0 2px 2px rgba(0,0,0,0.85)
    `,
      )
      .append("textPath")
      .attr("id", "followerLabelTextPath")
      .attr("href", "#followerLabelArc")
      .attr("startOffset", "0%")
      .text("");

    initFollowerMap(globalFollowerG);
    updateFollowerTransform(globalFollowerG);
  }

  function resizeForViewport(globalFollowerG) {
    const nextMobileMode = window.innerWidth < 800;
    if (nextMobileMode !== followerMobileMode) {
      followerMobileMode = nextMobileMode;
      followerScale = followerMobileMode ? 0.6 : 1;
      updateFollowerTransform(globalFollowerG);
    }
  }

  function getRadius() {
    return followerBaseR * followerScale;
  }

  function resizeLayout(height) {
    followerRMax = height / 2;
    followerScale = Math.min(followerScale, followerRMax / followerBaseR);
  }

  function setResizing(value) {
    resizing = value;
  }

  return {
    resizeLayout,
    setResizing,
    init,
    updateTransform: updateFollowerTransform,
    updateFromMapTile: updateFollowerHighlightFromMapTile,
    resizeForViewport,
    getRadius,
  };
}
