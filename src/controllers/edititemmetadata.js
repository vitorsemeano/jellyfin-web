import loading from 'loading';
import 'scripts/editorsidebar';

function reload(context, itemId) {
    loading.show();

    if (itemId) {
        import('metadataEditor').then(({ default: metadataEditor }) => {
            metadataEditor.embed(context.querySelector('.editPageInnerContent'), itemId, ApiClient.serverInfo().Id);
        });
    } else {
        context.querySelector('.editPageInnerContent').innerHTML = '';
        loading.hide();
    }
}

export default function (view, params) {
    view.addEventListener('viewshow', function () {
        reload(this, MetadataEditor.getCurrentItemId());
    });
    MetadataEditor.setCurrentItemId(null);
    view.querySelector('.libraryTree').addEventListener('itemclicked', function (event) {
        const data = event.detail;

        if (data.id != MetadataEditor.getCurrentItemId()) {
            MetadataEditor.setCurrentItemId(data.id);
            reload(view, data.id);
        }
    });
}
