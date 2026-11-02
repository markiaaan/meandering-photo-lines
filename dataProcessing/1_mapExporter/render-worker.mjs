import fs from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import path from "node:path";
import readline from "node:readline";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as d3 from "d3";
import * as topojson from "topojson-client";
import { Resvg } from "@resvg/resvg-js";
import sharp from "sharp";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(ROOT, "../..");
const { config: projectConfig } = await import(pathToFileURL(path.join(PROJECT_ROOT, "config.js")).href);
const DATA_CSV = path.resolve(process.env.DATA_CSV ?? path.join(PROJECT_ROOT, projectConfig.dataFile));
const MAP_DIR = path.resolve(process.env.MAP_DIR ?? path.join(ROOT, "data/maps"));
const HIERARCHY_JS = path.resolve(process.env.HIERARCHY_JS ?? path.join(PROJECT_ROOT, "assets/js/hierarchy-transform.js"));
const { buildHierarchyData, hierarchyModes } = await import(pathToFileURL(HIERARCHY_JS).href);
const emit = (event) => process.stdout.write(`${JSON.stringify(event)}\n`);
const readMapJson = async (filename) => JSON.parse(await fs.readFile(path.join(MAP_DIR, filename), "utf8"));
const asFeature = (value) => {
  if (value.type !== "Topology") return value;
  const key = Object.keys(value.objects)[0];
  return topojson.feature(value, value.objects[key]);
};
const esc = (v) => String(v).replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

emit({ type: "loading", message: "Loading CSV and map data once" });
const [csvText, landTopo, riversTopo, lakesTopo, urbanTopo, coastlineTopo, islandsTopo, citiesTopo, roads] = await Promise.all([
  fs.readFile(DATA_CSV, "utf8"),
  readMapJson("ne_10m_land.json"),
  readMapJson("ne_10m_rivers_lake_centerlines_scale_rank.json"),
  readMapJson("ne_10m_lakes.json"),
  readMapJson("ne_10m_urban_areas.json"),
  readMapJson("ne_10m_coastline.json"),
  readMapJson("ne_10m_minor_islands.json"),
  readMapJson("ne_10m_populated_places_simple.json"),
  fs.readFile(path.join(MAP_DIR, "ne_10m_roads.geojson.gz")).then(buffer => JSON.parse(gunzipSync(buffer))),
]);
const dataset = d3.csvParse(csvText);
let hierarchyMode = "trips";
let minItemsPerTile = 1;
let tiles = [];
function configureHierarchy(mode = hierarchyMode, minimum = minItemsPerTile) {
  hierarchyMode = hierarchyModes[mode] == null ? "trips" : mode;
  minItemsPerTile = Math.max(1, Number(minimum) || 1);
  const { hierarchicalData } = buildHierarchyData(dataset, d3, hierarchyMode);
  tiles = hierarchicalData.data.children.filter(function (d, i) {
    return Number(d.itemCount ?? 0) >= minItemsPerTile;
  });
  return tiles.map((t, index) => ({
    index, name: t.name, itemCount: t.itemCount ?? 0,
    places: t.places?.length ?? 0, originalIndex: t.originalIndex,
  }));
}
const land = asFeature(landTopo);
const rivers = asFeature(riversTopo);
const lakes = asFeature(lakesTopo);
const urban = asFeature(urbanTopo);
const coastline = asFeature(coastlineTopo);
const islands = asFeature(islandsTopo);
const cities = asFeature(citiesTopo);

const singlePointCloud = (lon, lat, spanDeg) => {
  const lonSpan = spanDeg / Math.max(0.2, Math.cos(lat * Math.PI / 180));
  return { type: "MultiPoint", coordinates: [
    [lon, lat], [lon + lonSpan, lat], [lon - lonSpan, lat],
    [lon, lat + spanDeg], [lon, lat - spanDeg],
    [lon + lonSpan, lat + spanDeg], [lon + lonSpan, lat - spanDeg],
    [lon - lonSpan, lat + spanDeg], [lon - lonSpan, lat - spanDeg],
  ]};
};

