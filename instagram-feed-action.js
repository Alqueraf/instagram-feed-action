// Compile this file using: `ncc build index.js --license licenses.txt`
const fs = require('fs');
const https = require('https')
const http = require('http')
const { basename } = require('path');
const { URL } = require('url');
const DOWNLOAD_TIMEOUT = 10000

const puppeteerService = require('./services/puppeteer.service');

const core = require('@actions/core');
const process = require('process');
const exec = require('./exec');

const promiseArray = []; // Runner
const runnerNameArray = []; // To show the error/success message
let instagramPostsArray = []; // Array to store posts
let jobFailFlag = false; // Job status flag

// Readme path, default: ./README.md
const README_FILE_PATH = core.getInput('readme_path');
const GITHUB_TOKEN = core.getInput('gh_token');

// Images folder
const IMAGES_DIR = core.getInput('images_directory');

// Reading account from the workflow input
const account = core.getInput('account').trim();
if (account.length === 0) {
    core.error('Please double check the value of account');
    process.exit(1);
}

// Retrieve Instagram Posts
// (One single account supported for now)
promiseArray.push(new Promise((resolve, reject) => {
    runnerNameArray.push(account);
    const maxPostCount = Number.parseInt(core.getInput('max_post_count'));
    if (maxPostCount <= 0) {
        core.error('Please set a max_post_count value greater than 0');
        process.exit(1);
    }
    puppeteerService.getLatestInstagramPostsFromAccount(account, maxPostCount)
        .then(posts => {
            if (posts.length === 0) {
                reject(`Couldn\'t find any posts for the specified account`);
            } else {
                resolve(posts);
            }
        })
        .catch(reject);
}));
// Processing the generated promises from Instagram Account
Promise.allSettled(promiseArray).then((results) => {
    results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
            // Succeeded
            core.info(runnerNameArray[index] + ' runner succeeded. Post count: ' + result.value.length);
            instagramPostsArray.push(...result.value);

        } else {
            jobFailFlag = true;
            // Rejected
            core.error(runnerNameArray[index] + ' runner failed, please verify the configuration. Error:');
            core.error(result.reason);
        }
    });
}).finally(async () => {
    try {
        // Download images
        // Done
        core.info("Reading README file");
        const readmeData = fs.readFileSync(README_FILE_PATH, 'utf8');
        if (instagramPostsArray == null || instagramPostsArray.length == 0) {
            core.info('No posts detected');
            process.exit(0);
        } else {
            console.log("Creating image directory");
            fs.mkdir(IMAGES_DIR, { recursive: true }, (err) => {
                if (err) throw err;
              });
            core.info("Downloading images");
            await Promise.all(instagramPostsArray.map((element, index) => {
                return downloadFile(element["image"], IMAGES_DIR + "/" + index + '.jpeg');
            }));
            core.info("Mapping urls to downloaded images");
            instagramPostsArray.forEach((element, index) => {
                element["image"] = IMAGES_DIR + "/" + index + '.jpeg';
            });
            core.info("Building Instagram Feed Markdown");
            const instagramFeedMarkdown = buildInstagramFeedMarkdown(instagramPostsArray);
            core.info("Building updated README");
            const newReadme = buildReadme(readmeData, instagramFeedMarkdown);
            // If there's change in readme file update it
            if (newReadme !== readmeData) {
                core.info('Writing to ' + README_FILE_PATH);
                fs.writeFileSync(README_FILE_PATH, newReadme);
                await commitReadme();
                await puppeteerService.close();
            } else {
                core.info('No change detected, skipping');
                process.exit(0);
            }
        }
    } catch (e) {
        core.error(e);
        process.exit(1);
    }
});

/**
 * Converts a list of instagram posts to Markdown
 * @param instagramPostsArray {array}: list of instagram posts to display
 * @return {string}: content after converting posts array to markdown
 */
const buildInstagramFeedMarkdown = (instagramPostsArray) => {
    // Prepare HTML block
    const imageWidthPx = Number.parseInt(core.getInput('image_size'));
    const imageMarginPx = Number.parseInt(core.getInput('image_margin'));
    const htmlStartElement = `<p>`;
    const htmlEndElement = `</p>`;
    const imagePlaceholder = "{{image}}";
    const messagePlaceholder = "{{message}}";
    const marginRightPlaceholder = "{{marginRight}}";
    const marginBottomPlaceholder = "{{marginBottom}}";
    const htmlPostElement =
        `<img width="${imageWidthPx}px" src="${imagePlaceholder}" alt="${messagePlaceholder}" style="padding-right:${marginRightPlaceholder}px;padding-bottom:${marginBottomPlaceholder}px" /> `;
    let newContent = instagramPostsArray.map((element, index) => {
        // Set Content
        let rowElement = htmlPostElement
            .replace(imagePlaceholder, element["image"])
            .replace(messagePlaceholder, element["message"].trim().replace(/(\r\n|\n|\r)/gm, " "));
        // Set Margins
        rowElement = rowElement
            .replace(marginRightPlaceholder, imageMarginPx)
            .replace(marginBottomPlaceholder, imageMarginPx);
        return rowElement;

    }).join('');
    return htmlStartElement + newContent + htmlEndElement;
};


