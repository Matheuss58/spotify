class MusicPlayer {
    constructor() {
        this.audioPlayer = document.getElementById('audioPlayer');
        this.playlistElement = document.getElementById('playlist');
        this.playPauseBtn = document.getElementById('playPauseBtn');
        this.progressBar = document.getElementById('progressBar');
        this.currentTimeEl = document.getElementById('currentTime');
        this.durationEl = document.getElementById('duration');
        this.nowPlayingTitle = document.getElementById('nowPlayingTitle');
        this.nowPlayingArtist = document.getElementById('nowPlayingArtist');
        this.nowPlayingCover = document.getElementById('nowPlayingCover');
        this.shuffleBtn = document.getElementById('shuffleBtn');
        this.installButton = document.getElementById('installButton');
        this.installContainer = document.getElementById('installContainer');

        this.CACHE_NAME = 'spotify-free-v3';
        this.PLAY_ICON = '<svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>';
        this.PAUSE_ICON = '<svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';

        this.isShuffleMode = false;
        this.currentSongIndex = 0;
        this.songs = [
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

        this.deferredPrompt = null;
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

        this.init();
    }

    async init() {
        this.setupEventListeners();
        this.setupMobileButtons();
        this.checkConnectionStatus();
        this.loadSongs();
        this.setupInstallPrompt();

        // Registrar Service Worker
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js');
                console.log('Service Worker registrado com sucesso:', registration.scope);
                
                // Verificar atualizações periodicamente
                setInterval(() => registration.update(), 60 * 60 * 1000); // A cada hora
            } catch (error) {
                console.error('Falha no registro do Service Worker:', error);
            }
        }
    }

    setupEventListeners() {
        // Eventos do player de áudio
        this.audioPlayer.addEventListener('timeupdate', this.updateProgress.bind(this));
        this.audioPlayer.addEventListener('loadedmetadata', this.updateDuration.bind(this));
        this.audioPlayer.addEventListener('ended', this.handleSongEnd.bind(this));
        this.audioPlayer.addEventListener('play', () => {
            this.playPauseBtn.innerHTML = this.PAUSE_ICON;
            this.highlightCurrentSong();
        });
        this.audioPlayer.addEventListener('pause', () => {
            this.playPauseBtn.innerHTML = this.PLAY_ICON;
        });
        this.audioPlayer.addEventListener('error', (e) => {
            console.error('Erro no player de áudio:', e);
            this.showOfflineMessage('Erro ao carregar a música');
        });

        // Eventos de controles
        this.playPauseBtn.addEventListener('click', this.togglePlayPause.bind(this));
        document.getElementById('prevBtn').addEventListener('click', this.playPrevious.bind(this));
        document.getElementById('nextBtn').addEventListener('click', this.playNext.bind(this));
        this.shuffleBtn.addEventListener('click', this.toggleShuffle.bind(this));
        this.progressBar.addEventListener('input', this.seek.bind(this));

        // Eventos de rede
        window.addEventListener('online', this.updateOnlineStatus.bind(this));
        window.addEventListener('offline', this.updateOnlineStatus.bind(this));

        // Prevenir zoom indesejado
        document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });
    }

    setupMobileButtons() {
        const buttons = ['#prevBtn', '#nextBtn', '#playPauseBtn', '#shuffleBtn'];
        
        buttons.forEach(selector => {
            const btn = document.querySelector(selector);
            if (!btn) return;
            
            btn.style.webkitTapHighlightColor = 'transparent';
            btn.style.touchAction = 'manipulation';
            
            // Eventos de toque
            btn.addEventListener('touchstart', () => {
                btn.style.transform = 'scale(0.85)';
                btn.style.transition = 'transform 0.1s ease';
            });
            
            btn.addEventListener('touchend', () => {
                btn.style.transform = 'scale(1)';
                btn.style.transition = 'transform 0.2s ease';
            });
            
            // Eventos para mouse (desktop)
            btn.addEventListener('mousedown', () => {
                btn.style.transform = 'scale(0.95)';
            });
            
            btn.addEventListener('mouseup', () => {
                btn.style.transform = 'scale(1)';
            });
            
            btn.addEventListener('mouseleave', () => {
                btn.style.transform = 'scale(1)';
            });
        });

        // Ajustes específicos para Moto G8 (360x720)
        if (window.matchMedia('(max-width: 360px)').matches) {
            const controls = document.querySelector('.player-controls');
            if (controls) {
                controls.style.gap = '10px';
            }
            
            this.playPauseBtn.style.width = '50px';
            this.playPauseBtn.style.height = '50px';
            
            const prevNextBtns = [document.getElementById('prevBtn'), document.getElementById('nextBtn')];
            prevNextBtns.forEach(btn => {
                if (btn) {
                    btn.style.width = '40px';
                    btn.style.height = '40px';
                    btn.style.fontSize = '20px';
                }
            });
        }
    }

    loadSongs() {
        this.renderPlaylist();
        if (this.songs.length > 0) {
            this.playSong(0);
        }
    }

    async playSong(index) {
        if (index >= 0 && index < this.songs.length) {
            this.currentSongIndex = index;
            const song = this.songs[index];
            const baseName = song.replace('.mp3', '');
            
            this.updateNowPlayingUI(baseName);
            
            const songUrl = `musicas/${song}`;
            
            try {
                // Tentar carregar da rede primeiro
                if (navigator.onLine) {
                    const response = await fetch(songUrl);
                    if (response.ok) {
                        // Armazenar no cache
                        const cache = await caches.open(this.CACHE_NAME);
                        await cache.put(songUrl, response.clone());
                        
                        // Tocar a música
                        this.audioPlayer.src = songUrl;
                        await this.audioPlayer.play();
                        return;
                    }
                }
                
                // Se offline ou falha na rede, tentar do cache
                const cache = await caches.open(this.CACHE_NAME);
                const cachedResponse = await cache.match(songUrl);
                
                if (cachedResponse) {
                    const blob = await cachedResponse.blob();
                    this.audioPlayer.src = URL.createObjectURL(blob);
                    await this.audioPlayer.play();
                } else {
                    this.showOfflineMessage(`"${baseName}" não está disponível offline`);
                    this.markSongAsUnavailable(index);
                }
            } catch (error) {
                console.error("Erro ao reproduzir música:", error);
                this.showOfflineMessage("Erro ao carregar música");
            }
        }
    }

    updateNowPlayingUI(baseName) {
        this.nowPlayingTitle.textContent = baseName;
        this.nowPlayingArtist.textContent = 'Matheus Galvão';
        this.loadAlbumCover(baseName);
        this.highlightCurrentSong();
    }

    loadAlbumCover(baseName) {
        this.nowPlayingCover.innerHTML = '';
        const img = document.createElement('img');
        img.alt = `Capa de ${baseName}`;
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'cover';
        img.style.borderRadius = '5px';
        
        // Tentar diferentes extensões de imagem
        const extensions = ['webp', 'jpg', 'jpeg', 'png', 'gif', 'avif'];
        let currentExt = 0;
        
        const tryLoad = () => {
            if (currentExt < extensions.length) {
                img.src = `musicas/covers/${baseName}.${extensions[currentExt++]}`;
            } else {
                this.nowPlayingCover.innerHTML = '<div class="cover-placeholder">🎵</div>';
            }
        };
        
        img.onload = () => {
            this.nowPlayingCover.appendChild(img);
        };
        
        img.onerror = tryLoad;
        
        tryLoad();
    }

    renderPlaylist() {
        this.playlistElement.innerHTML = '';
        this.songs.forEach((song, index) => {
            const li = document.createElement('li');
            const baseName = song.replace('.mp3', '');
            
            const albumCover = document.createElement('div');
            albumCover.className = 'album-cover';
            
            const img = document.createElement('img');
            img.alt = 'Capa do álbum';
            
            // Tentar diferentes extensões de imagem
            const extensions = ['webp', 'jpg', 'jpeg', 'png', 'gif', 'avif'];
            let currentExt = 0;
            
            const tryLoad = () => {
                if (currentExt < extensions.length) {
                    img.src = `musicas/covers/${baseName}.${extensions[currentExt++]}`;
                } else {
                    albumCover.innerHTML = '🎵';
                }
            };
            
            img.onload = () => {
                albumCover.appendChild(img);
            };
            
            img.onerror = tryLoad;
            tryLoad();
            
            const songInfo = document.createElement('div');
            songInfo.className = 'song-info';
            songInfo.innerHTML = `
                <div class="song-title">${baseName}</div>
                <div class="song-artist">Matheus Galvão</div>
            `;
            
            li.appendChild(albumCover);
            li.appendChild(songInfo);
            li.className = index === this.currentSongIndex ? 'current' : '';
            li.onclick = () => this.playSong(index);
            this.playlistElement.appendChild(li);
        });
    }

    highlightCurrentSong() {
        const items = this.playlistElement.getElementsByTagName('li');
        for (let i = 0; i < items.length; i++) {
            items[i].className = i === this.currentSongIndex ? 'current' : '';
        }
        
        if (items[this.currentSongIndex]) {
            items[this.currentSongIndex].scrollIntoView({
                behavior: 'smooth',
                block: 'nearest'
            });
        }
    }

    markSongAsUnavailable(index) {
        const items = this.playlistElement.getElementsByTagName('li');
        if (items[index]) {
            items[index].classList.add('not-cached');
        }
    }

    updateProgress() {
        if (!isNaN(this.audioPlayer.duration)) {
            const progress = (this.audioPlayer.currentTime / this.audioPlayer.duration) * 100;
            this.progressBar.value = progress;
            document.getElementById('progressFill').style.width = `${progress}%`;
            this.currentTimeEl.textContent = this.formatTime(this.audioPlayer.currentTime);
        }
    }

    updateDuration() {
        this.durationEl.textContent = this.formatTime(this.audioPlayer.duration);
    }

    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
    }

    togglePlayPause(e) {
        e.preventDefault();
        
        if (this.audioPlayer.paused) {
            this.audioPlayer.play().catch(error => {
                console.error("Erro ao reproduzir:", error);
                this.showOfflineMessage("Erro ao reproduzir música");
            });
        } else {
            this.audioPlayer.pause();
        }
    }

    playPrevious() {
        const prevIndex = (this.currentSongIndex - 1 + this.songs.length) % this.songs.length;
        this.playSong(prevIndex);
    }

    playNext() {
        const nextIndex = (this.currentSongIndex + 1) % this.songs.length;
        this.playSong(nextIndex);
    }

    toggleShuffle() {
        this.isShuffleMode = !this.isShuffleMode;
        this.shuffleBtn.classList.toggle('active', this.isShuffleMode);
        
        // Feedback visual
        this.shuffleBtn.style.transform = 'scale(1.1)';
        setTimeout(() => {
            this.shuffleBtn.style.transform = 'scale(1)';
        }, 200);
    }

    seek() {
        const seekTime = (this.progressBar.value / 100) * this.audioPlayer.duration;
        this.audioPlayer.currentTime = seekTime;
        document.getElementById('progressFill').style.width = `${this.progressBar.value}%`;
    }

    handleSongEnd() {
        let nextIndex;
        
        if (this.isShuffleMode) {
            const availableIndices = [...Array(this.songs.length).keys()];
            
            if (this.songs.length > 1) {
                availableIndices.splice(this.currentSongIndex, 1);
            }
            
            nextIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];
        } else {
            nextIndex = (this.currentSongIndex + 1) % this.songs.length;
        }
        
        this.playSong(nextIndex);
    }

    showOfflineMessage(message = 'Você está offline. Algumas funcionalidades podem estar limitadas.') {
        const existingMsg = document.getElementById('offline-message');
        if (existingMsg) {
            existingMsg.textContent = message;
            return;
        }
        
        const msg = document.createElement('div');
        msg.id = 'offline-message';
        msg.textContent = message;
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

    updateOnlineStatus() {
        if (navigator.onLine) {
            document.body.classList.remove('offline');
        } else {
            document.body.classList.add('offline');
            this.showOfflineMessage();
        }
    }

    setupInstallPrompt() {
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;
            this.showInstallButton();
        });

        window.addEventListener('appinstalled', () => {
            console.log('App instalado com sucesso');
            this.hideInstallButton();
            this.deferredPrompt = null;
        });

        // Verificar se já está instalado
        if (window.matchMedia('(display-mode: standalone)').matches) {
            this.hideInstallButton();
        }
    }

    showInstallButton() {
        if (this.deferredPrompt && !window.matchMedia('(display-mode: standalone)').matches) {
            this.installContainer.style.display = 'block';
            
            this.installButton.addEventListener('click', async () => {
                if (this.deferredPrompt) {
                    this.deferredPrompt.prompt();
                    
                    const { outcome } = await this.deferredPrompt.userChoice;
                    if (outcome === 'accepted') {
                        console.log('Usuário aceitou a instalação');
                        this.hideInstallButton();
                    }
                    
                    this.deferredPrompt = null;
                }
            });
        }
    }

    hideInstallButton() {
        this.installContainer.style.display = 'none';
    }

    checkConnectionStatus() {
        this.updateOnlineStatus();
    }
}

// Inicializar o player quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    const player = new MusicPlayer();
    
    // Expor para debug se necessário
    window.musicPlayer = player;
});