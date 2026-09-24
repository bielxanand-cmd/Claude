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
  await page.getByRole('textbox', { name: 'Pegadinhas' }).click()
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
  await page.getByRole('textbox', { name: 'Meu resumo' }).click()
  await page.keyboard.type('Habeas corpus: protege a liberdade de locomoção. Mandado de segurança: direito líquido e certo.')
  await page.getByRole('textbox', { name: 'Pegadinhas' }).click()
  await page.keyboard.type('Pessoa jurídica não propõe ação popular')

  await page.getByRole('button', { name: 'Criar mapa mental' }).first().click()
  const map = page.getByRole('img', { name: 'Mapa mental: Remédios constitucionais' })
  await expect(map).toBeVisible()
  for (const text of ['Meu resumo', 'Habeas corpus', 'Mandado de segurança', 'Pegadinhas'])
    await expect(map.getByText(text, { exact: true })).toHaveCount(1)
  // textos longos quebram em mais de uma linha dentro do nó
  await expect(map.getByText(/liberdade de/)).toHaveCount(1)
  await expect(map.getByText(/Pessoa jurídica/)).toHaveCount(1)

  if (!isMobile) {
    const download = page.waitForEvent('download')
    await page.getByRole('button', { name: /Baixar PNG/ }).click()
    expect((await download).suggestedFilename()).toBe('mapa-mental-remedios-constitucionais.png')
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
