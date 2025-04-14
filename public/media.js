let userName = "N/A";
let identifier = null;
let autoSyncTimer = 5;
let slippage = 2;
let unreadMessages = true;
let roomLocked = false;

// Dark + Light Mode
document.getElementById('theme').onclick = function () {
    const button = document.getElementById('theme');

    if (button.src.includes("moon.svg")) {
        button.src = "images/sun.svg";
        document.getElementById('htmlTheme').className = "dark"
    } else {
        button.src = "images/moon.svg";
        document.getElementById('htmlTheme').className = ""
    }
};

// Play button
document.querySelector('#play').onclick = function () {
    const playerState = player.getPlayerState()

    if(!roomId) {
        if(playerState === YT.PlayerState.PLAYING) {
            player.pauseVideo()
        } else {
            player.playVideo()
        }
        return
    }

    getRoomState(roomId, (state) => {
        if (state.isPlaying) {
            if(playerState === YT.PlayerState.PAUSED) {
                getSyncInfo(roomId, (state) => {
                    player.seekTo(state.videoTime, true)
                    player.playVideo()
                });
            } else {
                if(canSeek) {
                    console.log('Video paused, emitting pause event')
                    socket.emit('videoAction', {
                        room: roomId,
                        action: 'pause',
                        time: player.getCurrentTime(),
                        stamp: Date.now(),
                    })
                } else {
                    player.pauseVideo()
                }
            }
        } else {
            if(playerState === YT.PlayerState.PLAYING) {
                player.pauseVideo()
            } else {
                console.log('Video playing, emitting play event')
                socket.emit('videoAction', {
                    room: roomId,
                    action: 'play',
                    time: player.getCurrentTime(),
                    stamp: Date.now(),
                })
            }
        }
    })
}

// Seek bar functionality
const seekBar = document.querySelector('#seekBar');

seekBar.addEventListener('mousedown', () => {
    isSeeking = true;
});

seekBar.addEventListener('mouseup', () => {
    if (isSeeking && player && canSeek) {
        socket.emit('videoAction', {
            room: roomId,
            action: 'seek',
            time: Math.round(seekBar.value),
            stamp: Date.now(),
        });
    }
    isSeeking = false;
});

// Update playback time
function updateTimer() {
    const seek = document.querySelector('#seekBar');
    const time = document.querySelector('#time');

    setInterval(() => {
        if (player && typeof player.getCurrentTime === 'function' && !isSeeking) {
            seek.value = player.getCurrentTime();
            time.textContent =
                '-' + timeLeft(player.getCurrentTime(), player.getDuration());
        }
    }, 500);
}

// Queue container resize
window.addEventListener('resize', changeQueueSize);
window.addEventListener('load', changeQueueSize);

function changeQueueSize() {
    const videoBox = document.getElementById('videoBox');
    const queueContainer = document.getElementById('queueContainer');
    const videoBoxHeight = videoBox.offsetHeight;
    queueContainer.style.maxHeight = videoBoxHeight + 'px';
}

// Calculates how much time left on video
function timeLeft(seconds, videoLength) {
    const remainingTime = videoLength - seconds
    const hours = Math.floor(remainingTime / 3600)
    const minutes = Math.floor((remainingTime % 3600) / 60)
    const secs = Math.floor(remainingTime % 60)

    const updatedMinutes = minutes < 10 ? '0' + minutes : minutes
    const updatedSeconds = secs < 10 ? '0' + secs : secs

    if (hours > 0) {
        const updatedHours = hours < 10 ? '0' + hours : hours
        return updatedHours + ':' + updatedMinutes + ':' + updatedSeconds
    } else {
        return updatedMinutes + ':' + updatedSeconds
    }
}

