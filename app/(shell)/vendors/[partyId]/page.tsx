"use client";

import { useParams } from "next/navigation";

import { VendorDetailView } from "@/components/vendors/vendor-detail-view";

export default function VendorDetailPage() {
  const { partyId } = useParams<{ partyId: string }>();
  return <VendorDetailView partyId={partyId} />;
}
