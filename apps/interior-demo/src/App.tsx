import { LoadingButton } from "../components/interior/loading-button";
import { saveDraft } from "./save-draft";

export default function App() {
  return (
    <main className="grid min-h-dvh place-items-center bg-neutral-100 font-sans antialiased dark:bg-neutral-950">
      <LoadingButton
        onAction={saveDraft}
        pendingLabel="Saving"
        successLabel="Saved"
      >
        Save
      </LoadingButton>
    </main>
  );
}
