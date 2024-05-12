export interface IEgg {
  code: string,
  obtained?: boolean,
  visible?: boolean;
  coords?: [number, number],
  items?: Array<string>,
  /** Egg placeholder for grid. Does not exist. */
  placeholder?: boolean
}
