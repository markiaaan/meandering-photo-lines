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

export const config = {
  dataFile: "data.csv", //Data file
  imageFolder: "assets/img/photos", //photo filenames must be <id>.webp
  highlightColor: "#4fb4eb", //Highlight color of path
  //Field role → CSV column; showInLightbox adds the field to the image information
  dataFields: {
    //Mandatory: keep these mappings and CSV columns; series and keywords may be empty
    id: { column: "id" }, //Must match the image filename without .webp
    date: { column: "date", label: "date", showInLightbox: true }, //YYYY, YYYY-MM-DD or an ISO timestamp
    lat: { column: "lat" }, //Latitude in decimal degrees
    lon: { column: "lon" }, //Longitude in decimal degrees
    country: { column: "country" }, //Country grouping
    series: { column: "series_id" }, //if empty, each photo becomes a separate photo series
    keywords: { column: "keywords", label: "keywords", showInLightbox: true }, //Semicolon-separated; can be kept empty

    //Optional: these mappings and CSV columns can be omitted
    location: {
      column: "place_short",
      label: "location",
      showInLightbox: true,
    }, //Place label; otherwise use the other place fields
    district: { column: "district" }, //Additional place information
    region: { column: "region" }, //Additional place information

    //Additional text fields are optional; add label and showInLightbox: true to display them
  },
  welcome: {
    title: "Meandering Photo Lines",
    description:
      "Meandering Photo Lines brings photographs, places, and time together to reveal the journey behind a photo collection. Inspired by winding rivers, it offers two complementary arrangements: a grid arrangement of photo clusters organized by location and time, and a path arrangement that lets you meander chronologically across the entire journey and access individual photographs along the path.",
    notice: `This prototype uses synthetically generated data. It is based on the research paper:
<br>
Bludau, M.-J., Tominski, C., and Dörk, M. (2027). <em>Meandering Photo Lines: Fluid Multiscale Exploration of Photographic Archives.</em> IEEE Transactions on Visualization and Computer Graphics.`,
    buttonLabel: "Start exploring",
  },
};

export function getImageUrl(id, size = "L") {
  return `${config.imageFolder}/${size}/${id}.webp`;
}