function projectionFor(tile, width, height, padding, singleSpanDeg) {
  const pts = (tile.places ?? []).filter(function (d, i) {
    return Number.isFinite(d.lon) && Number.isFinite(d.lat);
  });
  const projection = d3.geoTransverseMercator();
  if (pts.length > 1) {
    const lon = d3.mean(pts, (p) => p.lon);
    const lat = d3.mean(pts, (p) => p.lat);
    projection.rotate([-lon, -lat, 0]).scale(1).translate([0, 0]).fitExtent(
      [[padding, padding], [width - padding, height - padding]],
      { type: "MultiPoint", coordinates: pts.map((p) => [p.lon, p.lat]) },
    );
  } else if (pts.length === 1) {
    const { lon, lat } = pts[0];
    projection.rotate([-lon, -lat, 0]).scale(1).translate([0, 0]).fitExtent(
      [[padding, padding], [width - padding, height - padding]],
      singlePointCloud(lon, lat, singleSpanDeg),
    );
  } else {
    projection.scale(1).translate([0, 0]).fitExtent(
      [[padding, padding], [width - padding, height - padding]], land,
    );
  }
  // Do not serialize off-canvas world geometry. This changes neither the D3
  // projection nor visible pixels; it keeps local-tile SVGs small enough for a queue.
  projection.clipExtent([[0, 0], [width, height]]);
  const span = pts.length >= 2
    ? Math.max(d3.max(pts, p => p.lon) - d3.min(pts, p => p.lon), d3.max(pts, p => p.lat) - d3.min(pts, p => p.lat))
    : null;
  const zoomMult = pts.length >= 2 ? Math.max(1, Math.min(3, Math.pow(60 / Math.max(span, 1e-6), 0.5))) : pts.length === 1 ? 2 : 1;
  return { projection, zoomMult };
}

function riverWidth(rank, zoom) {
  const base = rank === 0 ? 1.2 : rank === 1 ? 1.1 : rank === 2 ? 1 : rank === 3 ? .9 : rank === 4 ? .8 : rank === 5 ? .7 : rank === 6 ? .6 : .5;
  let damp = 1;
  if (zoom <= 1.08) damp = rank >= 6 ? .08 : rank === 5 ? .12 : rank === 4 ? .18 : rank === 3 ? .35 : rank === 2 ? .6 : rank === 1 ? .8 : .9;
  else if (zoom <= 1.18) damp = rank >= 6 ? .18 : rank === 5 ? .25 : rank === 4 ? .45 : rank === 3 ? .65 : rank === 2 ? .75 : rank === 1 ? .85 : .95;
  else if (zoom <= 1.28) damp = rank >= 6 ? .35 : rank === 5 ? .5 : rank === 4 ? .7 : 1;
  return Math.max(.08, base * (.9 + .4 * (zoom - 1)) * damp);
}
function riverOpacity(rank, zoom) {
  const base = rank === 0 ? .9 : rank === 1 ? .85 : rank === 2 ? .75 : rank === 3 ? .55 : rank === 4 ? .35 : rank === 5 ? .22 : .18;
  let fade = 0;
  if (zoom <= 1.08) fade = rank >= 6 ? .12 : rank === 5 ? .1 : rank === 4 ? .08 : rank === 3 ? .05 : 0;
  else if (zoom <= 1.18) fade = rank >= 6 ? .08 : rank === 5 ? .06 : rank === 4 ? .04 : 0;
  else if (zoom <= 1.28) fade = rank >= 6 ? .04 : rank === 5 ? .03 : 0;
  let value = base + Math.max(0, (zoom - 1) * .12) - fade;
  if (rank <= 2 && zoom <= 1.1) value = Math.max(value, .55);
  if (rank >= 5 && zoom <= 1.08) value = Math.min(value, .16);
  return Math.max(.04, Math.min(1, value));
}

