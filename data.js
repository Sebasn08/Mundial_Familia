// Datos del Mundial 2026 - Fase de grupos
const GROUPS = {
  A: ["México", "Sudáfrica", "República de Corea", "República Checa"],
  B: ["Canadá", "Bosnia y Herzegovina", "Catar", "Suiza"],
  C: ["Brasil", "Marruecos", "Haití", "Escocia"],
  D: ["Estados Unidos", "Paraguay", "Australia", "Turquía"],
  E: ["Alemania", "Curazao", "Costa de Marfil", "Ecuador"],
  F: ["Países Bajos", "Japón", "Suecia", "Túnez"],
  G: ["Bélgica", "Egipto", "RI de Irán", "Nueva Zelanda"],
  H: ["España", "Cabo Verde", "Arabia Saudí", "Uruguay"],
  I: ["Francia", "Senegal", "Irak", "Noruega"],
  J: ["Argentina", "Argelia", "Austria", "Jordania"],
  K: ["Portugal", "RD de Congo", "Uzbekistán", "Colombia"],
  L: ["Inglaterra", "Croacia", "Ghana", "Panamá"]
};

// Partidos de fase de grupos
// result: null si no jugado, o {home, away} con marcadores
const MATCHES = [
  // Grupo A
  {id:"A1", group:"A", date:"2026-06-11", time:"", home:"México", away:"Sudáfrica", stadium:"Estadio Ciudad de México", result:{home:2,away:0}},
  {id:"A2", group:"A", date:"2026-06-11", time:"", home:"República de Corea", away:"República Checa", stadium:"Estadio Guadalajara", result:{home:2,away:1}},
  {id:"A3", group:"A", date:"2026-06-18", time:"12:00", home:"República Checa", away:"Sudáfrica", stadium:"Estadio Atlanta", result:null},
  {id:"A4", group:"A", date:"2026-06-18", time:"21:00", home:"México", away:"República de Corea", stadium:"Estadio Guadalajara", result:null},
  {id:"A5", group:"A", date:"2026-06-24", time:"21:00", home:"República Checa", away:"México", stadium:"Estadio Ciudad de México", result:null},
  {id:"A6", group:"A", date:"2026-06-24", time:"21:00", home:"Sudáfrica", away:"República de Corea", stadium:"Estadio Monterrey", result:null},

  // Grupo B
  {id:"B1", group:"B", date:"2026-06-12", time:"", home:"Canadá", away:"Bosnia y Herzegovina", stadium:"Estadio Toronto", result:{home:1,away:1}},
  {id:"B2", group:"B", date:"2026-06-13", time:"", home:"Catar", away:"Suiza", stadium:"Estadio Bahía de San Francisco", result:{home:1,away:1}},
  {id:"B3", group:"B", date:"2026-06-18", time:"15:00", home:"Suiza", away:"Bosnia y Herzegovina", stadium:"Estadio Los Ángeles", result:null},
  {id:"B4", group:"B", date:"2026-06-18", time:"18:00", home:"Canadá", away:"Catar", stadium:"Estadio BC Place Vancouver", result:null},
  {id:"B5", group:"B", date:"2026-06-24", time:"15:00", home:"Suiza", away:"Canadá", stadium:"Estadio BC Place Vancouver", result:null},
  {id:"B6", group:"B", date:"2026-06-24", time:"15:00", home:"Bosnia y Herzegovina", away:"Catar", stadium:"Estadio Seattle", result:null},

  // Grupo C
  {id:"C1", group:"C", date:"2026-06-13", time:"", home:"Brasil", away:"Marruecos", stadium:"Estadio Nueva York Nueva Jersey", result:{home:1,away:1}},
  {id:"C2", group:"C", date:"2026-06-13", time:"", home:"Haití", away:"Escocia", stadium:"Estadio Boston", result:{home:0,away:1}},
  {id:"C3", group:"C", date:"2026-06-19", time:"18:00", home:"Escocia", away:"Marruecos", stadium:"Estadio Boston", result:null},
  {id:"C4", group:"C", date:"2026-06-19", time:"21:00", home:"Brasil", away:"Haití", stadium:"Estadio Filadelfia", result:null},
  {id:"C5", group:"C", date:"2026-06-24", time:"18:00", home:"Brasil", away:"Escocia", stadium:"Estadio Miami", result:null},
  {id:"C6", group:"C", date:"2026-06-24", time:"18:00", home:"Marruecos", away:"Haití", stadium:"Estadio Atlanta", result:null},

  // Grupo D
  {id:"D1", group:"D", date:"2026-06-12", time:"", home:"Estados Unidos", away:"Paraguay", stadium:"Estadio Los Ángeles", result:{home:4,away:1}},
  {id:"D2", group:"D", date:"2026-06-13", time:"00:00", home:"Australia", away:"Turquía", stadium:"Estadio BC Place Vancouver", result:null},
  {id:"D3", group:"D", date:"2026-06-19", time:"15:00", home:"Estados Unidos", away:"Australia", stadium:"Estadio Seattle", result:null},
  {id:"D4", group:"D", date:"2026-06-19", time:"00:00", home:"Turquía", away:"Paraguay", stadium:"Estadio Bahía de San Francisco", result:null},
  {id:"D5", group:"D", date:"2026-06-25", time:"22:00", home:"Turquía", away:"Estados Unidos", stadium:"Estadio Los Ángeles", result:null},
  {id:"D6", group:"D", date:"2026-06-25", time:"22:00", home:"Paraguay", away:"Australia", stadium:"Estadio Bahía de San Francisco", result:null},

  // Grupo E
  {id:"E1", group:"E", date:"2026-06-14", time:"13:00", home:"Alemania", away:"Curazao", stadium:"Estadio Houston", result:null},
  {id:"E2", group:"E", date:"2026-06-14", time:"19:00", home:"Costa de Marfil", away:"Ecuador", stadium:"Estadio Filadelfia", result:null},
  {id:"E3", group:"E", date:"2026-06-20", time:"16:00", home:"Alemania", away:"Costa de Marfil", stadium:"Estadio Toronto", result:null},
  {id:"E4", group:"E", date:"2026-06-20", time:"22:00", home:"Ecuador", away:"Curazao", stadium:"Estadio Kansas City", result:null},
  {id:"E5", group:"E", date:"2026-06-25", time:"16:00", home:"Curazao", away:"Costa de Marfil", stadium:"Estadio Filadelfia", result:null},
  {id:"E6", group:"E", date:"2026-06-25", time:"16:00", home:"Ecuador", away:"Alemania", stadium:"Estadio Nueva York Nueva Jersey", result:null},

  // Grupo F
  {id:"F1", group:"F", date:"2026-06-14", time:"16:00", home:"Países Bajos", away:"Japón", stadium:"Estadio Dallas", result:null},
  {id:"F2", group:"F", date:"2026-06-14", time:"22:00", home:"Suecia", away:"Túnez", stadium:"Estadio Monterrey", result:null},
  {id:"F3", group:"F", date:"2026-06-20", time:"13:00", home:"Países Bajos", away:"Suecia", stadium:"Estadio Houston", result:null},
  {id:"F4", group:"F", date:"2026-06-21", time:"00:00", home:"Túnez", away:"Japón", stadium:"Estadio Monterrey", result:null},
  {id:"F5", group:"F", date:"2026-06-25", time:"19:00", home:"Japón", away:"Suecia", stadium:"Estadio Dallas", result:null},
  {id:"F6", group:"F", date:"2026-06-25", time:"19:00", home:"Túnez", away:"Países Bajos", stadium:"Estadio Kansas City", result:null},

  // Grupo G
  {id:"G1", group:"G", date:"2026-06-15", time:"15:00", home:"Bélgica", away:"Egipto", stadium:"Estadio Seattle", result:null},
  {id:"G2", group:"G", date:"2026-06-15", time:"21:00", home:"RI de Irán", away:"Nueva Zelanda", stadium:"Estadio Los Ángeles", result:null},
  {id:"G3", group:"G", date:"2026-06-21", time:"15:00", home:"Bélgica", away:"RI de Irán", stadium:"Estadio Los Ángeles", result:null},
  {id:"G4", group:"G", date:"2026-06-21", time:"21:00", home:"Nueva Zelanda", away:"Egipto", stadium:"Estadio BC Place Vancouver", result:null},
  {id:"G5", group:"G", date:"2026-06-26", time:"23:00", home:"Egipto", away:"RI de Irán", stadium:"Estadio Seattle", result:null},
  {id:"G6", group:"G", date:"2026-06-26", time:"23:00", home:"Nueva Zelanda", away:"Bélgica", stadium:"Estadio BC Place Vancouver", result:null},

  // Grupo H
  {id:"H1", group:"H", date:"2026-06-15", time:"12:00", home:"España", away:"Cabo Verde", stadium:"Estadio Atlanta", result:null},
  {id:"H2", group:"H", date:"2026-06-15", time:"18:00", home:"Arabia Saudí", away:"Uruguay", stadium:"Estadio Miami", result:null},
  {id:"H3", group:"H", date:"2026-06-21", time:"12:00", home:"España", away:"Arabia Saudí", stadium:"Estadio Atlanta", result:null},
  {id:"H4", group:"H", date:"2026-06-21", time:"18:00", home:"Uruguay", away:"Cabo Verde", stadium:"Estadio Miami", result:null},
  {id:"H5", group:"H", date:"2026-06-26", time:"20:00", home:"Cabo Verde", away:"Arabia Saudí", stadium:"Estadio Houston", result:null},
  {id:"H6", group:"H", date:"2026-06-26", time:"20:00", home:"Uruguay", away:"España", stadium:"Estadio Guadalajara", result:null},

  // Grupo I
  {id:"I1", group:"I", date:"2026-06-16", time:"15:00", home:"Francia", away:"Senegal", stadium:"Estadio Nueva York Nueva Jersey", result:null},
  {id:"I2", group:"I", date:"2026-06-16", time:"18:00", home:"Irak", away:"Noruega", stadium:"Estadio Boston", result:null},
  {id:"I3", group:"I", date:"2026-06-22", time:"17:00", home:"Francia", away:"Irak", stadium:"Estadio Filadelfia", result:null},
  {id:"I4", group:"I", date:"2026-06-22", time:"20:00", home:"Noruega", away:"Senegal", stadium:"Estadio Nueva York Nueva Jersey", result:null},
  {id:"I5", group:"I", date:"2026-06-26", time:"15:00", home:"Noruega", away:"Francia", stadium:"Estadio Boston", result:null},
  {id:"I6", group:"I", date:"2026-06-26", time:"15:00", home:"Senegal", away:"Irak", stadium:"Estadio Toronto", result:null},

  // Grupo J
  {id:"J1", group:"J", date:"2026-06-16", time:"21:00", home:"Argentina", away:"Argelia", stadium:"Estadio Kansas City", result:null},
  {id:"J2", group:"J", date:"2026-06-17", time:"00:00", home:"Austria", away:"Jordania", stadium:"Estadio Bahía de San Francisco", result:null},
  {id:"J3", group:"J", date:"2026-06-22", time:"13:00", home:"Argentina", away:"Austria", stadium:"Estadio Dallas", result:null},
  {id:"J4", group:"J", date:"2026-06-22", time:"23:00", home:"Jordania", away:"Argelia", stadium:"Estadio Bahía de San Francisco", result:null},
  {id:"J5", group:"J", date:"2026-06-27", time:"22:00", home:"Argelia", away:"Austria", stadium:"Estadio Kansas City", result:null},
  {id:"J6", group:"J", date:"2026-06-27", time:"22:00", home:"Jordania", away:"Argentina", stadium:"Estadio Dallas", result:null},

  // Grupo K
  {id:"K1", group:"K", date:"2026-06-17", time:"13:00", home:"Portugal", away:"RD de Congo", stadium:"Estadio Houston", result:null},
  {id:"K2", group:"K", date:"2026-06-17", time:"22:00", home:"Uzbekistán", away:"Colombia", stadium:"Estadio Ciudad de México", result:null},
  {id:"K3", group:"K", date:"2026-06-23", time:"13:00", home:"Portugal", away:"Uzbekistán", stadium:"Estadio Houston", result:null},
  {id:"K4", group:"K", date:"2026-06-23", time:"22:00", home:"Colombia", away:"RD de Congo", stadium:"Estadio Guadalajara", result:null},
  {id:"K5", group:"K", date:"2026-06-27", time:"19:30", home:"Colombia", away:"Portugal", stadium:"Estadio Miami", result:null},
  {id:"K6", group:"K", date:"2026-06-27", time:"19:30", home:"RD de Congo", away:"Uzbekistán", stadium:"Estadio Atlanta", result:null},

  // Grupo L
  {id:"L1", group:"L", date:"2026-06-17", time:"16:00", home:"Inglaterra", away:"Croacia", stadium:"Estadio Dallas", result:null},
  {id:"L2", group:"L", date:"2026-06-17", time:"19:00", home:"Ghana", away:"Panamá", stadium:"Estadio Toronto", result:null},
  {id:"L3", group:"L", date:"2026-06-23", time:"16:00", home:"Inglaterra", away:"Ghana", stadium:"Estadio Boston", result:null},
  {id:"L4", group:"L", date:"2026-06-23", time:"19:00", home:"Panamá", away:"Croacia", stadium:"Estadio Toronto", result:null},
  {id:"L5", group:"L", date:"2026-06-27", time:"17:00", home:"Panamá", away:"Inglaterra", stadium:"Estadio Nueva York Nueva Jersey", result:null},
  {id:"L6", group:"L", date:"2026-06-27", time:"17:00", home:"Croacia", away:"Ghana", stadium:"Estadio Filadelfia", result:null}
];

