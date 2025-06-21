function handleImageError(imgElement, songName) {
    const extensions = ['avif', 'jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'];
    let currentExtensionIndex = 0;
    
    function tryNextExtension() {
        if (currentExtensionIndex < extensions.length) {
            const ext = extensions[currentExtensionIndex++];
            imgElement.src = `musicas/covers/${songName}.${ext}`;
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
        this.progressBar = document.getElementById('progressBar');
        this.progressFill = document.getElementById('progressFill');
        this.currentTimeEl = document.getElementById('currentTime');
        this.durationEl = document.getElementById('duration');
        this.nowPlayingTitle = document.getElementById('nowPlayingTitle');
        this.nowPlayingArtist = document.getElementById('nowPlayingArtist');
        this.nowPlayingCover = document.getElementById('nowPlayingCover');

        this.originalSongs = [
            'xeque-mate.mp3',
            'olhos-vazios.mp3', 
            'akuma-no-mi.mp3',
            'aguas-passadas.mp3',
            'amores-rasos.mp3',
            'andei.mp3',
            'cansado.mp3',
            'eu-venci.mp3',
            'gato-da-caixa.mp3',
            'insuficiencia-cosmica.mp3',
            'judas.mp3',
            'morte.mp3',
            'nuvens.mp3',
            'o-ciclo-odioso.mp3',
            'sacrilegio inepto.mp3',
            'sozin.mp3',
            'trela.mp3',
            'vivendo-o-passado.mp3'
        ];

        this.songs = this.shuffleArray([...this.originalSongs]);
        this.currentSongIndex = 0;
        this.isPlaying = false;
        this.shuffleMode = false;
        this.shuffleHistory = [];
        this.imageExtensions = ['avif', 'jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'];

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.renderPlaylist();
        this.loadSong(this.currentSongIndex);
        this.setupMobileControls();
    }

    setupMediaSession() {
        if ('mediaSession' in navigator) {
            const songName = this.songs[this.currentSongIndex].replace('.mp3', '');
            const coverImg = this.nowPlayingCover.querySelector('img');
            
            navigator.mediaSession.metadata = new MediaMetadata({
                title: songName,
                artist: "Matheus Galvão",
                artwork: coverImg?.src ? [
                    { src: coverImg.src, sizes: '512x512', type: 'image/jpeg' }
                ] : []
            });

            navigator.mediaSession.setActionHandler('play', () => {
                this.audio.play();
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
        this.progressBar.addEventListener('input', () => this.seek());
        
        this.audio.addEventListener('timeupdate', () => this.updateProgress());
        this.audio.addEventListener('loadedmetadata', () => this.updateDuration());
        this.audio.addEventListener('ended', () => this.handleSongEnd());
        this.audio.addEventListener('play', () => {
            this.isPlaying = true;
            this.playIcon.style.display = 'none';
            this.pauseIcon.style.display = 'block';
        });
        this.audio.addEventListener('pause', () => {
            this.isPlaying = false;
            this.playIcon.style.display = 'block';
            this.pauseIcon.style.display = 'none';
        });
    }

    setupMobileControls() {
        const buttons = [this.playPauseBtn, this.prevBtn, this.nextBtn, this.shuffleBtn];
        
        buttons.forEach(btn => {
            btn.addEventListener('touchstart', () => {
                btn.style.transform = 'scale(0.9)';
            });
            
            btn.addEventListener('touchend', () => {
                btn.style.transform = 'scale(1)';
            });
        });
    }

    shuffleArray(array) {
        const newArray = [...array];
        for (let i = newArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        return newArray;
    }

    toggleShuffle() {
        this.shuffleMode = !this.shuffleMode;
        this.shuffleBtn.classList.toggle('active', this.shuffleMode);
        this.shuffleHistory = [];
    }

handleSongEnd() {
    if (this.shuffleMode) {
        this.playRandomSong();
    } else {
        this.nextSong();
    }
    // Garante a reprodução mesmo se o player foi pausado durante a transição
    this.isPlaying = true;
    this.audio.play().catch(e => console.error("Erro ao reproduzir:", e));
}

    playRandomSong() {
        let availableSongs = this.songs.filter(
            (_, index) => index !== this.currentSongIndex
        );

        if (availableSongs.length === 0) {
            availableSongs = [...this.songs];
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
            
            li.addEventListener('click', () => this.loadSong(index));
            if (index === this.currentSongIndex) li.classList.add('current');
            this.playlistElement.appendChild(li);
        });
    }
    
    loadSong(index) {
        this.currentSongIndex = index;
        const song = this.songs[index];
        const songName = song.replace('.mp3', '');
        
        this.audio.src = `musicas/${song}`;
        this.nowPlayingTitle.textContent = songName;
        this.nowPlayingArtist.textContent = 'Matheus Galvão';
        
        const img = this.nowPlayingCover.querySelector('img') || document.createElement('img');
        img.src = `musicas/covers/${songName}.avif`;
        
        img.onerror = () => {
            let currentExtensionIndex = 0;
            const tryNextExtension = () => {
                if (currentExtensionIndex < this.imageExtensions.length) {
                    const ext = this.imageExtensions[currentExtensionIndex++];
                    img.src = `musicas/covers/${songName}.${ext}`;
                    img.onerror = tryNextExtension;
                } else {
                    this.nowPlayingCover.innerHTML = '<div class="cover-placeholder">🎵</div>';
                }
            };
            tryNextExtension();
        };
        
        if (!this.nowPlayingCover.querySelector('img')) {
            this.nowPlayingCover.innerHTML = '';
            this.nowPlayingCover.appendChild(img);
        }
        
        const items = this.playlistElement.querySelectorAll('li');
        items.forEach((item, i) => {
            item.classList.toggle('current', i === index);
        });
        
        items[index]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        
        if (this.isPlaying) {
            this.audio.play().catch(e => console.error("Erro ao reproduzir:", e));
        }
        
        this.setupMediaSession();
    }

    togglePlayPause() {
        if (this.audio.paused) {
            this.audio.play().catch(e => console.error("Erro ao reproduzir:", e));
        } else {
            this.audio.pause();
        }
    }

    prevSong() {
        const prevIndex = (this.currentSongIndex - 1 + this.songs.length) % this.songs.length;
        this.loadSong(prevIndex);
        if (this.isPlaying) {
            this.audio.play().catch(e => console.error("Erro ao reproduzir:", e));
        }
    }

    nextSong() {
        const nextIndex = (this.currentSongIndex + 1) % this.songs.length;
        this.loadSong(nextIndex);
        if (this.isPlaying) {
            this.audio.play().catch(e => console.error("Erro ao reproduzir:", e));
        }
    }

    updateProgress() {
        if (!isNaN(this.audio.duration)) {
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

document.addEventListener('DOMContentLoaded', () => {
    new MusicPlayer();
});