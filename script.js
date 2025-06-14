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

// Nome do cache para armazenamento offline
const CACHE_NAME = 'musicas-offline-v1';

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
async function playSong(index) {
    if (index >= 0 && index < songs.length) {
        currentSongIndex = index;
        const song = songs[index];
        const baseName = song.replace('.mp3', '');
        
        updateNowPlayingUI(baseName);
        
        const songUrl = `musicas/${song}`;
        
        // Verifica se está offline e se a música está no cache
        if (!navigator.onLine) {
            try {
                const cache = await caches.open(CACHE_NAME);
                const response = await cache.match(songUrl);
                
                if (response) {
                    const blob = await response.blob();
                    audioPlayer.src = URL.createObjectURL(blob);
                    audioPlayer.play().catch(e => console.error("Erro ao reproduzir offline:", e));
                } else {
                    alert('Esta música não está disponível offline.');
                    // Marca a música como não disponível
                    const items = playlistElement.getElementsByTagName('li');
                    if (items[index]) {
                        items[index].classList.add('not-cached');
                    }
                    return;
                }
            } catch (error) {
                console.error("Erro ao acessar cache:", error);
                alert('Erro ao carregar música offline.');
                return;
            }
        } else {
            // Online - comportamento normal
            audioPlayer.src = songUrl;
            audioPlayer.load();
            audioPlayer.play().catch(e => console.error("Erro ao reproduzir:", e));
            
            // Armazena no cache para uso futuro offline
            cacheSong(songUrl);
        }
    }
}

// Armazena uma música no cache
async function cacheSong(songUrl) {
    try {
        const response = await fetch(songUrl);
        if (response.ok) {
            const clone = response.clone();
            const cache = await caches.open(CACHE_NAME);
            await cache.put(songUrl, clone);
        }
    } catch (error) {
        console.error("Erro ao armazenar música no cache:", error);
    }
}

// Atualiza a interface com a música atual
function updateNowPlayingUI(baseName) {
    nowPlayingTitle.textContent = baseName;
    nowPlayingArtist.textContent = 'Matheus Galvão';
    loadAlbumCover(baseName);
    highlightCurrentSong();
}

function loadAlbumCover(baseName) {
    // Limpa o conteúdo atual
    nowPlayingCover.innerHTML = '';
    
    const img = document.createElement('img');
    img.alt = `Capa de ${baseName}`;
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'cover';
    img.style.borderRadius = '5px';
    
    const extensions = ['jpeg', 'jpg', 'png', 'gif', 'webp', 'avif'];
    let currentExtensionIndex = 0;
    
    function tryNextExtension() {
        if (currentExtensionIndex < extensions.length) {
            const ext = extensions[currentExtensionIndex++];
            img.src = `musicas/covers/${baseName}.${ext}?${Date.now()}`;
        } else {
            // Fallback quando nenhuma imagem é encontrada
            nowPlayingCover.innerHTML = '🎵';
            nowPlayingCover.style.fontSize = '24px';
            nowPlayingCover.style.display = 'flex';
            nowPlayingCover.style.alignItems = 'center';
            nowPlayingCover.style.justifyContent = 'center';
        }
    }
    
    // Configura os event listeners
    img.onload = () => {
        // Remove qualquer conteúdo fallback que possa existir
        nowPlayingCover.innerHTML = '';
        nowPlayingCover.appendChild(img);
    };
    
    img.onerror = tryNextExtension;
    
    // Inicia o processo de tentar carregar a imagem
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
        showInstallButton(true);
    }
});

window.addEventListener('appinstalled', () => {
    const installBtn = document.getElementById('installPWAButton');
    if (installBtn) {
        installBtn.remove();
    }
    deferredPrompt = null;
});

function showInstallButton(supportsOffline = false) {
    if (document.getElementById('installPWAButton')) {
        return;
    }

    const installBtn = document.createElement('button');
    installBtn.id = 'installPWAButton';
    installBtn.innerHTML = supportsOffline 
        ? '📲 Instalar App (funciona offline)' 
        : '📲 Instalar App';
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

// Verifica suporte offline e atualiza a UI
function updateOnlineStatus() {
    if (navigator.onLine) {
        console.log('Online');
        document.body.classList.remove('offline');
    } else {
        console.log('Offline');
        document.body.classList.add('offline');
        showOfflineMessage();
    }
}

function showOfflineMessage() {
    const existingMsg = document.getElementById('offline-message');
    if (existingMsg) return;
    
    const msg = document.createElement('div');
    msg.id = 'offline-message';
    msg.textContent = 'Você está offline. Apenas músicas já reproduzidas estão disponíveis.';
    msg.style.position = 'fixed';
    msg.style.bottom = '70px';
    msg.style.left = '20px';
    msg.style.right = '20px';
    msg.style.backgroundColor = '#ff9800';
    msg.style.color = 'white';
    msg.style.padding = '10px';
    msg.style.borderRadius = '5px';
    msg.style.zIndex = '1000';
    msg.style.textAlign = 'center';
    msg.style.animation = 'fadeIn 0.3s ease-in-out';
    
    document.body.appendChild(msg);
    
    setTimeout(() => {
        msg.style.opacity = '0';
        setTimeout(() => msg.remove(), 500);
    }, 5000);
}

// Pré-cache de músicas quando online
async function preCacheSongs() {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller && navigator.onLine) {
        try {
            const cache = await caches.open(CACHE_NAME);
            
            // Cache básico de recursos primeiro
            await cache.addAll([
                '/',
                '/index.html',
                '/style.css',
                '/script.js',
                '/icon-192.png',
                '/icon-512.png'
            ]);
            
            // Cache de músicas (opcional - pode consumir muita banda)
            // for (const song of songs) {
            //     const songUrl = `musicas/${song}`;
            //     try {
            //         await cache.add(songUrl);
            //     } catch (error) {
            //         console.error(`Erro ao armazenar ${song} no cache:`, error);
            //     }
            // }
        } catch (error) {
            console.error("Erro ao pré-armazenar no cache:", error);
        }
    }
}

// Event listeners para status de conexão
window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);
updateOnlineStatus(); // Verifica o status inicial

// Inicia o player quando a página carrega
window.addEventListener('load', () => {
    // Registra o Service Worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('ServiceWorker registrado com sucesso:', registration.scope);
                // Pré-cache após registro bem-sucedido
                preCacheSongs();
            })
            .catch(error => {
                console.log('Falha no registro do ServiceWorker:', error);
            });
    }
    
    loadSongs();
});