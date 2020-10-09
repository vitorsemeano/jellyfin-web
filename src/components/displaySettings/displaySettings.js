import browser from 'browser';
import layoutManager from 'layoutManager';
import pluginManager from 'pluginManager';
import appHost from 'apphost';
import focusManager from 'focusManager';
import datetime from 'datetime';
import globalize from 'globalize';
import loading from 'loading';
import skinManager from 'skinManager';
import events from 'events';
import 'emby-select';
import 'emby-checkbox';
import 'emby-button';

/* eslint-disable indent */

    function fillThemes(context, userSettings) {
        const select = context.querySelector('#selectTheme');

        skinManager.getThemes().then(themes => {
            select.innerHTML = themes.map(t => {
                return `<option value="${t.id}">${t.name}</option>`;
            }).join('');

            // get default theme
            const defaultTheme = themes.find(theme => {
                return theme.default;
            });

            // set the current theme
            select.value = userSettings.theme() || defaultTheme.id;
        });
    }

    function loadScreensavers(context, userSettings) {
        const selectScreensaver = context.querySelector('.selectScreensaver');
        const options = pluginManager.ofType('screensaver').map(plugin => {
            return {
                name: plugin.name,
                value: plugin.id
            };
        });

        options.unshift({
            name: globalize.translate('None'),
            value: 'none'
        });

        selectScreensaver.innerHTML = options.map(o => {
            return `<option value="${o.value}">${o.name}</option>`;
        }).join('');

        selectScreensaver.value = userSettings.screensaver();

        if (!selectScreensaver.value) {
            // TODO: set the default instead of none
            selectScreensaver.value = 'none';
        }
    }

    function showOrHideMissingEpisodesField(context) {
        if (browser.tizen || browser.web0s) {
            context.querySelector('.fldDisplayMissingEpisodes').classList.add('hide');
            return;
        }

        context.querySelector('.fldDisplayMissingEpisodes').classList.remove('hide');
    }

    function loadForm(context, user, userSettings) {
        if (appHost.supports('displaylanguage')) {
            context.querySelector('.languageSection').classList.remove('hide');
        } else {
            context.querySelector('.languageSection').classList.add('hide');
        }

        if (appHost.supports('displaymode')) {
            context.querySelector('.fldDisplayMode').classList.remove('hide');
        } else {
            context.querySelector('.fldDisplayMode').classList.add('hide');
        }

        if (appHost.supports('externallinks')) {
            context.querySelector('.learnHowToContributeContainer').classList.remove('hide');
        } else {
            context.querySelector('.learnHowToContributeContainer').classList.add('hide');
        }

        if (appHost.supports('screensaver')) {
            context.querySelector('.selectScreensaverContainer').classList.remove('hide');
        } else {
            context.querySelector('.selectScreensaverContainer').classList.add('hide');
        }

        if (datetime.supportsLocalization()) {
            context.querySelector('.fldDateTimeLocale').classList.remove('hide');
        } else {
            context.querySelector('.fldDateTimeLocale').classList.add('hide');
        }

        if (!browser.tizen && !browser.web0s) {
            context.querySelector('.fldBackdrops').classList.remove('hide');
            context.querySelector('.fldThemeSong').classList.remove('hide');
            context.querySelector('.fldThemeVideo').classList.remove('hide');
        } else {
            context.querySelector('.fldBackdrops').classList.add('hide');
            context.querySelector('.fldThemeSong').classList.add('hide');
            context.querySelector('.fldThemeVideo').classList.add('hide');
        }

        fillThemes(context, userSettings);
        loadScreensavers(context, userSettings);

        context.querySelector('.chkDisplayMissingEpisodes').checked = user.Configuration.DisplayMissingEpisodes || false;

        context.querySelector('#chkThemeSong').checked = userSettings.enableThemeSongs();
        context.querySelector('#chkThemeVideo').checked = userSettings.enableThemeVideos();
        context.querySelector('#chkFadein').checked = userSettings.enableFastFadein();
        context.querySelector('#chkBlurhash').checked = userSettings.enableBlurhash();
        context.querySelector('#chkBackdrops').checked = userSettings.enableBackdrops();
        context.querySelector('#chkDetailsBanner').checked = userSettings.detailsBanner();

        context.querySelector('#selectLanguage').value = userSettings.language() || '';
        context.querySelector('.selectDateTimeLocale').value = userSettings.dateTimeLocale() || '';

        context.querySelector('#txtLibraryPageSize').value = userSettings.libraryPageSize();

        context.querySelector('.selectLayout').value = layoutManager.getSavedLayout() || '';

        showOrHideMissingEpisodesField(context);

        loading.hide();
    }

    function saveUser(context, user, userSettingsInstance, apiClient) {
        user.Configuration.DisplayMissingEpisodes = context.querySelector('.chkDisplayMissingEpisodes').checked;

        if (appHost.supports('displaylanguage')) {
            userSettingsInstance.language(context.querySelector('#selectLanguage').value);
        }

        userSettingsInstance.dateTimeLocale(context.querySelector('.selectDateTimeLocale').value);

        userSettingsInstance.enableThemeSongs(context.querySelector('#chkThemeSong').checked);
        userSettingsInstance.enableThemeVideos(context.querySelector('#chkThemeVideo').checked);
        userSettingsInstance.theme(context.querySelector('#selectTheme').value);
        userSettingsInstance.screensaver(context.querySelector('.selectScreensaver').value);

        userSettingsInstance.libraryPageSize(context.querySelector('#txtLibraryPageSize').value);

        userSettingsInstance.enableFastFadein(context.querySelector('#chkFadein').checked);
        userSettingsInstance.enableBlurhash(context.querySelector('#chkBlurhash').checked);
        userSettingsInstance.enableBackdrops(context.querySelector('#chkBackdrops').checked);
        userSettingsInstance.detailsBanner(context.querySelector('#chkDetailsBanner').checked);

        if (user.Id === apiClient.getCurrentUserId()) {
            skinManager.setTheme(userSettingsInstance.theme());
        }

        layoutManager.setLayout(context.querySelector('.selectLayout').value);
        return apiClient.updateUserConfiguration(user.Id, user.Configuration);
    }

    function save(instance, context, userId, userSettings, apiClient, enableSaveConfirmation) {
        loading.show();

        apiClient.getUser(userId).then(user => {
            saveUser(context, user, userSettings, apiClient).then(() => {
                loading.hide();
                if (enableSaveConfirmation) {
                    import('toast').then(({default: toast}) => {
                        toast(globalize.translate('SettingsSaved'));
                    });
                }
                events.trigger(instance, 'saved');
            }, () => {
                loading.hide();
            });
        });
    }

    function onSubmit(e) {
        const self = this;
        const apiClient = window.connectionManager.getApiClient(self.options.serverId);
        const userId = self.options.userId;
        const userSettings = self.options.userSettings;

        userSettings.setUserInfo(userId, apiClient).then(() => {
            const enableSaveConfirmation = self.options.enableSaveConfirmation;
            save(self, self.options.element, userId, userSettings, apiClient, enableSaveConfirmation);
        });

        // Disable default form submission
        if (e) {
            e.preventDefault();
        }
        return false;
    }

    async function embed(options, self) {
        const { default: template } = await import('text!./displaySettings.template.html');
        options.element.innerHTML = globalize.translateHtml(template, 'core');
        options.element.querySelector('form').addEventListener('submit', onSubmit.bind(self));
        if (options.enableSaveButton) {
            options.element.querySelector('.btnSave').classList.remove('hide');
        }
        self.loadData(options.autoFocus);
    }

    class DisplaySettings {
        constructor(options) {
            this.options = options;
            embed(options, this);
        }

        loadData(autoFocus) {
            const self = this;
            const context = self.options.element;

            loading.show();

            const userId = self.options.userId;
            const apiClient = window.connectionManager.getApiClient(self.options.serverId);
            const userSettings = self.options.userSettings;

            return apiClient.getUser(userId).then(user => {
                return userSettings.setUserInfo(userId, apiClient).then(() => {
                    self.dataLoaded = true;
                    loadForm(context, user, userSettings);
                    if (autoFocus) {
                        focusManager.autoFocus(context);
                    }
                });
            });
        }

        submit() {
            onSubmit.call(this);
        }

        destroy() {
            this.options = null;
        }
    }

/* eslint-enable indent */
export default DisplaySettings;
