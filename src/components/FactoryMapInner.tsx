"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L, { type LeafletMouseEvent } from "leaflet";

import "leaflet/dist/leaflet.css";

import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/cn";
import {
  searchPlaces,
  suggestNearestPorts,
  reverseGeocode,
  getDrivingRoute,
  type PlaceHit,
  type SuggestedPort,
  type DrivingRoute,
} from "@/lib/maps";

const FACTORY_ICON = L.divIcon({
  className: "",
  html: '<div style="width:26px;height:26px;border-radius:9999px;background:#dc2626;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>',
  iconSize: [26, 26],
  iconAnchor: [13, 13],
});

const PORT_ICON = L.divIcon({
  className: "",
  html: '<div style="width:26px;height:26px;border-radius:9999px;background:#225cff;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>',
  iconSize: [26, 26],
  iconAnchor: [13, 13],
});

const PORT_ICON_DIM = L.divIcon({
  className: "",
  html: '<div style="width:18px;height:18px;border-radius:9999px;background:#a1a1aa;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.2);"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

type FactoryPin = {
  lat: number;
  lng: number;
  displayName: string;
  city: string;
  country: string;
};

export function FactoryMapInner({
  factoryAddressName,
  cityName,
  latName,
  lngName,
  originPortName,
  defaultCenter = [33.9, 35.51], // Beirut
  onPortSelected,
  onFactoryPinned,
}: {
  factoryAddressName: string;
  cityName: string;
  latName: string;
  lngName: string;
  originPortName: string;
  defaultCenter?: [number, number];
  onPortSelected?: (port: { unlocode: string; name: string; country: string }) => void;
  onFactoryPinned?: (lat: number, lng: number) => void;
}) {
  const t = useTranslations("FactoryMap");

  const [factory, setFactory] = useState<FactoryPin | null>(null);
  const [ports, setPorts] = useState<SuggestedPort[]>([]);
  const [selectedPort, setSelectedPort] = useState<SuggestedPort | null>(null);
  const [route, setRoute] = useState<DrivingRoute | null>(null);

  // Search state
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PlaceHit[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchPending, startSearch] = useTransition();
  const [portsPending, startPorts] = useTransition();
  const [routePending, startRoute] = useTransition();
  const wrapRef = useRef<HTMLDivElement>(null);

  // ---- Debounced place search ----
  useEffect(() => {
    // Skip if user hasn't typed enough, OR the box is showing the
    // already-picked place (avoids a redundant search after pick).
    if (query.length < 3 || query === factory?.displayName) {
      setSearchResults([]);
      setSearchOpen(false);
      return;
    }
    // Open the dropdown immediately with the loading state so users see
    // feedback while Nominatim is in-flight (which can take ~1s).
    setSearchOpen(true);
    const handle = setTimeout(() => {
      startSearch(async () => {
        const hits = await searchPlaces(query);
        setSearchResults(hits);
        setSearchOpen(true);
      });
    }, 400);
    return () => clearTimeout(handle);
  }, [query, factory?.displayName]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // ---- Factory pin → fetch nearest ports ----
  const placeFactory = useCallback(
    (pin: FactoryPin) => {
      setFactory(pin);
      setSelectedPort(null);
      setRoute(null);
      onFactoryPinned?.(pin.lat, pin.lng);
      startPorts(async () => {
        const hits = await suggestNearestPorts(pin.lat, pin.lng, 3);
        setPorts(hits);
      });
    },
    [onFactoryPinned]
  );

  const handleSearchPick = (hit: PlaceHit) => {
    placeFactory({
      lat: hit.lat,
      lng: hit.lng,
      displayName: hit.displayName,
      city: hit.city ?? "",
      country: hit.country ?? "",
    });
    setQuery(hit.displayName);
    setSearchOpen(false);
  };

  const handleMapClick = (lat: number, lng: number) => {
    placeFactory({
      lat,
      lng,
      displayName: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      city: "",
      country: "",
    });
    // Reverse geocode in the background to upgrade the address line.
    void reverseGeocode(lat, lng).then((hit) => {
      if (!hit) return;
      setFactory((prev) =>
        prev && prev.lat === lat && prev.lng === lng
          ? {
              ...prev,
              displayName: hit.displayName,
              city: hit.city ?? prev.city,
              country: hit.country ?? prev.country,
            }
          : prev
      );
    });
  };

  const handleMarkerDrag = (lat: number, lng: number) => {
    handleMapClick(lat, lng);
  };

  // ---- Origin port selected → fetch route ----
  const handlePortPick = (port: SuggestedPort) => {
    setSelectedPort(port);
    setRoute(null);
    onPortSelected?.({ unlocode: port.unlocode, name: port.name, country: port.country });
    if (!factory) return;
    startRoute(async () => {
      const r = await getDrivingRoute(factory.lat, factory.lng, port.lat, port.lng);
      setRoute(r);
    });
  };

  // Convert OSRM [lng, lat] geometry to Leaflet [lat, lng] polyline points.
  const routePositions: Array<[number, number]> = route
    ? route.geometry.map(([lng, lat]) => [lat, lng])
    : [];

  return (
    <div className="flex flex-col gap-3">
      {/* Hidden form fields — server action reads these. */}
      <input type="hidden" name={factoryAddressName} value={factory?.displayName ?? ""} />
      <input type="hidden" name={cityName} value={factory?.city ?? ""} />
      <input type="hidden" name={latName} value={factory?.lat ?? ""} />
      <input type="hidden" name={lngName} value={factory?.lng ?? ""} />
      <input type="hidden" name={originPortName} value={selectedPort?.unlocode ?? ""} />

      {/* Search box overlays the map. We give the wrapper its own z-context
          (z-[1100]) so the absolutely-positioned dropdown beats Leaflet's
          control layer (z-1000) and tooltip/popup panes (z-650/700). */}
      <div ref={wrapRef} className="relative z-[1100]">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => searchResults.length && setSearchOpen(true)}
          placeholder={t("searchPlaceholder")}
          autoComplete="off"
        />
        {searchOpen && (searchPending || searchResults.length > 0) && (
          <ul className="absolute z-[1200] mt-1 max-h-72 w-full overflow-auto rounded-md border border-zinc-200 bg-white shadow-lg">
            {searchPending && (
              <li className="px-3 py-2 text-sm text-zinc-400">{t("searching")}</li>
            )}
            {!searchPending &&
              searchResults.map((hit, i) => (
                <li key={`${hit.lat}-${hit.lng}-${i}`}>
                  <button
                    type="button"
                    onClick={() => handleSearchPick(hit)}
                    className="block w-full px-3 py-2 text-start text-sm hover:bg-zinc-100"
                  >
                    <span className="font-medium text-zinc-900">
                      {hit.displayName}
                    </span>
                  </button>
                </li>
              ))}
            {!searchPending && searchResults.length === 0 && query.length >= 3 && (
              <li className="px-3 py-2 text-sm text-zinc-400">{t("noMatches")}</li>
            )}
          </ul>
        )}
      </div>

      {/* Map */}
      <div className="overflow-hidden rounded-lg border border-zinc-200">
        <MapContainer
          center={factory ? [factory.lat, factory.lng] : defaultCenter}
          zoom={factory ? 11 : 6}
          style={{ height: 420, width: "100%" }}
          scrollWheelZoom={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickHandler onClick={handleMapClick} />
          <FlyTo factory={factory} />

          {factory && (
            <Marker
              position={[factory.lat, factory.lng]}
              icon={FACTORY_ICON}
              draggable
              eventHandlers={{
                dragend: (e) => {
                  const m = e.target as L.Marker;
                  const ll = m.getLatLng();
                  handleMarkerDrag(ll.lat, ll.lng);
                },
              }}
            />
          )}

          {ports.map((p) => (
            <Marker
              key={p.unlocode}
              position={[p.lat, p.lng]}
              icon={selectedPort?.unlocode === p.unlocode ? PORT_ICON : PORT_ICON_DIM}
              eventHandlers={{ click: () => handlePortPick(p) }}
            />
          ))}

          {routePositions.length > 0 && (
            <Polyline
              positions={routePositions}
              pathOptions={{ color: "#225cff", weight: 4, opacity: 0.85 }}
            />
          )}
        </MapContainer>
      </div>

      {/* Factory address readout */}
      {factory && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900">
          <div className="text-xs font-medium uppercase tracking-wide text-red-700">
            {t("factoryLabel")}
          </div>
          <div className="mt-0.5">{factory.displayName}</div>
          <div className="mt-0.5 text-xs text-red-700">
            {factory.lat.toFixed(4)}, {factory.lng.toFixed(4)}
            {factory.country ? ` · ${factory.country}` : ""}
          </div>
        </div>
      )}

      {/* Nearest-port suggestions */}
      {factory && (
        <div>
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
            {portsPending ? t("findingPorts") : t("nearestPorts")}
          </div>
          {ports.length === 0 && !portsPending ? (
            <p className="text-sm text-zinc-500">{t("noPortsNearby")}</p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-3">
              {ports.map((p) => (
                <li key={p.unlocode}>
                  <button
                    type="button"
                    onClick={() => handlePortPick(p)}
                    className={cn(
                      "block w-full rounded-md border p-3 text-start text-sm transition",
                      selectedPort?.unlocode === p.unlocode
                        ? "border-[var(--brand)] bg-[var(--brand)]/5"
                        : "border-zinc-300 bg-white hover:border-zinc-400"
                    )}
                  >
                    <div className="font-medium text-zinc-900">{p.name}</div>
                    <div className="text-xs text-zinc-500">
                      {p.unlocode} · {p.country}
                    </div>
                    <div className="mt-1 text-xs text-zinc-700">
                      {t("kmAway", { km: p.distanceKm })}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Route info */}
      {selectedPort && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
          <div className="text-xs font-medium uppercase tracking-wide text-emerald-700">
            {t("routeLabel")}
          </div>
          <div className="mt-0.5">
            {factory?.city || factory?.displayName.slice(0, 40)}
            <span className="px-2 text-emerald-400 dir-arrow" />
            {selectedPort.name} ({selectedPort.unlocode})
          </div>
          <div className="mt-0.5 text-xs text-emerald-700">
            {routePending
              ? t("computingRoute")
              : route
                ? t("routeDetails", {
                    km: route.distanceKm,
                    minutes: route.durationMin,
                  })
                : t("noRoute")}
          </div>
        </div>
      )}
    </div>
  );
}

function ClickHandler({
  onClick,
}: {
  onClick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e: LeafletMouseEvent) {
      onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function FlyTo({ factory }: { factory: FactoryPin | null }) {
  const map = useMap();

  // Make sure Leaflet has the correct container size — the map is mounted
  // inside a conditional ExWorks tab, so on first reveal it can cache a
  // stale 0×0 size and never recover until `invalidateSize` is called.
  useEffect(() => {
    if (!map) return;
    map.whenReady(() => {
      map.invalidateSize();
    });
  }, [map]);

  useEffect(() => {
    if (!map || !factory) return;
    // `whenReady` queues the call until the map's tile layer is initialised,
    // which avoids the "silent no-op" we saw when flyTo fires too early.
    map.whenReady(() => {
      map.flyTo([factory.lat, factory.lng], 11, { duration: 0.6 });
    });
  }, [factory, map]);

  return null;
}
