'use strict';

// Biblioteca de exercícios: músculo trabalhado, ilustração (padrão de movimento) e dicas de execução.

const MUSCULOS = {
  peito: 'Peito',
  costas: 'Costas',
  ombros: 'Ombros',
  biceps: 'Bíceps',
  triceps: 'Tríceps',
  quadriceps: 'Quadríceps',
  posterior: 'Posterior de coxa',
  gluteos: 'Glúteos',
  panturrilha: 'Panturrilha',
  abdomen: 'Abdômen',
};

const BIBLIOTECA = [
  // Peito
  { nome: 'Supino reto', musculo: 'peito', padrao: 'supino', peso: 'barra',
    dicas: ['Deite com os olhos abaixo da barra e os pés firmes no chão.', 'Junte as escápulas e mantenha uma leve curvatura na lombar.', 'Desça a barra controlando até tocar a linha do mamilo.', 'Empurre para cima soltando o ar, sem travar os cotovelos.'],
    evite: 'Tirar o quadril do banco ou quicar a barra no peito.' },
  { nome: 'Supino inclinado com halteres', musculo: 'peito', padrao: 'supinoInclinado', peso: 'halter',
    dicas: ['Ajuste o banco entre 30° e 45°.', 'Comece com os halteres na altura do peito, cotovelos a uns 45° do tronco.', 'Empurre para cima aproximando os halteres no topo.', 'Desça devagar até sentir o alongamento do peitoral.'],
    evite: 'Banco muito inclinado, que transfere o trabalho para o ombro.' },
  { nome: 'Supino reto com halteres', musculo: 'peito', padrao: 'supino', peso: 'halter',
    dicas: ['Apoie os halteres nas coxas e deite levando-os ao peito.', 'Mantenha as escápulas juntas e o peito aberto.', 'Empurre em arco até os halteres quase se tocarem.', 'Desça até os cotovelos ficarem um pouco abaixo do banco.'],
    evite: 'Deixar os halteres caírem para os lados na descida.' },
  { nome: 'Crucifixo com halteres', musculo: 'peito', padrao: 'crucifixo', peso: 'halter',
    dicas: ['Deite no banco com os halteres acima do peito e palmas voltadas uma para a outra.', 'Mantenha os cotovelos levemente flexionados o tempo todo.', 'Abra os braços em arco até sentir o peitoral alongar.', 'Feche o movimento como se abraçasse uma árvore.'],
    evite: 'Dobrar e esticar os cotovelos, virando um supino.' },
  { nome: 'Flexão de braço', musculo: 'peito', padrao: 'flexao', peso: null,
    dicas: ['Mãos um pouco mais abertas que os ombros.', 'Corpo em linha reta da cabeça aos calcanhares, abdômen contraído.', 'Desça até o peito ficar a poucos centímetros do chão.', 'Empurre o chão mantendo os cotovelos a uns 45° do corpo.'],
    evite: 'Deixar o quadril cair ou empinar o bumbum.' },
  { nome: 'Crossover na polia', musculo: 'peito', padrao: 'crossover', peso: 'polia',
    dicas: ['Polias na altura alta, um pé à frente para dar base.', 'Incline levemente o tronco à frente com o peito aberto.', 'Traga as mãos para baixo e para frente, em arco, até se encontrarem.', 'Volte devagar, sem deixar os braços passarem da linha dos ombros.'],
    evite: 'Usar o peso do corpo para puxar os cabos.' },
  { nome: 'Voador (peck deck)', musculo: 'peito', padrao: 'voador', peso: 'maquina',
    dicas: ['Ajuste o banco para as pegadas ficarem na altura do peito.', 'Costas apoiadas e escápulas juntas no encosto.', 'Feche os braços contraindo o peitoral por um segundo.', 'Abra de forma controlada até sentir o alongamento.'],
    evite: 'Soltar o peso de uma vez na volta.' },

  // Costas
  { nome: 'Puxada frontal', musculo: 'costas', padrao: 'puxada', peso: 'polia',
    dicas: ['Pegada um pouco mais aberta que os ombros, coxas presas no apoio.', 'Incline o tronco levemente para trás e estufe o peito.', 'Puxe a barra até a parte alta do peito levando os cotovelos para baixo.', 'Suba devagar até esticar os braços.'],
    evite: 'Puxar a barra atrás da nuca ou balançar o tronco.' },
  { nome: 'Barra fixa', musculo: 'costas', padrao: 'barraFixa', peso: null,
    dicas: ['Pegada pronada, um pouco mais aberta que os ombros.', 'Comece pendurado com os braços estendidos e o abdômen firme.', 'Puxe até o queixo passar da barra, levando o peito em direção a ela.', 'Desça controlando até estender os braços.'],
    evite: 'Fazer balanço (kipping) para subir.' },
  { nome: 'Remada curvada', musculo: 'costas', padrao: 'remadaCurvada', peso: 'barra',
    dicas: ['Joelhos levemente flexionados, tronco inclinado a uns 45°.', 'Coluna neutra e olhar alguns metros à frente.', 'Puxe a barra até o umbigo, levando os cotovelos para trás.', 'Aperte as escápulas no topo e desça controlando.'],
    evite: 'Arredondar a lombar ou levantar o tronco para puxar.' },
  { nome: 'Remada baixa', musculo: 'costas', padrao: 'remadaBaixa', peso: 'polia',
    dicas: ['Sente com os pés apoiados e joelhos levemente dobrados.', 'Tronco ereto, sem inclinar para frente e para trás.', 'Puxe o triângulo até o abdômen, cotovelos junto ao corpo.', 'Estenda os braços devagar, deixando as escápulas afastarem.'],
    evite: 'Usar o balanço do tronco para mover o peso.' },
  { nome: 'Remada unilateral com halter', musculo: 'costas', padrao: 'remadaCurvada', peso: 'halter',
    dicas: ['Apoie joelho e mão do mesmo lado no banco.', 'Costas retas, paralelas ao chão.', 'Puxe o halter em direção ao quadril, cotovelo rente ao corpo.', 'Desça até estender o braço, sem girar o tronco.'],
    evite: 'Girar o tronco para subir o halter.' },
  { nome: 'Pulldown com braços estendidos', musculo: 'costas', padrao: 'pulldownEstendido', peso: 'polia',
    dicas: ['Em pé, de frente para a polia alta, tronco levemente inclinado.', 'Braços quase retos, cotovelos levemente dobrados.', 'Leve a barra até as coxas em arco, usando as costas.', 'Volte devagar até os braços ficarem acima da cabeça.'],
    evite: 'Dobrar os cotovelos e transformar em tríceps.' },

  // Ombros
  { nome: 'Desenvolvimento com halteres', musculo: 'ombros', padrao: 'desenvolvimento', peso: 'halter',
    dicas: ['Sente com as costas apoiadas no banco a 90°.', 'Halteres na altura das orelhas, cotovelos levemente à frente.', 'Empurre para cima até quase estender os braços.', 'Desça controlando até a altura inicial.'],
    evite: 'Arquear demais a lombar para empurrar.' },
  { nome: 'Desenvolvimento militar', musculo: 'ombros', padrao: 'desenvolvimento', peso: 'barra',
    dicas: ['Barra apoiada na frente dos ombros, pegada na largura dos ombros.', 'Abdômen e glúteos contraídos.', 'Empurre a barra para cima passando rente ao rosto.', 'No topo, a barra fica alinhada sobre a cabeça.'],
    evite: 'Jogar o quadril para frente para ajudar.' },
  { nome: 'Elevação lateral', musculo: 'ombros', padrao: 'elevacaoLateral', peso: 'halter',
    dicas: ['Em pé, halteres ao lado do corpo, cotovelos levemente dobrados.', 'Eleve os braços pelas laterais até a altura dos ombros.', 'Lidere o movimento com os cotovelos, não com as mãos.', 'Desça devagar, sem deixar os halteres baterem no corpo.'],
    evite: 'Subir os ombros em direção às orelhas.' },
  { nome: 'Elevação frontal', musculo: 'ombros', padrao: 'elevacaoFrontal', peso: 'halter',
    dicas: ['Em pé, halteres na frente das coxas.', 'Eleve um ou os dois braços à frente até a altura dos ombros.', 'Mantenha o tronco parado e o abdômen firme.', 'Desça em dois a três segundos.'],
    evite: 'Balançar o corpo para subir o peso.' },
  { nome: 'Crucifixo invertido', musculo: 'ombros', padrao: 'elevacaoLateral', peso: 'halter',
    dicas: ['Incline o tronco à frente com a coluna reta.', 'Braços pendurados, cotovelos levemente flexionados.', 'Abra os braços para os lados apertando a parte de trás dos ombros.', 'Volte devagar até a posição inicial.'],
    evite: 'Usar carga alta e perder a postura.' },

  // Bíceps
  { nome: 'Rosca direta', musculo: 'biceps', padrao: 'rosca', peso: 'barra',
    dicas: ['Em pé, pegada supinada na largura dos ombros.', 'Cotovelos colados ao tronco durante todo o movimento.', 'Suba a barra até a altura dos ombros contraindo o bíceps.', 'Desça devagar até estender os braços.'],
    evite: 'Balançar o tronco ou levar os cotovelos à frente.' },
  { nome: 'Rosca alternada', musculo: 'biceps', padrao: 'rosca', peso: 'halter',
    dicas: ['Em pé, halteres ao lado do corpo com as palmas para dentro.', 'Suba um halter girando a palma para cima durante a subida.', 'Contraia no topo e desça devagar.', 'Alterne os braços mantendo o cotovelo parado.'],
    evite: 'Girar o tronco a cada repetição.' },
  { nome: 'Rosca martelo', musculo: 'biceps', padrao: 'rosca', peso: 'halter',
    dicas: ['Segure os halteres com as palmas voltadas uma para a outra.', 'Cotovelos fixos ao lado do corpo.', 'Suba mantendo a pegada neutra durante todo o movimento.', 'Desça controlando até estender os braços.'],
    evite: 'Subir os ombros junto com os halteres.' },
  { nome: 'Rosca Scott', musculo: 'biceps', padrao: 'roscaScott', peso: 'barra',
    dicas: ['Apoie a parte de trás dos braços inteira no banco Scott.', 'Axilas encostadas no topo do apoio.', 'Suba a barra sem tirar os braços do apoio.', 'Desça até quase estender, sem travar o cotovelo.'],
    evite: 'Soltar o peso na descida e hiperestender o cotovelo.' },
  { nome: 'Rosca na polia', musculo: 'biceps', padrao: 'rosca', peso: 'polia',
    dicas: ['Em pé, de frente para a polia baixa.', 'Cotovelos colados ao tronco.', 'Suba a barra até os ombros, mantendo tensão constante.', 'Desça devagar sem deixar o peso encostar.'],
    evite: 'Afastar os cotovelos do corpo.' },

  // Tríceps
  { nome: 'Tríceps na polia', musculo: 'triceps', padrao: 'tricepsPolia', peso: 'polia',
    dicas: ['Em pé, de frente para a polia alta, tronco levemente inclinado.', 'Cotovelos colados ao corpo e parados.', 'Empurre a barra para baixo até estender os braços.', 'Suba devagar até os antebraços passarem da horizontal.'],
    evite: 'Mover os cotovelos para frente e para trás.' },
  { nome: 'Tríceps corda', musculo: 'triceps', padrao: 'tricepsPolia', peso: 'polia',
    dicas: ['Segure a corda com as palmas voltadas uma para a outra.', 'Cotovelos fixos ao lado do tronco.', 'Estenda os braços e afaste as pontas da corda no final.', 'Volte devagar até a altura do peito.'],
    evite: 'Inclinar o corpo sobre a corda para empurrar.' },
  { nome: 'Tríceps testa', musculo: 'triceps', padrao: 'tricepsTesta', peso: 'barra',
    dicas: ['Deite no banco com a barra acima do peito, braços estendidos.', 'Mantenha os braços parados e um pouco inclinados para trás.', 'Dobre só os cotovelos, levando a barra até perto da testa.', 'Estenda os braços contraindo o tríceps.'],
    evite: 'Abrir os cotovelos para os lados.' },
  { nome: 'Tríceps francês', musculo: 'triceps', padrao: 'tricepsFrances', peso: 'halter',
    dicas: ['Sentado, segure um halter com as duas mãos acima da cabeça.', 'Cotovelos apontados para cima e próximos da cabeça.', 'Desça o halter atrás da cabeça dobrando só os cotovelos.', 'Estenda os braços de volta ao topo.'],
    evite: 'Arquear a lombar ou abrir muito os cotovelos.' },
  { nome: 'Mergulho no banco', musculo: 'triceps', padrao: 'mergulho', peso: null,
    dicas: ['Mãos na borda do banco, dedos para frente.', 'Pernas estendidas à frente, quadril perto do banco.', 'Desça dobrando os cotovelos até uns 90°.', 'Empurre o banco para subir, sem travar os cotovelos.'],
    evite: 'Descer demais e forçar a frente dos ombros.' },

  // Quadríceps
  { nome: 'Agachamento livre', musculo: 'quadriceps', padrao: 'agachamento', peso: 'barra',
    dicas: ['Barra apoiada no trapézio, pés na largura dos ombros e pontas levemente abertas.', 'Olhe para frente e mantenha o peito aberto.', 'Desça levando o quadril para trás até as coxas ficarem paralelas ao chão.', 'Suba empurrando o chão, joelhos na direção dos pés.'],
    evite: 'Deixar os joelhos caírem para dentro ou tirar os calcanhares do chão.' },
  { nome: 'Agachamento goblet', musculo: 'quadriceps', padrao: 'agachamento', peso: 'halter',
    dicas: ['Segure um halter junto ao peito com as duas mãos.', 'Pés um pouco mais abertos que os ombros.', 'Desça entre as pernas mantendo o tronco ereto.', 'Suba empurrando o chão com o pé inteiro.'],
    evite: 'Curvar as costas na descida.' },
  { nome: 'Hack machine', musculo: 'quadriceps', padrao: 'agachamento', peso: 'maquina',
    dicas: ['Costas e ombros bem apoiados no encosto.', 'Pés na largura dos ombros, no meio da plataforma.', 'Desça até os joelhos formarem uns 90°.', 'Suba sem travar os joelhos no topo.'],
    evite: 'Tirar a lombar do encosto.' },
  { nome: 'Leg press', musculo: 'quadriceps', padrao: 'legPress', peso: 'maquina',
    dicas: ['Costas e quadril bem apoiados no banco.', 'Pés na largura dos ombros, no centro da plataforma.', 'Desça até os joelhos formarem cerca de 90°.', 'Empurre com o calcanhar sem travar os joelhos.'],
    evite: 'Descer tanto que o quadril sai do banco.' },
  { nome: 'Cadeira extensora', musculo: 'quadriceps', padrao: 'extensora', peso: 'maquina',
    dicas: ['Ajuste o encosto para o joelho ficar alinhado ao eixo da máquina.', 'Apoio acima do tornozelo, segure as alças laterais.', 'Estenda as pernas e segure um segundo no topo.', 'Desça devagar, sem deixar o peso bater.'],
    evite: 'Tirar o quadril do banco para subir.' },
  { nome: 'Afundo', musculo: 'quadriceps', padrao: 'afundo', peso: 'halter',
    dicas: ['Dê um passo largo à frente, tronco ereto.', 'Desça até os dois joelhos formarem uns 90°.', 'O joelho da frente fica alinhado com o pé.', 'Suba empurrando com o calcanhar da frente.'],
    evite: 'Joelho da frente muito à frente da ponta do pé.' },
  { nome: 'Agachamento búlgaro', musculo: 'quadriceps', padrao: 'afundo', peso: 'halter',
    dicas: ['Apoie o peito do pé de trás em um banco.', 'Pé da frente cerca de dois passos à frente do banco.', 'Desça na vertical até a coxa da frente ficar paralela ao chão.', 'Suba empurrando com a perna da frente.'],
    evite: 'Jogar o peso na perna de trás.' },

  // Posterior de coxa
  { nome: 'Mesa flexora', musculo: 'posterior', padrao: 'flexora', peso: 'maquina',
    dicas: ['Deite de bruços com os joelhos logo após a borda do banco.', 'Rolo apoiado logo acima dos calcanhares.', 'Dobre os joelhos trazendo os calcanhares ao glúteo.', 'Volte devagar sem estender totalmente.'],
    evite: 'Levantar o quadril do banco.' },
  { nome: 'Cadeira flexora', musculo: 'posterior', padrao: 'extensoraInversa', peso: 'maquina',
    dicas: ['Sente com o joelho alinhado ao eixo da máquina.', 'Rolo acima do tornozelo e a trava firme sobre as coxas.', 'Puxe os calcanhares para baixo e para trás.', 'Volte devagar até quase estender as pernas.'],
    evite: 'Soltar o peso na volta.' },
  { nome: 'Stiff', musculo: 'posterior', padrao: 'stiff', peso: 'barra',
    dicas: ['Em pé, barra na frente das coxas, joelhos levemente flexionados.', 'Leve o quadril para trás mantendo a coluna reta.', 'Desça a barra rente às pernas até sentir o posterior alongar.', 'Suba empurrando o quadril para frente.'],
    evite: 'Arredondar as costas para descer mais.' },
  { nome: 'Levantamento terra romeno', musculo: 'posterior', padrao: 'stiff', peso: 'halter',
    dicas: ['Halteres na frente das coxas, pés na largura do quadril.', 'Joelhos destravados e fixos durante o movimento.', 'Empurre o quadril para trás deslizando os halteres pelas pernas.', 'Suba contraindo glúteos e posterior.'],
    evite: 'Dobrar os joelhos como num agachamento.' },

  // Glúteos
  { nome: 'Elevação pélvica', musculo: 'gluteos', padrao: 'elevacaoPelvica', peso: 'barra',
    dicas: ['Parte de cima das costas apoiada no banco, barra sobre o quadril.', 'Pés firmes no chão, na largura do quadril.', 'Suba o quadril até o tronco ficar alinhado com as coxas.', 'Aperte os glúteos no topo e desça controlando.'],
    evite: 'Arquear a lombar no topo em vez de usar o glúteo.' },
  { nome: 'Glúteo na polia', musculo: 'gluteos', padrao: 'gluteoPolia', peso: 'polia',
    dicas: ['Prenda a caneleira no tornozelo e segure na máquina.', 'Tronco levemente inclinado e abdômen firme.', 'Leve a perna para trás e para cima contraindo o glúteo.', 'Volte devagar sem apoiar o pé.'],
    evite: 'Arquear a lombar para subir mais a perna.' },
  { nome: 'Cadeira abdutora', musculo: 'gluteos', padrao: 'abducao', peso: 'maquina',
    dicas: ['Sente com as costas apoiadas e as pernas nos apoios.', 'Abra as pernas o máximo que conseguir com controle.', 'Segure um segundo na abertura máxima.', 'Feche devagar sem deixar o peso bater.'],
    evite: 'Balançar o tronco para abrir as pernas.' },

  // Panturrilha
  { nome: 'Panturrilha em pé', musculo: 'panturrilha', padrao: 'panturrilha', peso: 'maquina',
    dicas: ['Ponta dos pés no degrau, calcanhares para fora.', 'Joelhos estendidos, mas não travados.', 'Suba o máximo na ponta dos pés e segure um segundo.', 'Desça até alongar bem a panturrilha.'],
    evite: 'Fazer repetições curtas e rápidas.' },
  { nome: 'Panturrilha sentado', musculo: 'panturrilha', padrao: 'panturrilhaSentado', peso: 'maquina',
    dicas: ['Sente com o apoio sobre os joelhos e a ponta dos pés no degrau.', 'Desça os calcanhares até alongar.', 'Suba o máximo que conseguir.', 'Segure um segundo no topo em cada repetição.'],
    evite: 'Usar impulso das pernas.' },

  // Abdômen
  { nome: 'Abdominal crunch', musculo: 'abdomen', padrao: 'abdominal', peso: null,
    dicas: ['Deite com os joelhos dobrados e os pés no chão.', 'Mãos ao lado da cabeça, sem puxar o pescoço.', 'Tire as escápulas do chão enrolando o tronco.', 'Desça devagar mantendo o abdômen contraído.'],
    evite: 'Puxar a cabeça com as mãos.' },
  { nome: 'Prancha', musculo: 'abdomen', padrao: 'prancha', peso: null,
    dicas: ['Apoie os antebraços com os cotovelos sob os ombros.', 'Corpo reto da cabeça aos calcanhares.', 'Contraia abdômen e glúteos e respire normalmente.', 'Conte o tempo pelas repetições (ex.: 30 s).'],
    evite: 'Deixar o quadril cair ou subir demais.' },
  { nome: 'Elevação de pernas', musculo: 'abdomen', padrao: 'elevacaoPernas', peso: null,
    dicas: ['Deite com as mãos ao lado do corpo ou sob o quadril.', 'Lombar pressionada contra o chão.', 'Suba as pernas estendidas até formarem 90° com o tronco.', 'Desça devagar sem encostar os pés no chão.'],
    evite: 'Tirar a lombar do chão na descida.' },
];

