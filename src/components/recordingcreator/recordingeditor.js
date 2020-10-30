
import dialogHelper from '../dialogHelper/dialogHelper';
import globalize from '../../scripts/globalize';
import layoutManager from '../layoutManager';
import loading from '../loading/loading';
import scrollHelper from '../../scripts/scrollHelper';
import '../../assets/css/scrollstyles.css';
import '../../elements/emby-button/emby-button';
import '../../elements/emby-collapse/emby-collapse';
import '../../elements/emby-input/emby-input';
import '../../elements/emby-button/paper-icon-button-light';
import '../formdialog.css';
import './recordingcreator.css';
import 'material-design-icons-iconfont';
import '../../assets/css/flexstyles.css';
import ServerConnections from '../ServerConnections';

let currentDialog;
let recordingDeleted = false;
let currentItemId;
let currentServerId;
let currentResolve;

function deleteTimer(apiClient, timerId) {
    return import('./recordinghelper').then((recordingHelper) => {
        recordingHelper.cancelTimerWithConfirmation(timerId, apiClient.serverId());
    });
}

function renderTimer(context, item, apiClient) {
    context.querySelector('#txtPrePaddingMinutes').value = item.PrePaddingSeconds / 60;
    context.querySelector('#txtPostPaddingMinutes').value = item.PostPaddingSeconds / 60;

    loading.hide();
}

function closeDialog(isDeleted) {
    recordingDeleted = isDeleted;
    dialogHelper.close(currentDialog);
}

function onSubmit(e) {
    const form = this;

    const apiClient = ServerConnections.getApiClient(currentServerId);

    apiClient.getLiveTvTimer(currentItemId).then(function (item) {
        item.PrePaddingSeconds = form.querySelector('#txtPrePaddingMinutes').value * 60;
        item.PostPaddingSeconds = form.querySelector('#txtPostPaddingMinutes').value * 60;
        apiClient.updateLiveTvTimer(item).then(currentResolve);
    });

    e.preventDefault();

    // Disable default form submission
    return false;
}

function init(context) {
    context.querySelector('.btnCancel').addEventListener('click', function () {
        closeDialog(false);
    });

    context.querySelector('.btnCancelRecording').addEventListener('click', function () {
        const apiClient = ServerConnections.getApiClient(currentServerId);

        deleteTimer(apiClient, currentItemId).then(function () {
            closeDialog(true);
        });
    });

    context.querySelector('form').addEventListener('submit', onSubmit);
}

function reload(context, id) {
    loading.show();
    currentItemId = id;

    const apiClient = ServerConnections.getApiClient(currentServerId);
    apiClient.getLiveTvTimer(id).then(function (result) {
        renderTimer(context, result, apiClient);
        loading.hide();
    });
}

export function show(itemId, serverId, options) {
    return new Promise(function (resolve, reject) {
        recordingDeleted = false;
        currentServerId = serverId;
        loading.show();
        options = options || {};
        currentResolve = resolve;

        import('./recordingeditor.template.html').then(({default: template}) => {
            const dialogOptions = {
                removeOnClose: true,
                scrollY: false
            };

            if (layoutManager.tv) {
                dialogOptions.size = 'fullscreen';
            }

            const dlg = dialogHelper.createDialog(dialogOptions);

            dlg.classList.add('formDialog');
            dlg.classList.add('recordingDialog');

            if (!layoutManager.tv) {
                dlg.style['min-width'] = '20%';
                dlg.classList.add('dialog-fullscreen-lowres');
            }

            let html = '';

            html += globalize.translateHtml(template, 'core');

            dlg.innerHTML = html;

            if (options.enableCancel === false) {
                dlg.querySelector('.formDialogFooter').classList.add('hide');
            }

            currentDialog = dlg;

            dlg.addEventListener('closing', function () {
                if (!recordingDeleted) {
                    dlg.querySelector('.btnSubmit').click();
                }
            });

            dlg.addEventListener('close', function () {
                if (recordingDeleted) {
                    resolve({
                        updated: true,
                        deleted: true
                    });
                }
            });

            if (layoutManager.tv) {
                scrollHelper.centerFocus.on(dlg.querySelector('.formDialogContent'), false);
            }

            init(dlg);

            reload(dlg, itemId);

            dialogHelper.open(dlg);
        });
    });
}

