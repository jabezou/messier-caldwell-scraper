import { Browser, chromium } from 'playwright';
import { CelestialMetaData, CatalogModel } from './model';
import { log } from 'console';
import { url } from 'inspector';

const PAGE_URLS = [
  {
    catalog: "Hubble’s Messier Catalog",
    url: 'https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog'
  },
  // {
  //   catalog: "Hubble’s Caldwell Catalog",
  //   url: 'https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/'
  // },
]

export async function messier() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(PAGE_URLS[0].url, { timeout: 20 * 10 * 1000});
  const catalogContainer = page.locator("#post-list-container");
  
  const catalogs = await catalogContainer.locator('.hds-content-item.content-list-item-mission').all();

  async function scrapeURL(pageUrl: string): Promise<CelestialMetaData> {
    try {
      await page.goto(pageUrl, { 
        timeout: 50 * 1000,
        waitUntil: 'domcontentloaded'
      });
    } catch (error) {
      console.error(`Failed to load page: ${pageUrl}`, error);
    }
    
    const dataContainer = page.locator('.grid-col-12.desktop\\:grid-col-5.padding-left-0.desktop\\:padding-left-6');
    const planetaryMetaDataTitles = {
      distance: 'DISTANCE',
      apparentMagnitude: 'APPARENT MAGNITUDE',
      constellation: 'CONSTELLATION',
      type: 'OBJECT TYPE',
    };

    const result:Partial<CelestialMetaData> = {};
    // getting stats of astro object through their headings
    for (const [key, pDataString] of Object.entries(planetaryMetaDataTitles)) {
      result[key as keyof CelestialMetaData]
        =  await dataContainer.getByText(pDataString, { exact: false })
          .locator('+ p').textContent() as string;
    }

    return result as CelestialMetaData;
  }

  const skyObjects:Partial<CatalogModel[]> = [];
  const scrapedObjects = await Promise.all(
    catalogs.slice(0, 8).map(async (ca) => {
      const caHead: string = await ca.locator('.hds-a11y-heading-22').textContent() as string;
      const match = caHead.match(/\(([^)]+)\)/);
      const semantic: string | null = match ? match[1] : null;
  
      const [name, alternateName]: [string, string | null] = semantic
        ? [semantic, caHead.replace(caHead.match(/(\([^)]+\))/)[1], '').trim()]
        : [caHead, null];
      
      const [description, image, url] = await Promise.all([
        await ca.locator('p').textContent(),
        await ca.locator('img').getAttribute('src'),
        await ca.locator('.hds-content-item-thumbnail').first().getAttribute('href') as string
      ]);
      const metaData = await scrapeURL(url);
  
      
      return {
        name,
        alternateName,
        description,
        image,
        link: url,
        metaData,
      };
    })
  );
  
  skyObjects.push(...scrapedObjects);
  
  await browser.close();
  console.log('Closing browser');
  return skyObjects as CatalogModel[];
}