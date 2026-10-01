import { useMemo, useEffect, useRef } from "react";
import {
  Map,
  MapMarker,
  MarkerContent,
  MapControls,
  MapRoute,
  RouteProgress,
  RouteMarker,
} from "./map";

/**
 * RouteMap — real MapLibre map (mapcn components, free CARTO tiles, no API
 * key) showing a route line between the origin and destination stops, the
 * stops along it, and an animated progress bus when a live run exists.
 *
 * Falls back gracefully: when the stops table has no coordinates for the
 * route's endpoints the caller renders the old SVG canvas instead.
 */

// Cape Town fallback viewport so the map opens somewhere sensible even
// before stops resolve.
const CAPE_TOWN = { center: [18.4241, -33.9249], zoom: 10.5 };

export default function RouteMap({
  routeStops = [],
  progress = 0,
  routeLabel = "",
}) {
  // Coordinates for this route's endpoint stops, in travel order.
  const coordinates = useMemo(() => {
    const pairs = routeStops
      .map((s) => [s.longitude, s.latitude])
      .filter(([lng, lat]) => Number.isFinite(lng) && Number.isFinite(lat));
    return pairs.length >= 2 ? pairs : [];
  }, [routeStops]);

  const middleStops = useMemo(() => {
    if (routeStops.length < 3) return [];
    return routeStops.slice(1, -1).filter(
      (s) => Number.isFinite(s.longitude) && Number.isFinite(s.latitude),
    );
  }, [routeStops]);

  const mapRef = useRef(null);

  // Fit the viewport to the route once both map and stops are ready.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || coordinates.length < 2) return;
    map.fitBounds(
      [
        [Math.min(...coordinates.map((c) => c[0])), Math.min(...coordinates.map((c) => c[1]))],
        [Math.max(...coordinates.map((c) => c[0])), Math.max(...coordinates.map((c) => c[1]))],
      ],
      { padding: 56, maxZoom: 13, duration: 0 },
    );
  }, [coordinates]);

  if (coordinates.length < 2) return null;

  return (
    <div className="absolute inset-0">
      <Map
        ref={mapRef}
        {...CAPE_TOWN}
        className="h-full w-full"
        attributionControl={false}
      >
        <MapRoute
          id="route-line"
          coordinates={coordinates}
          color="#f0b429"
          width={5}
          opacity={0.95}
          progress={progress}
        >
          <RouteProgress color="#e1251b" width={4} />
          {coordinates.length >= 2 && (
            <RouteMarker at="start">
              <MarkerContent>
                <StopDot label={routeStops[0]?.name} />
              </MarkerContent>
            </RouteMarker>
          )}
          {coordinates.length >= 2 && (
            <RouteMarker at="end">
              <MarkerContent>
                <StopDot end label={routeStops[routeStops.length - 1]?.name} />
              </MarkerContent>
            </RouteMarker>
          )}
        </MapRoute>

        {/* Intermediate stops as simple dots */}
        {middleStops.map((s) => (
          <MapMarker key={s.id} longitude={s.longitude} latitude={s.latitude}>
            <MarkerContent>
              <span
                className="block h-2.5 w-2.5 rounded-full border-2 border-white bg-white/70 shadow"
                title={s.name}
              />
            </MarkerContent>
          </MapMarker>
        ))}

        {/* Live bus marker riding the route progress */}
        {progress > 0 && progress < 1 && (
          <RouteMarker at="progress">
            <MarkerContent>
              <div className="relative flex items-center justify-center">
                <span className="absolute h-8 w-8 animate-ping rounded-full bg-gold-400/50" />
                <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-gold-500 text-[13px] shadow-lg">
                  🚌
                </span>
              </div>
              <span className="absolute top-full mt-1 whitespace-nowrap rounded-md bg-ink-900/90 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                {routeLabel}
              </span>
            </MarkerContent>
          </RouteMarker>
        )}

        <MapControls position="bottom-right" showZoom showLocate />
      </Map>
    </div>
  );
}

function StopDot({ end = false, label }) {
  return (
    <div className="relative flex flex-col items-center">
      <span
        className={`h-4 w-4 rounded-full border-[3px] border-white shadow ${
          end ? "bg-brand-500" : "bg-gold-500"
        }`}
      />
      {label && (
        <span className="absolute top-full mt-0.5 whitespace-nowrap rounded bg-ink-900/85 px-1.5 py-0.5 text-[9px] font-semibold text-white">
          {label}
        </span>
      )}
    </div>
  );
}
