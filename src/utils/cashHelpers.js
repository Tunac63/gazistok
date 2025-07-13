export function hesaplaDevir(previousCarry, cashIn, cashExpense) {
  // previousCarry zaten masraflar düşülmüş net bakiye
  const devir = previousCarry + cashIn - cashExpense;
  return devir >= 0 ? devir : 0;
}
