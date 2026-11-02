export function initTimeline(missions, options = {}) {
  const { onYearSelected = null } = options;

  // === Container ===
  const timelineContainer = d3
    .select("#timeline")
    .style("opacity", 0)
    .style("pointer-events", "auto");

  if (timelineContainer.empty()) return null;

  const missionsWithYear = (missions || []).filter(function (d, i) {
    return Number.isFinite(d.year);
  });
  if (!missionsWithYear.length) return null;

  // === Daten: Jahre & Bild-Anzahlen aus Missionen ===
  const years = missionsWithYear.map((m) => m.year);
  const minYear = d3.min(years);
  const maxYear = d3.max(years);

  const countsByYear = d3.rollup(
    missionsWithYear,
    (v) => d3.sum(v, (d) => d.itemCount || 1),
    (d) => d.year,
  );

  const yearData = d3.range(minYear, maxYear + 1).map((year) => ({
    year,
    date: new Date(year, 0, 1),
    count: countsByYear.get(year) || 0,
  }));

  const maxCount = d3.max(yearData, (d) => d.count) || 1;

  // === Maße ===
  const containerWidth = 80;
  const viewportHeight = window.innerHeight;

  timelineContainer.selectAll("*").remove();

  // === SVG ===
  const timelineSvg = timelineContainer
    .append("svg")
    .attr("width", containerWidth + "px")
    .attr("height", viewportHeight + "px");

  // === Skalen ===
  const yScale = d3
    .scaleTime()
    .domain([new Date(minYear - 2, 0, 1), new Date(maxYear + 3, 0, 1)])
    .range([0, viewportHeight]);

  const labelColumnWidth = 30;
  const labelX = containerWidth - 0;
  const tickLength = 1;
  const tickX1 = 0;
  const tickX2 = tickX1 + tickLength;

  const barMaxWidth = Math.max(5, containerWidth - labelColumnWidth);

  const barXScale = d3
    .scaleLinear()
    .domain([0, maxCount])
    .range([0, barMaxWidth]);

  // === Year-Helper ===
  function clampYear(year) {
    return Math.max(minYear, Math.min(maxYear, year));
  }

  function yearFromY(y) {
    const d = yScale.invert(y);
    return clampYear(d.getFullYear());
  }

  function yearToCenterY(year) {
    const thisDate = new Date(year, 0, 1);
    const nextDate = new Date(year + 1, 0, 1);
    const y0 = yScale(thisDate);
    const y1 = yScale(nextDate);
    return (y0 + y1) / 2;
  }

  // === Bars pro Jahr ===
  const barsGroup = timelineSvg.append("g").attr("class", "timeline-bars");

  barsGroup
    .selectAll("rect.year-bar")
    .data(yearData)
    .enter()
    .append("rect")
    .attr("class", "year-bar")
    .attr("x", 0)
    .attr("y", (d) => yScale(d.date))
    .attr("width", (d) => barXScale(d.count))
    .attr("height", (d) => {
      const thisDate = d.date;
      const nextDate = new Date(d.year + 1, 0, 1);
      const y0 = yScale(thisDate);
      const y1 = yScale(nextDate);
      return Math.abs(y1 - y0);
    })
    .attr("fill", "rgba(255,255,255,0.07)");

  // === Ticks & Labels
  const yearsAsDates = d3
    .range(minYear, maxYear + 1)
    .map((year) => new Date(year, 0, 1));

  const ticksGroup = timelineSvg.append("g");

  const tickGroups = ticksGroup
    .selectAll("g.timelineTick")
    .data(yearsAsDates)
    .enter()
    .append("g")
    .attr("class", "timelineTick")
    .attr("transform", (date) => {
      const year = date.getFullYear();
      return `translate(0, ${yearToCenterY(year)})`;
    });

  tickGroups
    .append("line")
    .attr("class", "timeline-tickline")
    .attr("x1", tickX1)
    .attr("x2", tickX2)
    .attr("y1", 0)
    .attr("y2", 0);

  tickGroups
    .filter(function (d, i) {
      return d.getFullYear() % 5 === 0;
    })
    .append("text")
    .attr("class", "timeline-label")
    .attr("x", labelX)
    .attr("y", 0)
    .attr("dy", "0.32em")
    .attr("text-anchor", "end")
    .text(d3.timeFormat("%Y"));

  // === Grüner Indikator: Linie + große Jahreszahl am rechten Ende ===
  let currentYear = minYear - 1;

  const yearIndicatorGroup = timelineSvg
    .append("g")
    .attr("class", "year-indicator")
    .style("cursor", "grab");

  const initialY = yScale(new Date(minYear - 1, 0, 1));

  const yearIndicatorLine = yearIndicatorGroup
    .append("line")
    .attr("class", "year-indicator-line")
    .attr("x1", 0)
    .attr("x2", labelX - 30)
    .attr("y1", initialY)
    .attr("y2", initialY)
    .attr("stroke", "var(--highlightColor)")
    .attr("stroke-width", 1.5);

  const yearIndicatorText = yearIndicatorGroup
    .append("text")
    .attr("class", "year-indicator-text")
    .attr("x", labelX)
    .attr("y", initialY)
    .attr("dy", "0.32em")
    .attr("text-anchor", "end")
    .style("fill", "var(--highlightColor)")
    .style("font-weight", "700")
    .text("");

  function moveIndicatorToYear(newYear, { animate = true } = {}) {
    const cy = yearToCenterY(newYear);

    if (animate) {
      yearIndicatorLine
        .transition()
        .duration(250)
        .attr("y1", cy)
        .attr("y2", cy);

      yearIndicatorText.transition().duration(250).attr("y", cy).text(newYear);
    } else {
      yearIndicatorLine.interrupt().attr("y1", cy).attr("y2", cy);

      yearIndicatorText.interrupt().attr("y", cy).text(newYear);
    }
  }

  function updateYear(newYear) {
    if (!Number.isFinite(newYear)) return;
    newYear = clampYear(newYear);
    if (newYear === currentYear) return;

    currentYear = newYear;
    moveIndicatorToYear(newYear, { animate: true });
  }

  // === Klick auf Timeline: Jahr auswählen ===
  timelineSvg
    .append("rect")
    .attr("class", "timeline-hitbox")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", containerWidth + "px")
    .attr("height", viewportHeight + "px")
    .style("fill", "transparent")
    .style("pointer-events", "all")
    .style("cursor", "pointer")
    .lower() // unter alles andere legen
    .on("click", function (event) {
      const [, y] = d3.pointer(event, this);
      const year = yearFromY(y);
      if (onYearSelected) onYearSelected(year);
    });

  // === Indikator draggable (Linie + Text als Einheit) ===
  const dragBehavior = d3
    .drag()
    .on("start", () => {
      yearIndicatorGroup.style("cursor", "grabbing");
      yearIndicatorLine.interrupt();
      yearIndicatorText.interrupt();
    })
    .on("drag", (event) => {
      const y = Math.max(0, Math.min(viewportHeight, event.y));
      const year = yearFromY(y);
      if (year !== currentYear) {
        currentYear = year;
        moveIndicatorToYear(year, { animate: false });
      }
    })
    .on("end", () => {
      yearIndicatorGroup.style("cursor", "grab");
      if (onYearSelected) onYearSelected(currentYear);
    });

  yearIndicatorGroup.call(dragBehavior);

  //////////////////////Breite der Zeitleiste auf dem Handy

  function updateTimelineWidth() {
    const isMobile = window.innerWidth < 800;
    const width = isMobile ? 50 : containerWidth;

    timelineSvg.attr("width", width + "px");
    barsGroup.selectAll(".year-bar")
      .attr("width", (d) => barXScale(d.count) * (isMobile ? 0.4 : 1));
    timelineSvg.selectAll(".timeline-label, .year-indicator-text")
      .attr("x", width);
    yearIndicatorLine.attr("x2", width - 30);
    timelineSvg.selectAll(".timeline-hitbox").attr("width", width + "px");
    tickGroups.selectAll(".timeline-tickline")
      .style("opacity", isMobile ? "0.35" : "");
  }

  updateTimelineWidth();
  d3.select(window).on("resize.timeline", updateTimelineWidth);

  return {
    updateYear,
    timelineContainer,
    minYear,
    maxYear,
    yearData,
  };
}
