import { expect, test, type Page } from '@playwright/test'

const shot = (page: Page, name: string) =>
  process.env.E2E_SCREENSHOTS ? page.screenshot({ path: `${process.env.E2E_SCREENSHOTS}/${test.info().project.name}-${name}.png`, fullPage: true }) : Promise.resolve()

/**
 * Critério de sucesso do projeto: fluxo completo de ponta a ponta,
 * do onboarding ao progresso atualizado.
 */
test('onboarding → cargo → disciplina → assunto → resumo → conclusão → progresso → busca', async ({ page, isMobile }) => {
  // 1. Abrir o aplicativo
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /Prepare-se para conquistar sua/ })).toBeVisible()
  await shot(page, '01-landing')
  await page.getByRole('link', { name: /Começar minha preparação/ }).click()

  // 2. Carreira
  await expect(page.getByRole('heading', { name: 'Qual carreira você deseja seguir?' })).toBeVisible()
  await shot(page, '02-carreira')
  await page.getByRole('button', { name: /^Área Fiscal/ }).click()

  // 3–4. Abrangência + estado
  await expect(page.getByRole('heading', { name: 'Onde você pretende prestar concurso?' })).toBeVisible()
  await page.getByRole('radio', { name: /^Estadual/ }).click()
  await page.getByRole('button', { name: 'São Paulo' }).click()
  await shot(page, '03-abrangencia')
  await page.getByRole('button', { name: /Continuar/ }).click()

  // 5. Cargo (com busca)
  await expect(page.getByRole('heading', { name: 'Qual cargo?' })).toBeVisible()
  await page.getByLabel('Pesquisar cargo').fill('auditor')
  await shot(page, '04-cargo')
  await page.getByRole('button', { name: /^Auditor Fiscal Edital em SP/ }).click()

  await expect(page.getByRole('heading', { name: 'Seu plano de estudos está pronto.' })).toBeVisible()
  await expect(page.getByText('Auditor Fiscal — SEFAZ SP')).toBeVisible()
  await shot(page, '05-plano-pronto')
  await page.getByRole('button', { name: /Começar a estudar/ }).click()

  // Dashboard
  await expect(page).toHaveURL(/\/dashboard$/)
  await expect(page.getByRole('heading', { name: 'Auditor Fiscal', level: 1 })).toBeVisible()
  await expect(page.getByText('Continue de onde parou').or(page.getByText('Comece por aqui')).first()).toBeVisible()
  await shot(page, '06-dashboard')

  // 6–7. Disciplinas → abrir Direito Tributário
  if (isMobile) {
    await page.getByRole('button', { name: 'Abrir menu' }).click()
  }
  await page.getByRole('navigation', { name: 'Navegação principal' }).getByRole('link', { name: 'Disciplinas' }).click()
  await expect(page).toHaveURL(/\/disciplinas$/)
  await shot(page, '07-disciplinas')
  await page.getByRole('link', { name: /Direito Tributário/ }).first().click()
  await expect(page.getByRole('heading', { name: 'Direito Tributário', level: 1 })).toBeVisible()
  const subjectProgress = page.getByRole('progressbar', { name: 'Progresso em Direito Tributário' })
  await expect(subjectProgress).toHaveAttribute('aria-valuenow', '0')
  await shot(page, '08-disciplina')

  // 8–9. Assuntos → abrir um assunto
  await page.getByRole('link', { name: /Crédito tributário: constituição e lançamento/ }).first().click()
  await expect(page.getByRole('heading', { name: 'Crédito tributário: constituição e lançamento', level: 1 })).toBeVisible()

  // 10–11. Criar e salvar resumo
  const editor = page.getByRole('textbox', { name: 'Meu resumo' })
  await editor.click()
  await page.keyboard.type('Lançamento é ato privativo da autoridade administrativa. ')
  await page.keyboard.press('ControlOrMeta+b')
  await page.keyboard.type('Art. 142 do CTN.')
  await expect(page.getByText('Alterações não salvas')).toBeVisible()
  await page.getByRole('button', { name: /^Salvar/ }).click()
  await expect(page.getByText('Resumo salvo!')).toBeVisible()
  await shot(page, '09-assunto-resumo')

  // 12. Editar o resumo (após recarregar, o conteúdo persiste)
  await page.reload()
  await expect(page.getByRole('textbox', { name: 'Meu resumo' }).locator('strong')).toHaveText('Art. 142 do CTN.')
  // Sem campo de pegadinhas nos resumos novos
  await expect(page.getByRole('textbox', { name: 'Pegadinhas' })).toHaveCount(0)
  await page.getByRole('textbox', { name: 'Observações' }).click()
  await page.keyboard.type('Lançamento não é constitutivo do crédito para todas as bancas.')
  await page.getByRole('button', { name: /^Salvar/ }).click()
  await expect(page.getByText('Resumo salvo!').first()).toBeVisible()

  // 13. Marcar como concluído
  await page.getByRole('button', { name: /Marcar como concluído|Concluir/ }).click()
  await expect(page.getByText('Assunto concluído!')).toBeVisible()
  await expect(page.getByRole('radio', { name: /Concluído/ })).toHaveAttribute('aria-checked', 'true')

  // 14. Barra de progresso da disciplina atualizada
  await page.getByRole('link', { name: 'Voltar para disciplina' }).first().click()
  await expect(subjectProgress).toHaveAttribute('aria-valuenow', '6')
  await expect(page.getByText(/de 16 assuntos concluídos/)).toBeVisible()

  // Alterna outro assunto direto da lista
  await page.getByRole('button', { name: 'Marcar "Competência tributária" como concluído' }).click()
  await expect(subjectProgress).toHaveAttribute('aria-valuenow', '13')
  await shot(page, '10-disciplina-progresso')

  // 15. Progresso geral do cargo atualizado
  await page.goto('/progresso')
  await expect(page.getByRole('heading', { name: 'Minha preparação' })).toBeVisible()
  await expect(page.getByText('Concluídos recentemente')).toBeVisible()
  await expect(page.getByRole('link', { name: /Competência tributária/ })).toBeVisible()
  await shot(page, '11-progresso')

  // 16. Navegar entre disciplinas e assuntos
  await page.goto('/disciplina/direito-tributario')
  await page.getByRole('link', { name: /Próxima/ }).click()
  await expect(page).toHaveURL(/\/disciplina\/(?!direito-tributario)/)

  // 17. Pesquisar assuntos (busca global)
  await page.getByRole('button', { name: /Pesquisar/ }).first().click()
  await page.getByRole('combobox', { name: 'Pesquisar' }).fill('crédito')
  await expect(page.getByRole('option', { name: /Suspensão do crédito tributário/ })).toBeVisible()
  await expect(page.getByRole('option', { name: /Extinção do crédito tributário/ })).toBeVisible()
  await shot(page, '12-busca')
  await page.getByRole('option', { name: /Suspensão do crédito tributário/ }).click()
  await expect(page.getByRole('heading', { name: 'Suspensão do crédito tributário', level: 1 })).toBeVisible()

  // 18. Visualizar os próprios resumos
  await page.goto('/resumos')
  await expect(page.getByRole('link', { name: 'Crédito tributário: constituição e lançamento' })).toBeVisible()
  await expect(page.getByText(/Lançamento é ato privativo/)).toBeVisible()
  await shot(page, '13-resumos')

  // Dashboard reflete tudo
  await page.goto('/dashboard')
  await expect(page.getByText('Continue de onde parou')).toBeVisible()
  await shot(page, '14-dashboard-final')
})

