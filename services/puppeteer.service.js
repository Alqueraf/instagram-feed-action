const puppeteer = require('puppeteer');

class PuppeteerService {
    /**
     *
     * @param {string} account Account to crawl
     * @param {number} maxPostCount Quantity of posts to fetch
     */
    async getLatestInstagramPostsFromAccount(account, maxPostCount) {
        // Init Browser
        // https://github.com/puppeteer/puppeteer/issues/6560
        const browserFetcher = puppeteer.createBrowserFetcher();
        const revisionInfo = await browserFetcher.download('809590.');    
        const browser = await puppeteer.launch({
            executablePath: revisionInfo.executablePath,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-infobars',
                '--window-position=0,0',
                '--ignore-certifcate-errors',
                '--ignore-certifcate-errors-spki-list',
                '--incognito',
                '--proxy-server=http=194.67.37.90:3128',
            ],
        });
        const url = `https://www.picuki.com/profile/${account}`;
        // Go to page
        const page = await browser.newPage();
        await page.setExtraHTTPHeaders({
            'Accept-Language': 'en-US',
        });
        await page.goto(url, {
            waitUntil: `networkidle0`,
        });

        let previousHeight;

        try {
            previousHeight = await page.evaluate(`document.body.scrollHeight`);
            await page.evaluate(`window.scrollTo(0, document.body.scrollHeight)`);
            await page.waitForTimeout(1000);

            const nodes = await page.evaluate(() => {
                const images = Array.from(document.querySelectorAll(`.post-image`));
                const messages = Array.from(document.querySelectorAll(`.photo-description`));
                let posts = [];
                images.map((image, index) => {
                    posts.push({
                        "image": image.src,
                        "message": messages[index].innerHTML
                    });
                });
                return posts;
            });

            return nodes.slice(0, maxPostCount);
        } catch (error) {
            console.log('Error', error);
            process.exit();
        } finally {
            await page.close();
            await browser.close();
        }
    }

}

const puppeteerService = new PuppeteerService();

module.exports = puppeteerService;