document.querySelector('#volumeR').addEventListener('input', (event) => {
    const volume = document.querySelector('#volumeR')
    const volumeM = document.querySelector('#volumeSvg')
    if (player) {
        player.setVolume(volume.value)

        if (volume.value > 1) {
            player.unMute()
        }
    }

    document.addEventListener('mouseup', () => {
        if (volume.value >= 50) {
            volumeM.setAttribute(
                'd',
                'M7.093 15H4.5A1.5 1.5 0 0 1 3 13.5v-3A1.5 1.5 0 0 1 4.5 9h2.593l5.181-5.469C12.896 2.875 14 3.315 14 4.22v15.562c0 .904-1.104 1.344-1.726.688L7.093 15zm12.978 4.07a1 1 0 1 1-1.414-1.413A7.97 7.97 0 0 0 21 12a7.97 7.97 0 0 0-2.343-5.656 1 1 0 1 1 1.415-1.415A9.97 9.97 0 0 1 23 12a9.97 9.97 0 0 1-2.929 7.07zm-3.673-3.269a1 1 0 0 0 1.4-.198A5.978 5.978 0 0 0 19 12a5.977 5.977 0 0 0-1.197-3.596 1 1 0 0 0-1.6 1.2c.515.686.797 1.518.797 2.396 0 .88-.284 1.714-.8 2.401a1 1 0 0 0 .198 1.4z'
            )
        } else if (volume.value == 0) {
            volumeM.setAttribute(
                'd',
                'M7.093 15H4.5A1.5 1.5 0 0 1 3 13.5v-3A1.5 1.5 0 0 1 4.5 9h2.593l5.181-5.469C12.896 2.875 14 3.315 14 4.22v15.562c0 .904-1.104 1.344-1.726.688L7.093 15zm9.2-4.794a1 1 0 1 1 1.414-1.413l1.794 1.794 1.792-1.79a1 1 0 1 1 1.414 1.414l-1.793 1.791 1.793 1.795a1 1 0 1 1-1.414 1.413l-1.794-1.794-1.792 1.791a1 1 0 0 1-1.414-1.415l1.793-1.79-1.793-1.796z'
            )
        } else if (volume.value < 50) {
            volumeM.setAttribute(
                'd',
                'M4.5 15h2.593l5.181 5.468c.622.657 1.726.217 1.726-.687V4.219c0-.904-1.104-1.344-1.726-.688L7.093 9H4.5A1.5 1.5 0 0 0 3 10.5v3A1.5 1.5 0 0 0 4.5 15zm11.898.801a1 1 0 0 0 1.4-.198A5.978 5.978 0 0 0 19 12a5.977 5.977 0 0 0-1.197-3.596 1 1 0 0 0-1.6 1.2c.515.686.797 1.518.797 2.396 0 .88-.284 1.714-.8 2.401a1 1 0 0 0 .198 1.4z'
            )
        }
    })

})

document.getElementById('fullscreen').onclick = function () {
    const iframe = document.querySelector('#iframe iframe')
    const menu = document.querySelector('#settingsM')
    if (iframe) {
        if (iframe.requestFullscreen) {
            iframe.requestFullscreen()
        } else if (iframe.mozRequestFullScreen) {
            iframe.mozRequestFullScreen()
        } else if (iframe.webkitRequestFullscreen) {
            iframe.webkitRequestFullscreen()
        } else if (iframe.msRequestFullscreen) {
            iframe.msRequestFullscreen()
        }
    }
    if (menu.style.display === 'block') {
        menu.style.display = 'none'
    }
}

document.querySelector('#quality').addEventListener('click', () => {
    const qualityMenu = document.querySelector('#qualityM')
    const menu = document.querySelector('#settingsM')

    if (
        qualityMenu.style.display === 'none' ||
        qualityMenu.style.display === ''
    ) {
        loadQualityOptions()
        qualityMenu.style.display = 'block'
    } else {
        qualityMenu.style.display = 'none'
    }

    if (menu.style.display === 'block') {
        menu.style.display = 'none'
    }
})

document.querySelector('#settings').addEventListener('click', () => {
    const iframe = document.querySelector('#iframe iframe')
    const menu = document.querySelector('#settingsM')
    const qualityMenu = document.querySelector('#qualityM')

    if (!iframe) {
        return
    }

    if (menu.style.display === 'none' || menu.style.display === '') {
        menu.style.display = 'block'
    } else {
        menu.style.display = 'none'
    }

    if (qualityMenu.style.display === 'block' || qualityMenu.style.display === '') {
        qualityMenu.style.display = 'none'
    } else {
        qualityMenu.style.display = 'block'
    }
})

document.querySelector('#volume').addEventListener('click', () => {
    const iframe = document.querySelector('#iframe iframe')
    const menu = document.querySelector('#volumeM')

    if (!iframe) {
        return
    }

    if (menu.style.display === 'none' || menu.style.display === '') {
        menu.style.display = 'block'
    } else {
        menu.style.display = 'none'
    }
})

document.addEventListener('click', (event) => {
    const settingsMenu = document.querySelector('#settingsM');
    const qualityMenu = document.querySelector('#qualityM');
    const volumeMenu = document.querySelector('#volumeM');
    const accountMenu = document.querySelector('#accountSettings');
    
    const settingsButton = document.querySelector('#settings');
    const qualityButton = document.querySelector('#quality');
    const volumeButton = document.querySelector('#volume');
    const accountButton = document.querySelector('#account');

    const chat = document.querySelector('#chat')
    const chatBox = document.querySelector('#chatBox')

    // Volume menu
    if (
        !volumeMenu.contains(event.target) &&
        !volumeButton.contains(event.target)
    ) {
        volumeMenu.style.display = 'none';
    }

    // Settings menu
    if (
        !settingsMenu.contains(event.target) &&
        !settingsButton.contains(event.target)
    ) {
        settingsMenu.style.display = 'none';
    }

    // Quality menu
    if (
        !qualityMenu.contains(event.target) &&
        !qualityButton.contains(event.target)
    ) {
        qualityMenu.style.display = 'none';
    }

    // Account menu
    if (
        accountMenu &&
        !accountMenu.contains(event.target) &&
        !accountButton.contains(event.target)
    ) {
        accountMenu.classList.add('hidden');
    }

    // Chat box
    if (
        chatBox &&
        !chatBox.contains(event.target) &&
        !chat.contains(event.target)
    ) {
        chatBox.classList.add('hidden');
        chat.classList.remove('hidden');
    }

});

