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

test('importar edital por texto adiciona disciplinas com a fonte registrada', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => {
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
  await page.goto('/concursos?importar=1')
  await page.getByLabel('Órgão (sigla)').fill('TCU')
  await page.getByLabel('Conteúdo programático').fill('CIÊNCIA DE DADOS (peso 2): 1. Estatística descritiva. 2. Regressão linear.')
  await expect(page.getByText('1 disciplinas · 2 assuntos')).toBeVisible()
  await page.getByRole('button', { name: 'Importar para meu plano' }).click()
  await expect(page.getByText('Edital importado!')).toBeVisible()
  await expect(page.getByText('TCU').first()).toBeVisible()
  await page.goto('/disciplinas')
  await expect(page.getByRole('link', { name: /Ciência de Dados/ })).toBeVisible()
})
