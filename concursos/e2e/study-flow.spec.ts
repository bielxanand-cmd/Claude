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

  // 10–11. Sem os campos antigos: o resumo é escrito em temas (salvos automaticamente)
  await expect(page.getByRole('textbox', { name: 'Meu resumo' })).toHaveCount(0)
  await expect(page.getByRole('textbox', { name: 'Observações' })).toHaveCount(0)
  const themes = page.getByRole('region', { name: 'Temas do assunto' })
  await themes.getByRole('button', { name: 'Adicionar tema' }).click()
  await themes.getByLabel('Nome do novo tema').fill('Lançamento')
  await page.keyboard.press('Enter')
  await themes.getByRole('textbox', { name: 'Resumo do tema Lançamento' }).click()
  await page.keyboard.type('Lançamento é ato privativo da autoridade administrativa. ')
  await page.keyboard.press('ControlOrMeta+b')
  await page.keyboard.type('Art. 142 do CTN.')
  await expect(themes.getByText('Salvo automaticamente')).toBeVisible()
  await shot(page, '09-assunto-resumo')

  // 12. Após recarregar, o conteúdo persiste
  await page.reload()
  await themes.getByRole('button', { name: /Lançamento/ }).click()
  await expect(themes.getByRole('textbox', { name: 'Resumo do tema Lançamento' }).locator('strong')).toHaveText('Art. 142 do CTN.')

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
  await expect(page.getByText('Temas: Lançamento')).toBeVisible()
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

