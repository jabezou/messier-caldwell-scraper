export type CelestialMetaData = {
  distance: string;
  apparentMagnitude: string;
  constellation: string;
  type: string;
}

export type CatalogModel = {
  name: string | null;
  alternateName: string | null;
  description: string | null;
  image: string | null;
  link: string | null;
  metaData: CelestialMetaData | null;
}