const seedUser = (page: Page) =>
  page.evaluate(() => {
    localStorage.setItem(
      'concursos.user.v1',
      JSON.stringify({
        profile: { id: 'e2e', name: 'Ana', email: null, createdAt: new Date().toISOString() },
        selection: { positionId: 'analista-ti', sphere: 'federal', state: null, createdAt: new Date().toISOString() },
        topics: {},
        summaries: {},
      }),
    )
  })

/** Gera um PDF mínimo (texto em Helvetica, uma linha por item) para testar o upload. */
function makePdf(lines: string[]): Buffer {
  const esc = (t: string) => t.replace(/[\\()]/g, '\\$&')
  const content = `BT /F1 10 Tf 40 800 Td 14 TL ${lines.map((l) => `(${esc(l)}) Tj T*`).join(' ')} ET`
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
  ]
  let pdf = '%PDF-1.4\n'
  const offsets: number[] = []
  objects.forEach((body, i) => {
    offsets.push(pdf.length)
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`
  })
  const xref = pdf.length
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`
  return Buffer.from(pdf, 'latin1')
}

test('importar edital em PDF identifica disciplinas, assuntos e dados do edital', async ({ page }) => {
  await page.goto('/')
  await seedUser(page)
  await page.goto('/concursos?importar=1')

  const pdf = makePdf([
    'TRIBUNAL DE CONTAS DA UNIAO',
    'EDITAL No 1 - TCU, DE 10 DE MARCO DE 2025',
    '1.1 O concurso sera executado pelo Cebraspe.',
    '12 DOS OBJETOS DE AVALIACAO',
    'CIENCIA DE DADOS: 1 Estatistica descritiva. 2 Regressao linear. 2.1 Minimos quadrados.',
    'GOVERNANCA DE TI: 1 COBIT. 2 ITIL.',
    'ANEXO I',
    'CRONOGRAMA PREVISTO',
  ])
  await page.locator('#notice-file').setInputFiles({ name: 'edital-tcu.pdf', mimeType: 'application/pdf', buffer: pdf })

  await expect(page.getByText(/Encontramos/)).toContainText('2 disciplinas')
  await expect(page.getByText(/Encontramos/)).toContainText('12 DOS OBJETOS DE AVALIACAO')
  await expect(page.locator('#board')).toHaveValue('Cebraspe')
  await expect(page.locator('#year')).toHaveValue('2025')
  await expect(page.locator('#org-short')).toHaveValue('TCU')

  // Revisão: desmarca uma disciplina e transforma subitens em assuntos
  await page.getByRole('checkbox', { name: 'Importar Governanca de TI' }).uncheck()
  await page.getByRole('radio', { name: /Transformar em assuntos/ }).click()
  await expect(page.getByText('1 disciplinas · 2 assuntos')).toBeVisible()
  await page.getByRole('button', { name: 'Importar para meu plano' }).click()
  await expect(page.getByText('Edital importado!')).toBeVisible()

  await page.goto('/disciplinas')
  await expect(page.getByRole('link', { name: /Ciencia de Dados/ })).toBeVisible()
  await expect(page.getByRole('link', { name: /Governanca de TI/ })).toHaveCount(0)
})

test('importar PDF funciona no Safari e em navegadores sem os recursos mais novos de JavaScript', async ({ page }) => {
  // Simula Safari/Chrome/Firefox que ainda não têm estes recursos (exigidos pelo build moderno do pdf.js)
  await page.addInitScript(() => {
    const drop = (obj: object, key: string | symbol) => Reflect.deleteProperty(obj, key)
    drop(Map.prototype, 'getOrInsertComputed')
    drop(WeakMap.prototype, 'getOrInsertComputed')
    drop(Promise, 'withResolvers')
    drop(Uint8Array.prototype, 'toBase64')
    drop(Uint8Array, 'fromBase64')
    // Safari não permite percorrer ReadableStream com for await
    drop(ReadableStream.prototype, Symbol.asyncIterator)
    drop(ReadableStream.prototype, 'values')
  })
  await page.goto('/')
  await seedUser(page)
  await page.goto('/concursos?importar=1')
  await page.locator('#notice-file').setInputFiles({
    name: 'edital.pdf',
    mimeType: 'application/pdf',
    buffer: makePdf(['12 DOS OBJETOS DE AVALIACAO', 'CIENCIA DE DADOS: 1 Estatistica descritiva. 2 Regressao linear.']),
  })
  await expect(page.getByText(/Encontramos/)).toContainText('1 disciplinas e 2 assuntos')
})

test('importar edital colando o texto', async ({ page }) => {
  await page.goto('/')
  await seedUser(page)
  await page.goto('/concursos?importar=1')
  await page.getByRole('tab', { name: /Colar texto/ }).click()
  await page.getByLabel('Texto do edital ou do conteúdo programático').fill(
    'CIÊNCIA DE DADOS (peso 2): 1 Estatística descritiva. 2 Regressão linear. 2.1 Mínimos quadrados.',
  )
  await page.getByRole('button', { name: /Identificar disciplinas/ }).click()
  await expect(page.getByText(/Encontramos/)).toContainText('1 disciplinas')
  await page.locator('#org-short').fill('TCU')
  await page.getByRole('button', { name: 'Importar para meu plano' }).click()
  await expect(page.getByText('Edital importado!')).toBeVisible()

  await page.goto('/disciplinas')
  await page.getByRole('link', { name: /Ciência de Dados/ }).click()
  await page.getByRole('link', { name: /Regressão linear/ }).first().click()
  await expect(page.getByText('O que o edital cobra')).toBeVisible()
  await expect(page.getByText('Mínimos quadrados')).toBeVisible()
})

test('cria mapa mental a partir do resumo do assunto', async ({ page, isMobile }) => {
  await page.goto('/')
  await page.evaluate(() => {
    localStorage.setItem(
      'concursos.user.v1',
      JSON.stringify({
        profile: { id: 'e2e', name: 'Ana', email: null, createdAt: new Date().toISOString() },
        selection: { positionId: 'auditor-fiscal-estadual', sphere: 'estadual', state: 'SP', createdAt: new Date().toISOString() },
        topics: {},
        summaries: {},
      }),
    )
  })
  await page.goto('/assunto/direito-constitucional__remedios-constitucionais')

  // Sem texto: orienta a escrever primeiro
  await page.getByRole('button', { name: 'Criar mapa mental' }).first().click()
  await expect(page.getByText('Escreva seu resumo primeiro')).toBeVisible()
  await page.keyboard.press('Escape')

  // Texto ainda não salvo já entra no mapa
  const summary = page.getByRole('textbox', { name: 'Meu resumo' })
  await summary.click()
  await page.keyboard.type('Remédios constitucionais são ações que protegem direitos fundamentais.')
  await page.keyboard.press('Enter')
  await page.keyboard.type('## Habeas corpus')
  await page.keyboard.press('Enter')
  await page.keyboard.type('- O que é: protege a liberdade de locomoção')
  await page.keyboard.press('Enter')
  await page.keyboard.type('Gratuito e dispensa advogado')
  await page.keyboard.press('Enter')
  await page.keyboard.press('Enter')
  await page.keyboard.type('## Mandado de segurança')
  await page.keyboard.press('Enter')
  await page.keyboard.type('- Prazo: 120 dias')
  await page.keyboard.press('Enter')
  await page.keyboard.type('Direito líquido e certo')
  await page.getByRole('textbox', { name: 'Pontos importantes' }).click()
  await page.keyboard.type('Pessoa jurídica não propõe ação popular')

  await page.getByRole('button', { name: 'Criar mapa mental' }).first().click()
  const dialog = page.getByRole('dialog', { name: 'Mapa mental' })
  const map = dialog.getByRole('img', { name: 'Mapa mental: Remédios constitucionais' })
  await expect(map).toBeVisible()
  // Um cartão por título, com os tópicos; a primeira frase vira a definição no centro
  for (const text of ['HABEAS CORPUS', 'O que é', 'Prazo', 'Gratuito e dispensa advogado'])
    await expect(map.getByText(text, { exact: true })).toHaveCount(1)
  await expect(map.getByText(/^MANDADO DE/)).toHaveCount(1)
  await expect(map.getByText(/^PONTOS/)).toHaveCount(1)
  await expect(map.getByText(/protegem direitos/)).toHaveCount(1)
  await expect(map.getByText(/Pessoa jurídica/)).toHaveCount(1)
  await shot(page, 'mapa-mental')

  if (!isMobile) {
    const download = page.waitForEvent('download')
    await dialog.getByRole('button', { name: /Baixar JPEG/ }).click()
    expect((await download).suggestedFilename()).toBe('mapa-mental-remedios-constitucionais.jpg')
  }
})

test('Meus concursos: troca entre concursos já abertos mantendo o progresso', async ({ page, isMobile }) => {
  const start = async (career: RegExp, sphere: RegExp, position: RegExp, uf?: string) => {
    await page.goto('/onboarding')
    await page.getByRole('button', { name: career }).click()
    await page.getByRole('radio', { name: sphere }).click()
    if (uf) await page.getByRole('button', { name: uf }).click()
    await page.getByRole('button', { name: /Continuar/ }).click()
    await page.getByRole('button', { name: position }).first().click()
    await page.getByRole('button', { name: /Começar a estudar/ }).click()
    await expect(page).toHaveURL(/\/dashboard$/)
  }

  await start(/^Área Fiscal/, /^Estadual/, /^Auditor Fiscal Edital em SP/, 'São Paulo')
  await page.goto('/assunto/direito-tributario__competencia-tributaria')
  await page.getByRole('button', { name: /Marcar como concluído|Concluir/ }).click()
  await expect(page.getByText('Assunto concluído!')).toBeVisible()

  await start(/^Policial/, /^Federal/, /^Agente de Polícia Federal/)

  // O onboarding oferece voltar aos concursos já abertos
  await page.goto('/onboarding')
  await expect(page.getByText('Continuar um concurso que você já abriu')).toBeVisible()

  // Recarrega o app: tudo continua salvo
  await page.goto('/dashboard')
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Agente de Polícia Federal', level: 1 })).toBeVisible()

  await page.getByRole('button', { name: 'Trocar concurso' }).filter({ visible: true }).first().click()
  const dialog = page.getByRole('dialog', { name: 'Trocar concurso' })
  await expect(dialog.getByText('Agente de Polícia Federal — PF')).toBeVisible()
  await expect(dialog.getByText('Atual')).toBeVisible()
  const fiscal = dialog.getByRole('button', { name: /Auditor Fiscal — SEFAZ SP/ })
  await expect(fiscal).toContainText('1 concluídos')
  await fiscal.click()

  await expect(page).toHaveURL(/\/dashboard$/)
  await expect(page.getByRole('heading', { name: 'Auditor Fiscal', level: 1 })).toBeVisible()
  await expect(page.getByText('1 / 127')).toBeVisible()
  if (isMobile) return
  await page.getByRole('link', { name: 'Meu concurso' }).click()
  await expect(page.getByRole('region', { name: 'Meus concursos' }).getByText('Agente de Polícia Federal — PF')).toBeVisible()
})

test('flashcards: gera do resumo, edita, estuda com revisão espaçada e aparece na disciplina', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => {
    const topicId = 'direito-constitucional__remedios-constitucionais'
    localStorage.setItem(
      'concursos.user.v1',
      JSON.stringify({
        profile: { id: 'e2e', name: 'Ana', email: null, createdAt: new Date().toISOString() },
        selection: { positionId: 'auditor-fiscal-estadual', sphere: 'estadual', state: 'SP', createdAt: new Date().toISOString() },
        history: [],
        topics: {},
        flashcards: {},
        summaries: {
          [topicId]: {
            topicId,
            plainText: 'x',
            updatedAt: new Date().toISOString(),
            content: {
              summary:
                '<h2>Mandado de segurança</h2><ul><li><p>Prazo de <strong>120 dias</strong> para impetrar.</p></li><li><p>Coletivo: partido político ou sindicato</p></li></ul>',
              keyPoints: '',
              pitfalls: '<p>Não cabe habeas corpus em punição disciplinar militar.</p>',
              notes: '',
            },
          },
        },
      }),
    )
  })
  await page.goto('/assunto/direito-constitucional__remedios-constitucionais')
  // Resumo antigo com texto em Pegadinhas: o campo continua visível para não esconder o conteúdo
  await expect(page.getByRole('textbox', { name: 'Pegadinhas' })).toContainText('Não cabe habeas corpus')
  await page.getByRole('button', { name: /^Flashcards/ }).click()

  const dialog = page.getByRole('dialog', { name: 'Flashcards' })
  await expect(dialog.getByText('Prazo de _____ para impetrar')).toBeVisible()
  await expect(dialog.getByText('Coletivo', { exact: true })).toBeVisible()
  // Desmarca uma sugestão e adiciona as outras
  await dialog.locator('label', { hasText: 'Coletivo' }).getByRole('checkbox').uncheck()
  await dialog.getByRole('button', { name: /Adicionar 2 ao baralho/ }).click()
  await expect(page.getByText('2 cartões adicionados')).toBeVisible()

  // Cartão manual
  await dialog.getByRole('button', { name: /Cartão manual/ }).click()
  await dialog.getByLabel('Frente (pergunta)').fill('Qual remédio protege a liberdade de locomoção?')
  await dialog.getByLabel('Verso (resposta)').fill('Habeas corpus')
  await dialog.getByRole('button', { name: 'Salvar cartão' }).click()
  await expect(dialog.getByText('Qual remédio protege a liberdade de locomoção?')).toBeVisible()

  // Estudar: 3 cartões vencidos
  await dialog.getByRole('button', { name: /Estudar 3 cartões/ }).click()
  const session = page.getByRole('dialog', { name: /Flashcards · Remédios constitucionais/ })
  await expect(session.getByText('Cartão 1 de 3')).toBeVisible()
  await session.getByRole('button', { name: 'Mostrar resposta' }).click()
  await session.getByRole('button', { name: /^Acertei/ }).click()
  await page.keyboard.press(' ')
  await page.keyboard.press('1') // Errei: volta ao fim da fila
  await expect(session.getByText('Cartão 3 de 4')).toBeVisible()
  await page.keyboard.press(' ')
  await page.keyboard.press('4')
  await page.keyboard.press(' ')
  await page.keyboard.press('3')
  await expect(session.getByText('4 revisões feitas')).toBeVisible()
  await session.getByRole('button', { name: 'Concluir' }).click()

  // Persistência + resumo na disciplina
  await page.reload()
  await expect(page.getByRole('button', { name: /^Flashcards 3/ })).toBeVisible()
  await page.goto('/disciplina/direito-constitucional')
  await expect(page.getByText(/3 cartões em 1 assunto · 0 para revisar agora/)).toBeVisible()
})

