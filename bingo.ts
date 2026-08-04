/**
 * Bingo utilities: grid generation, win validation
 */

/** Generate a unique 5×5 bingo grid. Center [2][2] is null (FREE). */
export function generateBingoGrid(): (number | null)[][] {
  // B: 1-15, I: 16-30, N: 31-45, G: 46-60, O: 61-75
  const ranges = [
    [1, 15],
    [16, 30],
    [31, 45],
    [46, 60],
    [61, 75],
  ];

  const grid: (number | null)[][] = Array.from({ length: 5 }, () => Array(5).fill(null));

  for (let col = 0; col < 5; col++) {
    const [min, max] = ranges[col];
    const pool = Array.from({ length: max - min + 1 }, (_, i) => i + min);
    const picked: number[] = [];
    for (let row = 0; row < 5; row++) {
      if (col === 2 && row === 2) continue; // FREE space
      const idx = Math.floor(Math.random() * pool.length);
      picked.push(pool.splice(idx, 1)[0]);
    }
    let pickIdx = 0;
    for (let row = 0; row < 5; row++) {
      if (col === 2 && row === 2) {
        grid[row][col] = null; // FREE
      } else {
        grid[row][col] = picked[pickIdx++];
      }
    }
  }

  return grid;
}

/** Map a number (1-75) to its bingo column letter. */
export function getColumn(num: number): "B" | "I" | "N" | "G" | "O" {
  if (num >= 1 && num <= 15) return "B";
  if (num >= 16 && num <= 30) return "I";
  if (num >= 31 && num <= 45) return "N";
  if (num >= 46 && num <= 60) return "G";
  return "O";
}

/**
 * Validate if a card has bingo (line, column, or diagonal win).
 * markedNumbers includes the player's marked set; FREE space is counted.
 */
export function validateBingo(
  grid: (number | null)[][],
  markedNumbers: number[],
  gameType: string
): boolean {
  const marked = new Set(markedNumbers);
  const isFree = (row: number, col: number) => row === 2 && col === 2;

  const isMarked = (row: number, col: number) => {
    if (isFree(row, col)) return true;
    const val = grid[row]?.[col];
    return val !== null && val !== undefined && marked.has(val);
  };

  if (gameType === "coverall") {
    // All cells must be marked
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        if (!isMarked(r, c)) return false;
      }
    }
    return true;
  }

  // Check rows
  for (let r = 0; r < 5; r++) {
    if ([0, 1, 2, 3, 4].every((c) => isMarked(r, c))) return true;
  }

  // Check columns
  for (let c = 0; c < 5; c++) {
    if ([0, 1, 2, 3, 4].every((r) => isMarked(r, c))) return true;
  }

  if (gameType === "line") return false;

  // Check diagonals for classic/full_card
  if ([0, 1, 2, 3, 4].every((i) => isMarked(i, i))) return true;
  if ([0, 1, 2, 3, 4].every((i) => isMarked(i, 4 - i))) return true;

  if (gameType === "full_card") {
    // Full card: all cells
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        if (!isMarked(r, c)) return false;
      }
    }
    return true;
  }

  return false;
}
