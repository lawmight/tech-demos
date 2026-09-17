import Base
import ./demo.bend as Demo

law add_zero:
  for x: Nat
  {Nat.add(x, 0n) == x : Nat}

law pow2_base:
  {Demo.pow2(0n) == 1 : U32}
