export type Coord = { lat: number; lng: number };

export function formatDistance(meters: number) {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(meters < 10000 ? 1 : 0)} km`;
}

export function formatDuration(seconds: number) {
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return `${h} hr ${m % 60} min`;
}

export function googleMapsDir(to: Coord, from?: Coord | null) {
  const dest = `${to.lat},${to.lng}`;
  const origin = from ? `&origin=${from.lat},${from.lng}` : "";
  return `https://www.google.com/maps/dir/?api=1&destination=${dest}${origin}&travelmode=bicycling`;
}

export function getGps(options?: PositionOptions): Promise<Coord> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("GPS is not available on this device"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(new Error(err.message || "Could not read GPS")),
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 10000, ...options },
    );
  });
}

export function watchGps(onPoint: (coord: Coord) => void, onError?: (err: Error) => void) {
  if (!navigator.geolocation) {
    onError?.(new Error("GPS is not available on this device"));
    return () => {};
  }
  const id = navigator.geolocation.watchPosition(
    (pos) => onPoint({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
    (err) => onError?.(new Error(err.message || "Could not track GPS")),
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 },
  );
  return () => navigator.geolocation.clearWatch(id);
}
