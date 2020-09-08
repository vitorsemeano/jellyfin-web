import * as userSettings from './settings/userSettings';
import skinManager from './themeManager';
import { ConnectionManager, Events } from 'jellyfin-apiclient';

// Set the default theme when loading
skinManager.setTheme(userSettings.theme());

// Set the user's prefered theme when signing in
Events.on(ConnectionManager, 'localusersignedin', function (e, user) {
    skinManager.setTheme(userSettings.theme());
});
