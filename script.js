const audioPlayer = document.getElementById('audioPlayer');
const playlistElement = document.getElementById('playlist');
const playPauseBtn = document.getElementById('playPauseBtn');
const progressBar = document.getElementById('progressBar');
const currentTimeEl = document.getElementById('currentTime');
const durationEl = document.getElementById('duration');
const nowPlayingTitle = document.getElementById('nowPlayingTitle');
const nowPlayingArtist = document.getElementById('nowPlayingArtist');
const nowPlayingCover = document.getElementById('nowPlayingCover');
const shuffleBtn = document.getElementById('shuffleBtn');

// Ícones SVG para play/pause
const PLAY_ICON = `
    <svg viewBox="0 0 24 24" width="24" height="24">
        <path fill="currentColor" d="M8 5v14l11-7z"/>
    </svg>
`;

const PAUSE_ICON = `
    <svg viewBox="0 0 24 24" width="24" height="24">
        <path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
    </svg>
`;

// Inicializa o botão com o ícone de play
playPauseBtn.innerHTML = PLAY_ICON;

// Configuração inicial
let isShuffleMode = false;
let currentSongIndex = 0;
const songs = [
    'xeque-mate.mp3',
    'olhos vazios.mp3',
    'akuma no mi.mp3',
    'aguas passadas.mp3',
    'amores rasos.mp3',
    'andei.mp3',
    'cansado.mp3',
    'eu venci.mp3',
    'gato da caixa.mp3',
    'insuficiencia cosmica.mp3',
    'judas.mp3',
    'morte.mp3',
    'nuvens.mp3',
    'o ciclo odioso.mp3',
    'sacrilegio inepto.mp3',
    'sozin.mp3',
    'trela.mp3',
    'vivendo o passado.mp3'
];

// Função para carregar e exibir a playlist
function loadSongs() {
    renderPlaylist();
    if (songs.length > 0) {
        playSong(0);
    }
}

// Função para tocar uma música específica
function playSong(index) {
    if (index >= 0 && index < songs.length) {
        currentSongIndex = index;
        const song = songs[index];
        const baseName = song.replace('.mp3', '');
    
        updateNowPlayingUI(baseName);
        
        audioPlayer.src = `musicas/${song}`;
        audioPlayer.load();
        audioPlayer.play().catch(e => console.error("Erro ao reproduzir:", e));
    }
}

// Atualiza a interface com a música atual
function updateNowPlayingUI(baseName) {
    nowPlayingTitle.textContent = baseName;
    nowPlayingArtist.textContent = 'Matheus Galvão';
    loadAlbumCover(baseName);
    highlightCurrentSong();
}

// Carrega a capa do álbum
function loadAlbumCover(baseName) {
    nowPlayingCover.innerHTML = '';
    const img = document.createElement('img');
    
    const extensions = ['jpeg', 'jpg', 'png', 'gif', 'webp', 'avif'];
    let currentExtensionIndex = 0;
    
    function tryNextExtension() {
        if (currentExtensionIndex < extensions.length) {
            const ext = extensions[currentExtensionIndex++];
            img.src = `musicas/covers/${baseName}.${ext}?${Date.now()}`;
        } else {
            nowPlayingCover.innerHTML = '🎵';
            nowPlayingCover.style.fontSize = '24px';
            nowPlayingCover.style.display = 'flex';
            nowPlayingCover.style.alignItems = 'center';
            nowPlayingCover.style.justifyContent = 'center';
        }
    }
    
    img.alt = `Capa de ${baseName}`;
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'cover';
    img.style.borderRadius = '5px';
    
    img.onload = () => {
        nowPlayingCover.innerHTML = '';
        nowPlayingCover.appendChild(img);
    };
    img.onerror = tryNextExtension;
    
    tryNextExtension();
}

// Renderiza a lista de músicas
function renderPlaylist() {
    playlistElement.innerHTML = '';
    songs.forEach((song, index) => {
        const li = document.createElement('li');
        const baseName = song.replace('.mp3', '');
        
        const albumCover = document.createElement('div');
        albumCover.className = 'album-cover';
        
        const img = document.createElement('img');
        img.alt = 'Capa do álbum';
        
        const extensions = ['jpeg', 'jpg', 'png', 'gif', 'webp', 'avif'];
        let currentExtIndex = 0;
        
        function tryExtension() {
            if (currentExtIndex < extensions.length) {
                const ext = extensions[currentExtIndex++];
                img.src = `musicas/covers/${baseName}.${ext}`;
            } else {
                albumCover.innerHTML = '🎵';
                albumCover.style.fontSize = '24px';
            }
        }
        
        img.onerror = tryExtension;
        tryExtension();
        
        albumCover.appendChild(img);
        
        const songInfo = document.createElement('div');
        songInfo.className = 'song-info';
        songInfo.innerHTML = `
            <div class="song-title">${baseName}</div>
            <div class="song-artist">Matheus Galvão</div>
        `;
        
        li.appendChild(albumCover);
        li.appendChild(songInfo);
        li.className = index === currentSongIndex ? 'current' : '';
        li.onclick = () => playSong(index);
        playlistElement.appendChild(li);
    });
}

