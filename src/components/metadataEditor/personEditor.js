import dialogHelper from 'dialogHelper';
import layoutManager from 'layoutManager';
import globalize from 'globalize';
import 'paper-icon-button-light';
import 'emby-input';
import 'emby-select';
import 'css!./../formdialog';

/* eslint-disable indent */

    function centerFocus(elem, horiz, on) {
        import('scrollHelper').then(({default: scrollHelper}) => {
            const fn = on ? 'on' : 'off';
            scrollHelper.centerFocus[fn](elem, horiz);
        });
    }

    function show(person) {
        return new Promise(function (resolve, reject) {
            import('text!./personEditor.template.html').then(({default: template}) => {
                const dialogOptions = {
                    removeOnClose: true,
                    scrollY: false
                };

                if (layoutManager.tv) {
                    dialogOptions.size = 'fullscreen';
                } else {
                    dialogOptions.size = 'small';
                }

                const dlg = dialogHelper.createDialog(dialogOptions);

                dlg.classList.add('formDialog');

                let html = '';
                let submitted = false;

                html += globalize.translateHtml(template, 'core');

                dlg.innerHTML = html;

                dlg.querySelector('.txtPersonName', dlg).value = person.Name || '';
                dlg.querySelector('.selectPersonType', dlg).value = person.Type || '';
                dlg.querySelector('.txtPersonRole', dlg).value = person.Role || '';

                if (layoutManager.tv) {
                    centerFocus(dlg.querySelector('.formDialogContent'), false, true);
                }

                dialogHelper.open(dlg);

                dlg.addEventListener('close', function () {
                    if (layoutManager.tv) {
                        centerFocus(dlg.querySelector('.formDialogContent'), false, false);
                    }

                    if (submitted) {
                        resolve(person);
                    } else {
                        reject();
                    }
                });

                dlg.querySelector('.selectPersonType').addEventListener('change', function (e) {
                    if (this.value === 'Actor') {
                        dlg.querySelector('.fldRole').classList.remove('hide');
                    } else {
                        dlg.querySelector('.fldRole').classList.add('hide');
                    }
                });

                dlg.querySelector('.btnCancel').addEventListener('click', function (e) {
                    dialogHelper.close(dlg);
                });

                dlg.querySelector('form').addEventListener('submit', function (e) {
                    submitted = true;

                    person.Name = dlg.querySelector('.txtPersonName', dlg).value;
                    person.Type = dlg.querySelector('.selectPersonType', dlg).value;
                    person.Role = dlg.querySelector('.txtPersonRole', dlg).value || null;

                    dialogHelper.close(dlg);

                    e.preventDefault();
                    return false;
                });

                dlg.querySelector('.selectPersonType').dispatchEvent(new CustomEvent('change', {
                    bubbles: true
                }));
            });
        });
    }

export default {
    show: show
};

/* eslint-enable indent */
