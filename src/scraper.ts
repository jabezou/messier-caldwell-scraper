import fs from 'fs'
import path from 'path';
import { messier } from '.';
import { Browser, chromium } from 'playwright';

const DIRECTORY_DIST = path.join(process.cwd(), 'output');

function ensureDirectoryExists(directory: string) {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
}

function writeFile(fileName: string, data: any) {
  const filePath = path.join(DIRECTORY_DIST, fileName);
  fs.writeFileSync(filePath, JSON.stringify(data));
}

async function scraper() {
  ensureDirectoryExists(DIRECTORY_DIST);
  const browser = await chromium.launch({ headless: false });
  try {
    console.log('scraping...');
    const data = await messier();
    console.log(data);
    
    writeFile('messier-caldwell.json', data);
  } catch (error) {
    console.error(error);
  }

  await browser.close();
}

scraper();