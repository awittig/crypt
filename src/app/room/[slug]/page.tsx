import type { Metadata } from "next";
import { Suspense } from "react";

import { RoomSolver } from "@/components/room-solver";

export const metadata: Metadata = {
  title: "Private solving room",
  robots: {
    index: false,
    follow: false,
  },
};

export default function RoomPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return (
    <Suspense fallback={<div className="state-wrap">Opening the room…</div>}>
      <RoomContent params={params} />
    </Suspense>
  );
}

async function RoomContent({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <RoomSolver slug={slug} />;
}

