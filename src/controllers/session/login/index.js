import appHost from 'apphost';
import appSettings from 'appSettings';
import dom from 'dom';
import loading from 'loading';
import layoutManager from 'layoutManager';
import libraryMenu from 'libraryMenu';
import browser from 'browser';
import globalize from 'globalize';
import 'cardStyle';
import 'emby-checkbox';

/* eslint-disable indent */

    const enableFocusTransform = !browser.slow && !browser.edge;

    function authenticateUserByName(page, apiClient, username, password) {
        loading.show();
        apiClient.authenticateUserByName(username, password).then(function (result) {
            const user = result.User;
            loading.hide();

            onLoginSuccessful(user.Id, result.AccessToken, apiClient);
        }, function (response) {
            page.querySelector('#txtManualName').value = '';
            page.querySelector('#txtManualPassword').value = '';
            loading.hide();

            const UnauthorizedOrForbidden = [401, 403];
            if (UnauthorizedOrForbidden.includes(response.status)) {
                import('toast').then(({default: toast}) => {
                    const messageKey = response.status === 401 ? 'MessageInvalidUser' : 'MessageUnauthorizedUser';
                    toast(globalize.translate(messageKey));
                });
            } else {
                Dashboard.alert({
                    message: globalize.translate('MessageUnableToConnectToServer'),
                    title: globalize.translate('HeaderConnectionFailure')
                });
            }
        });
    }

    function authenticateQuickConnect(apiClient) {
        const url = apiClient.getUrl('/QuickConnect/Initiate');
        apiClient.getJSON(url).then(function (json) {
            if (!json.Secret || !json.Code) {
                console.error('Malformed quick connect response', json);
                return false;
            }

            Dashboard.alert({
                message: globalize.translate('QuickConnectAuthorizeCode', json.Code),
                title: globalize.translate('QuickConnect')
            });

            const connectUrl = apiClient.getUrl('/QuickConnect/Connect?Secret=' + json.Secret);

            const interval = setInterval(function() {
                apiClient.getJSON(connectUrl).then(async function(data) {
                    if (!data.Authenticated) {
                        return;
                    }

                    clearInterval(interval);

                    const result = await apiClient.quickConnect(data.Authentication);
                    onLoginSuccessful(result.User.Id, result.AccessToken, apiClient);
                }, function (e) {
                    clearInterval(interval);

                    Dashboard.alert({
                        message: globalize.translate('QuickConnectDeactivated'),
                        title: globalize.translate('HeaderError')
                    });

                    console.error('Unable to login with quick connect', e);
                });
            }, 5000, connectUrl);

            return true;
        }, function(e) {
            Dashboard.alert({
                message: globalize.translate('QuickConnectNotActive'),
                title: globalize.translate('HeaderError')
            });

            console.error('Quick connect error: ', e);
            return false;
        });
    }

    function onLoginSuccessful(id, accessToken, apiClient) {
        Dashboard.onServerChanged(id, accessToken, apiClient);
        Dashboard.navigate('home.html');
    }

    function showManualForm(context, showCancel, focusPassword) {
        context.querySelector('.chkRememberLogin').checked = appSettings.enableAutoLogin();
        context.querySelector('.manualLoginForm').classList.remove('hide');
        context.querySelector('.visualLoginForm').classList.add('hide');
        context.querySelector('.btnManual').classList.add('hide');

        if (focusPassword) {
            context.querySelector('#txtManualPassword').focus();
        } else {
            context.querySelector('#txtManualName').focus();
        }

        if (showCancel) {
            context.querySelector('.btnCancel').classList.remove('hide');
        } else {
            context.querySelector('.btnCancel').classList.add('hide');
        }
    }

    const metroColors = ['#6FBD45', '#4BB3DD', '#4164A5', '#E12026', '#800080', '#E1B222', '#008040', '#0094FF', '#FF00C7', '#FF870F', '#7F0037'];

    function getRandomMetroColor() {
        const index = Math.floor(Math.random() * (metroColors.length - 1));
        return metroColors[index];
    }

    function getMetroColor(str) {
        if (str) {
            const character = String(str.substr(0, 1).charCodeAt());
            let sum = 0;

            for (let i = 0; i < character.length; i++) {
                sum += parseInt(character.charAt(i));
            }

            const index = String(sum).substr(-1);
            return metroColors[index];
        }

        return getRandomMetroColor();
    }

    function loadUserList(context, apiClient, users) {
        let html = '';

        for (let i = 0; i < users.length; i++) {
            const user = users[i];

            // TODO move card creation code to Card component
            let cssClass = 'card squareCard scalableCard squareCard-scalable';

            if (layoutManager.tv) {
                cssClass += ' show-focus';

                if (enableFocusTransform) {
                    cssClass += ' show-animation';
                }
            }

            const cardBoxCssClass = 'cardBox cardBox-bottompadded';
            html += '<button type="button" class="' + cssClass + '">';
            html += '<div class="' + cardBoxCssClass + '">';
            html += '<div class="cardScalable">';
            html += '<div class="cardPadder cardPadder-square"></div>';
            html += '<div class="cardContent" data-haspw="' + user.HasPassword + '" data-username="' + user.Name + '" data-userid="' + user.Id + '">';
            let imgUrl;

            if (user.PrimaryImageTag) {
                imgUrl = apiClient.getUserImageUrl(user.Id, {
                    width: 300,
                    tag: user.PrimaryImageTag,
                    type: 'Primary'
                });
                html += '<div class="cardImageContainer coveredImage" style="background-image:url(\'' + imgUrl + "');\"></div>";
            } else {
                const background = getMetroColor(user.Id);
                imgUrl = 'assets/img/avatar.png';
                html += '<div class="cardImageContainer coveredImage" style="background-image:url(\'' + imgUrl + "');background-color:" + background + ';"></div>';
            }

            html += '</div>';
            html += '</div>';
            html += '<div class="cardFooter visualCardBox-cardFooter">';
            html += '<div class="cardText singleCardText cardTextCentered">' + user.Name + '</div>';
            html += '</div>';
            html += '</div>';
            html += '</button>';
        }

        context.querySelector('#divUsers').innerHTML = html;
    }

    export default function (view, params) {
        function getApiClient() {
            const serverId = params.serverid;

            if (serverId) {
                return window.connectionManager.getOrCreateApiClient(serverId);
            }

            return ApiClient;
        }

        function showVisualForm() {
            view.querySelector('.visualLoginForm').classList.remove('hide');
            view.querySelector('.manualLoginForm').classList.add('hide');
            view.querySelector('.btnManual').classList.remove('hide');

            import('autoFocuser').then(({default: autoFocuser}) => {
                autoFocuser.autoFocus(view);
            });
        }

        view.querySelector('#divUsers').addEventListener('click', function (e) {
            const card = dom.parentWithClass(e.target, 'card');
            const cardContent = card ? card.querySelector('.cardContent') : null;

            if (cardContent) {
                const context = view;
                const id = cardContent.getAttribute('data-userid');
                const name = cardContent.getAttribute('data-username');
                const haspw = cardContent.getAttribute('data-haspw');

                if (id === 'manual') {
                    context.querySelector('#txtManualName').value = '';
                    showManualForm(context, true);
                } else if (haspw == 'false') {
                    authenticateUserByName(context, getApiClient(), name, '');
                } else {
                    context.querySelector('#txtManualName').value = name;
                    context.querySelector('#txtManualPassword').value = '';
                    showManualForm(context, true, true);
                }
            }
        });
        view.querySelector('.manualLoginForm').addEventListener('submit', function (e) {
            appSettings.enableAutoLogin(view.querySelector('.chkRememberLogin').checked);
            const apiClient = getApiClient();
            authenticateUserByName(view, apiClient, view.querySelector('#txtManualName').value, view.querySelector('#txtManualPassword').value);
            e.preventDefault();
            return false;
        });
        view.querySelector('.btnForgotPassword').addEventListener('click', function () {
            Dashboard.navigate('forgotpassword.html');
        });
        view.querySelector('.btnCancel').addEventListener('click', showVisualForm);
        view.querySelector('.btnQuick').addEventListener('click', function () {
            const apiClient = getApiClient();
            authenticateQuickConnect(apiClient);
            return false;
        });
        view.querySelector('.btnManual').addEventListener('click', function () {
            view.querySelector('#txtManualName').value = '';
            showManualForm(view, true);
        });
        view.querySelector('.btnSelectServer').addEventListener('click', function () {
            Dashboard.selectServer();
        });

        view.addEventListener('viewshow', function (e) {
            loading.show();
            libraryMenu.setTransparentMenu(true);

            if (!appHost.supports('multiserver')) {
                view.querySelector('.btnSelectServer').classList.add('hide');
            }

            const apiClient = getApiClient();
            apiClient.getPublicUsers().then(function (users) {
                if (users.length) {
                    showVisualForm();
                    loadUserList(view, apiClient, users);
                } else {
                    view.querySelector('#txtManualName').value = '';
                    showManualForm(view, false, false);
                }
            }).catch().then(function () {
                loading.hide();
            });
            apiClient.getJSON(apiClient.getUrl('Branding/Configuration')).then(function (options) {
                view.querySelector('.disclaimer').textContent = options.LoginDisclaimer || '';
            });
        });
        view.addEventListener('viewhide', function (e) {
            libraryMenu.setTransparentMenu(false);
        });
    }

/* eslint-enable indent */
