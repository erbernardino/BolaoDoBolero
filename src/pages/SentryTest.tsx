export default function SentryTest() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <button
        type="button"
        className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg"
        onClick={() => {
          throw new Error('This is your first error!')
        }}
      >
        Break the world
      </button>
    </div>
  )
}
