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

export type Viewer = {
  name: string;
  simulated: boolean;
};

export type RouteInfo = {
  distanceMeters: number;
  durationSeconds: number;
  geometry: { type: "LineString"; coordinates: [number, number][] };
  steps: { instruction: string; distanceMeters: number; durationSeconds: number }[];
};
