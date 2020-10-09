import appSettings from 'appSettings';
import events from 'events';
import browser from 'browser';
import loading from 'loading';
import playbackManager from 'playbackManager';
import appRouter from 'appRouter';
import globalize from 'globalize';
import appHost from 'apphost';
import * as autocast from 'autocast';

function mirrorItem(info, player) {
    const item = info.item;

    playbackManager.displayContent({

        ItemName: item.Name,
        ItemId: item.Id,
        ItemType: item.Type,
        Context: info.context
    }, player);
}

function mirrorIfEnabled(info) {
    if (info && playbackManager.enableDisplayMirroring()) {
        const getPlayerInfo = playbackManager.getPlayerInfo();

        if (getPlayerInfo) {
            if (!getPlayerInfo.isLocalPlayer && getPlayerInfo.supportedCommands.indexOf('DisplayContent') !== -1) {
                mirrorItem(info, playbackManager.getCurrentPlayer());
            }
        }
    }
}

function emptyCallback() {
    // avoid console logs about uncaught promises
}

function getTargetSecondaryText(target) {
    if (target.user) {
        return target.user.Name;
    }

    return null;
}

function getIcon(target) {
    let deviceType = target.deviceType;

    if (!deviceType && target.isLocalPlayer) {
        if (browser.tv) {
            deviceType = 'tv';
        } else if (browser.mobile) {
            deviceType = 'smartphone';
        } else {
            deviceType = 'desktop';
        }
    }

    if (!deviceType) {
        deviceType = 'tv';
    }

    switch (deviceType) {
        case 'smartphone':
            return 'smartphone';
        case 'tablet':
            return 'tablet';
        case 'tv':
            return 'tv';
        case 'cast':
            return 'cast';
        case 'desktop':
            return 'computer';
        default:
            return 'tv';
    }
}

export function show(button) {
    const currentPlayerInfo = playbackManager.getPlayerInfo();

    if (currentPlayerInfo) {
        if (!currentPlayerInfo.isLocalPlayer) {
            showActivePlayerMenu(currentPlayerInfo);
            return;
        }
    }

    const currentPlayerId = currentPlayerInfo ? currentPlayerInfo.id : null;

    loading.show();

    playbackManager.getTargets().then(function (targets) {
        const menuItems = targets.map(function (t) {
            let name = t.name;

            if (t.appName && t.appName !== t.name) {
                name += ' - ' + t.appName;
            }

            return {
                name: name,
                id: t.id,
                selected: currentPlayerId === t.id,
                secondaryText: getTargetSecondaryText(t),
                icon: getIcon(t)
            };
        });

        import('actionsheet').then(({default: actionsheet}) => {
            loading.hide();

            const menuOptions = {
                title: globalize.translate('HeaderPlayOn'),
                items: menuItems,
                positionTo: button,

                resolveOnClick: true,
                border: true
            };

            // Unfortunately we can't allow the url to change or chromecast will throw a security error
            // Might be able to solve this in the future by moving the dialogs to hashbangs
            if (!(!browser.chrome && !browser.edgeChromium || appHost.supports('castmenuhashchange'))) {
                menuOptions.enableHistory = false;
            }

            actionsheet.show(menuOptions).then(function (id) {
                const target = targets.filter(function (t) {
                    return t.id === id;
                })[0];

                playbackManager.trySetActivePlayer(target.playerName, target);

                mirrorIfEnabled();
            }, emptyCallback);
        });
    });
}

function showActivePlayerMenu(playerInfo) {
    Promise.all([
        import('dialogHelper'),
        import('dialog'),
        import('emby-checkbox'),
        import('emby-button')
    ]).then(([dialogHelper]) => {
        showActivePlayerMenuInternal(dialogHelper, playerInfo);
    });
}

function disconnectFromPlayer(currentDeviceName) {
    if (playbackManager.getSupportedCommands().indexOf('EndSession') !== -1) {
        import('dialog').then(({default: dialog}) => {
            const menuItems = [];

            menuItems.push({
                name: globalize.translate('Yes'),
                id: 'yes'
            });
            menuItems.push({
                name: globalize.translate('No'),
                id: 'no'
            });

            dialog({
                buttons: menuItems,
                text: globalize.translate('ConfirmEndPlayerSession', currentDeviceName)

            }).then(function (id) {
                switch (id) {
                    case 'yes':
                        playbackManager.getCurrentPlayer().endSession();
                        playbackManager.setDefaultPlayerActive();
                        break;
                    case 'no':
                        playbackManager.setDefaultPlayerActive();
                        break;
                    default:
                        break;
                }
            });
        });
    } else {
        playbackManager.setDefaultPlayerActive();
    }
}