// Destaca a música atual na playlist
function highlightCurrentSong() {
    const items = playlistElement.getElementsByTagName('li');
    for (let i = 0; i < items.length; i++) {
        items[i].className = i === currentSongIndex ? 'current' : '';
    }
    
    if (items[currentSongIndex]) {
        items[currentSongIndex].scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });
    }
}

// Formata o tempo (mm:ss)
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
}

// Evento do botão shuffle
shuffleBtn.addEventListener('click', () => {
    isShuffleMode = !isShuffleMode;
    shuffleBtn.classList.toggle('active', isShuffleMode);
    
    // Feedback visual
    shuffleBtn.style.transform = 'scale(1.1)';
    setTimeout(() => {
        shuffleBtn.style.transform = 'scale(1)';
    }, 200);
});

// Eventos do player de áudio
audioPlayer.addEventListener('timeupdate', () => {
    if (!isNaN(audioPlayer.duration)) {
        const progress = (audioPlayer.currentTime / audioPlayer.duration) * 100;
        progressBar.value = progress;
        document.getElementById('progressFill').style.width = `${progress}%`;
        currentTimeEl.textContent = formatTime(audioPlayer.currentTime);
    }
});

audioPlayer.addEventListener('loadedmetadata', () => {
    durationEl.textContent = formatTime(audioPlayer.duration);
});

audioPlayer.addEventListener('ended', () => {
    let nextIndex;
    
    if (isShuffleMode) {
        const availableIndices = [...Array(songs.length).keys()];
        
        if (songs.length > 1) {
            availableIndices.splice(currentSongIndex, 1);
        }
        
        nextIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];
    } else {
        nextIndex = (currentSongIndex + 1) % songs.length;
    }
    
    playSong(nextIndex);
});

audioPlayer.addEventListener('play', () => {
    playPauseBtn.innerHTML = PAUSE_ICON;
    highlightCurrentSong();
});

audioPlayer.addEventListener('pause', () => {
    playPauseBtn.innerHTML = PLAY_ICON;
});

progressBar.addEventListener('input', () => {
    const seekTime = (progressBar.value / 100) * audioPlayer.duration;
    audioPlayer.currentTime = seekTime;
    document.getElementById('progressFill').style.width = `${progressBar.value}%`;
});

// Controles do player
playPauseBtn.addEventListener('click', (e) => {
    e.preventDefault();
    
    if (audioPlayer.paused) {
        audioPlayer.play();
    } else {
        audioPlayer.pause();
    }
    
    playPauseBtn.style.transform = 'scale(0.95)';
    setTimeout(() => {
        playPauseBtn.style.transform = 'scale(1)';
    }, 100);
});

document.getElementById('prevBtn').addEventListener('click', () => {
    const prevIndex = (currentSongIndex - 1 + songs.length) % songs.length;
    playSong(prevIndex);
});

document.getElementById('nextBtn').addEventListener('click', () => {
    const nextIndex = (currentSongIndex + 1) % songs.length;
    playSong(nextIndex);
});

// Melhora a resposta tátil nos botões
document.querySelectorAll('#prevBtn, #nextBtn, #shuffleBtn, #playPauseBtn').forEach(btn => {
    btn.addEventListener('touchstart', () => {
        btn.style.transform = 'scale(0.9)';
    });
    btn.addEventListener('touchend', () => {
        btn.style.transform = 'scale(1)';
    });
});

// Previne o zoom indesejado com toque duplo
document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });

// PWA Installation
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    
    if (!window.matchMedia('(display-mode: standalone)').matches) {
        showInstallButton();
    }
});

window.addEventListener('appinstalled', () => {
    const installBtn = document.getElementById('installPWAButton');
    if (installBtn) {
        installBtn.remove();
    }
    deferredPrompt = null;
});

function showInstallButton() {
    if (document.getElementById('installPWAButton')) {
        return;
    }

    const installBtn = document.createElement('button');
    installBtn.id = 'installPWAButton';
    installBtn.textContent = 'Instalar App';
    installBtn.style.position = 'fixed';
    installBtn.style.bottom = '20px';
    installBtn.style.right = '20px';
    installBtn.style.zIndex = '1000';
    installBtn.style.padding = '10px 20px';
    installBtn.style.backgroundColor = '#1DB954';
    installBtn.style.color = 'white';
    installBtn.style.border = 'none';
    installBtn.style.borderRadius = '5px';
    installBtn.style.fontWeight = 'bold';
    installBtn.style.boxShadow = '0 2px 10px rgba(0,0,0,0.3)';
  
    installBtn.addEventListener('click', () => {
        installBtn.style.display = 'none';
        deferredPrompt.prompt();
        
        deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                console.log('Usuário aceitou a instalação');
            } else {
                console.log('Usuário rejeitou a instalação');
            }
            deferredPrompt = null;
        });
    });
  
    document.body.appendChild(installBtn);
}

// Inicia o player
loadSongs();