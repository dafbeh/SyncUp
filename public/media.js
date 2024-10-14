
// Functionality for seek bar
document.querySelector('.seekBar').addEventListener('input', (event) => {
    const seekTime = event.target.value;
    if (player) {
        player.seekTo(seekTime, true);
    }
});

function updateSeek() {
    const seek = document.querySelector('.seekBar');
    setInterval(() => {
        if(player) {
            seek.value = player.getCurrentTime();
        }
    }, 500);
}

// Functionality for volume options
function updateVolume() {
    const volume = document.querySelector('.volume');
    setInterval(() => {
        if(player && !player.isMuted()) {
            volume.value = player.getVolume();
        } else if (player.isMuted) {
            volume.value = 0;
        }
    }, 1000);
}

document.querySelector('.volume').addEventListener('input', (event) => {
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

    document.querySelector('.fullscreen').onclick = function() {
        const iframe = document.querySelector('.iframe iframe');
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
    };
}

document.querySelector('.settings').addEventListener('click', () => {
    const menu = document.querySelector('.settingsM');
    if (menu.style.display === 'none' || menu.style.display === '') {
        menu.style.display = 'block';
    } else {
        menu.style.display = 'none';
    }
});

// Hide the menu when clicking outside of it
document.addEventListener('click', (event) => {
    const menu = document.querySelector('.settingsM');
    const button = document.querySelector('.settings');
    if (!menu.contains(event.target) && !button.contains(event.target)) {
        menu.style.display = 'none';
    }
});
