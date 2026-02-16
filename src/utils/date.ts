export const formatDay = (isoDate: string): string =>
  new Date(isoDate).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric"
  });

export const isSameDay = (firstIso: string, secondIso: string): boolean => {
  const first = new Date(firstIso);
  const second = new Date(secondIso);
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
};
