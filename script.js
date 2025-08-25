// Função auxiliar para mostrar toast notifications
function showToast(message, type = 'success') {
    // Remover toast existente se houver
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
    
    document.body.appendChild(toast);
    
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
            // Adicionar timestamp para evitar cache
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

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.renderPlaylist();
        this.loadSong(this.currentSongIndex, false);
        this.setupMobileControls();
        this.setupMediaSession();
        
        // Pré-carregar a próxima música
        this.preloadNextSong();
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
                this.audio.play().catch(e => console.error("Erro ao reproduzir:", e));
                this.isPlaying = true;
            });

            navigator.mediaSession.setActionHandler('pause', () => {
                this.audio.pause();
                this.isPlaying = false;
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
        
        // Eventos de teclado para controles
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                this.togglePlayPause();
            } else if (e.code === 'ArrowRight') {
                this.nextSong();
            } else if (e.code === 'ArrowLeft') {
                this.prevSong();
            }
        });
    }

    setupMobileControls() {
        const buttons = [this.playPauseBtn, this.prevBtn, this.nextBtn, this.shuffleBtn, this.repeatBtn, this.resetHistoryBtn];
        
        buttons.forEach(btn => {
            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                btn.style.transform = 'scale(0.9)';
            });
            
            btn.addEventListener('touchend', (e) => {
                e.preventDefault();
                btn.style.transform = 'scale(1)';
            });
            
            btn.addEventListener('touchcancel', (e) => {
                e.preventDefault();
                btn.style.transform = 'scale(1)';
            });
        });
    }

    toggleShuffle() {
        this.shuffleMode = !this.shuffleMode;
        this.shuffleBtn.classList.toggle('active', this.shuffleMode);
        
        if (this.shuffleMode) {
            // Embaralha a lista de músicas, mantendo a atual no mesmo lugar
            const currentSong = this.songs[this.currentSongIndex];
            const otherSongs = this.songs.filter((_, index) => index !== this.currentSongIndex);
            const shuffledOthers = this.shuffleArray(otherSongs);
            
            this.songs = [currentSong, ...shuffledOthers];
            this.currentSongIndex = 0;
            showToast('Modo aleatório ativado');
        } else {
            // Retorna à ordem original, mantendo a música atual
            const currentSong = this.songs[this.currentSongIndex];
            this.songs = [...this.originalSongs];
            this.currentSongIndex = this.songs.indexOf(currentSong);
            showToast('Modo aleatório desativado');
        }
        
        this.renderPlaylist();
        this.preloadNextSong();
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
        
        // Feedback visual
        this.resetHistoryBtn.style.transform = 'scale(0.9)';
        setTimeout(() => {
            this.resetHistoryBtn.style.transform = 'scale(1)';
        }, 100);
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
            // Repete a mesma música
            this.audio.currentTime = 0;
            this.audio.play().catch(e => console.error("Erro ao reproduzir:", e));
        } else if (this.shuffleMode) {
            this.playRandomSong();
        } else {
            this.nextSong();
        }
        
        this.renderPlaylist();
    }

    playRandomSong() {
        // Filtra músicas que ainda não foram reproduzidas
        let availableSongs = this.songs.filter(
            (song, index) => index !== this.currentSongIndex && !this.playedSongs.has(song)
        );

        // Se todas as músicas já foram reproduzidas, reseta
        if (availableSongs.length === 0) {
            this.playedSongs.clear();
            availableSongs = this.songs.filter
            availableSongs = this.songs.filter((_, index) => index !== this.currentSongIndex);
        }

        const randomSong = availableSongs[
            Math.floor(Math.random() * availableSongs.length)
        ];
        
        const nextIndex = this.songs.indexOf(randomSong);
        this.currentSongIndex = nextIndex;
        
        this.loadSong(this.currentSongIndex);
        this.audio.play().catch(e => console.error("Erro ao reproduzir:", e));
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
            
            li.addEventListener('click', () => this.loadSong(index));
            this.playlistElement.appendChild(li);
        });
    }
    
    loadSong(index, autoplay = true) {
        this.currentSongIndex = index;
        const song = this.songs[index];
        const songName = song.replace('.mp3', '');
        
        // Mostrar loading enquanto carrega
        toggleLoading(true);
        
        // Pré-carregar a música
        this.audio.src = `musicas/${song}?t=${Date.now()}`;
        this.audio.load();
        
        this.nowPlayingTitle.textContent = songName;
        this.nowPlayingArtist.textContent = 'Matheus Galvão';
        
        // Atualizar a capa do álbum
        this.updateAlbumCover(songName);
        
        // Atualizar a playlist para destacar a música atual
        const items = this.playlistElement.querySelectorAll('li');
        items.forEach((item, i) => {
            item.classList.toggle('current', i === index);
        });
        
        // Rolar para a música atual na playlist
        items[index]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        
        // Atualizar Media Session
        this.setupMediaSession();
        
        // Pré-carregar a próxima música
        this.preloadNextSong();
        
        // Reproduzir se estiver no modo de reprodução
        if (this.isPlaying && autoplay) {
            const playPromise = this.audio.play();
            
            if (playPromise !== undefined) {
                playPromise
                    .then(() => {
                        toggleLoading(false);
                    })
                    .catch(error => {
                        toggleLoading(false);
                        console.error("Erro ao reproduzir:", error);
                    });
            }
        } else {
            toggleLoading(false);
        }
    }

    updateAlbumCover(songName) {
        // Verificar se já temos a imagem em cache
        if (this.cachedCovers.has(songName)) {
            const imgUrl = this.cachedCovers.get(songName);
            this.setNowPlayingCover(imgUrl);
            return;
        }
        
        // Tentar carregar a imagem
        const img = new Image();
        let currentExtensionIndex = 0;
        
        const tryNextExtension = () => {
            if (currentExtensionIndex < this.imageExtensions.length) {
                const ext = this.imageExtensions[currentExtensionIndex++];
                img.src = `musicas/covers/${songName}.${ext}?t=${Date.now()}`;
            } else {
                // Nenhuma extensão funcionou, usar placeholder
                this.nowPlayingCover.innerHTML = '<div class="cover-placeholder">🎵</div>';
                this.cachedCovers.set(songName, null);
            }
        };
        
        img.onload = () => {
            this.setNowPlayingCover(img.src);
            this.cachedCovers.set(songName, img.src);
        };
        
        img.onerror = tryNextExtension;
        
        // Começar a tentar com a primeira extensão
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

    preloadNextSong() {
        // Determinar qual é a próxima música
        let nextIndex;
        if (this.shuffleMode && !this.repeatMode) {
            // No modo shuffle, não sabemos qual será a próxima
            return;
        } else {
            nextIndex = this.currentSongIndex + 1;
            if (nextIndex >= this.songs.length) nextIndex = 0;
        }
        
        // Pré-carregar a próxima música
        const nextSong = this.songs[nextIndex];
        const audio = new Audio();
        audio.src = `musicas/${nextSong}`;
        audio.preload = 'metadata';
        
        // Também pré-carregar a capa
        const nextSongName = nextSong.replace('.mp3', '');
        if (!this.cachedCovers.has(nextSongName)) {
            const img = new Image();
            img.src = `musicas/covers/${nextSongName}.avif`;
            img.onload = () => {
                this.cachedCovers.set(nextSongName, img.src);
            };
        }
    }

    togglePlayPause() {
        if (this.audio.paused) {
            const playPromise = this.audio.play();
            
            if (playPromise !== undefined) {
                playPromise
                    .then(() => {
                        // Reprodução iniciada com sucesso
                    })
                    .catch(error => {
                        console.error("Erro ao reproduzir:", error);
                        showToast('Erro ao reproduzir a música', 'error');
                    });
            }
        } else {
            this.audio.pause();
        }
    }

    prevSong() {
        let prevIndex = this.currentSongIndex - 1;
        if (prevIndex < 0) prevIndex = this.songs.length - 1;
        
        this.loadSong(prevIndex);
        if (this.isPlaying) {
            this.audio.play().catch(e => console.error("Erro ao reproduzir:", e));
        }
    }

    nextSong() {
        let nextIndex = this.currentSongIndex + 1;
        if (nextIndex >= this.songs.length) nextIndex = 0;
        
        this.loadSong(nextIndex);
        if (this.isPlaying) {
            this.audio.play().catch(e => console.error("Erro ao reproduzir:", e));
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
    // Verificar se há suporte para a API de áudio
    if (!window.AudioContext && !window.webkitAudioContext) {
        showToast('Seu navegador não suporta reprodução de áudio', 'error');
    }
    
    // Inicializar o player
    window.musicPlayer = new MusicPlayer();
    
    // Registrar eventos para PWA
    window.addEventListener('beforeinstallprompt', (e) => {
        // Prevenir que o prompt apareça automaticamente
        e.preventDefault();
        // Você pode armazenar este evento para mostrar o prompt mais tarde
        window.deferredInstallPrompt = e;
        
        // Mostrar um botão de instalação personalizado
        showToast('Instale este app para uma experiência melhor!');
    });
    
    window.addEventListener('appinstalled', () => {
        console.log('App instalado com sucesso!');
        window.deferredInstallPrompt = null;
    });
});

// Registrar o service worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        navigator.serviceWorker.register('./service-worker.js')
            .then(function(registration) {
                console.log('ServiceWorker registration successful with scope: ', registration.scope);
            })
            .catch(function(error) {
                console.log('ServiceWorker registration failed: ', error);
            });
    });
}