test('livro em PDF preenche o resumo do assunto e os resumos da disciplina', async ({ page }) => {
  await page.goto('/')
  await seedUser(page)
  await page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem('concursos.user.v1')!)
    raw.selection = { positionId: 'auditor-fiscal-estadual', sphere: 'estadual', state: 'SP', createdAt: new Date().toISOString() }
    localStorage.setItem('concursos.user.v1', JSON.stringify(raw))
  })
  // Livro fictício, uma frase por linha (texto ASCII para a fonte padrão do PDF)
  const book = makePdf([
    'CAPITULO 7 - REMEDIOS CONSTITUCIONAIS',
    'Os remedios constitucionais sao garantias que protegem direitos fundamentais contra abusos.',
    'O habeas corpus protege a liberdade de locomocao e pode ser impetrado por qualquer pessoa.',
    'O mandado de seguranca deve ser impetrado no prazo de 120 dias contados da ciencia do ato.',
    'Nao cabe habeas corpus em relacao a punicoes disciplinares militares, salvo quanto a legalidade.',
    'O habeas data assegura o conhecimento de informacoes pessoais constantes de registros publicos.',
    'CAPITULO 8 - PODER LEGISLATIVO',
    'O Poder Legislativo federal e exercido pelo Congresso Nacional, composto pela Camara e pelo Senado.',
    'As comissoes parlamentares de inquerito tem poderes de investigacao proprios das autoridades judiciais.',
  ])

  // 1. Assunto: preenche os campos no editor
  await page.goto('/assunto/direito-constitucional__remedios-constitucionais')
  await page.getByRole('button', { name: /Preencher com livro/ }).click()
  const dialog = page.getByRole('dialog', { name: /Preencher com livro/ })
  await dialog.locator('#topic-book-file').setInputFiles({ name: 'constitucional.pdf', mimeType: 'application/pdf', buffer: book })
  await expect(dialog.getByText(/Encontrado: p\. 1/)).toBeVisible()
  await dialog.getByRole('button', { name: 'Preencher campos' }).click()
  await expect(page.getByText('Campos preenchidos')).toBeVisible()
  await expect(page.getByRole('textbox', { name: 'Meu resumo' })).toContainText('habeas corpus protege a liberdade')
  await expect(page.getByRole('textbox', { name: 'Meu resumo' })).not.toContainText('Congresso Nacional')
  await expect(page.getByRole('textbox', { name: 'Pontos importantes' })).toContainText('Nao cabe habeas corpus')
  await expect(page.getByRole('textbox', { name: 'Pegadinhas' })).toHaveCount(0)
  await expect(page.getByRole('textbox', { name: 'Pontos importantes' }).locator('strong')).toContainText('120 dias')
  await expect(page.getByRole('textbox', { name: 'Observações' })).toContainText('constitucional')
  await page.getByRole('button', { name: /^Salvar/ }).click()
  await expect(page.getByText('Resumo salvo!')).toBeVisible()

  // 2. Disciplina: preenche vários assuntos de uma vez (o livro continua carregado)
  await page.getByRole('link', { name: 'Voltar para disciplina' }).first().click()
  await page.getByRole('button', { name: /Enviar livro \(PDF\)/ }).click()
  const batch = page.getByRole('dialog', { name: /Preencher resumos com livro/ })
  await expect(batch.getByText('constitucional', { exact: true })).toBeVisible()
  await expect(batch.getByRole('checkbox', { name: 'Preencher Poder Legislativo' })).toBeChecked()
  // Já tem resumo: fica desmarcado por padrão
  await expect(batch.getByRole('checkbox', { name: 'Preencher Remédios constitucionais' })).not.toBeChecked()
  await batch.getByRole('button', { name: /Preencher \d+ assunto/ }).click()
  await expect(page.getByText(/resumos? preenchidos?/)).toBeVisible()

  await page.goto('/resumos')
  await expect(page.getByRole('link', { name: 'Poder Legislativo' })).toBeVisible()
})

