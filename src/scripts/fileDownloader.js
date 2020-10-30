import multiDownload from './multiDownload';
import shell from './shell';

function FileDownloader(items) {
    if (!shell.downloadFiles(items)) {
        multiDownload(items.map(function (item) {
            return item.url;
        }));
    }
}

export default FileDownloader;
