import { LoadingButton } from '@/components/interior/loading-button'
import { saveDraft } from '@/save'

export default function App() {
  return (
    <main className="grid min-h-svh place-items-center bg-neutral-100 text-neutral-900">
      <div className="grid justify-items-center gap-3">
        <h1 className="text-base font-medium">Draft</h1>
        <p className="text-sm text-neutral-600">Click Save. It finishes in a moment.</p>
        <LoadingButton
          onAction={saveDraft}
          pendingLabel="Saving"
          successLabel="Saved"
        >
          Save
        </LoadingButton>
      </div>
    </main>
  )
}
