"""Rebuild the 20 shafts and prove each miner is reachable if walls can be blasted."""
from pathlib import Path

W = 40


def setc(m, x, y, c):
    if 0 <= y < len(m) and 0 <= x < W:
        row = m[y]
        m[y] = row[:x] + c + row[x + 1 :]


def make(h, fn):
    m = ["#" * W for _ in range(h)]

    def carve(x0, y0, x1, y1, ch="."):
        for y in range(y0, y1):
            for x in range(x0, x1):
                setc(m, x, y, ch)

    def s(x, y, c):
        setc(m, x, y, c)

    fn(carve, s)
    return m


def wall(s, x, y0, y1, ch="="):
    for y in range(y0, y1):
        s(x, y, ch)
        s(x + 1, y, ch)


def build():
    levels = []

    def L1(carve, s):
        carve(0, 0, 40, 6, "^")
        carve(16, 5, 24, 22)
        carve(16, 20, 36, 28)
        wall(s, 24, 20, 28, "=")
        s(19, 7, "P")
        s(32, 26, "W")

    def L2(carve, s):
        carve(0, 0, 40, 4, "^")
        carve(15, 3, 25, 16)
        carve(8, 14, 25, 20)
        carve(8, 18, 18, 30)
        carve(8, 28, 32, 32)
        wall(s, 20, 28, 32, "=")
        s(19, 5, "P")
        s(17, 15, "s")
        s(11, 24, "s")
        s(28, 30, "W")

    def L3(carve, s):
        carve(17, 1, 23, 12)
        carve(6, 10, 23, 16)
        carve(6, 14, 14, 24)
        carve(6, 22, 34, 28)
        carve(26, 26, 34, 34)
        wall(s, 18, 22, 28, "=")
        s(19, 2, "P")
        s(10, 12, "b")
        s(12, 20, "s")
        s(30, 32, "W")

    def L4(carve, s):
        carve(16, 1, 24, 14)
        carve(10, 12, 30, 18)
        carve(10, 16, 18, 26)
        carve(10, 24, 32, 32)
        wall(s, 20, 24, 32, "=")
        s(19, 2, "P")
        s(20, 8, "L")
        s(14, 14, "L")
        s(12, 22, "b")
        s(28, 14, "s")
        s(28, 30, "W")

    def L5(carve, s):
        carve(16, 1, 24, 12)
        carve(8, 10, 32, 16)
        carve(8, 14, 32, 20)
        carve(8, 18, 32, 22, "~")
        carve(8, 20, 16, 30)
        carve(24, 20, 32, 30)
        carve(8, 28, 32, 32)
        wall(s, 18, 28, 32, "=")
        s(19, 2, "P")
        s(12, 12, "s")
        s(26, 12, "b")
        s(28, 26, "W")

    def L6(carve, s):
        carve(14, 1, 22, 10)
        carve(6, 8, 34, 14)
        carve(6, 12, 34, 18, "~")
        carve(6, 16, 14, 28)
        carve(26, 16, 34, 28)
        carve(6, 26, 34, 30)
        s(10, 13, "r")
        s(17, 2, "P")
        s(20, 10, "b")
        wall(s, 16, 26, 30, "=")
        s(30, 28, "W")

    def L7(carve, s):
        carve(16, 1, 24, 12)
        carve(8, 10, 24, 16)
        carve(8, 14, 16, 26)
        carve(8, 24, 30, 32)
        wall(s, 18, 24, 32, "=")
        s(19, 2, "P")
        s(15, 12, "n")
        s(8, 18, "n")
        s(8, 22, "n")
        s(12, 20, "s")
        s(26, 30, "W")

    def L8(carve, s):
        carve(18, 1, 24, 8)
        carve(6, 7, 24, 12)
        carve(6, 10, 12, 22)
        carve(18, 10, 34, 16)
        carve(26, 14, 34, 28)
        carve(6, 20, 28, 26)
        carve(6, 24, 14, 36)
        carve(6, 34, 32, 38)
        wall(s, 20, 34, 38, "=")
        s(20, 2, "P")
        s(8, 8, "s")
        s(30, 12, "b")
        s(10, 22, "m")
        s(28, 22, "s")
        s(28, 36, "W")

    def L9(carve, s):
        carve(16, 1, 24, 10)
        carve(8, 8, 32, 14)
        carve(8, 12, 16, 22)
        carve(24, 12, 32, 22)
        carve(8, 20, 32, 26)
        carve(16, 24, 24, 34)
        wall(s, 18, 8, 14, "M")
        wall(s, 16, 20, 26, "=")
        s(19, 2, "P")
        s(10, 10, "s")
        s(28, 16, "b")
        s(12, 18, "n")
        s(19, 32, "W")

    def L10(carve, s):
        carve(15, 1, 23, 10)
        carve(6, 8, 34, 14)
        carve(6, 12, 34, 20, "~")
        carve(26, 18, 34, 30)
        carve(6, 26, 34, 32)
        s(10, 13, "r")
        s(20, 13, "t")
        s(18, 2, "P")
        s(10, 10, "b")
        wall(s, 16, 26, 32, "=")
        s(30, 30, "W")

    def L11(carve, s):
        carve(16, 1, 24, 10)
        carve(8, 8, 32, 14)
        carve(8, 12, 16, 24)
        carve(24, 12, 32, 24)
        carve(8, 22, 32, 28)
        carve(8, 26, 16, 36)
        carve(8, 34, 30, 37)
        s(19, 2, "P")
        s(20, 6, "L")
        s(12, 10, "L")
        s(28, 10, "L")
        s(10, 18, "L")
        s(12, 16, "s")
        s(28, 18, "b")
        s(20, 24, "m")
        wall(s, 18, 34, 37, "=")
        s(26, 35, "W")

    def L12(carve, s):
        carve(17, 1, 23, 8)
        carve(6, 7, 20, 12)
        carve(6, 10, 14, 18)
        carve(6, 16, 34, 20)
        carve(6, 18, 34, 22, "~")
        carve(22, 20, 30, 28)
        carve(10, 26, 30, 30)
        carve(10, 28, 18, 36)
        carve(10, 34, 32, 37)
        s(19, 2, "P")
        s(8, 8, "s")
        s(10, 14, "n")
        s(26, 16, "b")
        wall(s, 20, 34, 37, "=")
        s(28, 35, "W")

    def L13(carve, s):
        carve(16, 1, 24, 8)
        carve(6, 6, 34, 12)
        carve(6, 10, 34, 16, "~")
        carve(6, 14, 14, 22)
        carve(26, 14, 34, 22)
        carve(6, 20, 34, 24)
        carve(6, 22, 34, 26, "~")
        carve(14, 24, 26, 34)
        s(18, 2, "P")
        s(10, 11, "r")
        s(28, 11, "r")
        s(20, 23, "r")
        s(12, 8, "b")
        s(28, 8, "b")
        s(8, 18, "s")
        wall(s, 18, 28, 34, "=")
        s(20, 32, "W")

    def L14(carve, s):
        carve(18, 1, 24, 8)
        carve(6, 6, 24, 12)
        carve(6, 10, 12, 20)
        carve(18, 10, 34, 16)
        carve(26, 14, 34, 26)
        carve(6, 18, 20, 24)
        carve(6, 22, 34, 28)
        carve(14, 26, 22, 38)
        wall(s, 14, 6, 12, "M")
        wall(s, 22, 12, 16, "M")
        wall(s, 18, 22, 28, "=")
        s(20, 2, "P")
        s(8, 8, "s")
        s(30, 12, "m")
        s(8, 16, "n")
        s(28, 20, "b")
        s(17, 36, "W")

    def L15(carve, s):
        carve(15, 1, 23, 9)
        carve(6, 7, 34, 13)
        carve(6, 11, 34, 18, "~")
        carve(6, 16, 14, 26)
        carve(26, 16, 34, 30)
        carve(10, 28, 34, 36)
        s(18, 2, "P")
        s(20, 6, "L")
        s(10, 9, "L")
        s(12, 12, "r")
        s(22, 12, "t")
        s(30, 9, "b")
        s(8, 20, "s")
        s(8, 24, "n")
        wall(s, 18, 28, 36, "=")
        s(30, 34, "W")

    def L16(carve, s):
        carve(17, 1, 23, 8)
        carve(8, 6, 32, 12)
        carve(8, 10, 16, 34)
        carve(24, 10, 32, 22)
        carve(16, 20, 32, 26)
        carve(8, 32, 32, 40)
        wall(s, 18, 32, 40, "=")
        s(19, 2, "P")
        s(12, 8, "s")
        s(26, 8, "b")
        s(8, 14, "n")
        s(8, 18, "n")
        s(8, 22, "n")
        s(8, 28, "n")
        s(28, 14, "m")
        s(28, 22, "s")
        s(28, 38, "W")

    def L17(carve, s):
        carve(16, 1, 24, 8)
        carve(6, 6, 34, 12)
        carve(6, 10, 34, 14, "~")
        carve(6, 12, 12, 20)
        carve(28, 12, 34, 20)
        carve(6, 18, 34, 22)
        carve(6, 20, 34, 24, "M")
        carve(10, 20, 16, 24, ".")
        carve(24, 20, 30, 24, ".")
        carve(10, 22, 30, 28)
        carve(16, 26, 24, 38)
        s(19, 2, "P")
        s(10, 8, "b")
        s(28, 8, "b")
        s(8, 16, "s")
        s(30, 16, "m")
        wall(s, 18, 32, 38, "=")
        s(19, 36, "W")

    def L18(carve, s):
        carve(16, 1, 24, 8)
        carve(8, 6, 32, 12)
        carve(8, 10, 32, 16, "~")
        carve(8, 14, 16, 24)
        carve(24, 14, 32, 28)
        carve(8, 22, 32, 28)
        carve(8, 26, 16, 38)
        carve(8, 36, 30, 40)
        s(19, 2, "P")
        s(20, 6, "L")
        s(12, 8, "L")
        s(12, 11, "r")
        s(22, 11, "t")
        wall(s, 18, 22, 28, "M")
        s(10, 18, "s")
        s(28, 20, "b")
        s(10, 30, "n")
        wall(s, 18, 36, 40, "=")
        s(26, 38, "W")

    def L19(carve, s):
        carve(18, 1, 24, 7)
        carve(6, 6, 20, 11)
        carve(20, 6, 34, 11)
        carve(6, 9, 12, 18)
        carve(28, 9, 34, 18)
        carve(6, 16, 34, 21)
        carve(6, 19, 34, 23, "~")
        carve(14, 21, 26, 30)
        carve(8, 28, 18, 36)
        carve(22, 28, 32, 36)
        carve(8, 34, 32, 42)
        s(20, 2, "P")
        s(8, 7, "s")
        s(30, 7, "s")
        s(8, 13, "n")
        s(32, 13, "n")
        s(10, 17, "b")
        s(28, 17, "b")
        s(18, 20, "r")
        s(16, 24, "m")
        s(24, 26, "s")
        wall(s, 18, 34, 42, "=")
        s(28, 40, "W")

    def L20(carve, s):
        carve(17, 1, 23, 8)
        carve(6, 6, 34, 12)
        carve(6, 10, 34, 15, "~")
        carve(6, 13, 14, 22)
        carve(26, 13, 34, 22)
        carve(6, 20, 34, 26)
        carve(10, 24, 18, 32)
        carve(22, 24, 30, 32)
        carve(6, 30, 34, 36)
        carve(6, 34, 34, 38, "~")
        carve(14, 36, 26, 46)
        s(19, 2, "P")
        s(20, 6, "L")
        s(10, 8, "L")
        s(28, 8, "L")
        s(10, 11, "r")
        s(24, 11, "t")
        s(8, 8, "b")
        s(30, 8, "b")
        s(8, 16, "n")
        s(32, 16, "s")
        s(12, 22, "m")
        s(28, 22, "s")
        s(14, 28, "n")
        s(26, 28, "b")
        s(18, 35, "r")
        wall(s, 18, 40, 46, "=")
        wall(s, 20, 40, 46, "=")
        s(19, 44, "W")

    for fn in (L1, L2, L3, L4, L5, L6, L7, L8, L9, L10, L11, L12, L13, L14, L15, L16, L17, L18, L19, L20):
        levels.append(make(48, fn))
    return levels


def passable(c):
    return c not in {"#", "M"}


def flood(m):
    h = len(m)
    start = goal = None
    for y, row in enumerate(m):
        for x, c in enumerate(row):
            if c == "P":
                start = (x, y)
            elif c == "W":
                goal = (x, y)
    if not start or not goal:
        return False, start, goal, 0
    seen = {start}
    q = [start]
    i = 0
    while i < len(q):
        x, y = q[i]
        i += 1
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < W and 0 <= ny < h and (nx, ny) not in seen and passable(m[ny][nx]):
                seen.add((nx, ny))
                q.append((nx, ny))
    return goal in seen, start, goal, len(seen)


def main():
    levels = build()
    bad = 0
    for i, m in enumerate(levels, 1):
        ok, start, goal, n = flood(m)
        print(f"L{i:02d} start={start} miner={goal} cells={n} reachable={ok}")
        if not ok:
            bad += 1
            for row in m:
                print(row)
    print("FAIL" if bad else "OK", f"{len(levels)-bad}/{len(levels)}")
    raise SystemExit(bad)


if __name__ == "__main__":
    main()
