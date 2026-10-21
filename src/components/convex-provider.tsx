"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import type { ReactNode } from "react";

const client = new ConvexReactClient(
  process.env.NEXT_PUBLIC_CONVEX_URL ??
    "https://configure-your-project.convex.cloud",
);

export function AppConvexProvider({ children }: { children: ReactNode }) {
  return <ConvexProvider client={client}>{children}</ConvexProvider>;
}

