import { existsSync } from 'fs';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { MOCK_BIBLICAL_NODES } from '../src/data/mock-nodes';
import type { TimelineNode } from '../src/types';

const CONTENT_DIR = join(process.cwd(), 'content');

const SUMMARIES: Record<string, string> = {
  'EVT-0001': 'Deus cria os céus e a terra em seis dias. Adão e Eva são criados como o ápice da criação, com o dom do livre-arbítrio.',
  'EVT-0002': 'Jeová Deus traz um dilúvio global sobre a Terra para purificá-la da maldade. Noé, sua família e casais de animais são preservados na Arca.',
  'EVT-0003': 'A humanidade tenta erguer uma grande torre para desafiar a vontade divina. Deus confunde os idiomas e os dispersa.',
  'EVT-0004': 'Abrão obedece à ordem divina e deixa Ur dos Caldeus em direção a Canaã. Deus estabelece com ele uma aliança solene.',
  'EVT-0005': 'Moisés lidera os israelitas para fora da escravidão do Egito, atravessando milagrosamente o Mar Vermelho em terra seca.',
  'EVT-0006': 'Jeová Deus entrega a Lei e os Dez Mandamentos ao povo de Israel por intermédio de Moisés no Monte Sinai.',
  'EVT-0007': 'Sob a liderança de Josué, a nova geração de Israel atravessa o rio Jordão e inicia a conquista da Terra Prometida.',
  'EVT-0008': 'Saul é ungido pelo profeta Samuel como o primeiro rei de Israel unido.',
  'EVT-0009': 'O jovem Davi é ungido pelo profeta Samuel como o futuro rei de Israel por escolha direta de Jeová.',
  'EVT-0010': 'Salomão assume o trono de seu pai, Davi, iniciando um reinado marcado por sabedoria e prosperidade.',
  'EVT-0011': 'Salomão constrói o majestoso templo de Jerusalém dedicado ao culto de Jeová Deus.',
  'EVT-0012': 'Após a morte de Salomão, a nação se divide no Reino do Norte (Israel) e Reino do Sul (Judá).',
  'EVT-0013': 'Isaías profetiza ativamente em Judá, trazendo fortes alertas morais e profecias sobre o Messias.',
  'EVT-0014': 'O Reino de Judá é levado ao exílio em Babilônia pelo rei Nabucodonosor.',
  'EVT-0015': 'Jerusalém e seu templo são completamente destruídos pelos exércitos de Babilônia em 607 a.C.',
  'EVT-0016': 'Ciro, o Grande, emite o decreto histórico permitindo o retorno dos judeus exilados para reconstruir Jerusalém.',
  'EVT-0017': 'Os exilados retornam sob a liderança de Zorobabel e concluem a reconstrução do segundo templo.',
  'EVT-0018': 'Jesus nasce em Belém da Judeia, cumprindo profecias bíblicas de que o Messias viria da linhagem de Davi.',
  'EVT-0019': 'Jesus é batizado por João Batista no rio Jordão, sendo ungido com espírito santo como o Messias.',
  'EVT-0020': 'Jesus profere o famoso Sermão do Monte, estabelecendo princípios profundos sobre o Reino de Deus.',
  'EVT-0021': 'Jesus se transfigura diante de Pedro, Tiago e João em um monte alto, confirmando sua glória real.',
  'EVT-0022': 'Jesus morre no madeiro de tortura como sacrifício de resgate pelos pecados da humanidade, cumprindo as profecias messiânicas.',
  'EVT-0023': 'No terceiro dia após sua morte, Jesus ressuscita — garantia da ressurreição futura para toda a humanidade.',
  'EVT-0024': 'O espírito santo é derramado sobre os discípulos em Jerusalém no dia de Pentecostes, marcando o início da pregação cristã organizada.',
  'EVT-0025': 'Saulo de Tarso tem uma visão milagrosa de Jesus ressuscitado na estrada de Damasco e se converte ao cristianismo.',
  'EVT-0026': 'Paulo inicia sua primeira jornada missionária pela Ásia Menor, estabelecendo congregações cristãs.',
  'EVT-0027': 'Os apóstolos e anciãos se reúnem em Jerusalém para decidir a questão da circuncisão entre os cristãos não judeus.',
  'EVT-0028': 'Paulo viaja pela Grécia e Ásia Menor em sua segunda viagem, fortalecendo a fé cristã.',
  'EVT-0029': 'Jerusalém e seu templo são destruídos pelos exércitos romanos sob General Tito, em cumprimento exato da profecia de Jesus.',
  'EVT-0030': 'O apóstolo João recebe visões proféticas impressionantes registradas no livro de Apocalipse (Revelação).',
  'CHAR-0001': 'Líder escolhido por Deus para guiar Israel para fora do Egito e receber as tábuas da Lei no Sinai.',
  'CHAR-0002': 'O segundo rei de Israel, descrito como um homem segundo o coração de Deus e ancestral direto de Jesus Cristo.',
  'CHAR-0003': 'Profeta fiel exilado em Babilônia, conhecido por sua integridade na cova dos leões e visões proféticas globais.',
  'CHAR-0004': 'O precursor do Messias, batizando Jesus no rio Jordão e preparando o caminho para seu ministério.',
  'PLACE-0001': 'O lar original do primeiro casal humano criado por Deus, localizado no Oriente Médio.',
  'PLACE-0002': 'A cidade de Davi, capital do reino unido de Israel e o centro espiritual de reconstrução pós-exílio.',
  'PER-0001': 'Período em que juízes fiéis libertavam Israel da opressão de nações vizinhas.',
  'PER-0002': 'O apogeu da nação de Israel sob o governo unido dos reis Saul, Davi e Salomão.',
  'PER-0003': 'Intervalo cronológico sem novos livros bíblicos inspirados, entre Malaquias e o nascimento de Jesus.',
  'PER-0004': 'Período intensivo de pregação e milagres de Jesus na Judeia, Galileia e Samaria.'
};

async function migrate() {
  await mkdir(CONTENT_DIR, { recursive: true });
  console.log(`[migrate-mocks] Migrando ${MOCK_BIBLICAL_NODES.length} nós de dados...`);
  
  for (const node of MOCK_BIBLICAL_NODES) {
    const filename = `${node.id}-${node.slug}.md`;
    const filepath = join(CONTENT_DIR, filename);
    
    // Frontmatter fields
    const fm = [
      `---`,
      `id: ${node.id}`,
      `type: ${node.type}`,
      `title: "${node.title}"`,
      `slug: ${node.slug}`,
      `date_start: ${node.date_start}`,
      `date_end: ${node.date_end}`,
      `date_precision: ${node.date_precision}`,
      `date_display: "${node.date_display}"`,
      `uncertainty_years: ${node.uncertainty_years}`,
      `importance: ${node.importance}`,
      node.tags ? `tags:\n${node.tags.map(t => `  - ${t}`).join('\n')}` : '',
      node.scripture_refs ? `scripture_refs:\n${node.scripture_refs.map(r => `  - "${r}"`).join('\n')}` : '',
      `---`
    ].filter(Boolean).join('\n');
    
    const summary = SUMMARIES[node.id] || `Descrição detalhada do nó ${node.title}.`;
    const fullContent = `${fm}\n\n${summary}\n`;
    
    await writeFile(filepath, fullContent, 'utf-8');
  }
  
  console.log(`[migrate-mocks] ✅ Migração concluída com sucesso! Todos os arquivos .md criados em /content/`);
}

migrate().catch(console.error);