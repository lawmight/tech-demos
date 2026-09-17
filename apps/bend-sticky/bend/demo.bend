import Base

def add(+a: U32, +b: U32) -> U32:
  (a + b : U32)

def pow2(+n: Nat) -> U32:
  match n:
    case 0n:
      1
    case 1n+p:
      a b = pow2(p) pow2(p)
      (a + b : U32)
