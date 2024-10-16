
// Functionality for seek bar
document.querySelector('.seekBar').addEventListener('input', (event) => {
    const seekTime = event.target.value;
    if (player) {
        player.seekTo(seekTime, true);
    }
});

function updateSeek() {
    const seek = document.querySelector('.seekBar');
    const time = document.querySelector('.time');

    setInterval(() => {
        if(player) {
            seek.value = player.getCurrentTime();
            time.textContent = "-" + timeLeft(player.getCurrentTime(), player.getDuration());
        }
    }, 500);
}

function timeLeft(seconds, videoLength) {
    const remainingTime = videoLength - seconds;
    const hours = Math.floor(remainingTime / 3600);
    const minutes = Math.floor((remainingTime % 3600) / 60);
    const secs = Math.floor(remainingTime % 60);

    const updatedMinutes = minutes < 10 ? '0' + minutes : minutes;
    const updatedSeconds = secs < 10 ? '0' + secs : secs;

    if (hours > 0) {
        const updatedHours = hours < 10 ? '0' + hours : hours;
        return updatedHours + ":" + updatedMinutes + ":" + updatedSeconds;
    } else {
        return updatedMinutes + ":" + updatedSeconds;
    }
}

// Functionality for volume options
function updateVolume() {
    const volume = document.querySelector('.volumeR');
    const volumeM = document.querySelector('.volume');
    setInterval(() => {
        if (player && !player.isMuted()) {
            volume.value = player.getVolume();
        } else if (player.isMuted()) {
            volume.value = 0;
        }

        if (volume.value >= 50) {
            volumeM.style.backgroundImage = 'url("images/highVol.png")';
            console.log("high vol");
        } else if (volume.value == 0) {
            volumeM.style.backgroundImage = 'url("images/mute.png")';
        } else if (volume.value < 50) {
            volumeM.style.backgroundImage = 'url("images/lowVol.png")';
        }
    }, 1000);
}

document.querySelector('.volumeR').addEventListener('input', (event) => {
    if (player) {
        const volume = event.target.value;
        player.setVolume(volume);

        if(volume > 1) {
            player.unMute();
        }

    }
}); 

// Initialize / reset media buttons
function resetMediaButtons() {
    document.querySelector('.play').onclick = function() {
        const playerState = player.getPlayerState();
        if (playerState === YT.PlayerState.PLAYING) {
            player.pauseVideo();
        } else {
            player.playVideo();
        }
    };
}

document.getElementById('fullscreen').onclick = function() {
    const iframe = document.querySelector('.iframe iframe');
    const menu = document.querySelector('.settingsM');
    if (iframe) {
        if (iframe.requestFullscreen) {
            iframe.requestFullscreen();
        } else if (iframe.mozRequestFullScreen) {
            iframe.mozRequestFullScreen();
        } else if (iframe.webkitRequestFullscreen) {
            iframe.webkitRequestFullscreen();
        } else if (iframe.msRequestFullscreen) {
            iframe.msRequestFullscreen();
        }
    }
    if (menu.style.display === 'block') {
        menu.style.display = 'none';
    }
};

document.getElementById('quality').onclick = function() {
    const qualityMenu = document.querySelector('.qualityM');
    const menu = document.querySelector('.settingsM');

    if (qualityMenu.style.display === 'none' || qualityMenu.style.display === '') {
        loadQualityOptions();
        qualityMenu.style.display = 'block';
    } else {
        qualityMenu.style.display = 'none';
    }

    if (menu.style.display === 'block') {
        menu.style.display = 'none';
    }
};

document.querySelector('.settings').addEventListener('click', () => {
    const iframe = document.querySelector('.iframe iframe');
    const menu = document.querySelector('.settingsM');
    const qualityMenu = document.querySelector('.qualityM');

    if(!iframe) {
        return;
    }

    if (menu.style.display === 'none' || menu.style.display === '') {
        menu.style.display = 'block';
    } else {
        menu.style.display = 'none';
    }

    if (qualityMenu.style.display === 'block') {
        qualityMenu.style.display = 'none';
    }
});

document.querySelector('.volume').addEventListener('click', () => {
    const iframe = document.querySelector('.iframe iframe');
    const menu = document.querySelector('.volumeM');

    if(!iframe) {
        return;
    }

    if (menu.style.display === 'none' || menu.style.display === '') {
        menu.style.display = 'block';
    } else {
        menu.style.display = 'none';
    }
});

document.addEventListener('click', (event) => {
    const menu = document.querySelector('.settingsM');
    const qualityMenu = document.querySelector('.qualityM');
    const volumeMenu = document.querySelector('.volumeM');
    const settingsButton = document.querySelector('.settings');
    const qualityButton = document.getElementById('quality');
    const volumeButton = document.querySelector('.volume');

    if (!menu.contains(event.target) && !settingsButton.contains(event.target)) {
        menu.style.display = 'none';
    }
    if (!qualityMenu.contains(event.target) && !qualityButton.contains(event.target)) {
        qualityMenu.style.display = 'none';
    }
    if (!volumeMenu.contains(event.target) && !volumeButton.contains(event.target)) {
        volumeMenu.style.display = 'none';
    }
});

function loadQualityOptions() {
    const qualityMenu = document.querySelector('.qualityM');
    qualityMenu.innerHTML = '';

    if (player && player.getAvailableQualityLevels) {
        const qualityLevels = player.getAvailableQualityLevels();
        qualityLevels.forEach(level => {
            if(level.includes("hd") || level.includes("auto")) {
                const button = document.createElement('button');
                button.className = 'settingsO';
                button.textContent = level.replace("hd", "");
                button.onclick = () => {
                    player.setPlaybackQuality(level);
                    qualityMenu.style.display = 'none';
                };
                qualityMenu.appendChild(button);
            }
        });
    }
}