function showActivePlayerMenuInternal(dialogHelper, playerInfo) {
    let html = '';

    const dialogOptions = {
        removeOnClose: true
    };

    dialogOptions.modal = false;
    dialogOptions.entryAnimationDuration = 160;
    dialogOptions.exitAnimationDuration = 160;
    dialogOptions.autoFocus = false;

    const dlg = dialogHelper.createDialog(dialogOptions);

    dlg.classList.add('promptDialog');

    const currentDeviceName = (playerInfo.deviceName || playerInfo.name);

    html += '<div class="promptDialogContent" style="padding:1.5em;">';
    html += '<h2 style="margin-top:.5em;">';
    html += currentDeviceName;
    html += '</h2>';

    html += '<div>';

    if (playerInfo.supportedCommands.indexOf('DisplayContent') !== -1) {
        html += '<label class="checkboxContainer">';
        const checkedHtml = playbackManager.enableDisplayMirroring() ? ' checked' : '';
        html += '<input type="checkbox" is="emby-checkbox" class="chkMirror"' + checkedHtml + '/>';
        html += '<span>' + globalize.translate('EnableDisplayMirroring') + '</span>';
        html += '</label>';
    }

    html += '</div>';

    if (autocast.supported()) {
        html += '<div><label class="checkboxContainer">';
        const checkedHtmlAC = autocast.isEnabled() ? ' checked' : '';
        html += '<input type="checkbox" is="emby-checkbox" class="chkAutoCast"' + checkedHtmlAC + '/>';
        html += '<span>' + globalize.translate('EnableAutoCast') + '</span>';
        html += '</label></div>';
    }

    html += '<div style="margin-top:1em;display:flex;justify-content: flex-end;">';

    html += '<button is="emby-button" type="button" class="button-flat btnRemoteControl promptDialogButton">' + globalize.translate('HeaderRemoteControl') + '</button>';
    html += '<button is="emby-button" type="button" class="button-flat btnDisconnect promptDialogButton ">' + globalize.translate('Disconnect') + '</button>';
    html += '<button is="emby-button" type="button" class="button-flat btnCancel promptDialogButton">' + globalize.translate('ButtonCancel') + '</button>';
    html += '</div>';

    html += '</div>';
    dlg.innerHTML = html;

    const chkMirror = dlg.querySelector('.chkMirror');

    if (chkMirror) {
        chkMirror.addEventListener('change', onMirrorChange);
    }

    const chkAutoCast = dlg.querySelector('.chkAutoCast');

    if (chkAutoCast) {
        chkAutoCast.addEventListener('change', onAutoCastChange);
    }

    let destination = '';

    const btnRemoteControl = dlg.querySelector('.btnRemoteControl');
    if (btnRemoteControl) {
        btnRemoteControl.addEventListener('click', function () {
            destination = 'nowplaying';
            dialogHelper.close(dlg);
        });
    }

    dlg.querySelector('.btnDisconnect').addEventListener('click', function () {
        destination = 'disconnectFromPlayer';
        dialogHelper.close(dlg);
    });

    dlg.querySelector('.btnCancel').addEventListener('click', function () {
        dialogHelper.close(dlg);
    });

    dialogHelper.open(dlg).then(function () {
        if (destination === 'nowplaying') {
            appRouter.showNowPlaying();
        } else if (destination === 'disconnectFromPlayer') {
            disconnectFromPlayer(currentDeviceName);
        }
    }, emptyCallback);
}

function onMirrorChange() {
    playbackManager.enableDisplayMirroring(this.checked);
}

function onAutoCastChange() {
    autocast.enable(this.checked);
}

document.addEventListener('viewshow', function (e) {
    const state = e.detail.state || {};
    const item = state.item;

    if (item && item.ServerId) {
        mirrorIfEnabled({
            item: item
        });
        return;
    }
});

events.on(appSettings, 'change', function (e, name) {
    if (name === 'displaymirror') {
        mirrorIfEnabled();
    }
});

events.on(playbackManager, 'pairing', function (e) {
    loading.show();
});

events.on(playbackManager, 'paired', function (e) {
    loading.hide();
});

events.on(playbackManager, 'pairerror', function (e) {
    loading.hide();
});

export default {
    show: show
};
