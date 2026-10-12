import { SAMPLE_CODE_REQUEST, SAMPLE_FOLLOWUP, SAMPLE_GOAL } from "../lib/sample";

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSend: (text: string) => void;
  hasThread: boolean;
}

export function Composer({ value, onChange, onSend, hasThread }: Props) {
  const submit = () => {
    if (value.trim() !== "") onSend(value);
  };
  return (
    <form
      className="composer"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="chips">
        <span className="chips-label">Try:</span>
        <button type="button" className="chip" onClick={() => onChange(SAMPLE_GOAL)}>
          Sample goal
        </button>
        <button type="button" className="chip" onClick={() => onChange(SAMPLE_FOLLOWUP)}>
          Follow-up
        </button>
        <button type="button" className="chip" onClick={() => onChange(SAMPLE_CODE_REQUEST)}>
          Ask it to write code
        </button>
      </div>
      <div className="composer-row">
        <textarea
          value={value}
          rows={2}
          placeholder={hasThread ? "Message the coordinator in this thread" : "Describe a goal"}
          aria-label="Message"
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
        />
        <button type="submit" className="btn primary" disabled={value.trim() === ""}>
          Send
        </button>
      </div>
    </form>
  );
}
