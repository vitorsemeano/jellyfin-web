
import { Events } from 'jellyfin-apiclient';
import libraryBrowser from '../../scripts/libraryBrowser';
import imageLoader from '../../components/images/imageLoader';
import listView from '../../components/listview/listview';
import loading from '../../components/loading/loading';
import * as userSettings from '../../scripts/settings/userSettings';
import globalize from '../../scripts/globalize';
import '../../elements/emby-itemscontainer/emby-itemscontainer';

/* eslint-disable indent */

    export default function (view, params, tabContent) {
        function getPageData(context) {
            const key = getSavedQueryKey(context);
            let pageData = data[key];

            if (!pageData) {
                pageData = data[key] = {
                    query: {
                        SortBy: 'Album,SortName',
                        SortOrder: 'Ascending',
                        IncludeItemTypes: 'Audio',
                        Recursive: true,
                        Fields: 'AudioInfo,ParentId',
                        StartIndex: 0,
                        ImageTypeLimit: 1,
                        EnableImageTypes: 'Primary'
                    }
                };

                if (userSettings.libraryPageSize() > 0) {
                    pageData.query['Limit'] = userSettings.libraryPageSize();
                }

                pageData.query.ParentId = params.topParentId;
                libraryBrowser.loadSavedQueryValues(key, pageData.query);
            }

            return pageData;
        }

        function getQuery(context) {
            return getPageData(context).query;
        }

        function getSavedQueryKey(context) {
            if (!context.savedQueryKey) {
                context.savedQueryKey = libraryBrowser.getSavedQueryKey('songs');
            }

            return context.savedQueryKey;
        }

        const reloadItems = (page) => {
            loading.show();
            isLoading = true;
            const query = getQuery(page);
            ApiClient.getItems(ApiClient.getCurrentUserId(), query).then(result => {
                function onNextPageClick() {
                    if (isLoading) {
                        return;
                    }

                    if (userSettings.libraryPageSize() > 0) {
                        query.StartIndex += query.Limit;
                    }
                    reloadItems(tabContent);
                }

                function onPreviousPageClick() {
                    if (isLoading) {
                        return;
                    }

                    if (userSettings.libraryPageSize() > 0) {
                        query.StartIndex = Math.max(0, query.StartIndex - query.Limit);
                    }
                    reloadItems(tabContent);
                }

                window.scrollTo(0, 0);
                const pagingHtml = libraryBrowser.getQueryPagingHtml({
                    startIndex: query.StartIndex,
                    limit: query.Limit,
                    totalRecordCount: result.TotalRecordCount,
                    showLimit: false,
                    updatePageSizeSetting: false,
                    addLayoutButton: false,
                    sortButton: false,
                    filterButton: false
                });
                const html = listView.getListViewHtml({
                    items: result.Items,
                    action: 'playallfromhere',
                    smallIcon: true,
                    artist: true,
                    addToListButton: true
                });
                let elems = tabContent.querySelectorAll('.paging');

                for (let i = 0, length = elems.length; i < length; i++) {
                    elems[i].innerHTML = pagingHtml;
                }

                elems = tabContent.querySelectorAll('.btnNextPage');
                for (let i = 0, length = elems.length; i < length; i++) {
                    elems[i].addEventListener('click', onNextPageClick);
                }

                elems = tabContent.querySelectorAll('.btnPreviousPage');
                for (let i = 0, length = elems.length; i < length; i++) {
                    elems[i].addEventListener('click', onPreviousPageClick);
                }

                const itemsContainer = tabContent.querySelector('.itemsContainer');
                itemsContainer.innerHTML = html;
                imageLoader.lazyChildren(itemsContainer);
                libraryBrowser.saveQueryValues(getSavedQueryKey(page), query);
                loading.hide();
                isLoading = false;

                import('../../components/autoFocuser').then(({default: autoFocuser}) => {
                    autoFocuser.autoFocus(page);
                });
            });
        };

        const data = {};
        let isLoading = false;

        this.showFilterMenu = () => {
            import('../../components/filterdialog/filterdialog').then(({default: filterDialogFactory}) => {
                const filterDialog = new filterDialogFactory({
                    query: getQuery(tabContent),
                    mode: 'songs',
                    serverId: ApiClient.serverId()
                });
                Events.on(filterDialog, 'filterchange', () => {
                    getQuery(tabContent).StartIndex = 0;
                    reloadItems(tabContent);
                });
                filterDialog.show();
            });
        };

        this.getCurrentViewStyle = () => {
            return getPageData(tabContent).view;
        };

        const initPage = (tabContent) => {
            tabContent.querySelector('.btnFilter').addEventListener('click', () => {
                this.showFilterMenu();
            });
            tabContent.querySelector('.btnSort').addEventListener('click', e => {
                libraryBrowser.showSortMenu({
                    items: [{
                        name: globalize.translate('OptionTrackName'),
                        id: 'Name'
                    }, {
                        name: globalize.translate('Album'),
                        id: 'Album,SortName'
                    }, {
                        name: globalize.translate('AlbumArtist'),
                        id: 'AlbumArtist,Album,SortName'
                    }, {
                        name: globalize.translate('Artist'),
                        id: 'Artist,Album,SortName'
                    }, {
                        name: globalize.translate('OptionDateAdded'),
                        id: 'DateCreated,SortName'
                    }, {
                        name: globalize.translate('OptionDatePlayed'),
                        id: 'DatePlayed,SortName'
                    }, {
                        name: globalize.translate('OptionPlayCount'),
                        id: 'PlayCount,SortName'
                    }, {
                        name: globalize.translate('OptionReleaseDate'),
                        id: 'PremiereDate,AlbumArtist,Album,SortName'
                    }, {
                        name: globalize.translate('Runtime'),
                        id: 'Runtime,AlbumArtist,Album,SortName'
                    }],
                    callback: () => {
                        getQuery(tabContent).StartIndex = 0;
                        reloadItems(tabContent);
                    },
                    query: getQuery(tabContent),
                    button: e.target
                });
            });
        };

        initPage(tabContent);

        this.renderTab = () => {
            reloadItems(tabContent);
        };

        this.destroy = () => {};
    }

/* eslint-enable indent */
