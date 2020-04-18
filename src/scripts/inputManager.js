import playbackManager from 'playbackManager';
import focusManager from 'focusManager';
import appRouter from 'appRouter';
import dom from 'dom';
import appHost from 'apphost';

/* eslint-disable indent */

    let lastInputTime = new Date().getTime();

    export function notify() {
        lastInputTime = new Date().getTime();
        handleCommand('unknown');
    }

    export function notifyMouseMove() {
        lastInputTime = new Date().getTime();
    }

    export function idleTime() {
        return new Date().getTime() - lastInputTime;
    }

    export function select(sourceElement) {
        sourceElement.click();
    }

    let eventListenerCount = 0;
    export function on(scope, fn) {
        eventListenerCount++;
        dom.addEventListener(scope, 'command', fn, {});
    }

    export function off(scope, fn) {
        if (eventListenerCount) {
            eventListenerCount--;
        }
        dom.removeEventListener(scope, 'command', fn, {});
    }

    let commandTimes = {};

    function checkCommandTime(command) {

        const last = commandTimes[command] || 0;
        const now = new Date().getTime();

        if ((now - last) < 1000) {
            return false;
        }

        commandTimes[command] = now;
        return true;
    }

    export function handleCommand(commandName, options) {

        lastInputTime = new Date().getTime();

        let sourceElement = (options ? options.sourceElement : null);

        if (sourceElement) {
            sourceElement = focusManager.focusableParent(sourceElement);
        }

        if (!sourceElement) {
            sourceElement = document.activeElement || window;

            const dlg = document.querySelector('.dialogContainer .dialog.opened');

            if (dlg && (!sourceElement || !dlg.contains(sourceElement))) {
                sourceElement = dlg;
            }
        }

        if (eventListenerCount) {
            const customEvent = new CustomEvent("command", {
                detail: {
                    command: commandName
                },
                bubbles: true,
                cancelable: true
            });

            const eventResult = sourceElement.dispatchEvent(customEvent);
            if (!eventResult) {
                // event cancelled
                return;
            }
        }

        const keyActions = (command) => ({
            'up': () => {
                focusManager.moveUp(sourceElement);
            },
            'down': () => {
                focusManager.moveDown(sourceElement);
            },
            'left': () => {
                focusManager.moveLeft(sourceElement);
            },
            'right': () => {
                focusManager.moveRight(sourceElement);
            },
            'home': () => {
                appRouter.goHome();
            },
            'settings': () => {
                appRouter.showSettings();
            },
            'back': () => {
                if (appRouter.canGoBack()) {
                    appRouter.back();
                } else if (appHost.supports('exit')) {
                    appHost.exit();
                }
            },
            'select': () => {
                select(sourceElement);
            },
            'nextchapter': () => {
                playbackManager.nextChapter();
            },
            'next': () => {
                playbackManager.nextTrack();
            },
            'nexttrack': () => {
                playbackManager.nextTrack();
            },
            'previous': () => {
                playbackManager.previousTrack();
            },
            'previoustrack': () => {
                playbackManager.previousTrack();
            },
            'previouschapter': () => {
                playbackManager.previousChapter();
            },
            'guide': () => {
                appRouter.showGuide();
            },
            'recordedtv': () => {
                appRouter.showRecordedTV();
            },
            'livetv': () => {
                appRouter.showLiveTV();
            },
            'mute': () => {
                playbackManager.setMute(true);
            },
            'unmute': () => {
                playbackManager.setMute(false);
            },
            'togglemute': () => {
                playbackManager.toggleMute();
            },
            'channelup': () => {
                playbackManager.channelUp();
            },
            'channeldown': () => {
                playbackManager.channelDown();
            },
            'volumedown': () => {
                playbackManager.volumeDown();
            },
            'volumeup': () => {
                playbackManager.volumeUp();
            },
            'play': () => {
                playbackManager.unpause();
            },
            'pause': () => {
                playbackManager.pause();
            },
            'playpause': () => {
                playbackManager.playPause();
            },
            'stop': () => {
                if (checkCommandTime('stop')) {
                    playbackManager.stop();
                }
            },
            'changezoom': () => {
                playbackManager.toggleAspectRatio();
            },
            'changeaudiotrack': () => {
                playbackManager.changeAudioStream();
            },
            'changesubtitletrack': () => {
                playbackManager.changeSubtitleStream();
            },
            'search': () => {
                appRouter.showSearch();
            },
            'favorites': () => {
                appRouter.showFavorites();
            },
            'fastforward': () => {
                playbackManager.fastForward();
            },
            'rewind': () => {
                playbackManager.rewind();
            },
            'togglefullscreen': () => {
                playbackManager.toggleFullscreen();
            },
            'disabledisplaymirror': () => {
                playbackManager.enableDisplayMirroring(false);
            },
            'enabledisplaymirror': () => {
                playbackManager.enableDisplayMirroring(true);
            },
            'toggledisplaymirror': () => {
                playbackManager.toggleDisplayMirroring();
            },
            'nowplaying': () => {
                appRouter.showNowPlaying();
            },
            'repeatnone': () => {
                playbackManager.setRepeatMode('RepeatNone');
            },
            'repeatall': () => {
                playbackManager.setRepeatMode('RepeatAll');
            },
            'repeatone': () => {
                playbackManager.setRepeatMode('RepeatOne');
            }
        })[command];

        const action = keyActions(commandName);
        if (action !== undefined) {
            action.call();
        } else {
            console.debug(`inputManager: tried to process command with no action assigned: ${commandName}`);
        }
    }

    dom.addEventListener(document, 'click', notify, {
        passive: true
    });

/* eslint-enable indent */

export default {
    trigger: handleCommand,
    handle: handleCommand,
    notify: notify,
    notifyMouseMove: notifyMouseMove,
    idleTime: idleTime,
    on: on,
    off: off
};
