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

// Melhora a resposta tátil nos botões
const buttons = document.querySelectorAll('button');
buttons.forEach(btn => {
    btn.addEventListener('touchstart', () => {
        btn.style.transform = 'scale(0.95)';
    });
    btn.addEventListener('touchend', () => {
        btn.style.transform = 'scale(1)';
    });
});

// Previne o zoom indesejado com toque duplo
document.addEventListener('dblclick', (e) => {
    e.preventDefault();

}, { passive: false });
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
    'vivendo o passado.mp3',
];

function loadSongs() {
    renderPlaylist();
    if (songs.length > 0) {
        playSong(0);
    }
}

function playSong(index) {
    if (index >= 0 && index < songs.length) {
        currentSongIndex = index;
        const song = songs[index];
        const baseName = song.replace('.mp3', '');
        
        // Atualiza imediatamente a interface
        updateNowPlayingUI(baseName);
        
        audioPlayer.src = `musicas/${song}`;
        audioPlayer.load(); // Força o carregamento antes de tocar
        audioPlayer.play()
            .then(() => {
                playPauseBtn.textContent = '⏸';
            })
            .catch(e => console.error("Erro ao reproduzir:", e));
    }
}

function updateNowPlayingUI(baseName) {
    nowPlayingTitle.textContent = baseName;
    nowPlayingArtist.textContent = 'Matheus Galvão';
    loadAlbumCover(baseName);
    highlightCurrentSong();
}

function loadAlbumCover(baseName) {
    nowPlayingCover.innerHTML = '';
    const img = document.createElement('img');
    
    // Lista de extensões que serão testadas
    const extensions = ['jpeg', 'jpg', 'png', 'gif', 'webp', 'avif'];
    let currentExtensionIndex = 0;
    
    function tryNextExtension() {
        if (currentExtensionIndex < extensions.length) {
            const ext = extensions[currentExtensionIndex++];
            img.src = `musicas/covers/${baseName}.${ext}`;
        } else {
            // Se nenhuma extensão funcionar, mostra ícone padrão
            nowPlayingCover.innerHTML = '🎵';
            nowPlayingCover.style.fontSize = '24px';
            nowPlayingCover.style.display = 'flex';
            nowCover.style.alignItems = 'center';
            nowCover.style.justifyContent = 'center';
        }
    }
    
    img.alt = `Capa de ${baseName}`;
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'cover';
    img.style.borderRadius = '5px';
    
    img.onload = function() {
        // Se a imagem carregar com sucesso
        nowPlayingCover.appendChild(img);
    };
    
    img.onerror = function() {
        // Se der erro, tenta a próxima extensão
        tryNextExtension();
    };
    
    // Começa tentando a primeira extensão
    tryNextExtension();
    
    nowPlayingCover.appendChild(img);
}

function renderPlaylist() {
    playlistElement.innerHTML = '';
    songs.forEach((song, index) => {
        const li = document.createElement('li');
        const baseName = song.replace('.mp3', '');
        
        const albumCover = document.createElement('div');
        albumCover.className = 'album-cover';
        
        const img = document.createElement('img');
        img.alt = 'Capa do álbum';
        
        // Mesma lógica de tentar várias extensões
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

function highlightCurrentSong() {
    const items = playlistElement.getElementsByTagName('li');
    for (let i = 0; i < items.length; i++) {
        items[i].className = i === currentSongIndex ? 'current' : '';
    }
    
    // Rolagem automática para a música atual
    if (items[currentSongIndex]) {
        items[currentSongIndex].scrollIntoView({
            behavior: 'smooth',
            block: 'center' // Isso mantém a música no centro da visualização
        });
    }
}

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
}

// Event Listeners
shuffleBtn.addEventListener('click', () => {
    isShuffleMode = !isShuffleMode;
    shuffleBtn.classList.toggle('active', isShuffleMode);
});

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
        do {
            nextIndex = Math.floor(Math.random() * songs.length);
        } while (nextIndex === currentSongIndex && songs.length > 1);
    } else {
        nextIndex = (currentSongIndex + 1) % songs.length;
    }
    
    playSong(nextIndex);
});

audioPlayer.addEventListener('play', () => {
    highlightCurrentSong();
    const song = songs[currentSongIndex];
    const baseName = song.replace('.mp3', '');
    nowPlayingTitle.textContent = baseName;
    nowPlayingArtist.textContent = 'Matheus Galvão';
    loadAlbumCover(baseName);
});

progressBar.addEventListener('input', () => {
    const seekTime = (progressBar.value / 100) * audioPlayer.duration;
    audioPlayer.currentTime = seekTime;
    document.getElementById('progressFill').style.width = `${progressBar.value}%`;
});

playPauseBtn.addEventListener('click', (e) => {
    e.preventDefault(); // Impede comportamentos padrão
    
    if (audioPlayer.paused) {
        audioPlayer.play();
        playPauseBtn.innerHTML = '<span style="font-size:24px">⏸</span>';
    } else {
        audioPlayer.pause();
        playPauseBtn.innerHTML = '<span style="font-size:24px">▶</span>';
    }
    
    // Força repaint para evitar artefatos visuais
    playPauseBtn.style.transform = 'scale(0.98)';
    setTimeout(() => {
        playPauseBtn.style.transform = 'scale(1)';
    }, 100);

    // No JavaScript, substitua os emojis por:
playPauseBtn.innerHTML = `
    <svg viewBox="0 0 24 24" width="24" height="24">
        <path fill="currentColor" d="M8 5v14l11-7z"/>
    </svg>
`;
// E para pause:
playPauseBtn.innerHTML = `
    <svg viewBox="0 0 24 24" width="24" height="24">
        <path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
    </svg>
`;
});

document.getElementById('prevBtn').onclick = () => {
    const prevIndex = (currentSongIndex - 1 + songs.length) % songs.length;
    playSong(prevIndex);
};

document.getElementById('nextBtn').onclick = () => {
    const nextIndex = (currentSongIndex + 1) % songs.length;
    playSong(nextIndex);
};

// Inicia o player
loadSongs();