test('excluir um edital importado (os demonstrativos não podem ser excluídos)', async ({ page }) => {
  await page.goto('/')
  await seedUser(page)
  await page.goto('/concursos?importar=1')
  await page.getByRole('tab', { name: /Colar texto/ }).click()
  await page.getByLabel('Texto do edital ou do conteúdo programático').fill('CIÊNCIA DE DADOS (peso 2): 1 Estatística descritiva. 2 Regressão linear.')
  await page.getByRole('button', { name: /Identificar disciplinas/ }).click()
  await page.locator('#org-short').fill('TCU')
  await page.getByRole('button', { name: 'Importar para meu plano' }).click()
  await expect(page.getByText('Edital importado!')).toBeVisible()

  // Só o edital importado tem o botão de excluir (os demonstrativos, não)
  await expect(page.getByText(/^TCU · \d{4}$/)).toBeVisible()
  await expect(page.getByRole('button', { name: /^Excluir edital/ })).toHaveCount(1)
  await page.getByRole('button', { name: /^Excluir edital TCU/ }).click()
  const confirm = page.getByRole('dialog', { name: 'Excluir edital?' })
  await expect(confirm).toContainText('ficam guardados')
  await confirm.getByRole('button', { name: 'Excluir edital' }).click()
  await expect(page.getByText('Edital excluído')).toBeVisible()
  await expect(page.getByText(/^TCU · \d{4}$/)).toHaveCount(0)

  // A disciplina que só ele cobrava sai do plano, também depois de recarregar
  await page.reload()
  await expect(page.getByText(/^TCU · \d{4}$/)).toHaveCount(0)
  await page.goto('/disciplinas')
  await expect(page.getByRole('link', { name: /Ciência de Dados/ })).toHaveCount(0)
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
  await expect(page.getByText('Escreva os temas primeiro')).toBeVisible()
  await page.keyboard.press('Escape')

  // Temas do assunto viram os cartões do mapa
  const themes = page.getByRole('region', { name: 'Temas do assunto' })
  for (const [name, lines, keyPoint] of [
    ['Habeas corpus', ['- O que é: protege a liberdade de locomoção', 'Gratuito e dispensa advogado'], ''],
    ['Mandado de segurança', ['- Prazo: 120 dias', 'Direito líquido e certo'], 'Pessoa jurídica não propõe ação popular'],
  ] as const) {
    await themes.getByRole('button', { name: 'Adicionar tema' }).click()
    await themes.getByLabel('Nome do novo tema').fill(name)
    await page.keyboard.press('Enter')
    await themes.getByRole('textbox', { name: `Resumo do tema ${name}` }).click()
    for (const [i, line] of lines.entries()) {
      if (i) await page.keyboard.press('Enter')
      await page.keyboard.type(line)
    }
    if (keyPoint) {
      await themes.getByRole('textbox', { name: `Pontos importantes do tema ${name}` }).click()
      await page.keyboard.type(keyPoint)
    }
  }
  await expect(themes.getByText('Salvando…')).toHaveCount(0)

  await page.getByRole('button', { name: 'Criar mapa mental' }).first().click()
  const dialog = page.getByRole('dialog', { name: 'Mapa mental' })
  const map = dialog.getByRole('img', { name: 'Mapa mental: Remédios constitucionais' })
  await expect(map).toBeVisible()
  // Um cartão por tema, com os tópicos
  for (const text of ['HABEAS CORPUS', 'O que é', 'Prazo', 'Gratuito e dispensa advogado', 'Pontos importantes'])
    await expect(map.getByText(text, { exact: true })).toHaveCount(1)
  await expect(map.getByText(/^MANDADO DE/)).toHaveCount(1)
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
  // Resumo salvo nos campos antigos: continua acessível em "Resumo geral anterior"
  await expect(page.getByRole('textbox', { name: 'Pegadinhas' })).toBeHidden()
  await page.getByText('Resumo geral anterior').click()
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
  await dialog.getByRole('button', { name: 'Criar tema' }).click()
  await expect(page.getByText('Tema criado a partir do livro')).toBeVisible()
  // O conteúdo do livro vira um tema do assunto
  const themes = page.getByRole('region', { name: 'Temas do assunto' })
  await themes.getByRole('button', { name: /Do livro: constitucional/ }).click()
  const themeSummary = themes.getByRole('textbox', { name: 'Resumo do tema Do livro: constitucional' })
  await expect(themeSummary).toContainText('habeas corpus protege a liberdade')
  await expect(themeSummary).not.toContainText('Congresso Nacional')
  const themeKeyPoints = themes.getByRole('textbox', { name: 'Pontos importantes do tema Do livro: constitucional' })
  await expect(themeKeyPoints).toContainText('Nao cabe habeas corpus')
  await expect(themeKeyPoints.locator('strong')).toContainText('120 dias')
  await expect(page.getByRole('textbox', { name: 'Meu resumo' })).toHaveCount(0)

  // 2. Disciplina: preenche vários assuntos de uma vez (o livro continua carregado)
  await page.getByRole('link', { name: 'Voltar para disciplina' }).first().click()
  await page.getByRole('button', { name: /Enviar livro \(PDF\)/ }).click()
  const batch = page.getByRole('dialog', { name: /Preencher resumos com livro/ })
  await expect(batch.getByText('constitucional', { exact: true })).toBeVisible()
  await expect(batch.getByRole('checkbox', { name: 'Preencher Poder Legislativo' })).toBeChecked()
  // Já tem conteúdo (o tema do livro): fica desmarcado por padrão
  await expect(batch.getByRole('checkbox', { name: 'Preencher Remédios constitucionais' })).not.toBeChecked()
  await batch.getByRole('button', { name: /Preencher \d+ assunto/ }).click()
  await expect(page.getByText(/temas? criados? com o livro/)).toBeVisible()

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

  // 1. Resumir conteúdo → resumo para ler e copiar (os campos de resumo foram retirados)
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.getByRole('button', { name: /Resumir conteúdo/ }).click()
  const summarize = page.getByRole('dialog', { name: /Resumir conteúdo/ })
  await summarize.getByRole('button', { name: 'Resumir' }).click()
  await expect(summarize.getByText('Resumo rápido — Remédios constitucionais')).toBeVisible()
  await expect(summarize.getByRole('button', { name: 'Adicionar ao Meu resumo' })).toHaveCount(0)
  await summarize.getByRole('button', { name: 'Copiar' }).click()
  await expect(page.getByText('Resumo copiado')).toBeVisible()
  await page.keyboard.press('Escape')

  // 2. Criar questões: Certo/Errado gerado das anotações, corrigido na hora
  await page.getByRole('button', { name: 'Treinar questões' }).click()
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
  await explain.getByRole('button', { name: 'Salvar como tema' }).click()
  const themes = page.getByRole('region', { name: 'Temas do assunto' })
  await themes.getByRole('button', { name: /Explicação/ }).click()
  await expect(themes.getByRole('textbox', { name: 'Resumo do tema Explicação' })).toContainText('habeas corpus protege a liberdade')
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

test('subtemas: criados dentro do tema, salvos e excluídos junto com ele', async ({ page }) => {
  await page.goto('/')
  await seedUser(page)
  await page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem('concursos.user.v1')!)
    raw.selection = { positionId: 'auditor-fiscal-estadual', sphere: 'estadual', state: 'SP', createdAt: new Date().toISOString() }
    localStorage.setItem('concursos.user.v1', JSON.stringify(raw))
  })
  await page.goto('/assunto/direito-constitucional__remedios-constitucionais')
  const themes = page.getByRole('region', { name: 'Temas do assunto' })
  await themes.getByRole('button', { name: 'Adicionar tema' }).click()
  await themes.getByLabel('Nome do novo tema').fill('Poder derivado')
  await page.keyboard.press('Enter')

  // Dois subtemas dentro do tema aberto
  const subs = themes.getByRole('group', { name: 'Subtemas de Poder derivado' })
  for (const [name, text] of [
    ['Reformador', 'Emendas com 3/5 em dois turnos.'],
    ['Revisor', 'Uma única revisão, em 1993.'],
  ]) {
    await subs.getByRole('button', { name: 'Adicionar subtema' }).click()
    await subs.getByLabel('Nome do novo subtema').fill(name)
    await page.keyboard.press('Enter')
    await subs.getByRole('textbox', { name: `Resumo do subtema ${name}` }).click()
    await page.keyboard.type(text)
  }
  await expect(subs.getByText('1.2', { exact: true })).toBeVisible()
  await expect(themes.getByText('Salvando…')).toHaveCount(0)
  await shot(page, 'subtemas')

  // Recarrega: o tema mostra quantos subtemas tem e eles continuam lá
  await page.reload()
  const card = themes.getByRole('article').first()
  await expect(card).toContainText('2 subtemas')
  await card.getByRole('button', { name: /Poder derivado/ }).click()
  await subs.getByRole('button', { name: /Revisor/ }).click()
  await expect(subs.getByRole('textbox', { name: 'Resumo do subtema Revisor' })).toContainText('Uma única revisão, em 1993.')

  // Subtemas aparecem no mapa mental, dentro do cartão do tema
  await page.getByRole('button', { name: 'Criar mapa mental' }).first().click()
  const map = page.getByRole('img', { name: /Mapa mental:/ })
  await expect(map.getByText('Reformador', { exact: true })).toHaveCount(1)
  await expect(map.getByText('Revisor', { exact: true })).toHaveCount(1)
  await page.keyboard.press('Escape')

  // Excluir o tema leva os subtemas
  await themes.getByRole('button', { name: 'Excluir tema' }).click()
  await expect(page.getByText(/e os 2 subtemas dele/)).toBeVisible()
  await page.getByRole('dialog', { name: 'Excluir tema?' }).getByRole('button', { name: 'Excluir' }).click()
  await expect(themes.getByText('Nenhum tema ainda')).toBeVisible()
  await page.reload()
  await expect(themes.getByText('Nenhum tema ainda')).toBeVisible()
})

