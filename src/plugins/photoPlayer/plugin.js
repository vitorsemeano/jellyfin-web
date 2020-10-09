
export default class PhotoPlayer {
    constructor() {
        this.name = 'Photo Player';
        this.type = 'mediaplayer';
        this.id = 'photoplayer';
        this.priority = 1;
    }

    play(options) {
        return new Promise(function (resolve, reject) {
            import('slideshow').then(({default: slideshow}) => {
                const index = options.startIndex || 0;

                const apiClient = window.connectionManager.currentApiClient();
                apiClient.getCurrentUser().then(function(result) {
                    const newSlideShow = new slideshow({
                        showTitle: false,
                        cover: false,
                        items: options.items,
                        startIndex: index,
                        interval: 11000,
                        interactive: true,
                        user: result
                    });

                    newSlideShow.show();
                    resolve();
                });
            });
        });
    }

    canPlayMediaType(mediaType) {
        return (mediaType || '').toLowerCase() === 'photo';
    }
}
