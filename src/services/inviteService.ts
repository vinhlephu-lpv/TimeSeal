const INVITE_URL_BASE = 'https://timeseal-supports-aura.web.app/invite';

export const createCapsuleInviteUrl = (inviteCode: string) =>
  `${INVITE_URL_BASE}?inviteCode=${encodeURIComponent(inviteCode)}`;

export const normalizeInviteCode = (value: string) => {
  const trimmed = value.trim();
  const match = trimmed.match(/[?&](?:inviteCode|capsuleId)=([^&]+)/i);
  try {
    return decodeURIComponent(match?.[1] || trimmed);
  } catch {
    return '';
  }
};
