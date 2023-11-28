async function sleepWhile(ms: number): Promise<void> {
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

class FixedLengthArray<T> {
  readonly length!: number;
  public array: T[] = [];
  constructor(length: number) {
    this.length = length;
  }
  public add(info: T) {
    if (this.array.length >= this.length) {
      this.array.shift();
    }
    this.array.push(info);
  }
}
export { sleepWhile, FixedLengthArray };
