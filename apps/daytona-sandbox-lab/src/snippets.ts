import type { Language } from "./lifecycle";

export interface Snippet {
  id: string;
  language: Language;
  label: string;
  hint: string;
  code: string;
  /**
   * What the snippet prints when run inside a fresh Daytona sandbox. Used verbatim in mock mode
   * (labeled "simulated" in the UI). `{{id}}` is replaced with the mock sandbox id.
   */
  mockOutput: string;
}

export const SNIPPETS: Snippet[] = [
  {
    id: "py-hello",
    language: "python",
    label: "Hello from inside",
    hint: "Who am I, where am I running",
    code: `import os, platform, socket, sys

print("hello from a Daytona sandbox")
print("hostname :", socket.gethostname())
print("python   :", sys.version.split()[0])
print("kernel   :", platform.release())
print("cwd      :", os.getcwd())
print("cpus     :", os.cpu_count())
`,
    mockOutput: `hello from a Daytona sandbox
hostname : {{id}}
python   : 3.13.3
kernel   : 6.8.0-daytona
cwd      : /home/daytona
cpus     : 1
`,
  },
  {
    id: "py-primes",
    language: "python",
    label: "Prime sieve",
    hint: "A little CPU work, timed",
    code: `import time

def sieve(n):
    flags = bytearray([1]) * (n + 1)
    flags[0] = flags[1] = 0
    for i in range(2, int(n ** 0.5) + 1):
        if flags[i]:
            flags[i * i :: i] = bytearray(len(flags[i * i :: i]))
    return [i for i, f in enumerate(flags) if f]

t0 = time.perf_counter()
primes = sieve(2_000_000)
dt = (time.perf_counter() - t0) * 1000
print(f"found {len(primes):,} primes below 2,000,000 in {dt:.0f} ms")
print("last five:", primes[-5:])
`,
    mockOutput: `found 148,933 primes below 2,000,000 in 214 ms
last five: [1999891, 1999957, 1999969, 1999979, 1999993]
`,
  },
  {
    id: "ts-runtime",
    language: "typescript",
    label: "Node runtime info",
    hint: "Typed code, run via codeRun",
    code: `import os from "node:os";

type Report = { node: string; platform: string; arch: string; memGiB: number };

const report: Report = {
  node: process.version,
  platform: os.platform(),
  arch: os.arch(),
  memGiB: Math.round(os.totalmem() / 1024 ** 3),
};

console.log("hello from a Daytona sandbox (TypeScript)");
console.table(report);
`,
    mockOutput: `hello from a Daytona sandbox (TypeScript)
┌──────────┬───────────┐
│ (index)  │ Values    │
├──────────┼───────────┤
│ node     │ 'v22.14.0'│
│ platform │ 'linux'   │
│ arch     │ 'x64'     │
│ memGiB   │ 1         │
└──────────┴───────────┘
`,
  },
  {
    id: "js-env",
    language: "javascript",
    label: "Env + uptime",
    hint: "Plain JS, no types",
    code: `const started = Date.now();
const uptime = Math.round(process.uptime() * 1000);

console.log("hello from a Daytona sandbox (JavaScript)");
console.log("pid      :", process.pid);
console.log("uptime   :", uptime, "ms since node started");
console.log("user     :", process.env.USER ?? "unknown");
console.log("elapsed  :", Date.now() - started, "ms");
`,
    mockOutput: `hello from a Daytona sandbox (JavaScript)
pid      : 412
uptime   : 38 ms since node started
user     : daytona
elapsed  : 0 ms
`,
  },
  {
    id: "sh-probe",
    language: "shell",
    label: "System probe",
    hint: "uname, distro, cpus, memory",
    code: `uname -a
grep PRETTY_NAME /etc/os-release
echo "cpus: $(nproc)"
free -m | awk 'NR==2 {print "mem:  " $2 " MiB total, " $4 " MiB free"}'
df -h / | awk 'NR==2 {print "disk: " $2 " total, " $4 " free"}'
whoami
`,
    mockOutput: `Linux {{id}} 6.8.0-daytona #1 SMP PREEMPT_DYNAMIC x86_64 GNU/Linux
PRETTY_NAME="Debian GNU/Linux 12 (bookworm)"
cpus: 1
mem:  977 MiB total, 812 MiB free
disk: 3.0G total, 2.4G free
daytona
`,
  },
  {
    id: "sh-scratch",
    language: "shell",
    label: "Scratch files",
    hint: "Write, read, then let it all vanish",
    code: `mkdir -p /tmp/scratch && cd /tmp/scratch
for i in 1 2 3; do echo "line $i from an ephemeral box" > "file-$i.txt"; done
ls -1
cat file-2.txt
echo "these files are destroyed with the sandbox"
`,
    mockOutput: `file-1.txt
file-2.txt
file-3.txt
line 2 from an ephemeral box
these files are destroyed with the sandbox
`,
  },
];

export const DEFAULT_SNIPPET_ID = SNIPPETS[0]!.id;

export function snippetById(id: string | undefined): Snippet | undefined {
  return SNIPPETS.find((s) => s.id === id);
}

export function snippetsFor(language: Language): Snippet[] {
  return SNIPPETS.filter((s) => s.language === language);
}
