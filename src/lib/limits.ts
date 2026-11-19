export const PHOTO_CAP = 5;
export const SPOTS_PER_HOUR = 10;

export const RIDES = ["skateboard", "bike", "scooter", "rollerblades"] as const;
export type Ride = (typeof RIDES)[number];

export const RIDE_LABELS: Record<Ride, string> = {
  skateboard: "Skateboard",
  bike: "Bike",
  scooter: "Scooter",
  rollerblades: "Rollerblades",
};
