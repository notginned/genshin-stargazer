import type { Nullable } from "../types/lib.types";
import { isNull } from "./lib";

function lDistance(s: string, t: string): number {
  if (s === "") return t.length;
  if (t === "") return s.length;
  if (s === t) return 0;

  // + 1 to accomodate empty prefixes
  const numRows = s.length + 1;
  const numCols = t.length + 1;
  const mat: number[][] = Array.from({ length: numRows }, () =>
    Array.from({ length: numCols }, () => 0)
  );

  // Prefix of length i can be transformed into empty string in i deletions
  for (let i = 0; i < numRows; ++i) {
    mat[i][0] = i;
  }

  // Empty prefix can be transformed into a string of length j in j additions
  for (let j = 0; j < numCols; ++j) {
    mat[0][j] = j;
  }

  for (let i = 1; i < numRows; ++i) {
    for (let j = 1; j < numCols; ++j) {
      if (s[i - 1] === t[j - 1]) {
        // No Operation required, recurse into subproblem
        mat[i][j] = mat[i - 1][j - 1];
        continue;
      }

      mat[i][j] =
        1 +
        Math.min(
          mat[i - 1][j], // deletion
          mat[i][j - 1], // addition
          mat[i - 1][j - 1] // Substitution
        );
    }
  }

  return mat[numRows - 1][numCols - 1];
}

class Node<T> {
  data: T;
  children: { [weight: number]: Node<T> };

  constructor(data: T, children: { [weight: number]: Node<T> } = {}) {
    this.data = data;
    this.children = children;
  }
}

export class BKTree {
  root: Nullable<Node<string>>;

  constructor(strings?: string[]) {
    const unique = Array.from(new Set(strings));

    this.root = unique.length !== 0 ? new Node<string>(unique[0]) : null;
    for (let i = 1; i < unique.length; ++i) {
      this.add(unique[i], this.root);
    }
  }

  add(str: string, root = this.root): Node<string> {
    if (isNull(root)) return (this.root = new Node(str));

    const distance = lDistance(str, root.data);

    // Same word
    if (distance === 0) return root;

    if (root.children[distance] === undefined) {
      return (root.children[distance] = new Node(str));
    }

    return this.add(str, root.children[distance]);
  }

  search(str: string, radius = 2): [string, number][] {
    if (isNull(this.root)) return [];

    const candidates = [this.root];
    const results: [string, number][] = [];

    while (candidates.length !== 0) {
      const candidate = candidates.pop() as Node<string>;
      const distance = lDistance(str, candidate.data);
      if (distance <= radius) {
        results.push([candidate.data, distance]);
      }

      for (const d in candidate.children) {
        if (Number(d) < distance + radius && Number(d) > distance - radius) {
          candidates.push(candidate.children[d]);
        }
      }
    }

    return results;
  }
}
