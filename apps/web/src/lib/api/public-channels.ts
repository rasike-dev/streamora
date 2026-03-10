export async function getPublicChannelBySlug(
  slug: string,
  locale: string,
  page = 1,
  pageSize = 12,
) {
  const api = process.env.NEXT_PUBLIC_API_URL!;
  const params = new URLSearchParams({
    locale,
    page: String(page),
    pageSize: String(pageSize),
  });

  const res = await fetch(`${api}/channels/${slug}?${params.toString()}`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error('Failed to load channel');
  }

  return res.json();
}

{
  "cells": [],
  "metadata": {
    "language_info": {
      "name": "python"
    }
  },
  "nbformat": 4,
  "nbformat_minor": 2
}