/* Datos para el juego «Más o menos». Solo textos y cifras.
   - montanas: [nombre, altura en metros] · rios: [nombre, longitud en km] (cifras habituales de enciclopedia; en los ríos largos hay discusión sobre la medición).
   - wiki: [título exacto del artículo en es.wikipedia.org (con guiones bajos), nombre que se muestra]. Las visitas se piden EN DIRECTO a la API de visitas de Wikimedia al jugar.
   La población de los países se pide en directo a REST Countries (restcountries.com), no se guarda aquí. */
window.MASMENOS = {
   montanas: [['Everest', 8849], ['K2', 8611], ['Kanchenjunga', 8586], ['Lhotse', 8516], ['Makalu', 8485], ['Cho Oyu', 8188], ['Dhaulagiri', 8167], ['Manaslu', 8163], ['Nanga Parbat', 8126], ['Annapurna', 8091],
      ['Aconcagua', 6961], ['Ojos del Salado', 6893], ['Huascarán', 6768], ['Illimani', 6438], ['Chimborazo', 6263], ['Denali', 6190], ['Monte Logan', 5959], ['Cotopaxi', 5897], ['Kilimanjaro', 5895], ['Elbrús', 5642],
      ['Pico de Orizaba', 5636], ['Popocatépetl', 5426], ['Monte Kenia', 5199], ['Macizo Vinson', 4892], ['Puncak Jaya', 4884], ['Mont Blanc', 4806], ['Monte Whitney', 4421], ['Monte Elbert', 4401], ['Monte Rainier', 4392],
      ['Cervino', 4478], ['Mauna Kea', 4207], ['Jungfrau', 4158], ['Gran Paradiso', 4061], ['Eiger', 3967], ['Monte Fuji', 3776], ['Teide', 3715], ['Mulhacén', 3479], ['Aneto', 3404], ['Etna', 3357], ['Monte Perdido', 3355],
      ['Zugspitze', 2962], ['Olimpo', 2918], ['Almanzor', 2592], ['Kosciuszko', 2228], ['Mont Ventoux', 1912], ['Ben Nevis', 1345], ['Vesubio', 1281]],
   rios: [['Nilo', 6650], ['Amazonas', 6400], ['Yangtsé', 6300], ['Yeniséi', 5539], ['Río Amarillo', 5464], ['Obi', 5410], ['Paraná', 4880], ['Congo', 4700], ['Amur', 4444], ['Lena', 4400], ['Mekong', 4350], ['Níger', 4180],
      ['Misuri', 3767], ['Misisipi', 3734], ['Volga', 3530], ['Yukón', 3190], ['Indo', 3180], ['San Francisco', 2914], ['Danubio', 2850], ['Éufrates', 2800], ['Zambeze', 2574], ['Ganges', 2525], ['Murray', 2508],
      ['Colorado', 2330], ['Orinoco', 2140], ['Tigris', 1850], ['Mackenzie', 1738], ['Rin', 1230], ['Elba', 1094], ['Vístula', 1047], ['Tajo', 1007], ['Loira', 1006], ['Ebro', 930], ['Duero', 897], ['Ródano', 813],
      ['Sena', 777], ['Guadalquivir', 657], ['Po', 652], ['Támesis', 346]],
   wiki: [['Lionel_Messi', 'Lionel Messi'], ['Cristiano_Ronaldo', 'Cristiano Ronaldo'], ['Taylor_Swift', 'Taylor Swift'], ['Shakira', 'Shakira'], ['Bad_Bunny', 'Bad Bunny'], ['Michael_Jackson', 'Michael Jackson'],
      ['The_Beatles', 'The Beatles'], ['Albert_Einstein', 'Albert Einstein'], ['Leonardo_da_Vinci', 'Leonardo da Vinci'], ['Napoleón_Bonaparte', 'Napoleón Bonaparte'], ['Cleopatra', 'Cleopatra'], ['Elon_Musk', 'Elon Musk'],
      ['Frida_Kahlo', 'Frida Kahlo'], ['Pablo_Picasso', 'Pablo Picasso'], ['Salvador_Dalí', 'Salvador Dalí'], ['Miguel_de_Cervantes', 'Miguel de Cervantes'], ['Harry_Potter', 'Harry Potter'], ['Star_Wars', 'Star Wars'],
      ['Minecraft', 'Minecraft'], ['Netflix', 'Netflix'], ['Google', 'Google'], ['Bitcoin', 'Bitcoin'], ['Internet', 'Internet'], ['Inteligencia_artificial', 'Inteligencia artificial'],
      ['Madrid', 'Madrid'], ['Barcelona', 'Barcelona'], ['Sevilla', 'Sevilla'], ['Tokio', 'Tokio'], ['Nueva_York', 'Nueva York'], ['París', 'París'], ['Londres', 'Londres'], ['Roma', 'Roma'],
      ['Luna', 'Luna'], ['Sol', 'Sol'], ['Tierra', 'Tierra'], ['Marte_(planeta)', 'Marte'], ['Júpiter_(planeta)', 'Júpiter'], ['Gato', 'Gato'], ['Perro', 'Perro'], ['Elefante', 'Elefante'],
      ['Pizza', 'Pizza'], ['Chocolate', 'Chocolate'], ['Café', 'Café'], ['Fútbol', 'Fútbol'], ['Baloncesto', 'Baloncesto'], ['Tenis', 'Tenis'], ['Ajedrez', 'Ajedrez'],
      ['Segunda_Guerra_Mundial', 'Segunda Guerra Mundial'], ['Imperio_romano', 'Imperio romano'], ['Antiguo_Egipto', 'Antiguo Egipto']]
};