/**
 * Builds the new readme by replacing the readme's <!-- INSTAGRAM-FEED:START --><!-- INSTAGRAM-FEED:END --> tags
 * @param previousContent {string}: actual readme content
 * @param newContent {string}: content to add
 * @return {string}: content after combining previousContent and newContent
 */
const buildReadme = (previousContent, newContent) => {
    const tagToLookFor = `<!-- INSTAGRAM-FEED:`;
    const closingTag = '-->';
    const tagNewlineFlag = true;
    const startOfOpeningTagIndex = previousContent.indexOf(
        `${tagToLookFor}START`,
    );
    const endOfOpeningTagIndex = previousContent.indexOf(
        closingTag,
        startOfOpeningTagIndex,
    );
    const startOfClosingTagIndex = previousContent.indexOf(
        `${tagToLookFor}END`,
        endOfOpeningTagIndex,
    );
    if (
        startOfOpeningTagIndex === -1 ||
        endOfOpeningTagIndex === -1 ||
        startOfClosingTagIndex === -1
    ) {
        // Exit with error if comment is not found on the readme
        core.error(
            `Cannot find the comment tag on the readme:\n${tagToLookFor}:START -->\n${tagToLookFor}:END -->`
        );
        process.exit(1);
    }
    return [
        previousContent.slice(0, endOfOpeningTagIndex + closingTag.length),
        tagNewlineFlag ? '\n' : '',
        newContent,
        tagNewlineFlag ? '\n' : '',
        previousContent.slice(startOfClosingTagIndex),
    ].join('');
};

/**
 * Code to do git commit
 * @return {Promise<void>}
 */
const commitReadme = async () => {
    // Getting config
    const committerUsername = core.getInput('committer_username');
    const committerEmail = core.getInput('committer_email');
    const commitMessage = core.getInput('commit_message');
    // Doing commit and push
    await exec('git', [
        'config',
        '--global',
        'user.email',
        committerEmail,
    ]);
    if (GITHUB_TOKEN) {
        // git remote set-url origin
        await exec('git', ['remote', 'set-url', 'origin',
            `https://${GITHUB_TOKEN}@github.com/${process.env.GITHUB_REPOSITORY}.git`
        ]);
    }
    await exec('git', ['config', '--global', 'user.name', committerUsername]);
    // await exec('git', ['add', README_FILE_PATH]);
    await exec('git', ['add', '-A']);
    await exec('git', ['commit', '-m', commitMessage]);
    await exec('git', ['pull', '--ff-only']);
    await exec('git', ['push']);
    core.info('Readme updated successfully in the upstream repository');
    // Making job fail if one of the source fails
    process.exit(jobFailFlag ? 1 : 0);
};

function downloadFile (url, dest) {
    const uri = new URL(url)
    if (!dest) {
      dest = basename(uri.pathname)
    }
    const pkg = url.toLowerCase().startsWith('https:') ? https : http
  
    return new Promise((resolve, reject) => {
      const request = pkg.get(uri.href).on('response', (res) => {
        if (res.statusCode === 200) {
          const file = fs.createWriteStream(dest, { flags: 'w' })
          res
            .on('end', () => {
              file.end()
              // console.log(`${uri.pathname} downloaded to: ${path}`)
              resolve()
            })
            .on('error', (err) => {
              file.destroy()
              fs.unlink(dest, () => reject(err))
            }).pipe(file)
        } else if (res.statusCode === 302 || res.statusCode === 301) {
          // Recursively follow redirects, only a 200 will resolve.
          downloadFile(res.headers.location, dest).then(() => resolve())
        } else {
          reject(new Error(`Download request failed, response status: ${res.statusCode} ${res.statusMessage}`))
        }
      })
      request.setTimeout(DOWNLOAD_TIMEOUT, function () {
        request.destroy()
        reject(new Error(`Request timeout after ${DOWNLOAD_TIMEOUT / 1000.0}s`))
      })
    })
  }