function loadQualityOptions() {
    const qualityMenu = document.querySelector('#qualityM')
    qualityMenu.innerHTML = ''

    if (player && player.getAvailableQualityLevels) {
        const qualityLevels = player.getAvailableQualityLevels()

        qualityLevels.forEach((level) => {
            if (level.includes('hd') || level.includes('auto')) {
                const button = document.createElement('button');

                button.className = 'relative flex flex-col text-white bg-gray-800 p-1 w-20 border rounded-md hover:bg-gray-600 cursor-pointer';
                button.textContent = level.replace('hd', '').toUpperCase();

                button.onclick = () => {
                    player.setPlaybackQuality(level);
                    console.log("set too:" + level)
                    qualityMenu.style.display = 'none';
                };

                qualityMenu.appendChild(button);
            }
        });
    }
}

function resetControls() {
    const seek = document.querySelector('#seekBar')
    const time = document.querySelector('#time')
    const videoTitle = document.querySelector('#videoTitleText')
    const waiting = document.getElementById('waiting')
    const mute = document.getElementById('#volumeR')

    seek.value = 0
    time.textContent = "00:00"
    videoTitle.textContent = ""
    waiting.innerText = '...'
}

document.querySelector('#account').addEventListener('click', () => {
    const account = document.querySelector('#accountSettings')
    if (
        account.classList.contains('hidden')
    ) {
        account.classList.remove("hidden")
    } else {
        account.classList.add("hidden")
    }
})

function updateUsername() {
    const layout = /[^A-Za-z0-9\s_-]+$/
    const alert = document.getElementById('alertBox');
    const oldName = userName;
    const usernameValue = document.querySelector('#usernameInput');

    if(!alert.classList.contains('hidden')) {
        closeAlert();
    }

    if(layout.test(usernameValue.value)) {
        callAlert("Only use letters and numbers!")
        return;
    }

    if(usernameValue.value.length >= 3 || !usernameValue.value === userName) {
        usernameValue.placeholder = usernameValue.value

        document.cookie = `username=${usernameValue.value}; path=/; max-age=${60 * 60 * 24 * 30}`;

        socket.emit('newName', { roomId, oldName, newName: usernameValue.value.trim(), isNew: false })
    } else {
        callAlert("Please enter a longer username!");
    }
}

function autoSync() {
    const checkbox = document.getElementById('autoSyncCheckbox');

    if(checkbox.checked) {
        closeAlert()
        callAlert("Auto sync enabled!");
        syncing();
    } else {
        closeAlert()
        clearTimeout(syncingTimer);
        callAlert("Auto sync disabled!");
    }
}

function syncing() {
    if(document.getElementById('autoSyncCheckbox').checked) {
        syncingTimer = setTimeout(() => {
            if(videoLoaded && player.getPlayerState() === YT.PlayerState.PLAYING) {
                getSyncInfo(roomId, (state) => {
                    console.log((autoSyncTimer) + " has passed, scanning...")
                    console.log("difference = " + (state.videoTime - player.getCurrentTime()))
                    console.log(videoLoaded + " video loaded")
                    if (Math.abs(state.videoTime - player.getCurrentTime()) > slippage ) {
                        player.seekTo(state.videoTime, true)
                        console.log("server time: " + state.videoTime + " player time = " + player.getCurrentTime())
                    }
                    syncing();
                })
            } else { syncing(); }
        }, autoSyncTimer * 1000)
    } else {
        console.log("not checked")
    }
}

function handleSlippage() {
    const slippageText = document.getElementById('slippageText');
    const slippageBar = document.getElementById('slippageBar');
    
    if(slippageBar.value >= 1 && slippageBar.value <= 10) {
        slippageText.textContent = "Slippage ("+ slippageBar.value + " seconds)"

        slippage = slippageBar.value;
    }
}

function handleCheckTimer() {
    const timerText = document.getElementById('checkTimerText');
    const timerBar = document.getElementById('checkTimerBar');
    
    if(timerBar.value >= 3 && timerBar.value <= 30) {
        timerText.textContent = "Check Timer ("+ timerBar.value + " seconds)"

        autoSyncTimer = timerBar.value;
    }
}

