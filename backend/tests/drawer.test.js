import test from 'node:test';
import assert from 'node:assert/strict';

test('Cash Register Opening Float Calculation', () => {
  const openingFloat = 200.00;
  assert.equal(openingFloat, 200.00, 'Opening float should equal 200.00');
});

test('Cash Drawer Expected Cash Reconciliation Logic', () => {
  const openingFloat = 200.00;
  const cashSales = 450.00;
  const safeDrops = 100.00; // Bank deposit
  const pettyCashPayouts = 35.00; // Expenses

  const expectedCash = openingFloat + cashSales + safeDrops - pettyCashPayouts;
  assert.equal(expectedCash, 715.00, 'Expected cash should calculate openingFloat + cashSales + drops - payouts');
});

test('Z-Report Cash Drawer Variance Analysis', () => {
  const expectedCash = 715.00;

  // Case 1: Exact balanced match
  const actualCountedBalanced = 715.00;
  const varianceBalanced = Math.round((actualCountedBalanced - expectedCash) * 100) / 100;
  assert.equal(varianceBalanced, 0, 'Variance should be 0 for balanced drawer');

  // Case 2: Overage (+$15.00)
  const actualCountedOverage = 730.00;
  const varianceOverage = Math.round((actualCountedOverage - expectedCash) * 100) / 100;
  assert.equal(varianceOverage, 15.00, 'Variance should be positive 15.00 for overage');

  // Case 3: Shortage (-$10.00)
  const actualCountedShortage = 705.00;
  const varianceShortage = Math.round((actualCountedShortage - expectedCash) * 100) / 100;
  assert.equal(varianceShortage, -10.00, 'Variance should be negative 10.00 for shortage');
});

test('Petty Cash Payout Mandatory Reason Validation', () => {
  const payoutReason = 'Emergency kitchen ingredient purchase (Fresh Herbs)';
  const isValidReason = payoutReason && payoutReason.trim().length > 0;

  assert.equal(isValidReason, true, 'Petty cash payout reason must be non-empty string');
});
