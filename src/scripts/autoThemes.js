import * as userSettings from './settings/userSettings';
import skinManager from './themeManager';
import { Events } from 'jellyfin-apiclient';
import ServerConnections from '../components/ServerConnections';

// Set the default theme when loading
skinManager.setTheme(userSettings.theme());

// Set the user's prefered theme when signing in
Events.on(ServerConnections, 'localusersignedin', function (e, user) {
    skinManager.setTheme(userSettings.theme());
});