test('resumir conteúdo reconhece temas e subtemas e gera o resumo geral por tema', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => {
    const topicId = 'direito-constitucional__remedios-constitucionais'
    const now = new Date().toISOString()
    const t = (id: string, title: string, order: number, summary: string, extra: Record<string, unknown> = {}) => ({
      id, topicId, title, summary, keyPoints: '', order, createdAt: now, updatedAt: now, ...extra,
    })
    localStorage.setItem(
      'concursos.user.v1',
      JSON.stringify({
        profile: { id: 'e2e', name: 'Ana', email: null, createdAt: now },
        selection: { positionId: 'auditor-fiscal-estadual', sphere: 'estadual', state: 'SP', createdAt: now },
        history: [], topics: {}, flashcards: {}, quizzes: {},
        summaries: {},
        themes: {
          [topicId]: [
            t('a', 'Habeas corpus', 0, '<ul><li><p>Protege a liberdade de locomoção</p></li><li><p>Gratuito e sem advogado</p></li></ul>', { keyPoints: '<p>Não cabe em punição disciplinar militar</p>' }),
            t('b', 'Mandado de segurança', 1, '<p>Protege direito líquido e certo</p>'),
            t('c', 'Coletivo', 0, '<p>Partido político com representação no Congresso</p>', { parentId: 'b' }),
          ],
        },
      }),
    )
  })
  await page.goto('/assunto/direito-constitucional__remedios-constitucionais')
  await page.getByRole('button', { name: /Resumir conteúdo/ }).click()
  const dialog = page.getByRole('dialog', { name: /Resumir conteúdo/ })
  await expect(dialog.getByText('2 temas e 1 subtema')).toBeVisible()
  await dialog.getByRole('button', { name: 'Resumir' }).click()
  await expect(dialog.getByRole('heading', { name: 'Habeas corpus' })).toBeVisible()
  await expect(dialog.getByRole('heading', { name: 'Mandado de segurança' })).toBeVisible()
  await expect(dialog.getByText('Atenção: Não cabe em punição disciplinar militar')).toBeVisible()
  await expect(dialog.getByText('Coletivo', { exact: true })).toBeVisible()
  await expect(dialog.getByText(/Partido político com representação no Congresso/)).toBeVisible()
})