const normalizar = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const INDICE_BIBLIOTECA = new Map(BIBLIOTECA.map((e) => [normalizar(e.nome), e]));

function buscarExercicio(nome) {
  return INDICE_BIBLIOTECA.get(normalizar(nome)) || null;
}

// Sugestões do mesmo músculo, priorizando execuções diferentes (outro padrão de movimento ou equipamento)
function alternativas(nomeAtual, musculo, excluir = []) {
  const atual = buscarExercicio(nomeAtual);
  const fora = new Set([normalizar(nomeAtual), ...excluir.map(normalizar)]);
  const pontos = (e) => (atual && e.padrao === atual.padrao ? 2 : 0) + (atual && e.peso === atual.peso ? 1 : 0);
  return BIBLIOTECA
    .filter((e) => e.musculo === musculo && !fora.has(normalizar(e.nome)))
    .sort((a, b) => pontos(a) - pontos(b));
}

// ---------- Ilustrações ----------
// Cada padrão tem duas posições (início e fim) de um boneco visto de lado (ou de frente).
// Articulações: cab (cabeça), omb (ombro), cot/mao (braço), qua (quadril), joe/tor (perna),
// e cot2/mao2, joe2/tor2 para o segundo braço/perna quando aparecem.

const P = (o) => o;
const PADROES = {
  supino: {
    aparelho: '<rect x="45" y="116" width="100" height="6" rx="2"/><rect x="60" y="122" width="5" height="30"/><rect x="125" y="122" width="5" height="30"/>',
    a: P({ cab: [56, 108], omb: [72, 112], cot: [66, 126], mao: [76, 100], qua: [118, 112], joe: [146, 104], tor: [152, 150] }),
    b: P({ cot: [74, 88], mao: [76, 66] }),
  },
  supinoInclinado: {
    aparelho: '<path d="M70 86 L112 124 L118 118 L76 80 Z"/><rect x="108" y="124" width="30" height="6" rx="2"/><rect x="112" y="130" width="5" height="22"/>',
    a: P({ cab: [70, 78], omb: [82, 92], cot: [72, 110], mao: [86, 88], qua: [114, 120], joe: [142, 112], tor: [150, 150] }),
    b: P({ cot: [92, 70], mao: [100, 50] }),
  },
  crucifixo: {
    aparelho: '<rect x="45" y="116" width="100" height="6" rx="2"/><rect x="60" y="122" width="5" height="30"/><rect x="125" y="122" width="5" height="30"/>',
    a: P({ cab: [56, 108], omb: [72, 112], cot: [54, 116], mao: [44, 104], qua: [118, 112], joe: [146, 104], tor: [152, 150] }),
    b: P({ cot: [66, 90], mao: [74, 70] }),
  },
  flexao: {
    a: P({ cab: [152, 122], omb: [140, 130], cot: [126, 140], mao: [140, 150], qua: [92, 136], joe: [66, 141], tor: [40, 146] }),
    b: P({ cab: [150, 98], omb: [140, 106], cot: [140, 128], qua: [92, 124], joe: [66, 135] }),
  },
  crossover: {
    aparelho: '<rect x="30" y="5" width="6" height="147"/>',
    cabo: { de: [36, 10], ate: 'mao' },
    a: P({ cab: [102, 32], omb: [100, 46], cot: [82, 44], mao: [70, 32], qua: [96, 92], joe: [104, 122], tor: [104, 150], joe2: [90, 121], tor2: [82, 150] }),
    b: P({ cot: [114, 64], mao: [132, 76] }),
  },
  voador: {
    aparelho: '<rect x="92" y="60" width="16" height="42" rx="3"/><rect x="80" y="102" width="40" height="6" rx="2"/>',
    a: P({ cab: [100, 42], omb: [100, 56], cot: [74, 60], mao: [70, 38], qua: [100, 100], joe: [90, 128], tor: [90, 150], cot2: [126, 60], mao2: [130, 38], joe2: [110, 128], tor2: [110, 150] }),
    b: P({ cot: [90, 62], mao: [98, 40], cot2: [110, 62], mao2: [102, 40] }),
  },
  puxada: {
    aparelho: '<rect x="80" y="112" width="34" height="6" rx="2"/><rect x="94" y="118" width="5" height="34"/><rect x="118" y="98" width="16" height="6" rx="2"/>',
    cabo: { de: [100, 2], ate: 'mao' },
    a: P({ cab: [96, 56], omb: [94, 70], cot: [98, 48], mao: [100, 26], qua: [94, 112], joe: [124, 106], tor: [126, 150] }),
    b: P({ cot: [80, 88], mao: [100, 66] }),
  },
  barraFixa: {
    aparelho: '<rect x="60" y="16" width="80" height="5" rx="2"/>',
    a: P({ cab: [102, 50], omb: [100, 62], cot: [100, 42], mao: [100, 20], qua: [100, 106], joe: [98, 132], tor: [92, 150] }),
    b: P({ cab: [106, 14], omb: [100, 32], cot: [84, 42], qua: [100, 76], joe: [98, 102], tor: [92, 120] }),
  },
  remadaCurvada: {
    a: P({ cab: [134, 64], omb: [120, 72], cot: [122, 95], mao: [124, 118], qua: [82, 95], joe: [104, 122], tor: [100, 150] }),
    b: P({ cot: [98, 86], mao: [110, 100] }),
  },
  remadaBaixa: {
    aparelho: '<rect x="50" y="126" width="34" height="6" rx="2"/><rect x="62" y="132" width="5" height="20"/><rect x="138" y="112" width="6" height="40"/>',
    cabo: { de: [184, 112], ate: 'mao' },
    a: P({ cab: [74, 68], omb: [72, 82], cot: [96, 95], mao: [120, 102], qua: [70, 124], joe: [102, 108], tor: [136, 122] }),
    b: P({ cab: [70, 68], omb: [68, 82], cot: [50, 100], mao: [80, 104] }),
  },
  pulldownEstendido: {
    aparelho: '<rect x="170" y="2" width="6" height="150"/>',
    cabo: { de: [170, 8], ate: 'mao' },
    a: P({ cab: [106, 32], omb: [102, 46], cot: [118, 36], mao: [134, 26], qua: [96, 92], joe: [100, 122], tor: [98, 150] }),
    b: P({ cot: [108, 68], mao: [112, 90] }),
  },
  desenvolvimento: {
    aparelho: '<rect x="80" y="126" width="40" height="6" rx="2"/><rect x="80" y="70" width="6" height="56"/><rect x="97" y="132" width="5" height="20"/>',
    a: P({ cab: [102, 68], omb: [100, 82], cot: [92, 98], mao: [100, 76], qua: [98, 124], joe: [128, 122], tor: [130, 150] }),
    b: P({ cot: [100, 60], mao: [100, 38] }),
  },
  elevacaoLateral: {
    a: P({ cab: [100, 32], omb: [100, 46], cot: [90, 68], mao: [88, 90], qua: [100, 92], joe: [94, 122], tor: [92, 150], cot2: [110, 68], mao2: [112, 90], joe2: [106, 122], tor2: [108, 150] }),
    b: P({ cot: [78, 48], mao: [58, 48], cot2: [122, 48], mao2: [142, 48] }),
  },
  elevacaoFrontal: {
    a: P({ cab: [100, 32], omb: [100, 46], cot: [101, 68], mao: [102, 90], qua: [100, 92], joe: [102, 122], tor: [100, 150] }),
    b: P({ cot: [122, 46], mao: [144, 46] }),
  },
  rosca: {
    a: P({ cab: [100, 32], omb: [100, 46], cot: [101, 68], mao: [104, 90], qua: [100, 92], joe: [102, 122], tor: [100, 150] }),
    b: P({ mao: [112, 50] }),
  },
  roscaScott: {
    aparelho: '<path d="M108 70 L138 100 L108 100 Z"/><rect x="118" y="100" width="5" height="52"/><rect x="72" y="118" width="30" height="6" rx="2"/>',
    a: P({ cab: [94, 48], omb: [98, 62], cot: [124, 90], mao: [144, 106], qua: [88, 116], joe: [114, 118], tor: [112, 150] }),
    b: P({ mao: [122, 64] }),
  },
  tricepsPolia: {
    aparelho: '<rect x="150" y="2" width="6" height="150"/>',
    cabo: { de: [150, 6], ate: 'mao' },
    a: P({ cab: [106, 32], omb: [102, 46], cot: [104, 70], mao: [122, 58], qua: [96, 92], joe: [100, 122], tor: [98, 150] }),
    b: P({ mao: [110, 94] }),
  },
  tricepsTesta: {
    aparelho: '<rect x="45" y="116" width="100" height="6" rx="2"/><rect x="60" y="122" width="5" height="30"/><rect x="125" y="122" width="5" height="30"/>',
    a: P({ cab: [56, 108], omb: [72, 112], cot: [66, 82], mao: [52, 96], qua: [118, 112], joe: [146, 104], tor: [152, 150] }),
    b: P({ mao: [62, 58] }),
  },
  tricepsFrances: {
    aparelho: '<rect x="80" y="126" width="40" height="6" rx="2"/><rect x="97" y="132" width="5" height="20"/>',
    a: P({ cab: [102, 66], omb: [100, 80], cot: [102, 54], mao: [84, 66], qua: [98, 124], joe: [128, 122], tor: [130, 150] }),
    b: P({ mao: [104, 30] }),
  },
  mergulho: {
    aparelho: '<rect x="36" y="110" width="40" height="6" rx="2"/><rect x="40" y="116" width="5" height="36"/><rect x="68" y="116" width="5" height="36"/>',
    a: P({ cab: [86, 84], omb: [82, 98], cot: [60, 104], mao: [70, 110], qua: [86, 138], joe: [122, 136], tor: [152, 148] }),
    b: P({ cab: [88, 64], omb: [84, 78], cot: [76, 94], qua: [88, 118], joe: [122, 124] }),
  },
  agachamento: {
    a: P({ cab: [102, 32], omb: [100, 46], cot: [88, 58], mao: [96, 44], qua: [100, 92], joe: [102, 122], tor: [100, 150] }),
    b: P({ cab: [118, 70], omb: [112, 82], cot: [100, 94], mao: [110, 80], qua: [86, 120], joe: [124, 126] }),
  },
  afundo: {
    a: P({ cab: [100, 32], omb: [100, 46], cot: [100, 68], mao: [100, 90], qua: [100, 92], joe: [112, 121], tor: [122, 150], joe2: [90, 121], tor2: [78, 150] }),
    b: P({ cab: [100, 54], omb: [100, 68], cot: [100, 90], mao: [100, 112], qua: [100, 114], joe: [128, 116], tor: [126, 150], joe2: [90, 144], tor2: [66, 150] }),
  },
  legPress: {
    aparelho: '<path d="M30 92 L68 128 L74 122 L36 86 Z"/><rect x="50" y="128" width="40" height="6" rx="2"/>',
    peso: { em: 'tor', forma: 'plataforma' },
    a: P({ cab: [38, 76], omb: [48, 88], cot: [58, 108], mao: [72, 118], qua: [72, 122], joe: [86, 94], tor: [110, 104] }),
    b: P({ joe: [102, 108], tor: [132, 96] }),
  },
  extensora: {
    aparelho: '<rect x="70" y="118" width="46" height="6" rx="2"/><rect x="70" y="66" width="6" height="52"/><rect x="92" y="124" width="5" height="28"/>',
    peso: { em: 'tor', forma: 'rolo' },
    a: P({ cab: [84, 58], omb: [82, 72], cot: [88, 94], mao: [96, 114], qua: [82, 116], joe: [112, 116], tor: [114, 146] }),
    b: P({ tor: [142, 110] }),
  },
  extensoraInversa: {
    aparelho: '<rect x="70" y="118" width="46" height="6" rx="2"/><rect x="70" y="66" width="6" height="52"/><rect x="92" y="124" width="5" height="28"/>',
    peso: { em: 'tor', forma: 'rolo' },
    a: P({ cab: [84, 58], omb: [82, 72], cot: [88, 94], mao: [96, 114], qua: [82, 116], joe: [112, 116], tor: [140, 112] }),
    b: P({ tor: [108, 144] }),
  },
  flexora: {
    aparelho: '<rect x="30" y="118" width="110" height="6" rx="2"/><rect x="45" y="124" width="5" height="28"/><rect x="120" y="124" width="5" height="28"/>',
    peso: { em: 'tor', forma: 'rolo' },
    a: P({ cab: [38, 106], omb: [54, 112], cot: [48, 124], mao: [60, 124], qua: [100, 112], joe: [130, 112], tor: [160, 110] }),
    b: P({ tor: [136, 82] }),
  },
  stiff: {
    a: P({ cab: [100, 32], omb: [100, 46], cot: [101, 68], mao: [102, 92], qua: [100, 92], joe: [102, 122], tor: [100, 150] }),
    b: P({ cab: [142, 74], omb: [130, 80], cot: [130, 102], mao: [130, 124], qua: [86, 94], joe: [104, 122] }),
  },
  elevacaoPelvica: {
    aparelho: '<rect x="26" y="108" width="40" height="6" rx="2"/><rect x="30" y="114" width="5" height="38"/><rect x="56" y="114" width="5" height="38"/>',
    a: P({ cab: [48, 98], omb: [62, 104], cot: [78, 120], mao: [92, 128], qua: [92, 132], joe: [120, 114], tor: [126, 150] }),
    b: P({ cot: [80, 100], mao: [96, 102], qua: [96, 104], joe: [124, 104] }),
  },
  gluteoPolia: {
    aparelho: '<rect x="20" y="30" width="6" height="122"/>',
    cabo: { de: [26, 146], ate: 'tor' },
    a: P({ cab: [118, 40], omb: [112, 54], cot: [124, 68], mao: [136, 64], qua: [98, 96], joe: [100, 124], tor: [98, 146], joe2: [104, 124], tor2: [104, 150] }),
    b: P({ joe: [76, 114], tor: [56, 128] }),
  },
  abducao: {
    aparelho: '<rect x="80" y="102" width="40" height="6" rx="2"/><rect x="92" y="56" width="16" height="46" rx="3"/>',
    a: P({ cab: [100, 42], omb: [100, 56], cot: [90, 78], mao: [86, 98], qua: [100, 100], joe: [95, 126], tor: [95, 150], cot2: [110, 78], mao2: [114, 98], joe2: [105, 126], tor2: [105, 150] }),
    b: P({ joe: [78, 124], tor: [74, 150], joe2: [122, 124], tor2: [126, 150] }),
  },
  panturrilha: {
    aparelho: '<rect x="96" y="148" width="30" height="6"/>',
    a: P({ cab: [100, 30], omb: [100, 44], cot: [101, 66], mao: [102, 88], qua: [100, 90], joe: [101, 118], tor: [100, 146], pe: [114, 148] }),
    b: P({ cab: [101, 20], omb: [101, 34], cot: [102, 56], mao: [103, 78], qua: [101, 80], joe: [102, 108], tor: [103, 136] }),
  },
  panturrilhaSentado: {
    aparelho: '<rect x="60" y="102" width="40" height="6" rx="2"/><rect x="76" y="108" width="5" height="44"/><rect x="104" y="148" width="26" height="6"/><rect x="102" y="92" width="22" height="6" rx="2"/>',
    a: P({ cab: [80, 44], omb: [80, 58], cot: [92, 78], mao: [110, 92], qua: [80, 100], joe: [112, 100], tor: [110, 144], pe: [124, 148] }),
    b: P({ joe: [112, 92], tor: [111, 136] }),
  },
  abdominal: {
    a: P({ cab: [42, 138], omb: [56, 142], cot: [46, 128], mao: [40, 136], qua: [100, 142], joe: [124, 118], tor: [146, 146] }),
    b: P({ cab: [58, 112], omb: [68, 124], cot: [66, 106], mao: [58, 112] }),
  },
  prancha: {
    a: P({ cab: [46, 118], omb: [60, 124], cot: [60, 146], mao: [82, 146], qua: [110, 128], joe: [136, 134], tor: [162, 142] }),
    b: P({ qua: [110, 126] }),
  },
  elevacaoPernas: {
    a: P({ cab: [46, 138], omb: [60, 142], cot: [80, 145], mao: [100, 145], qua: [104, 142], joe: [134, 143], tor: [164, 144] }),
    b: P({ joe: [118, 114], tor: [128, 86] }),
  },
};

