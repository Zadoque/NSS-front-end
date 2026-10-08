import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import type { EpidemiologyRequest } from '../../src/types/epidemiology';
const oracle: {request:EpidemiologyRequest;expected:{items:{code:string;count:number}[]}}[] = JSON.parse(readFileSync(new URL('./snapshot-oracle.json', import.meta.url),'utf8'));
const manifest = JSON.parse(readFileSync(new URL('../../data/static-snapshot/manifest.json', import.meta.url),'utf8'));
for (const disease of ['CHIK','DENG','FMAC','TOXC','TOXG','ZIKA']) test(`snapshot ${disease}: municípios → distritos → sede e retorno`, async ({page}) => {
  const api: string[] = [];
  page.on('request', request => { if (new URL(request.url()).pathname.startsWith('/api/')) api.push(request.url()); });
  await page.route('**/api/**', route => route.abort());
  await page.goto('/mapa');
  await page.getByRole('button',{name:'Entrar na demonstração'}).click();
  await page.getByRole('button',{name:/^Sudeste ·/}).click();
  await page.getByRole('button',{name:/^Rio de Janeiro ·/}).click();
  const panel = page.locator('aside');
  await panel.getByLabel('Doença',{exact:true}).selectOption(disease);
  await panel.getByLabel('Ano',{exact:true}).selectOption('2024');
  await panel.getByLabel('Mês',{exact:true}).selectOption('ALL');
  async function verify(geography:string) {
    const ref = oracle.find(x => x.request.disease === disease && x.request.year === 2024 && x.request.month === 'ALL' && x.request.geography === geography)!;
    for (const item of ref.expected.items) {
      const name = manifest.catalog.find((x:{code:string}) => x.code === item.code).name;
      const button = page.locator('.ranking').getByRole('button').filter({has:page.getByText(name,{exact:true})});
      await expect(button).toContainText(`${item.count} notificações`);
    }
  }
  await verify('MUNICIPALITY');
  await page.locator('.ranking').getByRole('button',{name:/Campos dos Goytacazes/}).click();
  await expect(page.getByRole('heading',{name:'Notificações por distrito',exact:true})).toBeVisible();
  await verify('DISTRICT');
  await page.locator('.ranking').getByRole('button',{name:/Distrito Sede/}).click();
  await expect(page.getByRole('heading',{name:'Notificações por bairro da notificação',exact:true})).toBeVisible();
  await verify('NEIGHBORHOOD');
  await page.getByRole('button',{name:'Rio de Janeiro',exact:true}).click();
  await verify('MUNICIPALITY');
  expect(api).toEqual([]);
});
