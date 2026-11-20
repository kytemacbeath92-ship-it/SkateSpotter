import "server-only";
import { sql } from "./db";
import { PHOTO_CAP } from "./limits";
import { displaySpotName } from "./spotName";
import { isoWeekStartUtc } from "./week";

export { PHOTO_CAP };

export type PhotoKind = "spot" | "trick";

export type PhotoRow = {
  id: string;
  spot_id: string;
  kind: PhotoKind;
  mime_type: string;
  caption: string;
  created_by: string;
  created_by_name: string;
  created_at: string;
  like_count: number;
  liked_by_me: boolean;
  comment_count: number;
};

export type SpotRow = {
  id: string;
  lat: number;
  lng: number;
  street_address: string;
  building_name: string | null;
  common_name: string | null;
  common_name_logged_by: string | null;
  description: string;
  spot_type: string;
  security: string;
  created_by: string;
  created_by_name: string;
  created_at: string;
  cover_photo_id: string | null;
  pending_cover_photo_id: string | null;
};

export function photoUrl(id: string) {
  return `/api/photos/${id}`;
}

export function serializeSpot(row: SpotRow) {
  return {
    id: row.id,
    lat: row.lat,
    lng: row.lng,
    streetAddress: row.street_address,
    buildingName: row.building_name,
    commonName: row.common_name,
    name: displaySpotName({
      commonName: row.common_name,
      buildingName: row.building_name,
      streetAddress: row.street_address,
    }),
    nameIsCommon: Boolean(row.common_name),
    description: row.description,
    spotType: row.spot_type || "",
    security: row.security || "",
    createdByName: row.created_by_name,
    createdAt: row.created_at,
    coverPhotoId: row.cover_photo_id,
    coverUrl: row.cover_photo_id ? photoUrl(row.cover_photo_id) : null,
    pendingCoverPhotoId: row.pending_cover_photo_id,
  };
}

export function serializePhoto(row: PhotoRow) {
  return {
    id: row.id,
    spotId: row.spot_id,
    kind: row.kind,
    caption: row.caption,
    createdByName: row.created_by_name,
    createdAt: row.created_at,
    url: photoUrl(row.id),
    likeCount: Number(row.like_count) || 0,
    likedByMe: Boolean(row.liked_by_me),
    commentCount: Number(row.comment_count) || 0,
  };
}

export async function countUserPhotos(spotId: string, userId: string, kind: PhotoKind) {
  const rows = await sql<{ n: number }>(
    "select count(*)::int as n from photos where spot_id = $1 and created_by = $2 and kind = $3",
    [spotId, userId, kind],
  );
  return rows[0]?.n ?? 0;
}

export async function getSpot(id: string): Promise<SpotRow | null> {
  const rows = await sql<SpotRow>("select * from spots where id = $1", [id]);
  return rows[0] ?? null;
}

export async function listPhotos(spotId: string, viewerId: string, kind?: PhotoKind) {
  const params: unknown[] = [viewerId, spotId];
  const kindFilter = kind ? (params.push(kind), "and p.kind = $3") : "";
  return sql<PhotoRow>(
    `select p.id, p.spot_id, p.kind, p.mime_type, p.caption, p.created_by, p.created_by_name, p.created_at,
            (select count(*)::int from likes l where l.photo_id = p.id) as like_count,
            exists(select 1 from likes l where l.photo_id = p.id and l.user_id = $1) as liked_by_me,
            (select count(*)::int from comments c where c.photo_id = p.id) as comment_count
     from photos p
     where p.spot_id = $2 ${kindFilter}
     order by p.created_at asc`,
    params,
  );
}

export async function trickOfTheWeek(spotId: string, viewerId: string) {
  const start = isoWeekStartUtc();
  const rows = await sql<PhotoRow>(
    `select p.id, p.spot_id, p.kind, p.mime_type, p.caption, p.created_by, p.created_by_name, p.created_at,
            (select count(*)::int from likes l where l.photo_id = p.id) as like_count,
            exists(select 1 from likes l where l.photo_id = p.id and l.user_id = $1) as liked_by_me,
            (select count(*)::int from comments c where c.photo_id = p.id) as comment_count
     from photos p
     where p.spot_id = $2
       and p.kind = 'trick'
       and p.created_at >= $3
     order by like_count desc, p.created_at desc
     limit 1`,
    [viewerId, spotId, start.toISOString()],
  );
  const winner = rows[0];
  if (!winner || Number(winner.like_count) < 1) return null;
  return winner;
}
