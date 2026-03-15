import { AbstractControl, ValidationErrors } from '@angular/forms';

export function positiveAmountValidator(control: AbstractControl): ValidationErrors | null {
  if (control.value === '' || control.value === null || control.value === undefined) {
    return null;
  }

  const value = Number(control.value);
  return Number.isFinite(value) && value > 0 ? null : { positiveAmount: true };
}

export function nonBlankValidator(control: AbstractControl): ValidationErrors | null {
  return typeof control.value === 'string' && control.value.trim().length > 0 ? null : { blank: true };
}
