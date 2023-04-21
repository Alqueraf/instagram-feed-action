const puppeteer = require('puppeteer');

class PuppeteerService {
    /**
     *
     * @param {string} account Account to crawl
     * @param {number} maxPostCount Quantity of posts to fetch
     */
    async getLatestInstagramPostsFromAccount(account, maxPostCount) {
        // Init Browser
        const browser = await puppeteer.launch({
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-infobars',
                '--window-position=0,0',
                '--ignore-certifcate-errors',
                '--ignore-certifcate-errors-spki-list',
                '--incognito',
                '--window-size=1920,1080',
                '--proxy-server=http=194.67.37.90:3128',
            ],
            timeout: 0,
            // headless: false,
        });

        const url = `https://www.picuki.com/profile/${account}`;

        const availablePages = await browser.pages();
        const page = availablePages.length > 0 ? availablePages[0] : await browser.newPage();
        await page.setExtraHTTPHeaders({
            'Accept-Language': 'en-US',
        });

        // Set User Agent to avoid Cloudflare blocking
        await page.setUserAgent('Mozilla/5.0 (Windows NT 5.1; rv:5.0) Gecko/20100101 Firefox/5.0')

        await page.goto(url, { waitUntil: "domcontentloaded" });
        await page.waitForTimeout(4000);

        let previousHeight;

        try {
            previousHeight = await page.evaluate(`document.body.scrollHeight`);
            await page.evaluate(`window.scrollTo(0, document.body.scrollHeight)`);

            // Uncomment this line to screenshot the page
            // await page.screenshot({ path: 'test.png', fullPage: true })

            await page.waitForSelector(`.post-image`);
            await page.waitForSelector(`.photo-description`);
            const nodes = await page.evaluate(() => {
                const images = Array.from(document.querySelectorAll(`.post-image`));
                const messages = Array.from(document.querySelectorAll(`.photo-description`));
                let posts = [];
                images.map((image, index) => {
                    posts.push({
                        "image": image.src,
                        "message": messages[index].innerHTML.trim()
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
// puppeteerService.getLatestInstagramPostsFromAccount('alqueraf', 6).then(console.log);

module.exports = puppeteerService;