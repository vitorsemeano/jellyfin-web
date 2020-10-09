import dialogHelper from 'dialogHelper';
import dom from 'dom';
import layoutManager from 'layoutManager';
import scrollHelper from 'scrollHelper';
import globalize from 'globalize';
import 'material-icons';
import 'emby-button';
import 'paper-icon-button-light';
import 'emby-input';
import 'formDialogStyle';
import 'flexStyles';

/* eslint-disable indent */

    function showDialog(options, template) {
        const dialogOptions = {
            removeOnClose: true,
            scrollY: false
        };

        const enableTvLayout = layoutManager.tv;

        if (enableTvLayout) {
            dialogOptions.size = 'fullscreen';
        }

        const dlg = dialogHelper.createDialog(dialogOptions);

        dlg.classList.add('formDialog');

        dlg.innerHTML = globalize.translateHtml(template, 'core');

        dlg.classList.add('align-items-center');
        dlg.classList.add('justify-content-center');
        const formDialogContent = dlg.querySelector('.formDialogContent');
        formDialogContent.classList.add('no-grow');

        if (enableTvLayout) {
            formDialogContent.style['max-width'] = '50%';
            formDialogContent.style['max-height'] = '60%';
            scrollHelper.centerFocus.on(formDialogContent, false);
        } else {
            formDialogContent.style.maxWidth = `${Math.min((options.buttons.length * 150) + 200, dom.getWindowSize().innerWidth - 50)}px`;
            dlg.classList.add('dialog-fullscreen-lowres');
        }

        if (options.title) {
            dlg.querySelector('.formDialogHeaderTitle').innerHTML = options.title || '';
        } else {
            dlg.querySelector('.formDialogHeaderTitle').classList.add('hide');
        }

        const displayText = options.html || options.text || '';
        dlg.querySelector('.text').innerHTML = displayText;

        if (!displayText) {
            dlg.querySelector('.dialogContentInner').classList.add('hide');
        }

        let i;
        let length;
        let html = '';
        let hasDescriptions = false;

        for (i = 0, length = options.buttons.length; i < length; i++) {
            const item = options.buttons[i];
            const autoFocus = i === 0 ? ' autofocus' : '';

            let buttonClass = 'btnOption raised formDialogFooterItem formDialogFooterItem-autosize';

            if (item.type) {
                buttonClass += ` button-${item.type}`;
            }

            if (item.description) {
                hasDescriptions = true;
            }

            if (hasDescriptions) {
                buttonClass += ' formDialogFooterItem-vertical formDialogFooterItem-nomarginbottom';
            }

            html += `<button is="emby-button" type="button" class="${buttonClass}" data-id="${item.id}"${autoFocus}>${item.name}</button>`;

            if (item.description) {
                html += `<div class="formDialogFooterItem formDialogFooterItem-autosize fieldDescription" style="margin-top:.25em!important;margin-bottom:1.25em!important;">${item.description}</div>`;
            }
        }

        dlg.querySelector('.formDialogFooter').innerHTML = html;

        if (hasDescriptions) {
            dlg.querySelector('.formDialogFooter').classList.add('formDialogFooter-vertical');
        }

        let dialogResult;
        function onButtonClick() {
            dialogResult = this.getAttribute('data-id');
            dialogHelper.close(dlg);
        }

        const buttons = dlg.querySelectorAll('.btnOption');
        for (i = 0, length = buttons.length; i < length; i++) {
            buttons[i].addEventListener('click', onButtonClick);
        }

        return dialogHelper.open(dlg).then(() => {
            if (enableTvLayout) {
                scrollHelper.centerFocus.off(dlg.querySelector('.formDialogContent'), false);
            }

            if (dialogResult) {
                return dialogResult;
            } else {
                return Promise.reject();
            }
        });
    }

    export async function show(text, title) {
        let options;
        if (typeof text === 'string') {
            options = {
                title: title,
                text: text
            };
        } else {
            options = text;
        }

        const { default: template } = await import('text!./dialog.template.html');
        return new Promise((resolve, reject) => {
            showDialog(options, template).then(resolve, reject);
        });
    }

/* eslint-enable indent */
export default {
    show: show
};
