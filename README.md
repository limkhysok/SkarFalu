# ScraperSEO

A Chrome extension (Manifest V3) for scraping SEO-relevant data from social short-video platforms, starting with YouTube Shorts.

## Step 1: YouTube Shorts Scraping ✅

Runs on any channel's Shorts tab (`youtube.com/@handle/shorts`). Adds a floating panel that:

- Auto-scrolls the page to load all Shorts on the channel
- Scrapes each Short's **#**, **Title**, **Views**, **Date**, and **Link**
- Fetches the upload date per video (not present in the Shorts tab payload itself) via YouTube's player endpoint
- Exports the scraped table to a `.txt` file named `yt-shorts-@channel_handle.txt`

### Installation

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** and select this folder
4. Visit a channel's Shorts tab and click the **SEO** launcher button

## TODO — Next Platforms

- [ ] TikTok
- [ ] Facebook Reels
- [ ] Instagram Reels
- [ ] More platforms as needed
