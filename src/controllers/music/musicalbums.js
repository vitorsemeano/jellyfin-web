import { playbackManager } from '../../components/playback/playbackmanager';
import loading from '../../components/loading/loading';
import { Events } from 'jellyfin-apiclient';
import libraryBrowser from '../../scripts/libraryBrowser';
import imageLoader from '../../components/images/imageLoader';
import AlphaPicker from '../../components/alphaPicker/alphaPicker';
import listView from '../../components/listview/listview';
import cardBuilder from '../../components/cardbuilder/cardBuilder';
import * as userSettings from '../../scripts/settings/userSettings';
import globalize from '../../scripts/globalize';
import '../../elements/emby-itemscontainer/emby-itemscontainer';

/* eslint-disable indent */

    export default function (view, params, tabContent) {
        function playAll() {
            ApiClient.getItem(ApiClient.getCurrentUserId(), params.topParentId).then(item => {
                playbackManager.play({
                    items: [item]
                });
            });
        }

        function shuffle() {
            ApiClient.getItem(ApiClient.getCurrentUserId(), params.topParentId).then(item => {
                getQuery();
                playbackManager.shuffle(item, null);
            });
        }

        function getPageData() {
            const key = getSavedQueryKey();

            if (!pageData) {
                pageData = {
                    query: {
                        SortBy: 'SortName',
                        SortOrder: 'Ascending',
                        IncludeItemTypes: 'MusicAlbum',
                        Recursive: true,
                        Fields: 'PrimaryImageAspectRatio,SortName,BasicSyncInfo',
                        ImageTypeLimit: 1,
                        EnableImageTypes: 'Primary,Backdrop,Banner,Thumb',
                        StartIndex: 0
                    },
                    view: libraryBrowser.getSavedView(key) || 'Poster'
                };

                if (userSettings.libraryPageSize() > 0) {
                    pageData.query['Limit'] = userSettings.libraryPageSize();
                }

                pageData.query.ParentId = params.topParentId;
                libraryBrowser.loadSavedQueryValues(key, pageData.query);
            }

            return pageData;
        }

        function getQuery() {
            return getPageData().query;
        }

        function getSavedQueryKey() {
            if (!savedQueryKey) {
                savedQueryKey = libraryBrowser.getSavedQueryKey('musicalbums');
            }

            return savedQueryKey;
        }

        const onViewStyleChange = () => {
            const viewStyle = this.getCurrentViewStyle();
            const itemsContainer = tabContent.querySelector('.itemsContainer');

            if (viewStyle == 'List') {
                itemsContainer.classList.add('vertical-list');
                itemsContainer.classList.remove('vertical-wrap');
            } else {
                itemsContainer.classList.remove('vertical-list');
                itemsContainer.classList.add('vertical-wrap');
            }

            itemsContainer.innerHTML = '';
        };

        const reloadItems = (page) => {
            loading.show();
            isLoading = true;
            const query = getQuery();
            ApiClient.getItems(ApiClient.getCurrentUserId(), query).then((result) => {
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
                updateFilterControls(page);
                let html;
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
                const viewStyle = this.getCurrentViewStyle();
                if (viewStyle == 'List') {
                    html = listView.getListViewHtml({
                        items: result.Items,
                        context: 'music',
                        sortBy: query.SortBy,
                        addToListButton: true
                    });
                } else if (viewStyle == 'PosterCard') {
                    html = cardBuilder.getCardsHtml({
                        items: result.Items,
                        shape: 'square',
                        context: 'music',
                        showTitle: true,
                        coverImage: true,
                        showParentTitle: true,
                        lazy: true,
                        cardLayout: true
                    });
                } else {
                    html = cardBuilder.getCardsHtml({
                        items: result.Items,
                        shape: 'square',
                        context: 'music',
                        showTitle: true,
                        showParentTitle: true,
                        lazy: true,
                        centerText: true,
                        overlayPlayButton: true
                    });
                }

                let elems = tabContent.querySelectorAll('.paging');

                for (const elem of elems) {
                    elem.innerHTML = pagingHtml;
                }

                elems = tabContent.querySelectorAll('.btnNextPage');
                for (const elem of elems) {
                    elem.addEventListener('click', onNextPageClick);
                }

                elems = tabContent.querySelectorAll('.btnPreviousPage');
                for (const elem of elems) {
                    elem.addEventListener('click', onPreviousPageClick);
                }

                const itemsContainer = tabContent.querySelector('.itemsContainer');
                itemsContainer.innerHTML = html;
                imageLoader.lazyChildren(itemsContainer);
                libraryBrowser.saveQueryValues(getSavedQueryKey(), query);
                loading.hide();
                isLoading = false;

                import('../../components/autoFocuser').then(({default: autoFocuser}) => {
                    autoFocuser.autoFocus(tabContent);
                });
            });
        };

        const updateFilterControls = (tabContent) => {
            const query = getQuery();

            if (this.alphaPicker) {
                this.alphaPicker.value(query.NameStartsWith);

                if (query.SortBy.indexOf('SortName') === 0) {
                    this.alphaPicker.visible(true);
                } else {
                    this.alphaPicker.visible(false);
                }
            }
        };

        let savedQueryKey;
        let pageData;
        let isLoading = false;

        this.showFilterMenu = () => {
            import('../../components/filterdialog/filterdialog').then(({default: filterDialogFactory}) => {
                const filterDialog = new filterDialogFactory({
                    query: getQuery(),
                    mode: 'albums',
                    serverId: ApiClient.serverId()
                });
                Events.on(filterDialog, 'filterchange', () => {
                    getQuery().StartIndex = 0;
                    reloadItems(tabContent);
                });

                filterDialog.show();
            });
        };

        this.getCurrentViewStyle = () => {
            return getPageData().view;
        };

        const initPage = (tabContent) => {
            const alphaPickerElement = tabContent.querySelector('.alphaPicker');
            const itemsContainer = tabContent.querySelector('.itemsContainer');

            alphaPickerElement.addEventListener('alphavaluechanged', e => {
                const newValue = e.detail.value;
                const query = getQuery();
                query.NameStartsWith = newValue;
                query.StartIndex = 0;
                reloadItems(tabContent);
            });

            this.alphaPicker = new AlphaPicker({
                element: alphaPickerElement,
                valueChangeEvent: 'click'
            });

            tabContent.querySelector('.alphaPicker').classList.add('alphabetPicker-right');
            alphaPickerElement.classList.add('alphaPicker-fixed-right');
            itemsContainer.classList.add('padded-right-withalphapicker');

            tabContent.querySelector('.btnFilter').addEventListener('click', () => {
                this.showFilterMenu();
            });

            tabContent.querySelector('.btnSort').addEventListener('click', (e) => {
                libraryBrowser.showSortMenu({
                    items: [{
                        name: globalize.translate('Name'),
                        id: 'SortName'
                    }, {
                        name: globalize.translate('AlbumArtist'),
                        id: 'AlbumArtist,SortName'
                    }, {
                        name: globalize.translate('OptionCommunityRating'),
                        id: 'CommunityRating,SortName'
                    }, {
                        name: globalize.translate('OptionCriticRating'),
                        id: 'CriticRating,SortName'
                    }, {
                        name: globalize.translate('OptionDateAdded'),
                        id: 'DateCreated,SortName'
                    }, {
                        name: globalize.translate('OptionReleaseDate'),
                        id: 'ProductionYear,PremiereDate,SortName'
                    }, {
                        name: globalize.translate('OptionRandom'),
                        id: 'Random,SortName'
                    }],
                    callback: () => {
                        getQuery().StartIndex = 0;
                        reloadItems(tabContent);
                    },
                    query: getQuery(),
                    button: e.target
                });
            });

            const btnSelectView = tabContent.querySelector('.btnSelectView');
            btnSelectView.addEventListener('click', (e) => {
                libraryBrowser.showLayoutMenu(e.target, this.getCurrentViewStyle(), 'List,Poster,PosterCard'.split(','));
            });

            btnSelectView.addEventListener('layoutchange', e => {
                const viewStyle = e.detail.viewStyle;
                getPageData().view = viewStyle;
                libraryBrowser.saveViewSetting(getSavedQueryKey(), viewStyle);
                getQuery().StartIndex = 0;
                onViewStyleChange();
                reloadItems(tabContent);
            });

            tabContent.querySelector('.btnPlayAll').addEventListener('click', playAll);
            tabContent.querySelector('.btnShuffle').addEventListener('click', shuffle);
        };

        initPage(tabContent);
        onViewStyleChange();

        this.renderTab = () => {
            reloadItems(tabContent);
            updateFilterControls(tabContent);
        };

        this.destroy = () => {};
    }

/* eslint-enable indent */
