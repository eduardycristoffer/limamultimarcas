# Limamultimarcas

# Lima Multimarcas — loja online (estilo Mercado Livre, com a cara da Lima)

Crie uma loja online em **português do Brasil** para a **Lima Multimarcas**, loja física de motos elétricas em **Montes Claros/MG** (Av. João XXIII, 990 — em frente ao Hospital Aroldo Tourinho). O público é o brasileiro comum, acostumado com o Mercado Livre: o layout e os padrões de uso devem ser FAMILIARES (cabeçalho com busca, página de produto com galeria à esquerda e caixa de compra à direita, selo de frete grátis em verde, selo FULL, checkout em etapas com resumo ao lado). Mas a identidade visual é da Lima, NÃO copie cores nem logo do Mercado Livre.

Esta é a FASE 1 (front-end completo e navegável). A Fase 2 (banco de dados, painel admin, Pix pela Vega Checkout) virá em outra mensagem — então deixe toda chamada de dados/pagamento isolada em `src/lib/api.ts` e todos os números de negócio em `src/config/store.ts`, para trocar depois sem refazer telas.

## Arquivos anexados (salve em `src/assets/` com estes nomes exatos)
- `logo-lima.png` — logo "LM" vermelho/branco com fundo transparente.
- `{scooter-500w|cappuccino|foston-gt6x}-studio.jpg` — foto quadrada de estúdio, fundo cinza claro e limpo → imagem PRINCIPAL da galeria.
- `{...}-hero.jpg` — foto 16:9 na rua → banner da página do produto e 3ª imagem da galeria.
- `{...}-cut.png` — recorte com fundo transparente. As bordas têm um contorno escuro: use SOMENTE sobre fundos escuros (preto #0E0E10 / degradê vermelho-escuro), por exemplo nos cards e no banner da home. Nunca sobre branco.
Não gere nem substitua estas imagens por outras; não invente fotos de outros modelos.

## Identidade
- Cores: vermelho Lima `#E3000F` (CTA principal, destaques), preto `#0E0E10` (cabeçalho, rodapé, painéis), branco, fundo da página cinza claro `#EDEDED`, cards brancos com raio ~8px e sombra suave, verde `#00A650` só para "Frete grátis"/"FULL"/estoque, cinza `#6B6B70` para textos secundários, links em azul `#1F5FBF`. Defina tudo como tokens (CSS variables / Tailwind) e use semântica (primary, background etc.), sem cores soltas nos componentes.
- Fonte: Inter. Preços em negrito grande. Formate moeda com `Intl.NumberFormat('pt-BR', {style:'currency', currency:'BRL'})` (ex.: R$ 7.990).
- Mobile-first: a maioria dos clientes vem do celular. Barra fixa no rodapé da página de produto no mobile com preço + botão "Comprar agora".
- Acessibilidade: contraste AA, foco visível, `alt` descritivo, botões ≥44px no mobile.

## Dados de negócio (`src/config/store.ts`, tudo editável num lugar só)
- Loja: nome "Lima Multimarcas", cidade "Montes Claros/MG", endereço e referência acima, `whatsappNumber` (string vazia por enquanto — se vazio, ESCONDA os botões de WhatsApp em vez de usar número inventado), origem do frete: lat -16.7282, lon -43.8578 (Montes Claros).
- Frete: `freeShippingRadiusKm = 100`, `roadFactor = 1.2` (distância em linha reta × 1,2 ≈ estrada), `payOnDeliveryMaxKm = 100`, `extraKmPrice = null` (se null, fora do raio mostra "Frete a combinar com a loja" e deixa só "Retirar na loja"), `deliveryEstimateText = "em até 2 dias úteis"`.
- Pagamento: `payments = { pix: true, card: false, payOnDelivery: true }`, `payOnDeliveryMethods = ["Dinheiro", "Pix", "Cartão (maquininha)"]`, `maxInstallments = null` (não exiba parcelamento enquanto for null).
- Os 3 produtos em `src/data/products.ts` (preço em CENTAVOS):
  1. **Scooter Elétrica 500 W** — slug `scooter-500w` — R$ 3.990 (399000). Cor preta. Destaques confirmados: 500 W de potência, cesta dianteira, encosto/banco com apoio, zero gasolina.
  2. **Cappuccino** — slug `cappuccino` — R$ 7.990 (799000). Cor verde-menta (única cor disponível). Destaques confirmados: visual retrô, até 70 km de autonomia, baú traseiro e banco bege.
  3. **Foston GT6X** — slug `foston-gt6x` — R$ 9.990 (999000). Cor cinza/prata. Destaques confirmados: até 60 km de autonomia, farol em LED, freio a disco na roda dianteira.
  Campo `stock` (comece com 10 em cada), `badge: "Oferta de inauguração"`.
- REGRAS DE HONESTIDADE (importante): NÃO invente avaliações, notas de estrelas, número de vendidos, depoimentos, "preço de/por" riscado, contador regressivo, "últimas unidades" falso, nem especificações técnicas que não estão acima (bateria, velocidade máxima, peso, CNH/IPVA etc.). Mostre "Últimas unidades" apenas se `stock <= 3`. A "Ficha técnica" deve listar SOMENTE os dados confirmados acima + cor + condição "Novo"; deixe a estrutura pronta para o dono completar depois.

## Páginas
1. **Home `/`** — cabeçalho preto com logo, campo de busca (filtra os 3 produtos), "Entregamos em Montes Claros e região", ícone de WhatsApp (se houver número). Barra de benefícios: "Frete grátis até 100 km de Montes Claros", "Pague na entrega", "Pix". Banner grande com o recorte do produto em destaque sobre degradê preto→vermelho-escuro e a chamada "Oferta de inauguração". Grade com os 3 produtos (card branco estilo Mercado Livre: foto de estúdio, nome, preço grande, "no Pix", selo verde "Frete grátis", selo "⚡ FULL", "Pague na entrega"). Bloco "Visite nossa loja" com endereço e link do Google Maps (busca pelo endereço). Rodapé preto com logo, endereço e links.
2. **Três páginas de produto (as 3 landing pages)** — rotas `/moto/scooter-500w`, `/moto/cappuccino`, `/moto/foston-gt6x`, todas geradas pelo mesmo componente a partir dos dados. Estrutura:
   - Faixa hero no topo com a foto `-hero.jpg` em tela cheia (com leve overlay escuro à esquerda): selo "Oferta de inauguração", nome, preço, "Frete grátis até 100 km" e "Pague na entrega".
   - Abaixo, bloco estilo Mercado Livre em 3 colunas no desktop: miniaturas verticais (estúdio, hero) + imagem grande com zoom ao passar o mouse; título e condição "Novo | Oferta de inauguração"; caixa de compra à direita com preço grande, "à vista no Pix", linha verde "Frete grátis para Montes Claros e região (até 100 km)", linha "⚡ FULL — chega {deliveryEstimateText}", "Estoque disponível", seletor de quantidade (1 até o estoque), botões **"Comprar agora"** (vermelho, principal) e **"Falar com a Lima no WhatsApp"** (contorno, só se houver número), calculadora **"Calcular frete e prazo"** por CEP (veja Frete abaixo), caixa "Vendido por Lima Multimarcas — loja física em Montes Claros/MG" com endereço, e caixa "Meios de pagamento" mostrando só os habilitados em `config.payments` (Pix, Pagar na entrega; Cartão só se `card: true`).
   - Seções abaixo: "O que você precisa saber sobre este produto" (lista com os destaques), "Características" (tabela da ficha técnica), "Como funciona a entrega" (Frete grátis até 100 km, retirada na loja), "Como funciona o pagamento na entrega" (você só paga quando a moto chega; pode escolher dinheiro, Pix ou cartão na maquininha conforme `payOnDeliveryMethods`), FAQ em accordion (Como pago? Posso retirar na loja? Entregam na minha cidade? Posso pagar na entrega?) com respostas baseadas SÓ nas regras deste briefing, e carrossel "Outras ofertas da Lima" com os outros 2 modelos.
   - No mobile: galeria em carrossel com indicadores e barra fixa inferior (preço + Comprar agora).
   - SEO por página: `<title>`, meta description, Open Graph com a foto hero, dados estruturados schema.org `Product` com `offers` (preço, BRL, disponibilidade).
3. **Checkout `/checkout`** — estilo Mercado Livre, uma página com etapas em accordion e **Resumo da compra** fixo à direita (foto, nome, quantidade, subtotal, frete, total). O produto/quantidade vem de "Comprar agora" (guarde em contexto/estado + sessionStorage; não precisa de carrinho com vários itens).
   - Etapa 1 **Seus dados**: nome completo, CPF (validar dígitos verificadores, máscara), e-mail, celular com DDD (máscara). Validação com zod + react-hook-form, mensagens em português.
   - Etapa 2 **Entrega**: CEP (máscara) → busca automática do endereço (ViaCEP) preenchendo rua, bairro, cidade, UF; usuário informa número e complemento. Opções de entrega: **"⚡ Entrega FULL Lima"** (frete grátis se dentro do raio; senão "a combinar") e **"Retirar na loja — grátis"** (mostra o endereço da loja).
   - Etapa 3 **Pagamento**: opções como "radio cards": **Pix** (aprovação na hora), **Pagar na entrega** (só habilitado se a entrega for FULL e dentro de `payOnDeliveryMaxKm`; se for retirada na loja, mostre "Pague na loja"; se fora do raio, desabilite com explicação), e **Cartão de crédito** (só aparece se `payments.card` for true; por enquanto NÃO crie campos de número de cartão — apenas a estrutura para plugar depois). Em "Pagar na entrega" deixe o cliente escolher a forma (`payOnDeliveryMethods`).
   - Botão final **"Finalizar pedido"**. Capture `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term` e `src` da URL no primeiro acesso e guarde junto do pedido.
   - Por enquanto o envio do pedido chama `api.createOrder()` que é um STUB (retorna um pedido de demonstração com id local). Mostre um aviso discreto "Modo demonstração — pagamentos ainda não conectados" enquanto for stub.
4. **Pedido `/pedido/:id`** — confirmação com número do pedido, resumo, endereço, e por método: Pix → área com QR Code (use `qrcode.react`) e botão "Copiar código Pix" (copia-e-cola), instruções passo a passo e indicador "Aguardando pagamento" que muda para "Pagamento aprovado" (por enquanto simulado pelo stub); Pagar na entrega → "Pedido recebido! A Lima entrará em contato para combinar a entrega" + botão para enviar o pedido por WhatsApp (link `wa.me`, só se houver número) ; Retirada → endereço e horário a combinar.
5. **404** estilizada com a identidade da Lima.

## Frete (`src/lib/shipping.ts`)
Dado um CEP: 1) ViaCEP para cidade/UF/endereço; 2) coordenadas pela BrasilAPI `https://brasilapi.com.br/api/cep/v2/{cep}` (campo `location.coordinates`) e, se vierem vazias, geocodificação da cidade pela Open-Meteo `https://geocoding-api.open-meteo.com/v1/search?name={cidade}&count=10&language=pt&countryCode=BR` (escolha o resultado cujo `admin1` bate com a UF); 3) distância haversine até a origem × `roadFactor`; 4) se ≤ `freeShippingRadiusKm` → frete R$ 0,00 "Frete grátis"; senão, se `extraKmPrice` não for null → `(km - raio) * extraKmPrice`, senão "Frete a combinar com a loja". Se não conseguir calcular (APIs fora do ar), mostre mensagem amigável, mantenha "Retirar na loja" e o WhatsApp (se houver). Mostre a distância aproximada ("a ~{n} km da loja"). Esse cálculo no navegador é só para exibição; na Fase 2 o servidor recalcula.

## Qualidade
- React + TypeScript + Tailwind + shadcn/ui, rotas com react-router, imagens com `loading="lazy"` (exceto a hero) e `width/height` para evitar salto de layout. Sem texto "lorem". Sem console errors. Textos curtos e diretos, tom amigável de loja de bairro grande, tudo em pt-BR.
- Estados de carregamento/erro/vazio em todas as telas que buscam dados.
- Não colete nem envie número de cartão em nenhum lugar.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://limamultimarcas.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/8d758230-f716-4b1f-8b14-1a09de48566a).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
