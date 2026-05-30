export const formatDate = (isoString: string): string => {
  const date = new Date(isoString);
  return `${date.toLocaleDateString('vi-VN')} lúc ${date.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
};

export type CountdownValues = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isUnlocked: boolean;
};

export const getCountdownValues = (openDateISO: string): CountdownValues => {
  const now = new Date();
  const openDate = new Date(openDateISO);
  const diffMs = openDate.getTime() - now.getTime();

  if (diffMs <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isUnlocked: true };
  }

  const secMs = 1000;
  const minMs = 60 * secMs;
  const hrMs = 60 * minMs;
  const dayMs = 24 * hrMs;

  const days = Math.floor(diffMs / dayMs);
  const hours = Math.floor((diffMs % dayMs) / hrMs);
  const minutes = Math.floor((diffMs % hrMs) / minMs);
  const seconds = Math.floor((diffMs % minMs) / secMs);

  return { days, hours, minutes, seconds, isUnlocked: false };
};

export const getCountdownLabel = (openDateISO: string): string => {
  const { days, hours, minutes, seconds, isUnlocked } = getCountdownValues(openDateISO);

  if (isUnlocked) {
    return 'Đã đến ngày mở';
  }

  if (days > 0) {
    return `Còn ${days} ngày ${hours} giờ`;
  }
  if (hours > 0) {
    return `Còn ${hours} giờ ${minutes} phút`;
  }
  if (minutes > 0) {
    return `Còn ${minutes} phút ${seconds} giây`;
  }
  return `Còn ${seconds} giây`;
};
