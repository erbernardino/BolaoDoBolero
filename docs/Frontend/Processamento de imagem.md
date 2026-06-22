---
title: Processamento de imagem
tags: [frontend, perfil, imagem, storage]
status: documentado
related:
  - "[[Gerenciamento de Perfil]]"
  - "[[Regras do Storage]]"
  - "[[Frontend MOC]]"
---

Helpers puros (sem React) para **carregar, recortar e reduzir** a foto de perfil do usuário a um JPEG quadrado pequeno, pronto para upload no Firebase Storage. São o núcleo de processamento usado pela feature de [[Gerenciamento de Perfil]] e consumidos pelo componente de upload com [react-easy-crop](https://github.com/valentinh/react-easy-crop).

A lógica vive em `src/lib/imageProcess.ts` (funções puras) e é orquestrada pelo modal `src/components/UploadFotoPerfil.tsx`.

## Constantes e contrato de saída

| Constante | Valor | Significado |
| --- | --- | --- |
| `TAMANHO_FINAL` | `512` | Lado em px do JPEG quadrado salvo (`src/lib/imageProcess.ts:11`) |
| `QUALIDADE` | `0.85` | Qualidade do `toBlob` JPEG (`src/lib/imageProcess.ts:12`) |

O resultado final é sempre um `Blob` `image/jpeg` de 512x512.

## API pura (`imageProcess.ts`)

- **`loadImage(src)`** → `Promise<HTMLImageElement>`: cria um `Image()` com `img.crossOrigin = 'anonymous'` e resolve no `onload` (`src/lib/imageProcess.ts:14`).
- **`fileToDataUrl(file)`** → `Promise<string>`: usa `FileReader.readAsDataURL` para transformar o `File` selecionado em data URL (`src/lib/imageProcess.ts:24`).
- **`cropAndResizeToJpeg(imageSrc, crop, tamanhoFinal?, qualidade?)`** → `Promise<Blob>`: desenha em um `<canvas>` de 512x512, recorta pela `CropArea` e exporta JPEG (`src/lib/imageProcess.ts:35`).

### `CropArea`

```ts
interface CropArea { x: number; y: number; width: number; height: number }
```

Casa diretamente com o objeto `Area` (em pixels) que o `react-easy-crop` entrega no callback `onCropComplete` — por isso a área recortada flui sem conversão do componente para o helper.

### Pipeline de `cropAndResizeToJpeg`

1. `loadImage(imageSrc)` carrega a imagem (já como data URL, no fluxo normal).
2. Cria canvas 512x512 e pega contexto 2D (lança erro se indisponível).
3. **Pinta fundo branco** (`#ffffff`) antes de desenhar, para que PNGs com canal alpha (transparência) não fiquem com fundo preto/transparente no JPEG.
4. `ctx.drawImage(...)` recorta a região `crop.x/y/width/height` da origem e a escala para 512x512.
5. `canvas.toBlob(..., 'image/jpeg', qualidade)` produz o `Blob`; rejeita se o blob vier nulo.

> [!note] Funções puras e testáveis
> `imageProcess.ts` não importa React nem Firebase — é lógica de browser pura, alinhada à convenção de manter regras em `src/lib/` (ver [[Frontend MOC]]).

## Armadilha de CORS no canvas

> [!danger] `crossOrigin='anonymous'` é obrigatório
> Sem `img.crossOrigin = 'anonymous'`, desenhar uma imagem de **outra origem** no canvas o marca como *tainted* (contaminado), e qualquer chamada a `toBlob`/`toDataURL` lança `SecurityError`. Por isso `loadImage` sempre seta `crossOrigin` (`src/lib/imageProcess.ts:17`).

> [!warning] Origem precisa enviar headers CORS
> `crossOrigin='anonymous'` só resolve quando o servidor da imagem **responde com headers CORS** apropriados. Uma imagem remota sem CORS faz o `load` falhar (ou ainda contamina o canvas), quebrando o `toBlob`. No fluxo padrão isso não acontece porque a entrada é um data URL (mesma origem) gerado por `fileToDataUrl`.

## Orquestração no modal (`UploadFotoPerfil.tsx`)

O componente é um modal de "Trocar foto de perfil" que amarra os helpers ao fluxo de UI:

1. **Seleção** — `<input type="file" accept="image/*">`; valida que é imagem e que o arquivo tem no máximo 10 MB (`src/components/UploadFotoPerfil.tsx:35`).
2. **Pré-visualização** — `fileToDataUrl` gera o data URL, exibido no `Cropper` (`aspect={1}`, `cropShape="round"`, zoom de 1 a 4).
3. **Recorte** — `onCropComplete` guarda a `Area` em pixels (`croppedArea`).
4. **Salvar** — `cropAndResizeToJpeg(imageSrc, croppedArea)` gera o blob, faz `uploadBytes` em `fotos_perfil/${uid}/${Date.now()}.jpg` com `contentType: 'image/jpeg'`, obtém `getDownloadURL` e grava `fotoURL` no doc `usuarios/${uid}` via `updateDoc` (`src/components/UploadFotoPerfil.tsx:52`).

> [!info] Caminho no Storage
> O upload vai para `fotos_perfil/{uid}/{timestamp}.jpg`. As permissões desse caminho são governadas pelas [[Regras do Storage]] — tipicamente escrita restrita ao próprio `uid`. O documento de usuário atualizado faz parte da [[Entidade Usuario]].

## Placeholder de avatar (`Avatar.tsx`)

Complementar ao upload: quando o usuário **não tem** `fotoURL`, o componente `Avatar` renderiza um placeholder com a **inicial** do nome sobre uma **cor estável**.

- A cor é escolhida em uma `PALETA` de **12 cores** Tailwind via hash da chave (`uid` ou `nome`): `hash = hash * 31 + charCodeAt`, depois `PALETA[Math.abs(hash) % PALETA.length]`. Isso garante que o mesmo usuário sempre receba a mesma cor.
- Com `src` presente, renderiza `<img>` com `object-cover` e `referrerPolicy="no-referrer"`.

> [!tip] Cor determinística
> Como a cor deriva de hash do `uid`/`nome`, o avatar fica visualmente consistente entre sessões e telas, sem precisar persistir nada.

## Relacionados

- [[Gerenciamento de Perfil]] — feature que consome estes helpers para trocar a foto.
- [[Regras do Storage]] — controlam o caminho `fotos_perfil/{uid}/`.
- [[Entidade Usuario]] — recebe o campo `fotoURL` resultante.
- [[Frontend MOC]] — índice da área de frontend.
</content>
</invoke>