// Jornadas (para el bono de "todos los partidos de la jornada")
// Jornada 1 = primeros 2 partidos de cada grupo (j1,j2 por grupo), Jornada 2, Jornada 3
const JORNADAS = {
  1: MATCHES.filter(m => m.id.endsWith("1") || m.id.endsWith("2")),
  2: MATCHES.filter(m => m.id.endsWith("3") || m.id.endsWith("4")),
  3: MATCHES.filter(m => m.id.endsWith("5") || m.id.endsWith("6"))
};

// Sistema de puntos por defecto (editable desde admin)
const DEFAULT_POINTS = {
  marcadorExacto: 5,
  resultadoCorrecto: 3,
  jornadaPerfecta: 5,
  dosClasificados: 5,
  campeonGrupo: 3,
  primeroYsegundo: 8,
  dieciseisavosClasificado: 6,
  dieciseisavosMarcador: 9,
  octavosClasificado: 6,
  octavosMarcador: 9,
  cuartosClasificado: 8,
  cuartosMarcador: 11,
  semisClasificado: 12,
  semisMarcador: 18,
  tercerPuestoGanador: 20,
  tercerPuestoMarcador: 25,
  campeonFinal: 35,
  finalMarcador: 30,
  subcampeon: 32
};

// Rondas de la fase eliminatoria, en orden.
// El bracket es dinámico: el admin lo define después de la fase de grupos
// (eligiendo los 32 clasificados y armando los cruces reales de dieciseisavos),
// y cada ronda siguiente se genera a partir de los ganadores de la ronda anterior.
// Cruces fijos de Dieciseisavos de final (oficiales FIFA, en orden P73..P88).
// Cada slot es "1X" (primero del grupo X), "2X" (segundo del grupo X),
// o "3#N" (el N-ésimo mejor tercero predicho, N de 1 a 8).
const R32_FIXTURES = [
  {id:"r32-1",  home:"2A",  away:"2B"},
  {id:"r32-2",  home:"1E",  away:"3#1"},
  {id:"r32-3",  home:"1F",  away:"2C"},
  {id:"r32-4",  home:"1C",  away:"2F"},
  {id:"r32-5",  home:"1I",  away:"3#2"},
  {id:"r32-6",  home:"2E",  away:"2I"},
  {id:"r32-7",  home:"1A",  away:"3#3"},
  {id:"r32-8",  home:"1L",  away:"3#4"},
  {id:"r32-9",  home:"1D",  away:"3#5"},
  {id:"r32-10", home:"1G",  away:"3#6"},
  {id:"r32-11", home:"2K",  away:"2L"},
  {id:"r32-12", home:"1H",  away:"2J"},
  {id:"r32-13", home:"1B",  away:"3#7"},
  {id:"r32-14", home:"1J",  away:"2H"},
  {id:"r32-15", home:"1K",  away:"3#8"},
  {id:"r32-16", home:"2D",  away:"2G"}
];

const KNOCKOUT_ROUNDS = [
  {key:"r32", label:"Dieciseisavos de final", numMatches:16, pointsClasificado:"dieciseisavosClasificado", pointsMarcador:"dieciseisavosMarcador"},
  {key:"r16", label:"Octavos de final", numMatches:8, pointsClasificado:"octavosClasificado", pointsMarcador:"octavosMarcador"},
  {key:"qf", label:"Cuartos de final", numMatches:4, pointsClasificado:"cuartosClasificado", pointsMarcador:"cuartosMarcador"},
  {key:"sf", label:"Semifinales", numMatches:2, pointsClasificado:"semisClasificado", pointsMarcador:"semisMarcador"},
  {key:"third", label:"Tercer puesto", numMatches:1, pointsClasificado:"tercerPuestoGanador", pointsMarcador:"tercerPuestoMarcador"},
  {key:"final", label:"Final", numMatches:1, pointsClasificado:"campeonFinal", pointsMarcador:"finalMarcador"}
];
