import assert from 'node:assert/strict';
import {normalizePhoneInput} from '../lib/phone-input.ts';

for (const value of ['98676326', '98 67 63 26', '+47 98 67 63 26', '0047 98 67 63 26', '4798676326']) {
  assert.equal(normalizePhoneInput(value), '98676326', value);
}
assert.equal(normalizePhoneInput('47379453'), '47379453', 'National numbers starting with 47 are preserved');
assert.equal(normalizePhoneInput('98ab67'), '9867', 'Letters cannot enter the field');
assert.equal(normalizePhoneInput('986763269'), '986763269', 'Extra digits are not silently discarded');
assert.equal(normalizePhoneInput('+46 98676326'), '+4698676326', 'Foreign prefixes are not converted to local numbers');
assert.equal(normalizePhoneInput('+47'), '+47', 'Partial prefixes remain editable');
assert.equal(normalizePhoneInput(''), '');
console.log('Phone input tests passed');
