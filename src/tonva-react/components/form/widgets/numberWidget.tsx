//import * as React from 'react';
import { TextWidget } from './textWidget';
import { RuleNum, RuleInt } from '../rules';
import { NumBaseSchema } from '../../schema';

export class NumberWidget extends TextWidget {
    protected inputType = 'number';
    protected get itemSchema(): NumBaseSchema {return this._itemSchema as NumBaseSchema};

    protected buildRules() {
        super.buildRules();
        let res = this.context.form.res;
        let {min, max} = this.itemSchema;
        this.rules.push(
            this.itemSchema.type === 'integer'?
				new RuleInt(res, min, max) :
				new RuleNum(res, min, max)
        );
        /*
        if (this.itemSchema.type === 'integer') {
            this.rules.push(new RuleInt);
        }
        let {min, max} = this.itemSchema;
        if (min !== undefined) this.rules.push(new RuleMin(min));
        if (max !== undefined) this.rules.push(new RuleMax(max));
        */
    }

    protected parse(value:any):any {
        if (value === undefined || value === null) return;
        return Number(value);
    }
}
