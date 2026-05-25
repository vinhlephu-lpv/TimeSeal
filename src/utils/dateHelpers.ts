export const formatDate = (isoString: string): string => {
  const date = new Date(isoString);
  return date.toLocaleDateString('vi-VN');
};

export const getCountdownLabel = (openDateISO: string): string => {
  const now = new Date();
  const openDate = new Date(openDateISO);
  const diffMs = openDate.getTime() - now.getTime();

  if (diffMs <= 0) {
    return 'Đã đến ngày mở';
  }

  const dayMs = 24 * 60 * 60 * 1000;
  const days = Math.ceil(diffMs / dayMs);
  return `Còn ${days} ngày`;
};
