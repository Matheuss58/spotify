// Função auxiliar para mostrar toast notifications
function showToast(message, type = 'success') {
    const toastContainer = document.getElementById('toastContainer') || document.body;
    const existingToast = document.getElementById('app-toast');
    
    if (existingToast) {
        existingToast.remove();
    }
    
    const toast = document.createElement('div');
    toast.id = 'app-toast';
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        ${type === 'success' ? '✓' : '⚠'} 
        <span>${message}</span>
    `;
    
    toastContainer.appendChild(toast);
    
    // Auto-remover após 3 segundos
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Função para mostrar/ocultar loading
function toggleLoading(show) {
    const loadingIndicator = document.getElementById('loadingIndicator');
    if (loadingIndicator) {
        loadingIndicator.style.display = show ? 'flex' : 'none';
    }
}

// Função para lidar com erro de carregamento de imagem
function handleImageError(imgElement, songName) {
    const extensions = ['avif', 'jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'];
    let currentExtensionIndex = 0;
    
    function tryNextExtension() {
        if (currentExtensionIndex < extensions.length) {
            const ext = extensions[currentExtensionIndex++];
            imgElement.src = `musicas/covers/${songName}.${ext}?t=${Date.now()}`;
            imgElement.onerror = tryNextExtension;
        } else {
            imgElement.parentElement.innerHTML = '<div class="cover-placeholder">🎵</div>';
        }
    }
    
    tryNextExtension();
}

class MusicPlayer {
    constructor() {
        this.audio = document.getElementById('audioPlayer');
        this.playlistElement = document.getElementById('playlist');
        this.playPauseBtn = document.getElementById('playPauseBtn');
        this.playIcon = document.getElementById('playIcon');
        this.pauseIcon = document.getElementById('pauseIcon');
        this.prevBtn = document.getElementById('prevBtn');
        this.nextBtn = document.getElementById('nextBtn');
        this.shuffleBtn = document.getElementById('shuffleBtn');
        this.repeatBtn = document.getElementById('repeatBtn');
        this.resetHistoryBtn = document.getElementById('resetHistoryBtn');
        this.progressBar = document.getElementById('progressBar');
        this.progressFill = document.getElementById('progressFill');
        this.currentTimeEl = document.getElementById('currentTime');
        this.durationEl = document.getElementById('duration');
        this.nowPlayingTitle = document.getElementById('nowPlayingTitle');
        this.nowPlayingArtist = document.getElementById('nowPlayingArtist');
        this.nowPlayingCover = document.getElementById('nowPlayingCover');

        this.originalSongs = [
            'aguas-passadas.mp3',
            'cavaleiro-da-lua.mp3',
            'amores-rasos.mp3',
            'andei.mp3',
            'cansado.mp3',
            'eu-venci.mp3',
            'insuficiencia-cosmica.mp3',
            'judas.mp3',
            'melodias.mp3',
            'morte.mp3',
            'nuvens.mp3',
            'o-ciclo-odioso.mp3',
            'sacrilegio-inepto.mp3',
            'trela.mp3',
            'vivendo-o-passado.mp3',
            'querido-Deus.mp3'
        ];

        // Inicializa as estruturas de dados
        this.songs = [...this.originalSongs];
        this.playedSongs = new Set();
        this.currentSongIndex = 0;
        this.isPlaying = false;
        this.shuffleMode = false;
        this.repeatMode = false;
        this.isSeeking = false;
        this.imageExtensions = ['avif', 'jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'];
        this.cachedCovers = new Map();
        this.userInteracted = false; // Nova flag para controle de interação

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.renderPlaylist();
        this.loadSong(this.currentSongIndex, false);
        this.setupMobileControls();
        this.setupMediaSession();
        
        // Adicionar listener de interação do usuário
        this.setupUserInteraction();
    }

    setupUserInteraction() {
        // Marcar que o usuário interagiu com a página
        const interactionEvents = ['click', 'touchstart', 'keydown'];
        
        interactionEvents.forEach(event => {
            document.addEventListener(event, () => {
                this.userInteracted = true;
            }, { once: true, passive: true });
        });
    }

    setupMediaSession() {
        if ('mediaSession' in navigator) {
            const songName = this.songs[this.currentSongIndex].replace('.mp3', '');
            
            navigator.mediaSession.metadata = new MediaMetadata({
                title: songName,
                artist: "Matheus Galvão",
                artwork: [
                    { src: 'icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
                    { src: 'icons/icon-512x512.png', sizes: '512x512', type: 'image/png' }
                ]
            });

            navigator.mediaSession.setActionHandler('play', () => {
                this.togglePlayPause();
            });

            navigator.mediaSession.setActionHandler('pause', () => {
                this.togglePlayPause();
            });

            navigator.mediaSession.setActionHandler('previoustrack', () => {
                this.prevSong();
            });

            navigator.mediaSession.setActionHandler('nexttrack', () => {
                this.nextSong();
            });

            this.audio.addEventListener('play', () => {
                navigator.mediaSession.playbackState = 'playing';
            });

            this.audio.addEventListener('pause', () => {
                navigator.mediaSession.playbackState = 'paused';
            });
        }
    }

    setupEventListeners() {
        this.playPauseBtn.addEventListener('click', () => this.togglePlayPause());
        this.prevBtn.addEventListener('click', () => this.prevSong());
        this.nextBtn.addEventListener('click', () => this.nextSong());
        this.shuffleBtn.addEventListener('click', () => this.toggleShuffle());
        this.repeatBtn.addEventListener('click', () => this.toggleRepeat());
        this.resetHistoryBtn.addEventListener('click', () => this.resetHistory());
        
        // Barra de progresso melhorada
        this.progressBar.addEventListener('input', () => {
            this.isSeeking = true;
            this.seek();
        });
        
        this.progressBar.addEventListener('change', () => {
            this.isSeeking = false;
        });
        
        this.audio.addEventListener('timeupdate', () => this.updateProgress());
        this.audio.addEventListener('loadedmetadata', () => this.updateDuration());
        this.audio.addEventListener('ended', () => this.handleSongEnd());
        this.audio.addEventListener('play', () => {
            this.isPlaying = true;
            this.playIcon.style.display = 'none';
            this.pauseIcon.style.display = 'block';
            this.nowPlayingCover.classList.add('playing');
        });
        this.audio.addEventListener('pause', () => {
            this.isPlaying = false;
            this.playIcon.style.display = 'block';
            this.pauseIcon.style.display = 'none';
            this.nowPlayingCover.classList.remove('playing');
        });
        
        this.audio.addEventListener('waiting', () => {
            toggleLoading(true);
        });
        
        this.audio.addEventListener('canplay', () => {
            toggleLoading(false);
        });
        
        this.audio.addEventListener('error', (e) => {
            toggleLoading(false);
            console.error('Erro no áudio:', e);
            showToast('Erro ao carregar a música', 'error');
        });
    }

    setupMobileControls() {
        const buttons = [this.playPauseBtn, this.prevBtn, this.nextBtn, this.shuffleBtn, this.repeatBtn, this.resetHistoryBtn];
        
        buttons.forEach(btn => {
            // Touch events para mobile
            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                btn.classList.add('active');
            });
            
            btn.addEventListener('touchend', (e) => {
                e.preventDefault();
                btn.classList.remove('active');
                btn.click(); // Disparar o click normal
            });
            
            btn.addEventListener('touchcancel', (e) => {
                e.preventDefault();
                btn.classList.remove('active');
            });
        });
        
        // Melhorar a experiência de toque na playlist
        const playlistItems = this.playlistElement;
        playlistItems.addEventListener('touchstart', (e) => {
            if (e.target.closest('li')) {
                e.target.closest('li').classList.add('active');
            }
        });
        
        playlistItems.addEventListener('touchend', (e) => {
            if (e.target.closest('li')) {
                e.target.closest('li').classList.remove('active');
            }
        });
    }

    toggleShuffle() {
        this.shuffleMode = !this.shuffleMode;
        this.shuffleBtn.classList.toggle('active', this.shuffleMode);
        
        if (this.shuffleMode) {
            const currentSong = this.songs[this.currentSongIndex];
            const otherSongs = this.songs.filter((_, index) => index !== this.currentSongIndex);
            const shuffledOthers = this.shuffleArray(otherSongs);
            
            this.songs = [currentSong, ...shuffledOthers];
            this.currentSongIndex = 0;
            showToast('Modo aleatório ativado');
        } else {
            const currentSong = this.songs[this.currentSongIndex];
            this.songs = [...this.originalSongs];
            this.currentSongIndex = this.songs.indexOf(currentSong);
            showToast('Modo aleatório desativado');
        }
        
        this.renderPlaylist();
    }

    toggleRepeat() {
        this.repeatMode = !this.repeatMode;
        this.repeatBtn.classList.toggle('active', this.repeatMode);
        showToast(this.repeatMode ? 'Repetir ativado' : 'Repetir desativado');
    }

    resetHistory() {
        this.playedSongs.clear();
        this.renderPlaylist();
        showToast('Histórico reiniciado');
    }

    shuffleArray(array) {
        const newArray = [...array];
        for (let i = newArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        return newArray;
    }

    handleSongEnd() {
        this.playedSongs.add(this.songs[this.currentSongIndex]);
        
        if (this.repeatMode) {
            this.audio.currentTime = 0;
            this.safePlay();
        } else if (this.shuffleMode) {
            this.playRandomSong();
        } else {
            this.nextSong();
        }
        
        this.renderPlaylist();
    }

    playRandomSong() {
        let availableSongs = this.songs.filter(
            (song, index) => index !== this.currentSongIndex && !this.playedSongs.has(song)
        );

        if (availableSongs.length === 0) {
            this.playedSongs.clear();
            availableSongs = this.songs.filter((_, index) => index !== this.currentSongIndex);
        }

        const randomSong = availableSongs[
            Math.floor(Math.random() * availableSongs.length)
        ];
        
        const nextIndex = this.songs.indexOf(randomSong);
        this.currentSongIndex = nextIndex;
        
        this.loadSong(this.currentSongIndex);
        this.safePlay();
    }

    safePlay() {
        if (this.userInteracted) {
            const playPromise = this.audio.play();
            
            if (playPromise !== undefined) {
                playPromise
                    .then(() => {
                        // Reprodução iniciada com sucesso
                    })
                    .catch(error => {
                        console.error("Erro ao reproduzir:", error);
                        showToast('Toque para reproduzir', 'error');
                    });
            }
        } else {
            showToast('Toque em qualquer lugar para ativar o áudio', 'error');
        }
    }

    renderPlaylist() {
        this.playlistElement.innerHTML = '';
        
        this.songs.forEach((song, index) => {
            const li = document.createElement('li');
            const songName = song.replace('.mp3', '');
            const isPlayed = this.playedSongs.has(song);
            
            li.innerHTML = `
                <div class="album-cover">
                    <img src="musicas/covers/${songName}.avif" alt="${songName}" 
                         onerror="handleImageError(this, '${songName}')">
                </div>
                <div class="song-info">
                    <div class="song-title">${songName}</div>
                    <div class="song-artist">Matheus Galvão</div>
                </div>
            `;
            
            if (isPlayed) {
                li.classList.add('played');
            }
            
            if (index === this.currentSongIndex) {
                li.classList.add('current');
            }
            
            li.addEventListener('click', () => {
                this.userInteracted = true;
                this.loadSong(index);
            });
            this.playlistElement.appendChild(li);
        });
    }
    
    loadSong(index, autoplay = true) {
        this.currentSongIndex = index;
        const song = this.songs[index];
        const songName = song.replace('.mp3', '');
        
        toggleLoading(true);
        
        this.audio.src = `musicas/${song}`;
        this.audio.load();
        
        this.nowPlayingTitle.textContent = songName;
        this.nowPlayingArtist.textContent = 'Matheus Galvão';
        
        this.updateAlbumCover(songName);
        
        const items = this.playlistElement.querySelectorAll('li');
        items.forEach((item, i) => {
            item.classList.toggle('current', i === index);
        });
        
        items[index]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        
        this.setupMediaSession();
        
        if (this.isPlaying && autoplay) {
            this.safePlay();
        } else {
            toggleLoading(false);
        }
    }

    updateAlbumCover(songName) {
        if (this.cachedCovers.has(songName)) {
            const imgUrl = this.cachedCovers.get(songName);
            this.setNowPlayingCover(imgUrl);
            return;
        }
        
        const img = new Image();
        let currentExtensionIndex = 0;
        
        const tryNextExtension = () => {
            if (currentExtensionIndex < this.imageExtensions.length) {
                const ext = this.imageExtensions[currentExtensionIndex++];
                img.src = `musicas/covers/${songName}.${ext}`;
            } else {
                this.nowPlayingCover.innerHTML = '<div class="cover-placeholder">🎵</div>';
                this.cachedCovers.set(songName, null);
            }
        };
        
        img.onload = () => {
            this.setNowPlayingCover(img.src);
            this.cachedCovers.set(songName, img.src);
        };
        
        img.onerror = tryNextExtension;
        
        tryNextExtension();
    }
    
    setNowPlayingCover(src) {
        if (!src) {
            this.nowPlayingCover.innerHTML = '<div class="cover-placeholder">🎵</div>';
            return;
        }
        
        let img = this.nowPlayingCover.querySelector('img');
        if (!img) {
            img = document.createElement('img');
            this.nowPlayingCover.innerHTML = '';
            this.nowPlayingCover.appendChild(img);
        }
        img.src = src;
    }

    togglePlayPause() {
        this.userInteracted = true;
        
        if (this.audio.paused) {
            const playPromise = this.audio.play();
            
            if (playPromise !== undefined) {
                playPromise
                    .then(() => {
                        // Reprodução iniciada com sucesso
                    })
                    .catch(error => {
                        console.error("Erro ao reproduzir:", error);
                        showToast('Toque para reproduzir', 'error');
                    });
            }
        } else {
            this.audio.pause();
        }
    }

    prevSong() {
        this.userInteracted = true;
        let prevIndex = this.currentSongIndex - 1;
        if (prevIndex < 0) prevIndex = this.songs.length - 1;
        
        this.loadSong(prevIndex);
        if (this.isPlaying) {
            this.safePlay();
        }
    }

    nextSong() {
        this.userInteracted = true;
        let nextIndex = this.currentSongIndex + 1;
        if (nextIndex >= this.songs.length) nextIndex = 0;
        
        this.loadSong(nextIndex);
        if (this.isPlaying) {
            this.safePlay();
        }
    }

    updateProgress() {
        if (!this.isSeeking && !isNaN(this.audio.duration)) {
            const progress = (this.audio.currentTime / this.audio.duration) * 100;
            this.progressBar.value = progress;
            this.progressFill.style.width = `${progress}%`;
            this.currentTimeEl.textContent = this.formatTime(this.audio.currentTime);
        }
    }

    updateDuration() {
        if (!isNaN(this.audio.duration)) {
            this.durationEl.textContent = this.formatTime(this.audio.duration);
        }
    }

    seek() {
        const seekTime = (this.progressBar.value / 100) * this.audio.duration;
        this.audio.currentTime = seekTime;
    }

    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
    }
}

// Inicializar o player quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    if (!window.AudioContext && !window.webkitAudioContext) {
        showToast('Seu navegador não suporta reprodução de áudio', 'error');
    }
    
    window.musicPlayer = new MusicPlayer();
    
    // Adicionar instrução de toque para mobile
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) {
        showToast('Toque em qualquer lugar para ativar o áudio');
    }
});

// Registrar o service worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        navigator.serviceWorker.register('./service-worker.js')
            .then(function(registration) {
                console.log('ServiceWorker registrado com sucesso: ', registration.scope);
            })
            .catch(function(error) {
                console.log('Falha no registro do ServiceWorker: ', error);
            });
    });
}

// Verificar status de conectividade
function checkOnlineStatus() {
  if (!navigator.onLine) {
    showToast('Modo offline ativado', 'info');
    
    // Verificar se os recursos estão em cache
    caches.has(CACHE_NAME).then(hasCache => {
      if (!hasCache) {
        showToast('Alguns recursos podem não estar disponíveis offline', 'error');
      }
    });
  }
}

// Listeners para mudança de status de rede
window.addEventListener('online', () => {
  showToast('Conexão restaurada');
});

window.addEventListener('offline', () => {
  showToast('Modo offline ativado', 'info');
});

// Verificar status inicial
checkOnlineStatus();

// Função para atualizar o cache manualmente
async function updateCache() {
  if ('caches' in window) {
    try {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll([...urlsToCache, ...musicFiles, ...coverFiles]);
      showToast('Cache atualizado com sucesso');
    } catch (error) {
      showToast('Erro ao atualizar cache', 'error');
    }
  }
}

// Chamar esta função quando o usuário estiver online
if (navigator.onLine) {
  updateCache();
}