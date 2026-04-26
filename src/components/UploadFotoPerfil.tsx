import { useCallback, useRef, useState } from 'react'
import Cropper from 'react-easy-crop'
import type { Area } from 'react-easy-crop'
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'
import { doc, updateDoc } from 'firebase/firestore'
import { db, storage } from '../config/firebase'
import { cropAndResizeToJpeg, fileToDataUrl } from '../lib/imageProcess'

interface Props {
  uid: string
  onConcluido: (novaUrl: string) => void
  onCancelar: () => void
}

export function UploadFotoPerfil({ uid, onConcluido, onCancelar }: Props) {
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedArea, setCroppedArea] = useState<Area | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const onCropComplete = useCallback((_pixels: Area, area: Area) => {
    setCroppedArea(area)
  }, [])

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    setErro('')
    if (!file.type.startsWith('image/')) {
      setErro('Selecione um arquivo de imagem.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setErro('Arquivo muito grande. Maximo 10 MB.')
      return
    }
    try {
      const dataUrl = await fileToDataUrl(file)
      setImageSrc(dataUrl)
    } catch {
      setErro('Nao consegui ler a imagem.')
    }
  }

  const salvar = async () => {
    if (!imageSrc || !croppedArea) return
    setSalvando(true)
    setErro('')
    try {
      const blob = await cropAndResizeToJpeg(imageSrc, croppedArea)
      const filename = `${Date.now()}.jpg`
      const path = `fotos_perfil/${uid}/${filename}`
      const fileRef = storageRef(storage, path)
      await uploadBytes(fileRef, blob, { contentType: 'image/jpeg' })
      const url = await getDownloadURL(fileRef)
      await updateDoc(doc(db, 'usuarios', uid), { fotoURL: url })
      onConcluido(url)
    } catch (err) {
      console.error(err)
      setErro('Falha ao salvar a foto. Tente novamente.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col">
        <div className="px-5 py-3 border-b border-gray-200">
          <h2 className="font-bold text-gray-800">Trocar foto de perfil</h2>
        </div>

        <div className="p-5 space-y-4">
          {!imageSrc && (
            <div className="flex flex-col items-center gap-3 py-8">
              <p className="text-sm text-gray-500 text-center">
                Escolha uma imagem do celular ou computador. Ela sera recortada num quadrado.
              </p>
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
              <button
                onClick={() => inputRef.current?.click()}
                className="bg-blue-700 hover:bg-blue-800 text-white font-semibold px-4 py-2 rounded-lg"
              >
                Escolher imagem
              </button>
            </div>
          )}

          {imageSrc && (
            <>
              <div className="relative w-full h-72 bg-black rounded-lg overflow-hidden">
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  cropShape="round"
                  showGrid={false}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                />
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500">Zoom</span>
                <input
                  type="range"
                  min={1}
                  max={4}
                  step={0.05}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="flex-1"
                />
              </div>
            </>
          )}

          {erro && (
            <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">{erro}</p>
          )}
        </div>

        <div className="px-5 py-3 border-t border-gray-200 flex justify-end gap-2">
          <button
            onClick={onCancelar}
            disabled={salvando}
            className="px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-100 font-medium disabled:opacity-50"
          >
            Cancelar
          </button>
          {imageSrc && (
            <button
              onClick={() => setImageSrc(null)}
              disabled={salvando}
              className="px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-100 font-medium disabled:opacity-50"
            >
              Trocar
            </button>
          )}
          <button
            onClick={salvar}
            disabled={!imageSrc || !croppedArea || salvando}
            className="px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-semibold disabled:opacity-50"
          >
            {salvando ? 'Salvando...' : 'Salvar foto'}
          </button>
        </div>
      </div>
    </div>
  )
}