test('anexos do assunto: envia PDF e imagem, visualiza, baixa e exclui', async ({ page, isMobile }) => {
  await page.goto('/')
  await seedUser(page)
  await page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem('concursos.user.v1')!)
    raw.selection = { positionId: 'auditor-fiscal-estadual', sphere: 'estadual', state: 'SP', createdAt: new Date().toISOString() }
    localStorage.setItem('concursos.user.v1', JSON.stringify(raw))
  })
  await page.goto('/assunto/direito-constitucional__remedios-constitucionais')
  const card = page.getByRole('region', { name: 'Anexos' })
  await expect(card.getByText('Nenhum anexo')).toBeVisible()

  // PNG 1x1 e um PDF pequeno
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64')
  await card.getByLabel('Adicionar anexos ao assunto').setInputFiles([
    { name: 'apostila.pdf', mimeType: 'application/pdf', buffer: makePdf(['REMEDIOS CONSTITUCIONAIS', 'Habeas corpus protege a liberdade.']) },
    { name: 'esquema.png', mimeType: 'image/png', buffer: png },
    { name: 'planilha.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: Buffer.from('x') },
  ])
  await expect(page.getByText('“planilha.xlsx” não é aceito')).toBeVisible()
  await expect(card.getByRole('listitem')).toHaveCount(2)

  // Continua lá depois de recarregar
  await page.reload()
  await expect(card.getByRole('listitem')).toHaveCount(2)

  // PDF abre página a página
  await card.getByRole('button', { name: 'Ver apostila.pdf' }).click()
  const viewer = page.getByRole('dialog', { name: 'apostila.pdf' })
  await expect(viewer.getByLabel('Página 1 de 1')).toBeVisible()
  if (!isMobile) {
    const download = page.waitForEvent('download')
    await viewer.getByRole('button', { name: 'Baixar' }).click()
    expect((await download).suggestedFilename()).toBe('apostila.pdf')
  }
  await page.keyboard.press('Escape')

  // Imagem
  await card.getByRole('button', { name: 'Ver esquema.png' }).click()
  await expect(page.getByRole('dialog', { name: 'esquema.png' }).getByRole('img', { name: 'esquema.png' })).toBeVisible()
  await page.keyboard.press('Escape')

  // Excluir
  await card.getByRole('button', { name: 'Excluir esquema.png' }).click()
  await page.getByRole('dialog', { name: 'Excluir anexo?' }).getByRole('button', { name: 'Excluir' }).click()
  await expect(card.getByRole('listitem')).toHaveCount(1)
  await page.reload()
  await expect(card.getByRole('listitem')).toHaveCount(1)
})

