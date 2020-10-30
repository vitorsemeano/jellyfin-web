import browser from '../scripts/browser';
import Dialog from './dialog/dialog';
import globalize from '../scripts/globalize';

function replaceAll(originalString, strReplace, strWith) {
    const reg = new RegExp(strReplace, 'ig');
    return originalString.replace(reg, strWith);
}

function nativeAlert(options) {
    if (typeof options === 'string') {
        options = {
            title: '',
            text: options
        };
    }

    const text = replaceAll(options.text || '', '<br/>', '\n');
    const result = window.alert(text);

    if (result) {
        return Promise.resolve();
    } else {
        return Promise.reject();
    }
}

function customAlert(text, title) {
    let options;
    if (typeof text === 'string') {
        options = {
            title: title,
            text: text
        };
    } else {
        options = text;
    }

    const items = [];

    items.push({
        name: globalize.translate('ButtonGotIt'),
        id: 'ok',
        type: 'submit'
    });

    options.buttons = items;

    return Dialog(options).then(result => {
        if (result === 'ok') {
            return Promise.resolve();
        }

        return Promise.reject();
    });
}

const alert = browser.tv && window.alert ? nativeAlert : customAlert;

export default alert;

