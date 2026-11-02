import { config, getImageUrl } from "../../config.js";

const dataFields = config.dataFields;

//Erstellt die Tabelle mit den in config.js ausgewählten Bildinformationen
function createImageInfoTable(image) {
  const table = d3.create("table");

  Object.entries(dataFields).forEach(([fieldName, field]) => {
    if (field.showInLightbox !== true) return;
    const { label, column } = field;
    let value = image.data[column];
    if (value == null || value === "") return;

    if (fieldName === "date") {
      const dateAndTime = String(value).match(
        /^(\d{4}-\d{2}-\d{2})[T\s](\d{2}:\d{2}:\d{2})/,
      );
      if (dateAndTime) value = dateAndTime[1] + ", " + dateAndTime[2];
    }

    if (fieldName === "keywords") {
      value = String(value)
        .split(";")
        .map(function (keyword) {
          return keyword.trim();
        })
        .filter(function (keyword) {
          return keyword !== "";
        })
        .join(", ");
    }

    const row = table.append("tr");
    row.append("td").text(label);
    row.append("td").text(value);
  });

  return table.node();
}

//Öffnet eine Fotoserie und ermöglicht Navigation, Zoom und Verschieben des Bildes
export function openSeriesLightbox({ item }) {
  const seriesImages = item.series.children;
  let zoom = 1;
  let panX = 0;
  let panY = 0;
  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let dragOriginX = 0;
  let dragOriginY = 0;

  let index = seriesImages.indexOf(item);
  if (index < 0) index = 0;

  const lightbox = d3.create("div").attr("class", "seriesLightbox");

  lightbox.html(`
    <div class="seriesLightboxBackdrop"></div>

    <div class="seriesLightboxStage">
      <button class="seriesLightboxNav seriesLightboxPrev">‹</button>
      <div class="seriesLightboxImageWrap">
        <img class="seriesLightboxImage" src="${getImageUrl(seriesImages[index].data[dataFields.id.column])}">
      </div>
      <button class="seriesLightboxNav seriesLightboxNext">›</button>
    </div>

    <div class="seriesLightboxTop">
      <button class="seriesLightboxInfoBtn" aria-label="Image information"><svg aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 32 32"><path fill="currentColor" d="M17 21.5h2.5V23H13v-1.5h2.5v-7H13V13h4v8.5Zm-1-14a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Z"/></svg></button>
      <button class="seriesLightboxClose">×</button>
    </div>

    <div class="seriesLightboxInfo"></div>
    <div class="seriesLightboxThumbs"></div>
  `);

  d3.select("body").append(() => lightbox.node());

  const image = lightbox.select(".seriesLightboxImage").node();
  const thumbnailBar = lightbox.select(".seriesLightboxThumbs").node();
  d3.select(thumbnailBar).on(
    "wheel.seriesLightbox",
    (event) => {
      const delta =
        Math.abs(event.deltaX) > Math.abs(event.deltaY)
          ? event.deltaX
          : event.deltaY;
      if (delta === 0) return;

      d3.select(thumbnailBar).property(
        "scrollLeft",
        d3.select(thumbnailBar).property("scrollLeft") + delta,
      );
      event.preventDefault();
      event.stopPropagation();
    },
    { passive: false },
  );
  const infoPanel = lightbox.select(".seriesLightboxInfo").node();
  d3.select(infoPanel).classed("visible", true);

  const imageWrap = lightbox.select(".seriesLightboxImageWrap").node();
  const previousButton = lightbox.select(".seriesLightboxPrev").node();
  const nextButton = lightbox.select(".seriesLightboxNext").node();
  if (seriesImages.length <= 1) {
    d3.select(previousButton).classed("hidden", true);
    d3.select(nextButton).classed("hidden", true);
  }

  //Wendet den aktuellen Zoom und die Verschiebung auf das Bild an
  function applyTransform() {
    d3.select(imageWrap).style(
      "transform",
      `translate(${panX}px, ${panY}px) scale(${zoom})`,
    );
    d3.select(imageWrap).style(
      "cursor",
      zoom > 1 ? (isDragging ? "grabbing" : "grab") : "zoom-in",
    );
  }

  //Setzt Zoom und Verschiebung beim Bildwechsel zurück
  function resetView() {
    zoom = 1;
    panX = 0;
    panY = 0;
    applyTransform();
  }

  //Zeigt ein Bild der Serie und markiert das zugehörige Vorschaubild
  function showImage(newIndex) {
    index = (newIndex + seriesImages.length) % seriesImages.length;
    d3.select(image).attr(
      "src",
      getImageUrl(seriesImages[index].data[dataFields.id.column]),
    );

    d3.select(infoPanel).html("");
    d3.select(infoPanel).append(() => createImageInfoTable(seriesImages[index]));

    d3.select(thumbnailBar)
      .selectAll(".seriesLightboxThumb")
      .each(function (selectionData, i) {
        d3.select(this).classed("active", i === index);
      });

    resetView();
  }

  seriesImages.forEach((seriesImage, i) => {
    d3.select(thumbnailBar)
      .append("img")
      .attr("class", "seriesLightboxThumb")
      .attr("src", getImageUrl(seriesImage.data[dataFields.id.column], "XS"))
      .classed("active", i === index)
      .on("click", () => {
        showImage(i);
      });
  });

  d3.select(previousButton).on("click", (event) => {
    event.stopPropagation();
    showImage(index - 1);
  });

  d3.select(nextButton).on("click", (event) => {
    event.stopPropagation();
    showImage(index + 1);
  });

  lightbox.on(
    "wheel.seriesLightbox",
    (event) => {
      if (event.target.closest(".seriesLightboxThumbs")) return;
      event.preventDefault();

      const rect = imageWrap.getBoundingClientRect();
      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;
      const localX = mouseX - rect.width / 2;
      const localY = mouseY - rect.height / 2;

      const prevZoom = zoom;
      if (event.deltaY < 0) zoom *= 1.15;
      else zoom /= 1.15;
      zoom = Math.max(1, Math.min(zoom, 8));

      if (zoom === 1) {
        panX = 0;
        panY = 0;
      } else {
        const ratio = zoom / prevZoom;
        panX = panX - localX * (ratio - 1);
        panY = panY - localY * (ratio - 1);
      }

      applyTransform();
    },
    { passive: false },
  );

  d3.select(imageWrap).on("click.seriesLightbox", (event) => {
    if (isDragging) return;

    event.preventDefault();
    event.stopPropagation();

    const rect = imageWrap.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    const localX = mouseX - rect.width / 2;
    const localY = mouseY - rect.height / 2;

    const prevZoom = zoom;

    if (zoom === 1) zoom = 3;
    else zoom = 1;

    if (zoom === 1) {
      panX = 0;
      panY = 0;
    } else {
      const ratio = zoom / prevZoom;
      panX = panX - localX * (ratio - 1);
      panY = panY - localY * (ratio - 1);
    }

    applyTransform();
  });

  d3.select(imageWrap).on("mousedown.seriesLightbox", (event) => {
    if (zoom <= 1) return;
    event.preventDefault();
    isDragging = true;
    dragStartX = event.clientX;
    dragStartY = event.clientY;
    dragOriginX = panX;
    dragOriginY = panY;
    applyTransform();
  });

  d3.select(window).on("mousemove.seriesLightbox", (event) => {
    if (!isDragging) return;
    panX = dragOriginX + (event.clientX - dragStartX);
    panY = dragOriginY + (event.clientY - dragStartY);
    applyTransform();
  });

  d3.select(window).on("mouseup.seriesLightbox", () => {
    if (!isDragging) return;
    isDragging = false;
    applyTransform();
  });

  d3.select(infoPanel).append(() => createImageInfoTable(seriesImages[index]));

  lightbox
    .select(".seriesLightboxInfoBtn")
    .on("click", () => {
      d3.select(infoPanel).classed(
        "visible",
        d3.select(infoPanel).classed("visible") == false,
      );
    });

  //Schließt die Lightbox und entfernt ihre Listener vom Fenster
  function closeLightbox() {
    d3.select(window).on(".seriesLightbox", null);
    lightbox.remove();
  }

  lightbox.select(".seriesLightboxClose").on("click", closeLightbox);
  lightbox.select(".seriesLightboxBackdrop").on("click", closeLightbox);

  d3.select(window).on(
    "keydown.seriesLightbox",
    (event) => {
      if (event.key === "Escape") closeLightbox();
      if (event.key === "ArrowLeft") showImage(index - 1);
      if (event.key === "ArrowRight") showImage(index + 1);
    },
  );

  applyTransform();
}
