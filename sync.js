'use strict';

(function () {
  const SESSION_KEY = 'localfy-sync-session';
  const QUEUE_KEY = 'localfy-sync-queue';
  const PLAYLIST_UPDATED_KEY = 'localfy-playlists-updated-at';
  const config = window.LOCALFY_SYNC_CONFIG || {};

  class LocalfySync extends EventTarget {
    constructor() {
      super();
      this.db = null;
      this.state = null;
      this.render = null;
      this.session = this.readJson(SESSION_KEY, null);
      this.busy = false;
      this.timer = null;
      this.lastSync = localStorage.getItem('localfy-last-sync') || '';
    }

    get configured() {
      return /^https:\/\/.+\.supabase\.co\/?$/i.test(config.supabaseUrl || '') && Boolean(config.supabaseKey);
    }

    get authenticated() {
      return Boolean(this.session?.access_token && this.session?.user?.id);
    }

    get baseUrl() {
      return String(config.supabaseUrl || '').replace(/\/$/, '');
    }

    readJson(key, fallback) {
      try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
    }

    saveSession(session) {
      this.session = session;
      if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      else localStorage.removeItem(SESSION_KEY);
      this.updateUi();
    }

    async attach({ db, state, render }) {
      this.db = db;
      this.state = state;
      this.render = render;
      this.bindUi();
      this.updateUi();
      if (this.authenticated && navigator.onLine) {
        await this.refreshSession().catch(() => this.signOut(false));
        if (this.authenticated) this.sync();
      }
      const interval = Math.max(15000, Number(config.pollIntervalMs) || 30000);
      this.timer = setInterval(() => {
        if (navigator.onLine && document.visibilityState === 'visible') this.sync();
      }, interval);
      window.addEventListener('online', () => this.sync());
    }

    bindUi() {
      const dialog = document.querySelector('#syncDialog');
      document.querySelector('#syncBtn')?.addEventListener('click', () => {
        this.updateUi();
        dialog?.showModal();
      });
      document.querySelector('[data-close-sync]')?.addEventListener('click', () => dialog?.close());
      document.querySelector('#signInBtn')?.addEventListener('click', () => this.submitAuth('signin'));
      document.querySelector('#signUpBtn')?.addEventListener('click', () => this.submitAuth('signup'));
      document.querySelector('#syncNowBtn')?.addEventListener('click', () => this.sync(true));
      document.querySelector('#signOutBtn')?.addEventListener('click', () => this.signOut());
    }

    setStatus(message, type = '') {
      const element = document.querySelector('#syncStatusText');
      if (element) {
        element.textContent = message;
        element.dataset.type = type;
      }
    }

    updateUi() {
      const button = document.querySelector('#syncBtn');
      const label = document.querySelector('#syncLabel');
      const dot = document.querySelector('#syncDot');
      const missing = document.querySelector('#syncMissingConfig');
      const auth = document.querySelector('#syncAuthPanel');
      const account = document.querySelector('#syncAccountPanel');
      if (missing) missing.hidden = this.configured;
      if (auth) auth.hidden = !this.configured || this.authenticated;
      if (account) account.hidden = !this.authenticated;
      if (label) label.textContent = this.busy ? 'Sincronizando' : this.authenticated ? 'Sincronizado' : 'Sincronizar';
      if (dot) dot.className = `sync-dot ${this.busy ? 'working' : this.authenticated ? 'online' : ''}`;
      if (button) button.title = this.configured ? 'Sincronização da biblioteca' : 'Configure o Supabase para sincronizar';
      const email = document.querySelector('#syncAccountEmail');
      if (email) email.textContent = this.session?.user?.email || '';
      const last = document.querySelector('#lastSyncText');
      if (last) last.textContent = this.lastSync ? new Date(this.lastSync).toLocaleString('pt-BR') : 'Ainda não sincronizado';
    }

    async submitAuth(mode) {
      const email = document.querySelector('#syncEmail')?.value.trim();
      const password = document.querySelector('#syncPassword')?.value || '';
      if (!email || password.length < 6) {
        this.setStatus('Informe um e-mail e uma senha com pelo menos 6 caracteres.', 'error');
        return;
      }
      this.setStatus(mode === 'signup' ? 'Criando conta…' : 'Entrando…');
      try {
        const endpoint = mode === 'signup' ? '/auth/v1/signup' : '/auth/v1/token?grant_type=password';
        const response = await fetch(this.baseUrl + endpoint, {
          method: 'POST',
          headers: { apikey: config.supabaseKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.msg || data.error_description || data.message || 'Não foi possível autenticar.');
        if (!data.access_token) {
          this.setStatus('Conta criada. Confirme o e-mail e depois entre.', 'success');
          return;
        }
        this.saveSession(data);
        this.setStatus('Conta conectada.', 'success');
        await this.sync(true);
      } catch (error) {
        this.setStatus(error.message, 'error');
      }
    }

    async refreshSession() {
      if (!this.session?.refresh_token) throw new Error('Sessão expirada.');
      const response = await fetch(`${this.baseUrl}/auth/v1/token?grant_type=refresh_token`, {
        method: 'POST',
        headers: { apikey: config.supabaseKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: this.session.refresh_token })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Sessão expirada.');
      this.saveSession(data);
      return data;
    }

    signOut(showMessage = true) {
      this.saveSession(null);
      if (showMessage) this.setStatus('Sessão encerrada. A biblioteca offline foi mantida.', 'success');
    }

    async request(path, options = {}, retry = true) {
      if (!this.authenticated) throw new Error('Entre na sua conta para sincronizar.');
      const response = await fetch(this.baseUrl + path, {
        ...options,
        headers: {
          apikey: config.supabaseKey,
          Authorization: `Bearer ${this.session.access_token}`,
          ...(options.headers || {})
        }
      });
      if (response.status === 401 && retry) {
        await this.refreshSession();
        return this.request(path, options, false);
      }
      if (!response.ok) {
        let message = `Erro de sincronização (${response.status}).`;
        try { const body = await response.json(); message = body.message || body.msg || body.error || message; } catch {}
        const error = new Error(message);
        error.status = response.status;
        throw error;
      }
      return response;
    }

    queueDelete(song) {
      const queue = this.readJson(QUEUE_KEY, []);
      queue.push({ type: 'delete', id: song.id, storagePath: song.storagePath || null, at: new Date().toISOString() });
      localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
      if (this.authenticated && navigator.onLine) this.sync();
    }

    markTrackDirty(song) {
      song.updatedAt = new Date().toISOString();
      song.syncState = 'pending';
      if (this.authenticated && navigator.onLine) this.sync();
    }

    markPlaylistsDirty() {
      localStorage.setItem(PLAYLIST_UPDATED_KEY, new Date().toISOString());
      if (this.authenticated && navigator.onLine) this.sync();
    }

    async processQueue() {
      const queue = this.readJson(QUEUE_KEY, []);
      const pending = [];
      for (const operation of queue) {
        try {
          if (operation.type === 'delete') {
            if (operation.storagePath) {
              const encoded = operation.storagePath.split('/').map(encodeURIComponent).join('/');
              try {
                await this.request(`/storage/v1/object/music/${encoded}`, { method: 'DELETE' });
              } catch (error) {
                if (error.status !== 404) throw error;
              }
            }
            await this.request(`/rest/v1/tracks?id=eq.${encodeURIComponent(operation.id)}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' },
              body: JSON.stringify({ deleted_at: operation.at, updated_at: operation.at })
            });
          }
        } catch (error) {
          console.warn('Operação de sincronização pendente:', error);
          pending.push(operation);
        }
      }
      localStorage.setItem(QUEUE_KEY, JSON.stringify(pending));
    }

    async fetchRemoteTracks() {
      const response = await this.request('/rest/v1/tracks?select=*&order=updated_at.asc');
      return response.json();
    }

    async uploadTrack(song) {
      const extension = (song.originalName?.split('.').pop() || song.blob?.type?.split('/').pop() || 'audio').replace(/[^a-z0-9]/gi, '').slice(0, 8) || 'audio';
      const storagePath = song.storagePath || `${this.session.user.id}/${song.id}.${extension}`;
      if (!song.storagePath) {
        const encoded = storagePath.split('/').map(encodeURIComponent).join('/');
        await this.request(`/storage/v1/object/music/${encoded}`, {
          method: 'POST',
          headers: { 'Content-Type': song.blob.type || 'application/octet-stream', 'x-upsert': 'true', 'cache-control': '3600' },
          body: song.blob
        });
      }
      const updatedAt = song.updatedAt || song.addedAt || new Date().toISOString();
      const row = {
        id: song.id,
        user_id: this.session.user.id,
        title: song.title,
        artist: song.artist || 'Artista desconhecido',
        album: song.album || 'Importados',
        original_name: song.originalName || song.title,
        mime_type: song.blob.type || 'application/octet-stream',
        size: song.size || song.blob.size || 0,
        duration: song.duration || 0,
        favorite: Boolean(song.favorite),
        storage_path: storagePath,
        updated_at: updatedAt,
        deleted_at: null
      };
      await this.request('/rest/v1/tracks?on_conflict=id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify(row)
      });
      song.storagePath = storagePath;
      song.updatedAt = updatedAt;
      song.syncState = 'synced';
      await this.db.put(song);
    }

    async downloadTrack(row) {
      const encoded = row.storage_path.split('/').map(encodeURIComponent).join('/');
      const response = await this.request(`/storage/v1/object/authenticated/music/${encoded}`);
      const blob = await response.blob();
      return {
        id: row.id,
        title: row.title,
        artist: row.artist,
        album: row.album,
        originalName: row.original_name,
        size: row.size || blob.size,
        duration: row.duration || 0,
        favorite: Boolean(row.favorite),
        addedAt: row.updated_at,
        updatedAt: row.updated_at,
        storagePath: row.storage_path,
        syncState: 'synced',
        blob
      };
    }

    async syncPlaylists() {
      const response = await this.request('/rest/v1/library_state?select=*&limit=1');
      const rows = await response.json();
      const remote = rows[0];
      const localUpdated = localStorage.getItem(PLAYLIST_UPDATED_KEY) || '1970-01-01T00:00:00.000Z';
      if (!remote || new Date(localUpdated) >= new Date(remote.updated_at)) {
        const updatedAt = localUpdated === '1970-01-01T00:00:00.000Z' ? new Date().toISOString() : localUpdated;
        await this.request('/rest/v1/library_state?on_conflict=user_id', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
          body: JSON.stringify({ user_id: this.session.user.id, playlists: this.state.playlists, updated_at: updatedAt })
        });
        localStorage.setItem(PLAYLIST_UPDATED_KEY, updatedAt);
      } else {
        this.state.playlists = Array.isArray(remote.playlists) ? remote.playlists : [];
        localStorage.setItem('localfy-playlists', JSON.stringify(this.state.playlists));
        localStorage.setItem(PLAYLIST_UPDATED_KEY, remote.updated_at);
      }
    }

    async sync(force = false) {
      if (this.busy || !this.db || !this.state || !this.configured || !this.authenticated || !navigator.onLine) return;
      this.busy = true;
      this.updateUi();
      this.setStatus('Sincronizando biblioteca…');
      try {
        await this.processQueue();
        let remoteTracks = await this.fetchRemoteTracks();
        const remoteById = new Map(remoteTracks.map(row => [row.id, row]));
        for (const song of [...this.state.songs]) {
          const remote = remoteById.get(song.id);
          if (remote?.deleted_at && new Date(remote.updated_at) >= new Date(song.updatedAt || song.addedAt || 0)) {
            await this.db.delete(song.id);
            this.state.songs = this.state.songs.filter(item => item.id !== song.id);
            continue;
          }
          if (!remote || song.syncState === 'pending' || new Date(song.updatedAt || song.addedAt || 0) > new Date(remote.updated_at)) {
            await this.uploadTrack(song);
          }
        }
        remoteTracks = await this.fetchRemoteTracks();
        const localById = new Map(this.state.songs.map(song => [song.id, song]));
        for (const row of remoteTracks) {
          if (row.deleted_at) continue;
          const local = localById.get(row.id);
          if (!local) {
            const downloaded = await this.downloadTrack(row);
            await this.db.put(downloaded);
            this.state.songs.push(downloaded);
          } else if (new Date(row.updated_at) > new Date(local.updatedAt || local.addedAt || 0)) {
            Object.assign(local, { title: row.title, artist: row.artist, album: row.album, favorite: row.favorite, updatedAt: row.updated_at, storagePath: row.storage_path, syncState: 'synced' });
            await this.db.put(local);
          }
        }
        await this.syncPlaylists();
        this.lastSync = new Date().toISOString();
        localStorage.setItem('localfy-last-sync', this.lastSync);
        this.setStatus('Biblioteca sincronizada.', 'success');
        this.render?.();
      } catch (error) {
        console.error('Falha na sincronização:', error);
        this.setStatus(error.message, 'error');
        if (force && window.toast) window.toast(error.message, 'error');
      } finally {
        this.busy = false;
        this.updateUi();
      }
    }
  }

  window.localfySync = new LocalfySync();
})();
