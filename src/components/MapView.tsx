"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, LayerGroup, Polyline } from "leaflet";
import type { Coord } from "@/lib/client/geo";
import "leaflet/dist/leaflet.css";

export type MapSpot = {
  id: string;
  lat: number;
  lng: number;
  name: string;
};

type Props = {
  spots?: MapSpot[];
  center: Coord;
  zoom?: number;
  userLocation?: Coord | null;
  route?: { coordinates: [number, number][] } | null;
  selectedId?: string | null;
  pin?: Coord | null;
  pickable?: boolean;
  onSelect?: (id: string) => void;
  onPick?: (coord: Coord) => void;
  fitToSpots?: boolean;
};

export default function MapView({
  spots = [],
  center,
  zoom = 13,
  userLocation,
  route,
  selectedId,
  pin,
  pickable,
  onSelect,
  onPick,
  fitToSpots,
}: Props) {
  const host = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const spotsLayer = useRef<LayerGroup | null>(null);
  const extrasLayer = useRef<LayerGroup | null>(null);
  const routeLine = useRef<Polyline | null>(null);
  const onSelectRef = useRef(onSelect);
  const onPickRef = useRef(onPick);
  const [ready, setReady] = useState(0);
  onSelectRef.current = onSelect;
  onPickRef.current = onPick;

  useEffect(() => {
    if (!host.current || mapRef.current) return;
    let cancelled = false;
    (async () => {
      const L = await import("leaflet");
      if (cancelled || !host.current) return;
      const map = L.map(host.current, {
        zoomControl: false,
        attributionControl: true,
      }).setView([center.lat, center.lng], zoom);
      L.control.zoom({ position: "bottomright" }).addTo(map);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap",
        className: "sk-tiles",
        maxZoom: 19,
      }).addTo(map);
      spotsLayer.current = L.layerGroup().addTo(map);
      extrasLayer.current = L.layerGroup().addTo(map);
      map.on("click", (event) => {
        if (onPickRef.current) {
          onPickRef.current({ lat: event.latlng.lat, lng: event.latlng.lng });
        }
      });
      mapRef.current = map;
      setReady((n) => n + 1);
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setView([center.lat, center.lng], map.getZoom() || zoom);
  }, [center.lat, center.lng, zoom, ready]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const map = mapRef.current;
      const layer = spotsLayer.current;
      if (!map || !layer) return;
      const L = await import("leaflet");
      if (!alive) return;
      layer.clearLayers();
      for (const spot of spots) {
        const selected = spot.id === selectedId;
        const marker = L.marker([spot.lat, spot.lng], {
          icon: L.divIcon({
            className: `sk-pin${selected ? " is-selected" : ""}`,
            html: "<span></span>",
            iconSize: [22, 22],
          }),
          title: spot.name,
        });
        marker.on("click", (event) => {
          L.DomEvent.stopPropagation(event);
          onSelectRef.current?.(spot.id);
        });
        marker.addTo(layer);
      }
      if (fitToSpots && spots.length > 1) {
        const bounds = L.latLngBounds(spots.map((s) => [s.lat, s.lng] as [number, number]));
        map.fitBounds(bounds.pad(0.2));
      }
    })();
    return () => {
      alive = false;
    };
  }, [spots, selectedId, fitToSpots, ready]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const map = mapRef.current;
      const layer = extrasLayer.current;
      if (!map || !layer) return;
      const L = await import("leaflet");
      if (!alive) return;
      layer.clearLayers();
      if (routeLine.current) {
        routeLine.current.remove();
        routeLine.current = null;
      }
      if (userLocation) {
        L.marker([userLocation.lat, userLocation.lng], {
          icon: L.divIcon({
            className: "sk-user",
            html: "<span></span>",
            iconSize: [18, 18],
          }),
          zIndexOffset: 400,
          title: "You",
        }).addTo(layer);
      }
      if (pin) {
        L.marker([pin.lat, pin.lng], {
          icon: L.divIcon({
            className: "sk-drop",
            html: "<span></span>",
            iconSize: [22, 22],
          }),
          zIndexOffset: 500,
          draggable: Boolean(pickable),
        })
          .on("dragend", (event) => {
            const marker = event.target as { getLatLng: () => { lat: number; lng: number } };
            onPickRef.current?.({ lat: marker.getLatLng().lat, lng: marker.getLatLng().lng });
          })
          .addTo(layer);
      }
      if (route?.coordinates?.length) {
        const latlngs = route.coordinates.map(([lng, lat]) => [lat, lng] as [number, number]);
        routeLine.current = L.polyline(latlngs, {
          color: "#ff4d00",
          weight: 5,
          opacity: 0.92,
        }).addTo(map);
        map.fitBounds(routeLine.current.getBounds().pad(0.2));
      }
    })();
    return () => {
      alive = false;
    };
  }, [userLocation, pin, pickable, route, ready]);

  return <div ref={host} className="h-full w-full" />;
}
