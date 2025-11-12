// Configuração do Site Romântico
// Edite este arquivo para personalizar seu site

export const config = {
  // Data de início do relacionamento
  startDate: {
    year: 2025,
    month: 10, // Outubro (0 = Janeiro, 9 = Outubro)
    day: 4,
    hour: 1,
    minute: 0,
  },

  // Texto do contador
  counterText: "Eu te amo há:",

  // Imagens do carrossel
  // Coloque suas imagens na pasta client/public/ e atualize os caminhos aqui
  images: [
    "/placeholder-1.jpg",
    "/placeholder-2.jpg",
    "/placeholder-3.jpg",
  ],

  // Músicas
  // Coloque seus arquivos MP3 na pasta client/public/ e atualize aqui
  songs: [
    {
      title: "Música 1",
      artist: "Artista 1",
      file: "/song-1.mp3",
    },
    {
      title: "Música 2",
      artist: "Artista 2",
      file: "/song-2.mp3",
    },
    {
      title: "Música 3",
      artist: "Artista 3",
      file: "/song-3.mp3",
    },
  ],
};
