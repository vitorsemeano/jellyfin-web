/* eslint-env serviceworker */
(function () {
    'use strict';

    let connectionManager;

    function getApiClient(serverId) {
        if (connectionManager) {
            return Promise.resolve(connectionManager.getApiClient(serverId));
        }
        return Promise.reject();
    }

    function executeAction(action, data, serverId) {
        return getApiClient(serverId).then(function (apiClient) {
            switch (action) {
                case 'cancel-install':
                    return apiClient.cancelPackageInstallation(data.id);
                case 'restart':
                    return apiClient.restartServer();
                default:
                    clients.openWindow('/');
                    return Promise.resolve();
            }
        });
    }

    /* eslint-disable-next-line no-restricted-globals -- self is valid in a serviceworker environment */
    self.addEventListener('notificationclick', function (event) {
        const notification = event.notification;
        notification.close();

        const data = notification.data;
        const serverId = data.serverId;
        const action = event.action;

        if (!action) {
            clients.openWindow('/');
            event.waitUntil(Promise.resolve());
            return;
        }

        event.waitUntil(executeAction(action, data, serverId));
    }, false);
})();