test('mapa mental de um tema e de um subtema', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => {
    const topicId = 'direito-constitucional__remedios-constitucionais'
    const now = new Date().toISOString()
    const t = (id: string, title: string, summary: string, extra: Record<string, unknown> = {}) => ({
      id, topicId, title, summary, keyPoints: '', order: 0, createdAt: now, updatedAt: now, ...extra,
    })
    localStorage.setItem(
      'concursos.user.v1',
      JSON.stringify({
        profile: { id: 'e2e', name: 'Ana', email: null, createdAt: now },
        selection: { positionId: 'auditor-fiscal-estadual', sphere: 'estadual', state: 'SP', createdAt: now },
        history: [], topics: {}, flashcards: {}, quizzes: {}, summaries: {},
        themes: {
          [topicId]: [
            t('a', 'Mandado de segurança', '<ul><li><p>Prazo: 120 dias</p></li><li><p>Direito líquido e certo</p></li></ul>', { keyPoints: '<p>Não cabe contra lei em tese</p>' }),
            t('b', 'Coletivo', '<ul><li><p>Partido político: com representação no Congresso</p></li><li><p>Sindicato: em funcionamento há 1 ano</p></li></ul>', { parentId: 'a' }),
          ],
        },
      }),
    )
  })
  await page.goto('/assunto/direito-constitucional__remedios-constitucionais')
  const themes = page.getByRole('region', { name: 'Temas do assunto' })
  await themes.getByRole('button', { name: /Mandado de segurança/ }).click()

  // Mapa do tema: resumo, pontos importantes e o subtema
  await themes.getByRole('button', { name: 'Mapa mental' }).first().click()
  let map = page.getByRole('img', { name: 'Mapa mental: Mandado de segurança' })
  await expect(map.getByText('Prazo', { exact: true })).toHaveCount(1)
  await expect(map.getByText('Não cabe contra lei em tese')).toHaveCount(1)
  await expect(map.getByText('COLETIVO', { exact: true })).toHaveCount(1)
  await page.keyboard.press('Escape')

  // Mapa do subtema
  const subs = themes.getByRole('group', { name: 'Subtemas de Mandado de segurança' })
  await subs.getByRole('button', { name: /Coletivo/ }).click()
  await subs.getByRole('button', { name: 'Mapa mental' }).click()
  map = page.getByRole('img', { name: 'Mapa mental: Coletivo' })
  await expect(map.getByText('Partido político', { exact: true })).toHaveCount(1)
  await expect(map.getByText(/Remédios constitucionais · Mandado de segurança/).first()).toBeVisible()
})

test('questões: anota as que errou, marca tema e subtema e filtra', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => {
    const topicId = 'direito-constitucional__remedios-constitucionais'
    const now = new Date().toISOString()
    const t = (id: string, title: string, order: number, extra: Record<string, unknown> = {}) => ({
      id, topicId, title, summary: '', keyPoints: '', order, createdAt: now, updatedAt: now, ...extra,
    })
    localStorage.setItem(
      'concursos.user.v1',
      JSON.stringify({
        profile: { id: 'e2e', name: 'Ana', email: null, createdAt: now },
        selection: { positionId: 'auditor-fiscal-estadual', sphere: 'estadual', state: 'SP', createdAt: now },
        history: [], topics: {}, flashcards: {}, quizzes: {}, summaries: {},
        themes: {
          [topicId]: [t('hc', 'Habeas corpus', 0), t('ms', 'Mandado de segurança', 1), t('col', 'Coletivo', 0, { parentId: 'ms' })],
        },
      }),
    )
  })
  await page.goto('/assunto/direito-constitucional__remedios-constitucionais')
  // Os campos antigos não aparecem mais
  await expect(page.getByRole('textbox', { name: 'Meu resumo' })).toHaveCount(0)
  await expect(page.getByText('Resumo geral anterior')).toHaveCount(0)

  const section = page.getByRole('region', { name: 'Questões' })
  await expect(section.getByText('Nenhuma questão anotada')).toBeVisible()

  // 1ª questão: tema Habeas corpus
  await section.getByRole('button', { name: 'Adicionar questão' }).click()
  await section.getByLabel('Tema da questão', { exact: true }).selectOption({ label: 'Habeas corpus' })
  await expect(section.getByLabel('Subtema da questão')).toBeDisabled()
  await section.getByRole('textbox', { name: 'Anotação da questão' }).click()
  await page.keyboard.type('Marquei que HC cabe em punição militar. Errado: não cabe (art. 142, §2º).')

  // 2ª questão: tema Mandado de segurança › subtema Coletivo
  await section.getByRole('button', { name: 'Adicionar questão' }).click()
  const second = section.getByRole('article').first()
  await second.getByLabel('Tema da questão', { exact: true }).selectOption({ label: 'Mandado de segurança' })
  await second.getByLabel('Subtema da questão').selectOption({ label: 'Coletivo' })
  await second.getByRole('textbox', { name: 'Anotação da questão' }).click()
  await page.keyboard.type('Sindicato precisa de 1 ano de funcionamento; associação também.')
  await expect(section.getByText('Salvando…')).toHaveCount(0)
  await shot(page, 'questoes')

  // Persistência
  await page.reload()
  await expect(section.getByRole('article')).toHaveCount(2)
  await expect(section.getByText('Mandado de segurança › Coletivo')).toBeVisible()

  // Filtros por tema e subtema
  const filter = section.getByLabel('Filtrar questões por tema e subtema')
  await filter.selectOption({ label: 'Habeas corpus — todo o tema (1)' })
  await expect(section.getByRole('article')).toHaveCount(1)
  await expect(section.getByRole('article')).toContainText('HC cabe em punição militar')
  await filter.selectOption({ label: '↳ Coletivo (1)' })
  await expect(section.getByRole('article')).toContainText('Sindicato precisa de 1 ano')
  await filter.selectOption({ label: 'Mandado de segurança — todo o tema (1)' })
  await expect(section.getByRole('article')).toHaveCount(1)

  // Nova questão com filtro ativo já vem marcada com o tema/subtema
  await filter.selectOption({ label: '↳ Coletivo (1)' })
  await section.getByRole('button', { name: 'Adicionar questão' }).click()
  await expect(section.getByRole('article')).toHaveCount(2)
  await expect(section.getByLabel('Subtema da questão').first()).toHaveValue('col')
})

