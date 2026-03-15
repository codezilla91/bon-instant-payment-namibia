let lastDateStamp = '';
let dailySequence = 0;

export function buildTransactionId(): string {
  // Match the challenge sample shape: TXN + YYYYMMDD + 4-digit daily sequence.
  const date = new Date();
  const dateStamp = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;

  if (dateStamp !== lastDateStamp) {
    lastDateStamp = dateStamp;
    dailySequence = 0;
  }

  dailySequence += 1;

  return `TXN${dateStamp}${String(dailySequence).padStart(4, '0')}`;
}
