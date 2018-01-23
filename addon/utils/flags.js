function getFlag(str) {
  return `__LIFELINE_${str}_${Math.floor(Math.random() * new Date())}`;
}

export const WILL_DESTROY_PATCHED = getFlag('WILL_DESTROY_PATCHED');
