import Base
import ./demo.bend as Demo

def main() -> IO(Unit):
  do IO<Unit>:
    IO.print("pow2(12) = " ++ U32.show(Demo.pow2(12n)))
    IO.print("pow2(16) = " ++ U32.show(Demo.pow2(16n)))
    IO.print("")
    IO.print("The line `a b = pow2(p) pow2(p)` is a parallel call.")
    IO.print("Bend schedules both recursive calls independently — no threads, no locks.")
