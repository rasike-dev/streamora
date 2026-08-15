export type TaxonomyChannel = {
  id: string;
  slug: string;
  name: string;
  videoCount?: number;
};

export type TaxonomySubcategory = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  videoCount?: number;
  channels: TaxonomyChannel[];
};

export type TaxonomyCategory = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  subcategories: TaxonomySubcategory[];
};

export type TaxonomyBreadcrumb = {
  category: { slug: string; name: string } | null;
  subcategory: { slug: string; name: string } | null;
  channel: { slug: string; name: string };
};

export async function getCategories(locale: string): Promise<TaxonomyCategory[]> {
  const api = process.env.NEXT_PUBLIC_API_URL!;

  const res = await fetch(`${api}/categories?locale=${locale}`, {
    cache: 'no-store',
  });

  if (!res.ok) throw new Error('Failed to load categories');

  return res.json();
}

export async function getCategoryBySlug(
  slug: string,
  locale: string,
): Promise<TaxonomyCategory> {
  const api = process.env.NEXT_PUBLIC_API_URL!;

  const res = await fetch(`${api}/categories/${slug}?locale=${locale}`, {
    cache: 'no-store',
  });

  if (!res.ok) throw new Error('Failed to load category');

  return res.json();
}

export async function getSubcategoryBySlug(
  categorySlug: string,
  subcategorySlug: string,
  locale: string,
): Promise<
  TaxonomySubcategory & { category: { slug: string; name: string } }
> {
  const api = process.env.NEXT_PUBLIC_API_URL!;

  const res = await fetch(
    `${api}/categories/${categorySlug}/subcategories/${subcategorySlug}?locale=${locale}`,
    { cache: 'no-store' },
  );

  if (!res.ok) throw new Error('Failed to load subcategory');

  return res.json();
}
