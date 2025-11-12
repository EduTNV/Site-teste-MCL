# Site Romântico - TODO

## Funcionalidades Principais

- [x] Tela 1: Página inicial com fundo azul escuro e animação de água
- [x] Tela 1: Botão "Clique aqui" centralizado
- [x] Tela 1: Navegação para segunda tela ao clicar no botão
- [x] Tela 2: Player de música customizável (aceita arquivos MP3)
- [x] Tela 2: Interface do player estilo Spotify
- [x] Tela 2: Carrossel de imagens com proporção 16:9
- [x] Tela 2: Suporte para múltiplas imagens no carrossel
- [x] Tela 2: Indicador de posição do carrossel (bolinhas)
- [x] Tela 2: Contador de tempo progressivo (anos, meses, dias, horas, minutos, segundos)
- [x] Tela 2: Texto "Eu te amo há:" acima do contador
- [x] Tela 2: Data inicial configurável (4 de outubro de 2025, 01:00)
- [x] Design responsivo para desktop e mobile
- [x] Sistema de upload/configuração de arquivos MP3
- [x] Sistema de upload/configuração de imagens

## Melhorias do Player de Música

- [x] Adicionar botão de shuffle (reprodução aleatória)
- [x] Adicionar botão de repeat (modo de repetição)
- [x] Implementar lógica de shuffle para embaralhar playlist
- [x] Implementar três modos de repeat: off, repeat all, repeat one
- [x] Adicionar indicadores visuais para shuffle e repeat ativos

## Terceira Aba - Configurações

- [x] Criar página de configurações (Settings)
- [x] Adicionar campos para alterar data e hora do relacionamento
- [x] Implementar armazenamento local (localStorage) para salvar configurações
- [x] Criar sistema de upload de fotos na aba de configurações
- [x] Adicionar visualização de fotos já carregadas
- [x] Permitir deletar fotos do carrossel
- [x] Sincronizar mudanças entre abas em tempo real

## Reorganização do Layout

- [x] Colocar fotos como destaque principal (60% da tela)
- [x] Reduzir temporizador para uma única linha
- [x] Manter proporção 16:9 das fotos
- [x] Adicionar funcionalidade de deletar fotos na aba de configurações
- [x] Reorganizar ordem dos elementos: Player > Fotos > Temporizador


## Melhorias de UX e Responsividade

- [x] Adicionar transições fade in/out ao carrossel de fotos
- [x] Criar seção de mensagens personalizadas na aba de configurações
- [x] Exibir mensagens personalizadas na página principal
- [x] Reduzir tamanho do espaço do player de música
- [x] Otimizar layout para mobile com fotos ocupando maior espaço
- [x] Testar responsividade em diferentes tamanhos de tela


## Modo Tela Cheia e Upload de Músicas

- [x] Adicionar botão de tela cheia no carrossel de fotos
- [x] Implementar modal/overlay de tela cheia para fotos
- [x] Adicionar controles de navegação no modo tela cheia
- [x] Criar seção de upload de músicas na aba de configurações
- [x] Implementar sistema de gerenciamento de playlist personalizada
- [x] Permitir deletar músicas da playlist personalizada
- [x] Sincronizar playlist personalizada com o player


## Correção de Erros de Storage

- [ ] Implementar IndexedDB para armazenar imagens e músicas
- [ ] Usar localStorage apenas para metadados (datas, mensagens)
- [ ] Corrigir QuotaExceededError ao salvar configurações
- [ ] Testar upload de múltiplas imagens e músicas