const SEGMENTOS = [
  ['omb', 'qua'], ['omb', 'cot'], ['cot', 'mao'], ['qua', 'joe'], ['joe', 'tor'],
  ['omb', 'cot2'], ['cot2', 'mao2'], ['qua', 'joe2'], ['joe2', 'tor2'], ['tor', 'pe'],
];

const movimentoReduzido = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function figuraExercicio(padraoNome, { animar = true, peso = null } = {}) {
  const pad = PADROES[padraoNome];
  if (!pad) {
    return `<svg class="figura" viewBox="0 0 200 160" role="img" aria-label="Sem ilustração">
      <line class="chao" x1="10" y1="152" x2="190" y2="152"/>
      <text x="100" y="92" text-anchor="middle" class="interrogacao">?</text></svg>`;
  }
  const a = pad.a;
  const b = { ...a, ...pad.b };
  const mover = animar && !movimentoReduzido();
  const DUR = '2.8s';
  const anim = (attr, va, vb) => (mover && va !== vb
    ? `<animate attributeName="${attr}" values="${va};${vb};${va}" keyTimes="0;0.5;1" dur="${DUR}" repeatCount="indefinite" calcMode="spline" keySplines=".45 0 .55 1;.45 0 .55 1"/>`
    : '');

  const linha = (p, q, pose2, cls) => {
    const [x1, y1] = p; const [x2, y2] = q;
    const f = pose2 ? pose2 : null;
    return `<line class="${cls}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${
      f ? anim('x1', x1, f[0][0]) + anim('y1', y1, f[0][1]) + anim('x2', x2, f[1][0]) + anim('y2', y2, f[1][1]) : ''}</line>`;
  };

  const desenharPose = (pose, alvo, cls) => {
    let out = '';
    SEGMENTOS.forEach(([i, j]) => {
      if (!pose[i] || !pose[j]) return;
      out += linha(pose[i], pose[j], alvo ? [alvo[i], alvo[j]] : null, cls);
    });
    // Pescoço e cabeça
    out += linha(pose.omb, pose.cab, alvo ? [alvo.omb, alvo.cab] : null, cls);
    out += `<circle class="${cls} cabeca" cx="${pose.cab[0]}" cy="${pose.cab[1]}" r="8">${
      alvo ? anim('cx', pose.cab[0], alvo.cab[0]) + anim('cy', pose.cab[1], alvo.cab[1]) : ''}</circle>`;
    return out;
  };

  // Peso (anilha/halter) acompanha a mão; plataforma/rolo acompanham o pé
  const tipoPeso = pad.peso ? pad.peso.forma : peso === 'barra' ? 'anilha' : peso === 'halter' ? 'halter' : null;
  const ondePeso = pad.peso ? pad.peso.em : 'mao';
  let pesoSvg = '';
  if (tipoPeso && a[ondePeso]) {
    const [xa, ya] = a[ondePeso]; const [xb, yb] = b[ondePeso];
    const r = { anilha: 9, halter: 5, rolo: 5, plataforma: 0 }[tipoPeso];
    if (tipoPeso === 'plataforma') {
      pesoSvg = `<g class="peso"><rect x="-3" y="-16" width="6" height="32" rx="2" transform="rotate(-38)"/>${
        mover ? `<animateTransform attributeName="transform" type="translate" values="${xa} ${ya};${xb} ${yb};${xa} ${ya}" keyTimes="0;0.5;1" dur="${DUR}" repeatCount="indefinite" calcMode="spline" keySplines=".45 0 .55 1;.45 0 .55 1"/>` : ''}</g>`;
      if (!mover) pesoSvg = pesoSvg.replace('<g class="peso">', `<g class="peso" transform="translate(${xa} ${ya})">`);
    } else {
      pesoSvg = `<circle class="peso" cx="${xa}" cy="${ya}" r="${r}">${anim('cx', xa, xb)}${anim('cy', ya, yb)}</circle>`;
    }
  }

  let caboSvg = '';
  if (pad.cabo) {
    const [dx, dy] = pad.cabo.de;
    const pa = a[pad.cabo.ate]; const pb = b[pad.cabo.ate];
    caboSvg = `<line class="cabo" x1="${dx}" y1="${dy}" x2="${pa[0]}" y2="${pa[1]}">${anim('x2', pa[0], pb[0])}${anim('y2', pa[1], pb[1])}</line>`;
  }

  return `<svg class="figura" viewBox="0 0 200 160" role="img" aria-label="Ilustração do movimento">
    <line class="chao" x1="10" y1="152" x2="190" y2="152"/>
    <g class="aparelho">${pad.aparelho || ''}</g>
    ${animar ? `<g class="fantasma">${desenharPose(b, null, 'corpo')}</g>` : ''}
    ${caboSvg}
    <g>${desenharPose(a, mover ? b : null, 'corpo')}</g>
    ${pesoSvg}
  </svg>`;
}
