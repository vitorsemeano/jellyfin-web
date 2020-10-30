import loading from '../../components/loading/loading';
import libraryBrowser from '../../scripts/libraryBrowser';
import cardBuilder from '../../components/cardbuilder/cardBuilder';

/* eslint-disable indent */

    function getQuery(params) {
        const key = getSavedQueryKey();
        let pageData = data[key];

        if (!pageData) {
            pageData = data[key] = {
                query: {
                    SortBy: 'SortName',
                    SortOrder: 'Ascending',
                    IncludeItemTypes: 'Series',
                    Recursive: true,
                    Fields: 'DateCreated,PrimaryImageAspectRatio',
                    StartIndex: 0
                }
            };
            pageData.query.ParentId = params.topParentId;
        }

        return pageData.query;
    }

    function getSavedQueryKey() {
        return libraryBrowser.getSavedQueryKey('studios');
    }

    function getPromise(context, params) {
        const query = getQuery(params);
        loading.show();
        return ApiClient.getStudios(ApiClient.getCurrentUserId(), query);
    }

    function reloadItems(context, params, promise) {
        promise.then(result => {
            const elem = context.querySelector('#items');
            cardBuilder.buildCards(result.Items, {
                itemsContainer: elem,
                shape: 'backdrop',
                preferThumb: true,
                showTitle: true,
                scalable: true,
                centerText: true,
                overlayMoreButton: true,
                context: 'tvshows'
            });
            loading.hide();

            import('../../components/autoFocuser').then(({default: autoFocuser}) => {
                autoFocuser.autoFocus(context);
            });
        });
    }

    const data = {};

    export default function (view, params, tabContent) {
        let promise;

        this.preRender = () => {
            promise = getPromise(view, params);
        };

        this.renderTab = () => {
            reloadItems(tabContent, params, promise);
        };
    }

/* eslint-enable indent */
