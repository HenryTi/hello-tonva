import { Res, UI } from "tonva-react";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { FieldItem, FieldItemInt, FieldItemNum, FieldItemString, FieldItemId } from "tonva-react";
import { OrderDetail } from "./BzTest";

/*--fields--*/
const fields = {
	id: {
		"name": "id",
		"type": "id",
		"isKey": false,
		"label": "Id"
	} as FieldItemId,
	master: {
		"name": "master",
		"type": "id",
		"isKey": true,
		"label": "Master"
	} as FieldItemId,
	row: {
		"name": "row",
		"type": "integer",
		"isKey": true,
		"widget": "updown",
		"label": "Row"
	} as FieldItemInt,
	product: {
		"name": "product",
		"type": "id",
		"isKey": false,
		"label": "Product"
	} as FieldItemId,
	price: {
		"name": "price",
		"type": "number",
		"isKey": false,
		"widget": "number",
		"label": "Price"
	} as FieldItemNum,
	quantity: {
		"name": "quantity",
		"type": "number",
		"isKey": false,
		"widget": "number",
		"label": "Quantity"
	} as FieldItemNum,
	amount: {
		"name": "amount",
		"type": "number",
		"isKey": false,
		"widget": "number",
		"label": "Amount"
	} as FieldItemNum,
};
/*==fields==*/

export const fieldArr: FieldItem[] = [
	fields.master, fields.row, fields.product, fields.price, fields.quantity, fields.amount, 
];

export const ui: UI = {
	label: "OrderDetail",
	fieldArr,
	fields,
};

export const res: Res<any> = {
	zh: {
	},
	en: {
	}
};

export function render(item: OrderDetail):JSX.Element {
	return <>{JSON.stringify(item)}</>;
};
