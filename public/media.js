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

// Functionality for seek bar
document.querySelector('#seekBar').addEventListener('input', (event) => {
  const seekTime = event.target.value
  if (player) {
    player.seekTo(seekTime, true)
  }
})

function updateSeek() {
  const seek = document.querySelector('#seekBar')
  const time = document.querySelector('#time')

  setInterval(() => {
    if (player) {
      seek.value = player.getCurrentTime()
      time.textContent =
        '-' + timeLeft(player.getCurrentTime(), player.getDuration())
    }
  }, 500)
}

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

// Functionality for volume options
function updateVolume() {
  const volume = document.querySelector('#volumeR')
  const volumeM = document.querySelector('#volumeSvg')
  setInterval(() => {
    if (player && !player.isMuted()) {
      volume.value = player.getVolume()
    } else if (player.isMuted()) {
      volume.value = 0
    }

    if (volume.value >= 50) {
      volumeM.setAttribute(
        'd',
        'M7.093 15H4.5A1.5 1.5 0 0 1 3 13.5v-3A1.5 1.5 0 0 1 4.5 9h2.593l5.181-5.469C12.896 2.875 14 3.315 14 4.22v15.562c0 .904-1.104 1.344-1.726.688L7.093 15zm12.978 4.07a1 1 0 1 1-1.414-1.413A7.97 7.97 0 0 0 21 12a7.97 7.97 0 0 0-2.343-5.656 1 1 0 1 1 1.415-1.415A9.97 9.97 0 0 1 23 12a9.97 9.97 0 0 1-2.929 7.07zm-3.673-3.269a1 1 0 0 0 1.4-.198A5.978 5.978 0 0 0 19 12a5.977 5.977 0 0 0-1.197-3.596 1 1 0 0 0-1.6 1.2c.515.686.797 1.518.797 2.396 0 .88-.284 1.714-.8 2.401a1 1 0 0 0 .198 1.4z'
      )
      console.log('high vol')
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
  }, 1000)
}

document.querySelector('#volumeR').addEventListener('input', (event) => {
  if (player) {
    const volume = event.target.value
    player.setVolume(volume)

    if (volume > 1) {
      player.unMute()
    }
  }
})

// Initialize / reset media buttons
function resetMediaButtons() {
  document.querySelector('#play').onclick = function () {
    const playerState = player.getPlayerState()
    if (playerState === YT.PlayerState.PLAYING) {
      player.pauseVideo()
    } else {
      player.playVideo()
    }
  }
}

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
  const settingsMenu = document.querySelector('#settingsM')
  const qualityMenu = document.querySelector('#qualityM')
  const volumeMenu = document.querySelector('#volumeM')
  const settingsButton = document.querySelector('#settings')
  const qualityButton = document.getElementById('quality')
  const volumeButton = document.querySelector('#volume')

  if ( // Volume menu
    !volumeMenu.contains(event.target) &&
    !volumeButton.contains(event.target)
  ) {
    volumeMenu.style.display = 'none';
  }

  if ( // Settings menu
    !settingsMenu.contains(event.target) &&
    !settingsButton.contains(event.target)
  ) {
    settingsMenu.style.display = 'none'
  }

  if ( // Quality menu
    !qualityMenu.contains(event.target) &&
    !qualityButton.contains(event.target)
  ) {
    qualityMenu.style.display = 'none'
  }
})

function loadQualityOptions() {
  const qualityMenu = document.querySelector('#qualityM')
  qualityMenu.innerHTML = ''

  if (player && player.getAvailableQualityLevels) {
    const qualityLevels = player.getAvailableQualityLevels()
    
    qualityLevels.forEach((level) => {
      if (level.includes('hd') || level.includes('auto')) {
        const button = document.createElement('qualityO');
        
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