document.querySelector('#chat').addEventListener('click', () => {
    const chat = document.querySelector('#chat')
    const chatBox = document.querySelector('#chatBox')
    chat.classList.remove("chat-fade");

    if (
        chatBox.classList.contains('hidden')
    ) {
        chatBox.classList.remove("hidden")
        chat.classList.add("hidden")
        readMessage(true)
    } else {
        chat.classList.remove("hidden")
        chatBox.classList.add("hidden")
    }
})

function readMessage(value) {
    unreadMessages = value;

    if(unreadMessages) {
        document.getElementById('messagePulse').classList.add("hidden");
    } else if (chatBox.classList.contains("hidden")) {
        document.getElementById('messagePulse').classList.remove("hidden");
    }
}

function handleMessage(event) {
    event.preventDefault();
    const messageBox = document.getElementById("messages");
    const message = document.getElementById("messageText").value;

    if(message.length < 1 || message.length > 200) {
        return;
    } 

    socket.emit('message', { roomId, message })
    document.getElementById("messageText").value = ""

    messageBox.scrollTop = messageBox.scrollHeight;
}

function skipVideo() {
    console.log(videoLoaded)
    if(videoLoaded && player.getVideoUrl && typeof player.getVideoUrl === 'function') {
        const url = player.getVideoUrl()


        socket.emit('videoEnded', { room:roomId, url } )
    }
}

function lockRoom() {
    const lock = document.getElementById('lockRoom');
    if(!roomLocked && isLeader) {
        roomLocked = true
        lock.src = "images/locked.svg"
        socket.emit('lockRoom', roomId, true)
    } else if (roomLocked && isLeader){
        roomLocked = false
        lock.src = "images/unlocked.svg"
        socket.emit('lockRoom', roomId, false)
    }
}

function disableButtons(state) {
    const play = document.querySelector('#play');
    const seek = document.querySelector('#seekBar');
    const search = document.querySelector('#searchBar');
    const skip = document.querySelector('#skip');

    if(isLeader) {
        return;
    }

    if(state) {
        play.disabled = true;
        play.classList.add('bg-red-500');
        play.classList.remove('hover:bg-gray-600');

        search.disabled = true;
        skip.disabled = true;

        seek.disabled = true;
        seek.classList.add('accent-red-500');
        seek.classList.add('cursor-default');
    } else {
        play.disabled = false;
        play.classList.remove('bg-red-500')
        play.classList.add('hover:bg-gray-600');

        search.disabled = false;
        skip.disabled = false;

        seek.disabled = false;
        seek.classList.remove('accent-red-500');
        seek.classList.remove('cursor-default');
    }
}

function callAlert(text) {
    const alert = document.getElementById('alertBox');
    const exitBtn = document.getElementById('closeAlert');
    const alertTxt = document.getElementById('alertTxt');

    // When alert is called
    if(alert.classList.contains('hidden')) {
        alert.classList.remove('hidden');
        alertTxt.innerText = text;
        startAnimation()

        // When exit is pressed
        exitBtn.addEventListener('click', () => {
            endAnimation()
            clearTimeout(closeTimeout)
        }, {once : true});

        // Auto close alert
        closeTimeout = setTimeout(() => {
            endAnimation()
        }, 10000)
    }

    // Animations + Closing handling
    function startAnimation() {
        setTimeout(() => {
            alert.classList.remove("translate-x-full");
            alert.classList.add("translate-x-0");
        }, 1);
    }

    function endAnimation() {
        alert.classList.add("translate-y-full");
        setTimeout(() => {
            alert.classList.add("translate-x-full");
            alert.classList.remove("translate-x-0");
            alert.classList.remove("translate-y-full");

            alert.classList.add("hidden");
        }, 100);
    }
}

function closeAlert() {
    const alert = document.getElementById('alertBox');

    if(!alert.classList.contains('hidden')) {
        clearTimeout(closeTimeout)

        alert.classList.add("hidden");
        alert.classList.add("translate-y-full");
        alert.classList.add("translate-x-full");
        alert.classList.remove("translate-x-0");
        alert.classList.remove("translate-y-full");
    }
}

function loadBeatles() {
    const videoLinks = [
        "https://www.youtube.com/watch?v=CGj85pVzRJs",
        "https://www.youtube.com/watch?v=KQetemT1sWc",
        "https://www.youtube.com/watch?v=mBqqeqcJM_0",
        "https://www.youtube.com/watch?v=TQemQRL_YVQ",
        "https://www.youtube.com/watch?v=Man4Xw8Xypo",
        "https://www.youtube.com/watch?v=oxwAB3SECtc"
    ];

    function addLink(index) {
        if (index >= videoLinks.length) return;

        handleQueue(videoLinks[index]);

        setTimeout(() => {
            addLink(index + 1);
        }, 250);
    }

    addLink(0);
}