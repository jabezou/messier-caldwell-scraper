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

  const catalogs = await catalogContainer.locator('.hds-content-item.content-list-item-mission').all();
  const skyObjects:Partial<CatalogModel>[] = [];
  const scrapedObjects: Partial<CatalogModel>[] = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.hds-content-item.content-list-item-mission'))
      .slice(0, 8)
      .map((ca) => {
        const caHead = ca.querySelector('.hds-a11y-heading-22')?.textContent?.trim() || '';
        const description = ca.querySelector('p')?.textContent?.trim() || '';
        const image = ca.querySelector('img')?.getAttribute('src') || '';
        const url = ca.querySelector('.hds-content-item-thumbnail')?.getAttribute('href') || '';
  
        const match = caHead.match(/\(([^)]+)\)/);
        const semantic = match ? match[1] : null;
        const [name, alternateName] = semantic
          ? [semantic, caHead.replace(match[0], '').trim()]
          : [caHead, null];
  
        return { name, alternateName, description, image, link: url, metaData: null };
      });
  });
  

  for (const obj of scrapedObjects) {
    if (obj.link) {
      obj.metaData = await scrapeURL(obj.link);
    }
    skyObjects.push(obj);
  }
  
  await browser.close();
  console.log('Closing browser');
  return skyObjects as CatalogModel[];
}