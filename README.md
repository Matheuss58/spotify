# Localfy

Player PWA para organizar e ouvir uma biblioteca de músicas local, inclusive offline.

## Recursos

- Biblioteca com busca, ordenação, favoritos e músicas recentes
- Importação de arquivos MP3, MP4, M4A, WAV, OGG, FLAC, AAC e WebM
- Armazenamento persistente no dispositivo usando IndexedDB
- Playlists personalizadas
- Reprodução aleatória, repetição, volume e integração com controles do sistema
- PWA instalável e cache offline
- Sincronização opcional entre aparelhos usando Supabase
- Layout responsivo para computador e celular

## Executar localmente

O app precisa ser servido por HTTP para que o PWA e o modo offline funcionem. Por exemplo:

```bash
python -m http.server 8080
```

Abra `http://localhost:8080`.

## Armazenamento e sincronização

O aplicativo inicia com a biblioteca vazia. As músicas importadas ficam no IndexedDB do dispositivo e continuam disponíveis offline. Arquivos de áudio não devem ser versionados no repositório.

O GitHub Pages atualiza os arquivos do PWA, mas não recebe uploads. Para compartilhar a biblioteca entre aparelhos será necessário configurar armazenamento autenticado separado; a opção recomendada é Supabase Storage com políticas privadas por usuário.

### Configurar o Supabase

1. Crie um projeto no Supabase.
2. Abra o SQL Editor, copie o conteúdo de `supabase-setup.sql` e execute uma vez.
3. Em **Project Settings > API**, copie a URL do projeto e a chave **Publishable** (ou `anon`). Nunca use a `service_role` no PWA.
4. Preencha esses dois valores em `sync-config.js`.
5. Publique os arquivos no GitHub Pages e abra o app.
6. No botão **Sincronizar**, crie a mesma conta ou entre com ela em todos os aparelhos.

O banco usa Row Level Security e o bucket `music` é privado. Cada conta acessa somente a própria pasta. Alterações offline ficam em fila; quando a conexão volta, o PWA envia as mudanças. Enquanto estiver aberto e online, ele também busca novidades periodicamente.

## Sobre links externos

Links diretos para arquivos de áudio podem ser importados quando o servidor permite acesso pelo navegador. YouTube e Spotify não entregam o arquivo de áudio diretamente a um PWA. Para essas fontes, obtenha legalmente o arquivo e use a importação local.

Links do Spotify podem ser usados para importar referências e metadados após a integração com a API oficial. O Spotify não fornece os arquivos de áudio das músicas ou playlists para download.
