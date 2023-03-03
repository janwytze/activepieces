import { Component } from '@angular/core';
import {
  ControlValueAccessor,
  FormBuilder,
  FormControl,
  FormGroup,
  NG_VALIDATORS,
  NG_VALUE_ACCESSOR,
  Validators,
} from '@angular/forms';
import { Observable, pairwise, startWith, tap } from 'rxjs';
import {
  BranchActionSettings,
  BranchOperator,
  singleValueConditions,
} from '@activepieces/shared';
import { DropdownItem } from '../../../../../../../../common/model/dropdown-item.interface';
import { InterpolatingTextFormControlComponent } from '../../../../../../../../common/components/form-controls/interpolating-text-form-control/interpolating-text-form-control.component';
import { InsertMentionOperation } from '../../../../../../../../common/components/form-controls/interpolating-text-form-control/utils';

interface BranchForm {
  firstValue: FormControl<string | null>;
  operator: FormControl<BranchOperator | null>;
  secondValue: FormControl<string | null>;
}
interface BranchFormValue {
  firstValue: string | null;
  operator: BranchOperator | null;
  secondValue: string | null;
}

@Component({
  selector: 'app-branch-step-input-form',
  templateUrl: './branch-step-input-form.component.html',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      multi: true,
      useExisting: BranchStepInputFormComponent,
    },
    {
      provide: NG_VALIDATORS,
      multi: true,
      useExisting: BranchStepInputFormComponent,
    },
  ],
})
export class BranchStepInputFormComponent implements ControlValueAccessor {
  form: FormGroup<BranchForm>;
  valueChanges$: Observable<Partial<BranchFormValue>>;
  operatorChanged$: Observable<[BranchOperator | null, BranchOperator | null]>;
  conditionsDropdownOptions: DropdownItem[] = [];
  onChange: (val: BranchActionSettings) => void = () => {
    //ignored
  };

  constructor(private fb: FormBuilder) {
    const operatorControl: FormControl<BranchOperator | null> = new FormControl(
      null,
      {
        nonNullable: true,
        validators: Validators.required,
      }
    );
    this.form = this.fb.group({
      firstValue: new FormControl('', {
        nonNullable: false,
        validators: Validators.required,
      }),
      operator: operatorControl,
      secondValue: new FormControl('', {
        nonNullable: false,
        validators: Validators.required,
      }),
    });
    this.operatorChanged$ = this.form.controls.operator.valueChanges.pipe(
      startWith(null),
      pairwise(),
      tap(([firstValue, secondValue]) => {
        const isFirstValueBinaryCondition = !singleValueConditions.find(
          (c) => c === firstValue
        );
        const isSecondValueSingleValueCondition = !!singleValueConditions.find(
          (c) => c === secondValue
        );
        if (
          (isFirstValueBinaryCondition || firstValue === null) &&
          isSecondValueSingleValueCondition
        ) {
          this.form.controls.secondValue.setValue('');
          this.form.controls.secondValue.disable();
        } else {
          this.form.controls.secondValue.enable();
        }
      })
    );
    this.createConditionsDropdownOptions();
    this.form.markAllAsTouched();
    this.valueChanges$ = this.form.valueChanges.pipe(
      tap(() => {
        const val = this.form.getRawValue();
        this.onChange({
          conditions: [
            [
              {
                firstValue: val.firstValue || '',
                secondValue: val.secondValue || '',
                operator: val.operator || undefined,
              },
            ],
          ],
        });
      })
    );
  }
  writeValue(obj: BranchActionSettings): void {
    if (obj && obj.conditions && obj.conditions[0] && obj.conditions[0][0]) {
      this.form.patchValue(obj.conditions[0][0]);
    }
  }
  registerOnChange(fn: (val: BranchActionSettings) => void): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: () => void): void {
    fn;
  }
  setDisabledState?(isDisabled: boolean): void {
    if (isDisabled) {
      this.form.disable();
    }
  }
  createConditionsDropdownOptions() {
    this.conditionsDropdownOptions = Object.values(BranchOperator).map(
      (operator) => {
        const label = operator
          .split('_')
          .map((word, idx) => {
            if (idx === 0) {
              const formmatedWord =
                word[0].toUpperCase() + word.toLowerCase().slice(1);
              if (
                word.toLocaleLowerCase() === 'does' ||
                word.toLocaleLowerCase() === 'exists'
              ) {
                return formmatedWord;
              }
              return '(' + formmatedWord + ')';
            }
            return word.toLowerCase();
          })
          .join(' ');
        return {
          label: label,
          value: operator,
        };
      }
    );
  }
  async addMention(
    textControl: InterpolatingTextFormControlComponent,
    mentionOp: InsertMentionOperation
  ) {
    await textControl.addMention(mentionOp);
  }
  showSecondValue() {
    const currentBranchCondition = this.form.value.operator;
    return !singleValueConditions.find((c) => c === currentBranchCondition);
  }
  validate() {
    if (this.form.invalid) {
      return { invalid: true };
    }
    return null;
  }
}
