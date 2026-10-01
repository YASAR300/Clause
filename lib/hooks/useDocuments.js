"use client";

import useSWR from "swr";

const fetcher = (url) => fetch(url).then((res) => res.json());

export function useDocuments({
  search = "",
  status = "ALL",
  sort = "newest",
  page = 1,
  limit = 20,
} = {}) {
  const queryParams = new URLSearchParams();
  if (search) queryParams.set("search", search);
  if (status && status !== "ALL") queryParams.set("status", status);
  if (sort) queryParams.set("sort", sort);
  if (page) queryParams.set("page", String(page));
  if (limit) queryParams.set("limit", String(limit));

  const url = `/api/documents?${queryParams.toString()}`;

  const { data, error, isLoading, mutate } = useSWR(url, fetcher, {
    revalidateOnFocus: false,
    refreshInterval: (latestData) => {
      // If any document is still processing, poll every 2s
      const hasProcessing = latestData?.items?.some((doc) =>
        ["UPLOADING", "QUEUED", "EXTRACTING", "INDEXING"].includes(doc.status)
      );
      return hasProcessing ? 2000 : 0;
    },
  });

  return {
    documents: data?.items || [],
    total: data?.total || 0,
    totalPages: data?.totalPages || 1,
    page: data?.page || 1,
    isLoading,
    error,
    mutate,
  };
}
