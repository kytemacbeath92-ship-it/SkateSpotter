export type Spot = {
  id: string;
  lat: number;
  lng: number;
  streetAddress: string;
  buildingName: string | null;
  commonName: string | null;
  name: string;
  nameIsCommon: boolean;
  description: string;
  createdByName: string;
  createdAt: string;
  coverPhotoId: string | null;
  coverUrl: string | null;
  pendingCoverPhotoId: string | null;
  distanceMeters?: number;
};

export type Photo = {
  id: string;
  spotId: string;
  kind: "spot" | "trick";
  caption: string;
  createdByName: string;
  createdAt: string;
  url: string;
  likeCount: number;
  likedByMe: boolean;
  commentCount: number;
};

export type Comment = {
  id: string;
  userName: string;
  body: string;
  createdAt: string;
};

export type Ride = "skateboard" | "bike" | "scooter" | "rollerblades";

export type Viewer = {
  complete: boolean;
  name: string;
  fullName?: string;
  age?: number | null;
  city?: string;
  country?: string;
  contact?: string;
  ride?: Ride | "";
  simulated: boolean;
};

export type RouteInfo = {
  distanceMeters: number;
  durationSeconds: number;
  geometry: { type: "LineString"; coordinates: [number, number][] };
  steps: { instruction: string; distanceMeters: number; durationSeconds: number }[];
};