test('assunto criado manualmente na disciplina: aparece na lista, abre, conta no progresso e pode ser excluído', async ({ page }) => {
  await page.goto('/')
  await seedUser(page)
  await page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem('concursos.user.v1')!)
    raw.selection = { positionId: 'auditor-fiscal-estadual', sphere: 'estadual', state: 'SP', createdAt: new Date().toISOString() }
    localStorage.setItem('concursos.user.v1', JSON.stringify(raw))
  })
  await page.goto('/disciplina/direito-constitucional')
  const list = page.getByRole('region', { name: 'Assuntos' })
  await expect(list.getByRole('listitem').first()).toBeVisible()
  const before = await list.getByRole('listitem').count()

  await page.getByRole('button', { name: 'Adicionar assunto' }).click()
  const dialog = page.getByRole('dialog', { name: 'Adicionar assunto' })
  // Nome repetido é recusado
  await dialog.getByLabel('Nome do assunto').fill('Remédios constitucionais')
  await expect(dialog.getByText('Já existe um assunto com esse nome')).toBeVisible()
  await dialog.getByLabel('Nome do assunto').fill('Poder constituinte')
  await dialog.getByLabel('O que estudar').fill('- Poder originário\n- Poder derivado reformador')
  await dialog.getByRole('button', { name: 'Criar', exact: true }).click()
  await expect(page.getByText('Assunto criado')).toBeVisible()
  await expect(list.getByRole('listitem')).toHaveCount(before + 1)
  const row = list.getByRole('listitem').filter({ hasText: 'Poder constituinte' })
  await expect(row.getByText('Criado por você')).toBeVisible()

  // Persiste e abre como um assunto normal
  await page.reload()
  await row.getByRole('link', { name: /Poder constituinte/ }).first().click()
  await expect(page.getByRole('heading', { name: 'Poder constituinte', level: 1 })).toBeVisible()
  await expect(page.getByText('O que estudar')).toBeVisible()
  await expect(page.getByText('Poder derivado reformador')).toBeVisible()
  await expect(page.getByRole('region', { name: 'Temas do assunto' })).toBeVisible()

  // Conta no progresso da disciplina
  await page.getByRole('button', { name: /Marcar como concluído|Concluir/ }).click()
  await expect(page.getByText('Assunto concluído!')).toBeVisible()

  // Excluir
  await page.getByRole('button', { name: 'Excluir assunto' }).click()
  await page.getByRole('dialog', { name: 'Excluir assunto?' }).getByRole('button', { name: 'Excluir assunto' }).click()
  await expect(page).toHaveURL(/\/disciplina\/direito-constitucional$/)
  await expect(list.getByRole('listitem')).toHaveCount(before)
})
