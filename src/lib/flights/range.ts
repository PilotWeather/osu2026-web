export function analyticsRange(params: { preset?: string; from?: string; to?: string }) {
  const today = new Date(); today.setUTCHours(0,0,0,0);
  const to = params.to?.match(/^\d{4}-\d{2}-\d{2}$/) ? new Date(`${params.to}T23:59:59.999Z`) : new Date(today.getTime()+86_399_999);
  const from = params.from?.match(/^\d{4}-\d{2}-\d{2}$/) ? new Date(`${params.from}T00:00:00.000Z`) : new Date(today);
  if (!params.from) from.setUTCDate(from.getUTCDate()-(params.preset==="today"?0:params.preset==="30"?29:6));
  return { from, to };
}
