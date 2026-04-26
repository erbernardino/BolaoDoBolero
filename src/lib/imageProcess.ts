// Helpers para processar foto de perfil: carrega, recorta pelo crop area e
// reduz para um JPEG pequeno e quadrado pronto para upload.

export interface CropArea {
  x: number
  y: number
  width: number
  height: number
}

const TAMANHO_FINAL = 512  // lado em px do JPEG salvo
const QUALIDADE = 0.85

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = (err) => reject(err)
    img.src = src
  })
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

// Aplica o crop e reduz para um JPEG quadrado de 512x512 (configuravel).
// Retorna um Blob pronto para upload no Firebase Storage.
export async function cropAndResizeToJpeg(
  imageSrc: string,
  crop: CropArea,
  tamanhoFinal: number = TAMANHO_FINAL,
  qualidade: number = QUALIDADE,
): Promise<Blob> {
  const img = await loadImage(imageSrc)
  const canvas = document.createElement('canvas')
  canvas.width = tamanhoFinal
  canvas.height = tamanhoFinal
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas 2D nao disponivel')

  // Fundo branco para imagens com canal alpha (PNG transparente)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, tamanhoFinal, tamanhoFinal)

  ctx.drawImage(
    img,
    crop.x, crop.y, crop.width, crop.height,
    0, 0, tamanhoFinal, tamanhoFinal,
  )

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Falha ao gerar JPEG'))
      },
      'image/jpeg',
      qualidade,
    )
  })
}
