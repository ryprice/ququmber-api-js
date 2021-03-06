export default class FuzzyGranularity {
  private readonly name: string;
  private readonly key: number;

  constructor(name: string, key: number) {
    this.name = name;
    this.key = key;
  }

  public getName(): string {
    return this.name;
  }

  public getKey(): number {
    return this.key;
  }

  public static fromKey(key: number) {
    switch(key) {
      case 0:
        return this.MINUTE;
      case 1:
        return this.HOUR;
      case 2:
        return this.DAY;
      case 3:
        return this.WEEK;
      case 4:
        return this.MONTH;
      case 5:
        return this.YEAR;
      case 6:
        return this.FOREVER;
    }
  }

  public static MINUTE = new FuzzyGranularity('Minute', 0);
  public static HOUR = new FuzzyGranularity('Hour', 1);
  public static DAY = new FuzzyGranularity('Day', 2);
  public static WEEK = new FuzzyGranularity('Week', 3);
  public static MONTH = new FuzzyGranularity('Month', 4);
  public static YEAR = new FuzzyGranularity('Year', 5);
  public static FOREVER = new FuzzyGranularity('Forever', 6);

  private static readonly sizeStack: FuzzyGranularity[] = [
    FuzzyGranularity.MINUTE,
    FuzzyGranularity.HOUR,
    FuzzyGranularity.DAY,
    FuzzyGranularity.WEEK,
    FuzzyGranularity.MONTH,
    FuzzyGranularity.YEAR,
    FuzzyGranularity.FOREVER
  ];

  // Returns true if this granularity fits squarely inside of the given granularity.
  // Eg a week doesn't fit into a month, but a day fits into a week squarely.
  public fitsSquarelyIn(granularity: FuzzyGranularity): boolean {
    if (this === granularity || granularity === FuzzyGranularity.FOREVER) {
      return true;
    }
    if (this.compareTo(granularity) > 1) {
      return false;
    }
    return granularity !== FuzzyGranularity.WEEK;
  }

  // Determine which granularity is a larger unit of time
  public compareTo(other: FuzzyGranularity): number {
    const thisSize = FuzzyGranularity.sizeStack.indexOf(this);
    const otherSize = FuzzyGranularity.sizeStack.indexOf(other);

    if (thisSize < otherSize) {
      return 1;
    } else if (thisSize > otherSize) {
      return -1;
    }
    return 0;
  }

  public getNext(sequence: FuzzyGranularitySequence) {
    const idx = sequence.indexOf(this) + 1;
    if (sequence.length > idx) {
      return sequence[idx];
    }
    return FuzzyGranularity.FOREVER;
  }

  public getPrev(sequence: FuzzyGranularitySequence) {
    const idx = sequence.indexOf(this) - 1;
    if (sequence.length >= 0) {
      return sequence[idx];
    }
  }
}

export type FuzzyGranularitySequence = Array<FuzzyGranularity>;

export const StandardGranularitySequence = new Array<FuzzyGranularity>(
  FuzzyGranularity.DAY,
  FuzzyGranularity.WEEK,
  FuzzyGranularity.MONTH,
  FuzzyGranularity.YEAR,
  FuzzyGranularity.FOREVER
);
