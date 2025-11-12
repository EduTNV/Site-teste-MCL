# 💕 Site Romântico - Instruções de Personalização

## 📋 Visão Geral

Este site possui duas telas:
1. **Tela Inicial**: Fundo azul escuro com efeito de água animado e botão "Clique aqui"
2. **Tela Principal**: Player de música, carrossel de fotos e contador de tempo

## 🎵 Como Usar o Player de Música

### Controles do Player

O player possui os seguintes controles:

- **🔀 Shuffle**: Ativa/desativa a reprodução aleatória das músicas
- **⏮ Anterior**: Volta para a música anterior (no modo shuffle, volta para a última música tocada)
- **▶️/⏸ Play/Pause**: Inicia ou pausa a reprodução
- **⏭ Próxima**: Avança para a próxima música (aleatória se shuffle estiver ativo)
- **🔁 Repeat**: Alterna entre três modos:
  - **Desligado**: Para no final da playlist
  - **Repetir todas** (🔁): Repete toda a playlist continuamente
  - **Repetir uma** (🔂1): Repete apenas a música atual
- **🔊 Volume**: Controla o volume da reprodução

Quando shuffle ou repeat estão ativos, os botões ficam destacados com um fundo mais claro.

## 🎵 Como Adicionar Suas Músicas

### Passo 1: Preparar os arquivos MP3
1. Tenha seus arquivos de música no formato MP3
2. Renomeie-os para facilitar (ex: `musica1.mp3`, `musica2.mp3`, etc.)

### Passo 2: Adicionar ao projeto
1. Coloque os arquivos MP3 na pasta: `client/public/`
2. Você pode fazer isso através da interface de gerenciamento de arquivos

### Passo 3: Configurar no código
1. Abra o arquivo: `client/src/config.ts`
2. Localize a seção `songs`:

```typescript
songs: [
  {
    title: "Nome da Música 1",
    artist: "Nome do Artista 1",
    file: "/musica1.mp3",  // Nome do arquivo que você colocou na pasta public
  },
  {
    title: "Nome da Música 2",
    artist: "Nome do Artista 2",
    file: "/musica2.mp3",
  },
  // Adicione mais músicas conforme necessário
],
```

## 📸 Como Adicionar Suas Fotos

### Passo 1: Preparar as imagens
1. Use imagens com proporção 16:9 (recomendado: 1920x1080 pixels)
2. Formatos aceitos: JPG, PNG, WebP
3. Renomeie para facilitar (ex: `foto1.jpg`, `foto2.jpg`, etc.)

### Passo 2: Adicionar ao projeto
1. Coloque as imagens na pasta: `client/public/`
2. Você pode fazer upload através da interface

### Passo 3: Configurar no código
1. Abra o arquivo: `client/src/config.ts`
2. Localize a seção `images`:

```typescript
images: [
  "/foto1.jpg",
  "/foto2.jpg",
  "/foto3.jpg",
  // Adicione mais fotos conforme necessário
],
```

## ⏰ Como Configurar a Data do Relacionamento

1. Abra o arquivo: `client/src/config.ts`
2. Localize a seção `startDate`:

```typescript
startDate: {
  year: 2025,      // Ano
  month: 9,        // Mês (0 = Janeiro, 1 = Fevereiro, ..., 9 = Outubro, 11 = Dezembro)
  day: 4,          // Dia
  hour: 1,         // Hora (0-23)
  minute: 0,       // Minuto (0-59)
},
```

**⚠️ IMPORTANTE**: Os meses começam do zero!
- Janeiro = 0
- Fevereiro = 1
- Março = 2
- Abril = 3
- Maio = 4
- Junho = 5
- Julho = 6
- Agosto = 7
- Setembro = 8
- Outubro = 9
- Novembro = 10
- Dezembro = 11

### Exemplo: Para 4 de outubro de 2025 às 01:00
```typescript
startDate: {
  year: 2025,
  month: 9,    // Outubro (lembre-se: 0 = Janeiro)
  day: 4,
  hour: 1,
  minute: 0,
},
```

## ✏️ Como Mudar o Texto do Contador

1. Abra o arquivo: `client/src/config.ts`
2. Localize a linha `counterText`:

```typescript
counterText: "Eu te amo há:",
```

3. Altere o texto entre aspas para o que você quiser

## 📱 Estrutura de Arquivos

```
site-romantico/
├── client/
│   ├── public/              ← Coloque suas músicas e fotos AQUI
│   │   ├── song-1.mp3       (seus arquivos MP3)
│   │   ├── song-2.mp3
│   │   ├── placeholder-1.jpg (suas fotos)
│   │   ├── placeholder-2.jpg
│   │   └── placeholder-3.jpg
│   └── src/
│       ├── config.ts        ← Arquivo de CONFIGURAÇÃO principal
│       └── pages/
│           ├── Home.tsx     (Tela inicial com água)
│           └── MainPage.tsx (Tela principal)
└── INSTRUCOES.md           ← Este arquivo
```

## 🎨 Personalização Avançada

### Mudar a cor do fundo da tela inicial
Edite o arquivo `client/src/pages/Home.tsx` e procure por:
```typescript
bg-[oklch(0.25_0.08_250)]
```
Altere os valores para mudar a cor.

### Mudar a cor de fundo da tela principal
Edite o arquivo `client/src/pages/MainPage.tsx` e procure por:
```typescript
from-[oklch(0.2_0.08_250)] to-[oklch(0.15_0.06_260)]
```

## 🚀 Como Testar Suas Alterações

1. Após fazer qualquer alteração nos arquivos
2. Salve o arquivo
3. O site será atualizado automaticamente no navegador
4. Se não atualizar, recarregue a página (F5)

## 📱 Responsividade

O site foi desenvolvido para funcionar perfeitamente em:
- 💻 Desktop (computadores)
- 📱 Mobile (celulares)
- 📱 Tablets

## ❓ Dicas Importantes

1. **Tamanho dos arquivos**: Mantenha as músicas e fotos com tamanho razoável para carregar rápido
2. **Formato das imagens**: Use proporção 16:9 para melhor visualização
3. **Nomes de arquivos**: Evite espaços e caracteres especiais nos nomes
4. **Quantidade**: Você pode adicionar quantas músicas e fotos quiser

## 🔧 Solução de Problemas

### A música não toca
- Verifique se o arquivo está na pasta `client/public/`
- Verifique se o nome do arquivo em `config.ts` está correto
- Certifique-se de que o arquivo é MP3 válido

### A foto não aparece
- Verifique se o arquivo está na pasta `client/public/`
- Verifique se o nome do arquivo em `config.ts` está correto
- Use formatos JPG, PNG ou WebP

### O contador não está correto
- Verifique se configurou o mês corretamente (lembre-se: Janeiro = 0)
- Verifique se todos os valores estão corretos

## 📞 Suporte

Se tiver dúvidas ou problemas, revise este documento ou entre em contato.

---

**Desenvolvido com ❤️ para momentos especiais**