test('assistentes: resumir, criar questões (com placar no progresso) e explicar com o livro', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => {
    const topicId = 'direito-constitucional__remedios-constitucionais'
    localStorage.setItem(
      'concursos.user.v1',
      JSON.stringify({
        profile: { id: 'e2e', name: 'Ana', email: null, createdAt: new Date().toISOString() },
        selection: { positionId: 'auditor-fiscal-estadual', sphere: 'estadual', state: 'SP', createdAt: new Date().toISOString() },
        history: [],
        topics: {},
        flashcards: {},
        summaries: {
          [topicId]: {
            topicId,
            plainText: 'x',
            updatedAt: new Date().toISOString(),
            content: {
              summary:
                '<h2>Mandado de segurança</h2><ul><li><p>O mandado de segurança deve ser impetrado em 120 dias.</p></li><li><p>O habeas corpus é gratuito e dispensa advogado.</p></li></ul>',
              keyPoints: '<ul><li><p>O habeas data assegura o acesso a informações pessoais.</p></li><li><p>Não cabe habeas corpus em punição disciplinar militar.</p></li></ul>',
              pitfalls: '',
              notes: '',
            },
          },
        },
      }),
    )
  })
  await page.goto('/assunto/direito-constitucional__remedios-constitucionais')
  await expect(page.getByText('em breve')).toHaveCount(0)

  // 1. Resumir conteúdo → adiciona ao "Meu resumo"
  await page.getByRole('button', { name: /Resumir conteúdo/ }).click()
  const summarize = page.getByRole('dialog', { name: /Resumir conteúdo/ })
  await summarize.getByRole('button', { name: 'Resumir' }).click()
  await expect(summarize.getByText('Resumo rápido — Remédios constitucionais')).toBeVisible()
  await summarize.getByRole('button', { name: 'Adicionar ao Meu resumo' }).click()
  await expect(page.getByRole('textbox', { name: 'Meu resumo' })).toContainText('Resumo rápido')

  // 2. Criar questões: Certo/Errado gerado das anotações, corrigido na hora
  await page.getByRole('button', { name: /^Questões$/ }).click()
  const quiz = page.getByRole('dialog', { name: 'Questões' })
  await quiz.getByRole('button', { name: 'Gerar questões' }).click()
  const items = quiz.getByRole('listitem')
  await expect(items.first()).toBeVisible()
  const total = await items.count()
  expect(total).toBeGreaterThanOrEqual(3)
  await items.nth(0).getByRole('button', { name: 'Certo' }).click()
  await expect(items.nth(0).getByRole('status')).toContainText('Você acertou.')
  await items.nth(1).getByRole('button', { name: 'Certo' }).click()
  await expect(items.nth(1).getByRole('status')).toContainText('Você errou.')
  await expect(quiz.getByText(/2 de \d+ respondidas/)).toBeVisible()
  await expect(quiz.getByText(/desempenho no assunto: 1 de 2/)).toBeVisible()
  await page.keyboard.press('Escape')

  // Placar persistido e visível no progresso
  await page.goto('/progresso')
  await expect(page.getByText('Desempenho em questões')).toBeVisible()
  await expect(page.getByText('1/2 · 50%')).toBeVisible()

  // 3. Explicar assunto: sem Claude, mostra o que o livro diz
  await page.goto('/assunto/direito-constitucional__remedios-constitucionais')
  await page.getByRole('button', { name: /Explicar assunto/ }).click()
  const explain = page.getByRole('dialog', { name: /Explicar assunto/ })
  const book = makePdf([
    'CAPITULO 7 - REMEDIOS CONSTITUCIONAIS',
    'Os remedios constitucionais sao garantias que protegem direitos fundamentais contra abusos.',
    'O habeas corpus protege a liberdade de locomocao e pode ser impetrado por qualquer pessoa.',
    'O mandado de seguranca deve ser impetrado no prazo de 120 dias contados da ciencia do ato.',
  ])
  await explain.locator('#explain-book-file').setInputFiles({ name: 'constitucional.pdf', mimeType: 'application/pdf', buffer: book })
  await explain.getByRole('button', { name: /O que o livro diz/ }).click()
  await expect(explain.getByText(/habeas corpus protege a liberdade/)).toBeVisible()
  await explain.getByRole('button', { name: 'Salvar em Observações' }).click()
  await expect(page.getByRole('textbox', { name: 'Observações' })).toContainText('Explicação')
})

