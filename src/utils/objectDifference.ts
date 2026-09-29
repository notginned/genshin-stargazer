const objectDifference = <T extends Object, U extends Object>(obj1: T, obj2: U) => {
  const res: T = {} as T;
  for (const prop in obj1) {
    if (Object.prototype.hasOwnProperty.call(obj2, prop)) continue;

    // x is elementof A and x is not element of B
    res[prop] = obj1[prop];
  }
  return res;
};

export { objectDifference };
