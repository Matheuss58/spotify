# Localfy

Player PWA para organizar e ouvir uma biblioteca de músicas local, inclusive offline.

## Recursos

- Biblioteca com busca, ordenação, favoritos e músicas recentes
- Importação de arquivos MP3, MP4, M4A, WAV, OGG, FLAC, AAC e WebM
- Armazenamento persistente no dispositivo usando IndexedDB
- Playlists personalizadas
- Reprodução aleatória, repetição, volume e integração com controles do sistema
- PWA instalável e cache offline
- Compatível com as músicas já existentes na pasta `musicas`

## Executar localmente

O app precisa ser servido por HTTP para que o PWA e o modo offline funcionem. Por exemplo:

```bash
python -m http.server 8080
```

Abra `http://localhost:8080`.

## Sobre links externos

Links diretos para arquivos de áudio podem ser importados quando o servidor permite acesso pelo navegador. YouTube e Spotify não entregam o arquivo de áudio diretamente a um PWA. Para essas fontes, obtenha legalmente o arquivo e use a importação local.

As faixas importadas ficam no armazenamento do navegador deste dispositivo. Para arquivos versionados no Git, coloque-os na pasta `musicas` e adicione-os ao catálogo `BUNDLED` em `script.js`.
