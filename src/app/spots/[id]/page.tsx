import SpotDetail from "@/components/SpotDetail";

export default async function SpotPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ photo?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  return <SpotDetail spotId={id} focusPhotoId={query.photo} />;
}
