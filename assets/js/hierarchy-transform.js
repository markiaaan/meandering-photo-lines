import { config } from "../../config.js";

const dataFields = config.dataFields;

export const hierarchyModes = {
  trips: { clusterYears: 1, groupMode: "year+region" },
  "1y": { clusterYears: 1, groupMode: "year" },
  "5y": { clusterYears: 5, groupMode: "year" },
};

export function buildHierarchyData(photos, d3, hierarchyMode = "trips") {
  const { clusterYears, groupMode } =
    hierarchyModes[hierarchyMode] || hierarchyModes.trips;

  //////////////////////Read dates and sort photos

  const parseYear = (dateValue) => {
    if (!dateValue) return null;
    const dateText = String(dateValue).trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(dateText)) {
      return parseInt(dateText.slice(0, 4), 10);
    }
    if (/^\d{4}$/.test(dateText)) return parseInt(dateText, 10);
    const yearMatch = dateText.match(/\d{4}/);
    return yearMatch ? parseInt(yearMatch[0], 10) : null;
  };

  const photoDate = (photo) => {
    if (!photo) return "";
    return String(photo[dataFields.date.column] || "").trim();
  };

  const photoTimestamp = (photo) => {
    const date = photoDate(photo);
    if (!date) return null;
    const timestamp = Date.parse(date);
    if (Number.isFinite(timestamp)) return timestamp;

    const year = parseYear(date);
    if (Number.isFinite(year)) return Date.parse(`${year}-01-01`);
    return null;
  };

  const photoId = (photo) =>
    String(photo[dataFields.id.column] || "").trim();

  const photoSortKey = (photo) => {
    const timestamp = photoTimestamp(photo);
    return {
      ts: Number.isFinite(timestamp) ? timestamp : Infinity,
      id: photoId(photo),
    };
  };

  const comparePhotoSortKeys = (a, b) => {
    if (a.ts !== b.ts) return a.ts - b.ts;
    return a.id.localeCompare(b.id, undefined, {
      numeric: true,
      sensitivity: "base",
    });
  };

  //////////////////////Build place and map-tile labels

  function photoPlaceName(photo) {
    const district = String(
      dataFields.district ? photo[dataFields.district.column] || "" : "",
    ).trim();
    const location = String(
      dataFields.location ? photo[dataFields.location.column] || "" : "",
    ).trim();
    const region = String(
      dataFields.region ? photo[dataFields.region.column] || "" : "",
    ).trim();
    const country = String(photo[dataFields.country.column] || "").trim();

    return [district, location, region, country]
      .filter(function (value, index) {
        return value !== "";
      })
      .join(", ");
  }

  let previousCountryYear = "";
  let tripNumber = 0;

  const mapTileKey = (photo) => {
    const year = parseYear(photoDate(photo));
    let yearLabel = "N/A";
    if (Number.isFinite(year)) {
      const start = Math.floor(year / clusterYears) * clusterYears;
      yearLabel =
        clusterYears === 1 ? String(start) : `${start}–${start + 4}`;
    }

    const country =
      String(photo[dataFields.country.column] || "").trim() || "N/A";

    if (groupMode === "year") return yearLabel;

    // A return to the same country starts a new trip after another country was visited.
    const countryYear = `${country}||${yearLabel}`;
    if (countryYear !== previousCountryYear) {
      tripNumber += 1;
      previousCountryYear = countryYear;
    }
    return `${countryYear}||${tripNumber}`;
  };

  //////////////////////Group photos into map tiles and series

  // Skip photos without the required values.
  const chronologicalPhotos = photos
    .filter(function (photo, index) {
      return (
        String(photo[dataFields.country.column] || "").trim() !== "" &&
        Number.isFinite(photoTimestamp(photo)) &&
        Number.isFinite(+photo[dataFields.lat.column]) &&
        Number.isFinite(+photo[dataFields.lon.column])
      );
    })
    .sort((a, b) =>
      comparePhotoSortKeys(photoSortKey(a), photoSortKey(b)),
    );

  const mapTiles = d3.group(
    chronologicalPhotos,
    mapTileKey,
    function (photo) {
      const series = String(photo[dataFields.series.column] || "").trim();
      // Photos without a series ID are handled as individual series.
      return series || "photo:" + photoId(photo);
    },
  );

  //////////////////////Build map-tile data

  const missions = Array.from(mapTiles, ([mapTileId, seriesMap]) => {
    let countryLabel = "";
    let yearLabel = mapTileId;

    if (groupMode !== "year") {
      [countryLabel, yearLabel] = mapTileId.split("||");
    }
    const mapTileLabel = countryLabel
      ? `${countryLabel} (${yearLabel})`
      : yearLabel;

    const photoSeries = Array.from(seriesMap, ([seriesName, seriesPhotos]) => {
      const seriesItems = seriesPhotos
        .map((photo) => ({
          title: photoId(photo),
          year: parseYear(photoDate(photo)),
          data: photo,
        }))
        .sort((a, b) =>
          comparePhotoSortKeys(photoSortKey(a.data), photoSortKey(b.data)),
        );

      return {
        name: seriesName,
        year:
          seriesItems.find((item) => Number.isFinite(item.year))?.year ?? null,
        children: seriesItems,
      };
    });

    return {
      id: mapTileId,
      name: mapTileLabel,
      countryLabel,
      yearLabel,
      year:
        photoSeries.find((series) => Number.isFinite(series.year))?.year ??
        null,
      children: photoSeries,
      itemCount: Array.from(seriesMap.values()).flat().length,
    };
  });

  missions.forEach((mission, index) => (mission.originalIndex = index));

  //////////////////////Combine series by GPS position

  // Merge series positions that are no more than 25 metres apart.
  const placeMergeDistanceKm = 0.025;

  // Latitude and longitude are angles, not distances. The Haversine formula
  // finds the angle between both points on Earth. Multiplying that angle by
  // the Earth radius gives the distance in kilometres.
  function distanceInKm(first, second) {
    const earthRadiusKm = 6371;
    const latitudeDifference =
      ((second.lat - first.lat) * Math.PI) / 180;
    const longitudeDifference =
      ((second.lon - first.lon) * Math.PI) / 180;
    const firstLatitude = (first.lat * Math.PI) / 180;
    const secondLatitude = (second.lat * Math.PI) / 180;
    const haversine =
      Math.sin(latitudeDifference / 2) ** 2 +
      Math.cos(firstLatitude) *
        Math.cos(secondLatitude) *
        Math.sin(longitudeDifference / 2) ** 2;
    return 2 * earthRadiusKm * Math.asin(Math.sqrt(haversine));
  }

  missions.forEach(function (mission) {
    const combinedPlaces = [];

    mission.children.forEach(function (series) {
      const seriesPhotos = series.children;

      // Average GPS position of all photos in the series.
      const seriesLatitude =
        seriesPhotos.reduce(function (total, photoItem) {
          return total + +photoItem.data[dataFields.lat.column];
        }, 0) / seriesPhotos.length;
      const seriesLongitude =
        seriesPhotos.reduce(function (total, photoItem) {
          return total + +photoItem.data[dataFields.lon.column];
        }, 0) / seriesPhotos.length;

      const firstPhoto = seriesPhotos[0].data;
      const firstTimestamp = photoTimestamp(firstPhoto);
      const lastTimestamp = photoTimestamp(
        seriesPhotos[seriesPhotos.length - 1].data,
      );
      const seriesForPlace = {
        name: series.name,
        year: series.year,
        count: seriesPhotos.length,
        children: seriesPhotos,
      };
      const seriesPlace = {
        name: photoPlaceName(firstPhoto),
        place_short:
          String(
            dataFields.location
              ? firstPhoto[dataFields.location.column] || ""
              : "",
          ).trim() || photoPlaceName(firstPhoto),
        count: seriesPhotos.length,
        lat: seriesLatitude,
        lon: seriesLongitude,
        children: [seriesForPlace],
        firstTimestamp,
        lastTimestamp,
        firstSortKey: photoSortKey(firstPhoto),
        seriesPositions: [{ lat: seriesLatitude, lon: seriesLongitude }],
        sourceSeries: [series],
      };

      // Place names are labels; grouping uses GPS positions.
      const nearbyPlace = combinedPlaces.find(function (place) {
        return distanceInKm(place, seriesPlace) <= placeMergeDistanceKm;
      });

      if (nearbyPlace == null) {
        combinedPlaces.push(seriesPlace);
        return;
      }

      // Add this series to the existing nearby place.
      nearbyPlace.count += seriesPlace.count;
      nearbyPlace.children.push(...seriesPlace.children);
      nearbyPlace.seriesPositions.push(...seriesPlace.seriesPositions);
      nearbyPlace.sourceSeries.push(series);
      nearbyPlace.lastTimestamp = Math.max(
        nearbyPlace.lastTimestamp,
        seriesPlace.lastTimestamp,
      );

      // Average nearby series positions without weighting by photo count.
      nearbyPlace.lat =
        nearbyPlace.seriesPositions.reduce(function (total, position) {
          return total + position.lat;
        }, 0) / nearbyPlace.seriesPositions.length;
      nearbyPlace.lon =
        nearbyPlace.seriesPositions.reduce(function (total, position) {
          return total + position.lon;
        }, 0) / nearbyPlace.seriesPositions.length;
    });

    mission.places = combinedPlaces.map(function (place, placeIndex) {
      const finalPlace = {
        key: `${mission.id}||place-${placeIndex}`,
        name: place.name,
        place_short: place.place_short,
        count: place.count,
        lat: place.lat,
        lon: place.lon,
        children: place.children,
        firstTimestamp: place.firstTimestamp,
        lastTimestamp: place.lastTimestamp,
        firstSortKey: place.firstSortKey,
      };
      place.sourceSeries.forEach(function (series) {
        series.places = [finalPlace];
      });
      return finalPlace;
    });
  });

  //////////////////////Create D3 hierarchy

  const hierarchicalData = d3
    .hierarchy({
      name: "root",
      year: null,
      children: missions,
      places: missions.flatMap((mission) => mission.places),
    })
    .sum((hierarchyItem) =>
      hierarchyItem && hierarchyItem.data ? 1 : 0,
    );

  return {
    missions,
    hierarchicalData,
    hierarchyMode:
      hierarchyModes[hierarchyMode] == null ? "trips" : hierarchyMode,
  };
}
