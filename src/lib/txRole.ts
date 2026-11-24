/**
 * How an account relates to one transaction. `sent`: the account sent it or
 * paid for it. `received`: it was the recipient. `affected`: it was involved
 * some other way.
 */
export type TxRole = 'sent' | 'received' | 'affected';

const same = (a: string | null | undefined, b: string): boolean => !!a && a.toLowerCase() === b.toLowerCase();

export const txRole = (account: string, sender: string | null | undefined, recipient?: string | null): TxRole => {
  if (same(sender, account)) return 'sent';
  if (recipient !== undefined && same(recipient, account)) return 'received';
  return 'affected';
};

export const TX_ROLE_LABEL: Record<TxRole, string> = {
  sent: 'sent',
  received: 'received',
  affected: 'affected',
};
