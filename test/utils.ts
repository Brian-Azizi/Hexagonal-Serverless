export const today = () => {
  const result = new Date();
  result.setHours(0, 0, 0, 0);
  return result;
};

export const tomorrow = () => {
  const result = today();
  result.setDate(result.getDate() + 1);
  return result;
};

export const later = () => {
  // 100 days from today
  const result = today();
  result.setDate(result.getDate() + 100);
  return result;
};