test('temas do assunto: cria, escreve com salvamento automático, reordena e exclui', async ({ page }) => {
  await page.goto('/')
  await seedUser(page)
  await page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem('concursos.user.v1')!)
    raw.selection = { positionId: 'auditor-fiscal-estadual', sphere: 'estadual', state: 'SP', createdAt: new Date().toISOString() }
    localStorage.setItem('concursos.user.v1', JSON.stringify(raw))
  })
  await page.goto('/assunto/direito-constitucional__remedios-constitucionais')
  const themes = page.getByRole('region', { name: 'Temas do assunto' })
  await expect(themes.getByText('Nenhum tema ainda')).toBeVisible()

  // Primeiro tema
  await themes.getByRole('button', { name: 'Adicionar tema' }).click()
  await themes.getByLabel('Nome do novo tema').fill('Habeas corpus')
  await themes.getByRole('button', { name: 'Criar tema' }).click()
  await themes.getByRole('textbox', { name: 'Resumo do tema Habeas corpus' }).click()
  await page.keyboard.type('Protege a liberdade de locomoção.')
  await themes.getByRole('textbox', { name: 'Pontos importantes do tema Habeas corpus' }).click()
  await page.keyboard.type('Gratuito e dispensa advogado.')
  await expect(themes.getByText('Salvo automaticamente')).toBeVisible()

  // Segundo tema (Enter cria)
  await themes.getByRole('button', { name: 'Adicionar tema' }).click()
  await themes.getByLabel('Nome do novo tema').fill('Mandado de segurança')
  await page.keyboard.press('Enter')
  await themes.getByRole('textbox', { name: 'Resumo do tema Mandado de segurança' }).click()
  await page.keyboard.type('Prazo de 120 dias.')
  await expect(themes.getByText('Salvo automaticamente')).toBeVisible()
  await shot(page, 'temas')

  // Persistência: recarrega e confere os cartões na ordem, com a prévia
  await page.reload()
  const cards = themes.getByRole('article')
  await expect(cards).toHaveCount(2)
  await expect(cards.nth(0)).toContainText('Habeas corpus')
  await expect(cards.nth(0)).toContainText('Protege a liberdade de locomoção.')
  await expect(cards.nth(1)).toContainText('Mandado de segurança')

  // Abre o segundo, sobe para o primeiro lugar
  await cards.nth(1).getByRole('button', { name: /Mandado de segurança/ }).click()
  await expect(themes.getByRole('textbox', { name: 'Resumo do tema Mandado de segurança' })).toContainText('Prazo de 120 dias.')
  await themes.getByRole('button', { name: 'Mover tema para cima' }).click()
  await expect(cards.nth(0)).toContainText('Mandado de segurança')

  // Os temas entram no mapa mental do assunto
  await page.getByRole('button', { name: 'Criar mapa mental' }).first().click()
  const map = page.getByRole('img', { name: /Mapa mental:/ })
  await expect(map.getByText('HABEAS CORPUS', { exact: true })).toHaveCount(1)
  await page.keyboard.press('Escape')

  // Excluir (com confirmação, pois tem conteúdo)
  await themes.getByRole('button', { name: 'Excluir tema' }).click()
  await page.getByRole('dialog', { name: 'Excluir tema?' }).getByRole('button', { name: 'Excluir' }).click()
  await expect(cards).toHaveCount(1)
  await page.reload()
  await expect(themes.getByRole('article')).toHaveCount(1)
})