async function render(command) {
  const index = Number(command.index);
  const tile = tiles[index];
  if (!tile) throw new Error(`Tile ${index} does not exist (0–${tiles.length - 1})`);
  const width = Number(command.width ?? 260);
  const height = Number(command.height ?? width);
  const padding = Number(command.padding ?? 50);
  const style = command.style;
  const { projection, zoomMult } = projectionFor(tile, width, height, padding, Number(command.singleSpanDeg ?? .6));
  const geoPath = d3.geoPath(projection);
  emit({ type: "tile", phase: "projection", index, name: tile.name, zoomMult });

  const lakeFeatures = lakes.features.filter(function (d, i) {
    const cls = String(d.properties.featurecla).toLowerCase();
    if (cls.includes("ocean") || cls.includes("sea") || cls.includes("land")) return false;
    if (cls && !["lake", "reservoir", "waterbody", "inland"].some((x) => cls.includes(x))) return false;
    const b = geoPath.bounds(d);
    return !((b[1][0] - b[0][0] > width * .95) && (b[1][1] - b[0][1] > height * .95));
  });
  const riverFeatures = rivers.features.filter(function (d, i) {
    const rank = d.properties.scalerank;
    if (zoomMult <= 1.10 && rank >= 5) return false;
    if (zoomMult <= 1.05 && rank >= 4) return false;
    if (zoomMult <= 1.15) {
    const b = geoPath.bounds(d);
      if (Math.hypot(b[1][0] - b[0][0], b[1][1] - b[0][1]) < 6) return false;
    }
    return true;
  });
  let cityLabels = [];
  if (style.showCities && cities.features.length) {
    const allInView = cities.features.filter(function (d, i) {
      const name = String(d.properties?.name ?? "");
      const fc = String(d.properties?.featurecla ?? "").toLowerCase();
      return name && !fc.includes("region") && (fc.includes("populated place") || fc.includes("admin-0 capital") || fc.includes("admin-1 capital")) && Array.isArray(d.geometry?.coordinates);
    }).map((f) => {
      const point = projection(f.geometry.coordinates);
      if (!point || !Number.isFinite(point[0]) || !Number.isFinite(point[1]) || point[0] < 0 || point[0] > width || point[1] < 0 || point[1] > height) return null;
      return { f, x: point[0], y: point[1], s: Number.isFinite(+f.properties?.scalerank) ? +f.properties.scalerank : 99, l: Number.isFinite(+f.properties?.labelrank) ? +f.properties.labelrank : 99, pop: Number.isFinite(+f.properties?.pop_max) ? +f.properties.pop_max : 0 };
    }).filter(function (d, i) {
      return Boolean(d);
    });
    const importance = (a, b) => (a.s - b.s) || (a.l - b.l) || (b.pop - a.pop);
    cityLabels = allInView.filter(function (d, i) {
      return d.s <= 4 || d.l <= 4 || d.pop >= 800000;
    }).sort(importance).slice(0, style.cityMaxPrimary);
    if (cityLabels.length < 2) cityLabels = allInView.filter(function (d, i) {
      return d.s <= 7 || d.l <= 7 || d.pop >= 80000;
    }).sort(importance).slice(0, style.cityMaxRelaxed);
    if (!cityLabels.length && allInView.length) {
      const nearest = d3.least(allInView, (d) => (d.x - width / 2) ** 2 + (d.y - height / 2) ** 2);
      cityLabels = [{ ...nearest, forceCenter: true }];
    }
  }
  const p = (feature) => geoPath(feature) || "";
  const clipId = `land-${index}`;
  const patternId = `urban-${index}`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
<rect width="${width}" height="${height}" fill="${esc(style.background)}"/>
<defs><clipPath id="${clipId}"><path d="${esc(p(land))}"/></clipPath><pattern id="${patternId}" patternUnits="userSpaceOnUse" width="${style.urbanSpacing}" height="${style.urbanSpacing}" patternTransform="rotate(${style.urbanAngle})"><line x1="0" y1="0" x2="0" y2="${style.urbanSpacing}" stroke="${esc(style.urban)}" stroke-width="${style.urbanLineWidth}" opacity="${style.urbanOpacity}"/></pattern></defs>
<path d="${esc(p({ type: "Sphere" }))}" fill="${esc(style.ocean)}"/>
<path d="${esc(p(d3.geoGraticule10()))}" fill="none" stroke="${esc(style.graticule)}" stroke-width="${style.graticuleWidth}"/>
<path d="${esc(p(islands))}" fill="${esc(style.land)}"/>
<path d="${esc(p(land))}" fill="${esc(style.land)}"/>
<path d="${esc(p(urban))}" fill="url(#${patternId})"/>
${style.showRoads ? `<path d="${esc(p(roads))}" fill="none" stroke="${esc(style.roads)}" stroke-width="${style.roadWidth}" stroke-opacity="${style.roadOpacity}" stroke-linecap="round" stroke-linejoin="round"/>` : ""}
${lakeFeatures.map((f) => `<path d="${esc(p(f))}" fill="${esc(style.water)}"/>`).join("\n")}
${riverFeatures.map((f) => { const r = f.properties.scalerank; return `<path d="${esc(p(f))}" fill="none" stroke="${esc(style.river)}" stroke-linecap="round" stroke-linejoin="round" stroke-width="${riverWidth(r, zoomMult)}" stroke-opacity="${riverOpacity(r, zoomMult)}"/>`; }).join("\n")}
<path d="${esc(p(coastline))}" fill="none" stroke="${esc(style.coastline)}" stroke-width="${style.coastlineWidth}" opacity="${style.coastlineOpacity}"/>
${cityLabels.map((d) => `<text x="${d.forceCenter ? width / 2 : d.x}" y="${d.forceCenter ? height / 2 : d.y}" dy="-0.35em" fill="${esc(style.cityColor)}" opacity="1" font-size="${d.forceCenter ? style.cityFallbackSize : style.citySize}" font-family="${esc(style.cityFamily)}" font-weight="${style.cityWeight}" font-style="${esc(style.cityStyle)}" text-anchor="middle" paint-order="stroke" stroke="${esc(style.cityHalo)}" stroke-width="${style.cityHaloWidth}" stroke-opacity="${style.cityHaloOpacity}">${esc(d.f.properties?.name ?? "")}</text>`).join("\n")}
</svg>`;
  const outputDir = path.resolve(command.outputDir ?? path.join(PROJECT_ROOT, "map-tiles/trips"));
  await fs.mkdir(outputDir, { recursive: true });
  const stem = String(command.stem ?? tile.originalIndex ?? index).padStart(4, "0");
  const scale = Number(command.scale ?? 5);
  const rendered = new Resvg(svg, {
    fitTo: { mode: "width", value: Math.round(width * scale) },
    font: {
      fontFiles: command.fontFiles ?? [],
      fontDirs: command.fontDirs ?? [],
      loadSystemFonts: command.loadSystemFonts ?? true,
      defaultFontFamily: command.defaultFontFamily ?? "sans-serif",
    },
  }).render();
  const file = path.join(outputDir, `${stem}.webp`);
  await sharp(rendered.asPng()).webp({
    lossless: false,
    quality: Number(command.webpQuality ?? 95),
    effort: Number(command.webpEffort ?? 5),
  }).toFile(file);
  return { output: file };
}

let tileSummary = configureHierarchy();
emit({ type: "ready", count: tiles.length, tiles: tileSummary, hierarchyMode });
const lines = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
for await (const line of lines) {
  if (!line.trim()) continue;
  let command;
  try { command = JSON.parse(line); } catch (error) { emit({ type: "error", message: `Invalid JSON: ${error.message}` }); continue; }
  if (command.action === "quit") break;
  if (command.action === "configure") {
    try {
      tileSummary = configureHierarchy(command.mode, command.minItemsPerTile);
      emit({ type: "configured", count: tiles.length, tiles: tileSummary, hierarchyMode });
    } catch (error) {
      emit({ type: "error", message: error.message, stack: error.stack });
    }
    continue;
  }
  if (command.action !== "render") { emit({ type: "error", message: `Unbekannte Aktion: ${command.action}` }); continue; }
  const started = Date.now();
  try { emit({ type: "done", ...(await render(command)), seconds: (Date.now() - started) / 1000 }); }
  catch (error) { emit({ type: "failed", index: command.index, message: error.message, stack: error.stack }); }
}
lines.close();
process.exit(0);
