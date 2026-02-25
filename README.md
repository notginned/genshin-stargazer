## What is this?
- A web app that lets users add genshin wish history screenshots to convert them into a list of wishes.
- The data is stored within browser storage and can be exported as an excel spreadsheet to be imported into wish trackers

## Usage Instructions
※ You can add screenshots of your Genshin Impact in-game wish history to export them. They can be added to the queue one by one or multiple at a time. The images are processed as soon as they are added and the scan button appears after that. The export button exports the wish history as an excel spreadsheet that can be imported into wish trackers.

If an image can not be processed, you will get an error and that batch will be discarded. Please open an issue on Github along with the image if that image was a valid wish history screenshot.

All the processing is done on your device, no data is uploaded.

## Development / Self hosting the app
> [!NOTE]
> Make sure to have nodejs installed on your system

1. Clone the repo
```
# via SSH
git clone git@github.com:notginned/genshin-stargazer.git && cd genshin-stargazer

## or via https
git clone https://github.com/notginned/genshin-stargazer.git && cd genshin-stargazer

```
2. Install dependencies
```
npm install
```
3. Run the site locally
```
npm run dev
```

## Pipeline

1. User adds file(s) to the application using the file picker.
1. OpenCV preprocesses the images and detects table borders using Probabilistic Hough Line Transform.
1. Processed images are hashed by metadata into an ephemeral hashmap to avoid reprocessing the same images in a single session.
1. The columnn bounds are computed with ROI and fed into Tesseract which runs OCR and outputs column data as blocks.
1. The text blocks are parsed and any mis-scanning is corrected with a fuzzy matching algorithm.
1. The corrected text blocks are converted into lists of wishes separated by events.
1. The stored wish history and the new history are merged, removing any duplicates.
1. Once the new wish history is saved to storage, the hashes of the newly scanned images are added to persistent browser storage to avoid rescanning in the future.
1. If at any point there is an error in processing or scanning an image, the user is informed of the error and the entire batch is discarded to preserve data integrity.
1. The wish history is displayed as table on the web page.
1. The stored wish history can be exported into the `XLSX` format.


## Known Issues
1. In rare cases where two identical halves of a single 10-pull are uploaded in different batches, the merging algorithm will only include one half. This is by design because it is an unlikely event, and fixing this would make the merging result in duplicate entries every other time. The fix is to always upload a ten pull in a single batch which avoids this problem.
1. No localization support - deemed unfeasible for a single-person toy project which may not even see much use.
1. The data is stored along with the codebase, which will be fixed a later date (likely never).
1. The codebase looks like a mess :(


## Copyright
Genshin Stargazer is not affiliated with HoYoverse.
Genshin Impact, game content and materials are trademarks and copyrights of HoYoverse.
