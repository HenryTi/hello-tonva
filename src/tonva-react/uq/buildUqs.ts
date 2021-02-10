import fs from 'fs';
import path from 'path';
import { Action, Book, Query, Sheet, Tuid, UqEnum, 
	UqMan, UQsMan, Map, History, Tag, Pending, 
	Entity, ArrFields, Field } from './index';
import { nav } from '../components';
import { UqsConfig } from '../app';
import { ID, IX, IDX } from './ID';
import { camelCase, capitalCase, env } from 'tonva-react';

const red = '\x1b[41m%s\x1b[0m';
let lastBuildTime:number = 0;
const uqTsSrcPath = 'src/UqApp';

// 返回每个uq构建时的错误
async function uqsStart(uqsConfig: UqsConfig):Promise<string[]> {
	nav.forceDevelopment = true;
	await nav.init();
	let retErrors = await UQsMan.build(uqsConfig);
	return retErrors;
}
export async function buildUqs(options: UqsConfig) {
	// 只从test 数据库构建uq ts
	env.testing = true;

	if (lastBuildTime > 0) {
		console.log(red, 'quit !');
		return;
	}
	if (!fs.existsSync(uqTsSrcPath)) {
		fs.mkdirSync(uqTsSrcPath);
	}
	//buildTsAppName(options);
	//buildTsAppConfig(options);
	
	let tsIndex = buildTsIndex();
	saveTsFile('index', tsIndex);
	let tsCApp = buildTsCApp();
	saveTsFileIfNotExists('CApp', tsCApp);
	let tsCBase = buildTsCBase();
	saveTsFile('CBase', tsCBase);
	let tsVMain = buildTsVMain();
	saveTsFileIfNotExists('VMain', tsVMain, 'tsx');

	saveTsFile('uqs', '');
	fs.unlinkSync(uqTsSrcPath + '/uqs.ts');
	await buildUqsFolder(uqTsSrcPath + '/uqs', options);
};

function saveTsFileIfNotExists(fileName:string, content:string, suffix:string = 'ts') {
	let tsFile = `${uqTsSrcPath}/${fileName}.${suffix}`;
	if (fs.existsSync(tsFile) === true) return;
	saveTsFile(fileName, content, suffix);
}
function saveTsFile(fileName:string, content:string, suffix:string = 'ts') {
	let srcFile = `${uqTsSrcPath}/${fileName}.${suffix}.txt`;
	let tsFile = `${uqTsSrcPath}/${fileName}.${suffix}`;
	if (!fs.existsSync(srcFile)) {
		if (fs.existsSync(tsFile)) {
			fs.renameSync(tsFile, srcFile);
		}
	}
	fs.writeFileSync(tsFile, content);
	lastBuildTime = Date.now();
	console.log(red, `${tsFile} is built`);
}
function overrideTsFile(path:string, fileName:string, content:string, suffix:string = 'ts') {
	let tsFile = `${path}/${fileName}.${suffix}`;
	fs.writeFileSync(tsFile, content);
	lastBuildTime = Date.now();
	console.log(red, `${tsFile} is built`);
}
/*
function createTsFile(path:string, fileName:string, content:string, suffix:string = 'ts') {
	let tsFile = `${path}/${fileName}.${suffix}`;
	if (fs.existsSync(tsFile) === true) return;
	fs.writeFileSync(tsFile, content);
	lastBuildTime = Date.now();
	console.log(red, `${tsFile} is built`);
}
*/
function buildTsHeader() {
	return `//=== UqApp builder created on ${new Date()} ===//`;
}

function buildTsIndex():string {
	return `${buildTsHeader()}
export { CUqApp, CUqBase, CUqSub } from './CBase';
export { CApp } from './CApp';
export * from './uqs';
`;
}
function buildTsCApp():string {
	return `${buildTsHeader()}
import { CUqApp } from "./CBase";
import { VMain } from "./VMain";
import { UQs } from "./uqs";

const gaps = [10, 3,3,3,3,3,5,5,5,5,5,5,5,5,10,10,10,10,15,15,15,30,30,60];

export class CApp extends CUqApp<> {
	protected async internalStart(isUserLogin: boolean) {
		this.openVPage(VMain, undefined, this.dispose);
	}

	private timer:any;
	protected onDispose() {
		clearInterval(this.timer);
		this.timer = undefined;
	}

	private tick = 0;
	private gapIndex = 0;
	private callTick = async () => {
		try {
			if (!this.user) return;
			++this.tick;
			if (this.tick<gaps[this.gapIndex]) return;
			//console.error('tick ', new Date());
			this.tick = 0;
			if (this.gapIndex < gaps.length - 1) ++this.gapIndex;
			let ret = await this.uqs.BzHelloTonva.$poked.query(undefined, false);
			let v = ret.ret[0];
			if (v === undefined) return;
			if (!v.poke) return;
			this.gapIndex = 1;

			// 数据服务器提醒客户端刷新，下面代码重新调入的数据
			//this.cHome.refresh();
		}
		catch {
		}
	}
}
`;
}
function buildTsCBase():string {
	return `${buildTsHeader()}
import { CSub, CBase, CAppBase, IConstructor } from 'tonva-react';
import { UQs } from './uqs';
import { CApp } from './CApp';

export abstract class CUqBase extends CBase<CApp, UQs> {
}

export abstract class CUqSub<A extends CAppBase<U>, U, T extends CBase<A,U>> extends CSub<A, U, T> {
}

export abstract class CUqApp extends CAppBase<UQs> {
	protected newC<T extends CUqBase>(type: IConstructor<T>): T {
		let c = new type(this);
		c.init();
		return c;
	}
}
`;
}
function buildTsVMain() {
	return `${buildTsHeader()}
import { VPage, Page } from 'tonva-react';
import { CApp } from './CApp';

export class VMain extends VPage<CApp> {
	async open(param?: any, onClosePage?: (ret:any)=>void) {
		this.openPage(this.render, param, onClosePage);
	}

	render = (param?: any): JSX.Element => {
		return <Page header="TEST">
			<div className="m-3">
				<div>{this.renderMe()}</div>
				<div className="mb-5">同花样例主页面</div>
			</div>
		</Page>;
	}
}
`;
}

async function buildUqsFolder(uqsFolder:string, options: UqsConfig) {
	let uqErrors = await uqsStart(options);

	let uqsMan = UQsMan.value;
	let uqMans = uqsMan.getUqMans();
	
	let promiseArr:Promise<void>[] = [];
	if (uqErrors) {
		throw new Error(uqErrors.join('\n'));
	}

	for (let uq of uqMans) {
		promiseArr.push(loadUqEntities(uq));
	}
	await Promise.all(promiseArr);

	if (!fs.existsSync(uqsFolder)) {
		fs.mkdirSync(uqsFolder);
	}
	else {
		try {
			let files = fs.readdirSync(uqsFolder);
			for (const file of files) {
				fs.unlinkSync(path.join(uqsFolder, file));
			}	
		}
		catch (err) {
			throw err;
		}
	}
	let tsUqsIndexHeader = buildTsHeader();
	let tsUqsIndexContent = `\n\nexport interface UQs {`;
	let tsUqsIndexReExport = '\n';
	for (let uq of uqMans) {
		let {devName:o1, uqName:n1} = getNameFromUq(uq);
		let uqAlias = o1 + n1;
		let tsUq = buildTsUq(uq, uqAlias);
		overrideTsFile(uqsFolder, uqAlias, tsUq);

		tsUqsIndexHeader += `\nimport * as ${uqAlias} from './${uqAlias}';`;
		tsUqsIndexContent += `\n\t${uqAlias}: ${uqAlias}.UqExt;`; 
		tsUqsIndexReExport += `\nexport * as ${uqAlias} from './${uqAlias}';`;
	}

	overrideTsFile(uqsFolder, 'index', 
		tsUqsIndexHeader + tsUqsIndexContent + '\n}' + tsUqsIndexReExport + '\n');
}

function buildTsUq(uq: UqMan, uqAlias:string) {
	let ret = buildTsHeader();
	ret += buildUQ(uq, uqAlias);
	return ret;
}

function entityName(s:string):string {
	return capitalCase(s);
}

function getNameFromUq(uqMan:UqMan):{devName:string; uqName:string} {
	let {config} = uqMan;
	let devPart:string, uqPart:string;
	if (config) {
		let {dev, name, alias} = config;
		let {name:devName, alias:devAlias} = dev;
		devPart = devAlias || devName;
		uqPart = alias || name;
	}
	else {
		let {uqOwner, uqName} = uqMan;
		devPart = uqOwner;
		uqPart = uqName;
	}
	return {
		devName: capitalCase(devPart),
		uqName: capitalCase(uqPart),
	};
}

function uqBlock<T extends Entity>(entity: T, build: (entity: T)=>string) {
	let {name} = entity;
	if (name.indexOf('$') > 0) return '';
	let entityCode = build(entity);
	if (!entityCode) return '';
	return '\n' + entityCode;
}

function uqEntityInterface<T extends Entity>(entity: T, buildInterface: (entity: T)=>string) {
	let {name} = entity;
	if (name.indexOf('$') > 0) return '';
	let entityCode = buildInterface(entity);
	if (!entityCode) return '';
	return '\n' + entityCode + '\n';
}

async function loadUqEntities(uq:UqMan):Promise<void> {
	await uq.loadAllSchemas();
}

function buildUQ(uq:UqMan, uqAlias:string) {
	let tsImport = `
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { IDXValue, Uq`;
	let ts:string = `\n\n`;
	ts += '\n//===============================';
	ts += `\n//======= UQ ${uq.name} ========`;
	ts += '\n//===============================';
	ts += '\n';
	
	uq.enumArr.forEach(v => ts += uqEntityInterface<UqEnum>(v, buildEnumInterface));

	uq.tuidArr.forEach(v => ts += uqEntityInterface<Tuid>(v, buildTuidInterface));
    uq.actionArr.forEach(v => ts += uqEntityInterface<Action>(v, buildActionInterface));
    uq.sheetArr.forEach(v => ts += uqEntityInterface<Sheet>(v, buildSheetInterface));
    uq.queryArr.forEach(v => ts += uqEntityInterface<Query>(v, buildQueryInterface));
    uq.bookArr.forEach(v => ts += uqEntityInterface<Book>(v, buildBookInterface));
    uq.mapArr.forEach(v => ts += uqEntityInterface<Map>(v, buildMapInterface));
    uq.historyArr.forEach(v => ts += uqEntityInterface<History>(v, buildHistoryInterface));
    uq.pendingArr.forEach(v => ts += uqEntityInterface<Pending>(v, buildPendingInterface));
	uq.tagArr.forEach(v => ts += uqEntityInterface<Tag>(v, buildTagInterface));
	uq.idArr.forEach(v => ts += uqEntityInterface<ID>(v, buildIDInterface));
	uq.idxArr.forEach(v => ts += uqEntityInterface<IDX>(v, buildIDXInterface));
	uq.id2Arr.forEach(v => ts += uqEntityInterface<IX>(v, buildIXInterface));

	ts += buildIDActInterface(uq);

	ts += `
\nexport interface UqExt extends Uq {
	IDActs(param:ParamIDActs): Promise<any>;
`;
	function appendArr<T extends Entity>(arr:T[], type:string, tsBuild: (v:T) => string) {
		if (arr.length === 0) return;
		let tsLen = ts.length;
		arr.forEach(v => ts += tsBuild(v));
		if (ts.length - tsLen > 0) {
			tsImport += ', Uq' + type;
		}
	}
	appendArr<Tuid>(uq.tuidArr, 'Tuid', v => uqBlock<Tuid>(v, buildTuid));
	appendArr<Action>(uq.actionArr, 'Action', v => uqBlock<Action>(v, buildAction));
	appendArr<Sheet>(uq.sheetArr, 'Sheet', v => uqBlock<Sheet>(v, buildSheet));
	appendArr<Book>(uq.bookArr, 'Book', v => uqBlock<Book>(v, buildBook));
	appendArr<Query>(uq.queryArr, 'Query', v => uqBlock<Query>(v, buildQuery));
	appendArr<Map>(uq.mapArr, 'Map', v => uqBlock<Map>(v, buildMap));
	appendArr<History>(uq.historyArr, 'History', v => uqBlock<History>(v, buildHistory));
	appendArr<Pending>(uq.pendingArr, 'Pending', v => uqBlock<Pending>(v, buildPending));
	appendArr<Tag>(uq.tagArr, 'Tag', v => uqBlock<Tag>(v, buildTag));
	appendArr<ID>(uq.idArr, 'ID', v => uqBlock<ID>(v, buildID));
	appendArr<IDX>(uq.idxArr, 'IDX', v => uqBlock<IDX>(v, buildIDX));
	appendArr<IX>(uq.id2Arr, 'IX', v => uqBlock<IX>(v, buildIX));
	ts += '\n}\n';
	tsImport += ' } from "tonva-react";';
	return tsImport + ts;
}

function buildFields(fields: Field[], isInID:boolean = false, indent:number = 1) {
	if (!fields) return '';
	let ts = '';
	for (let f of fields) {
		ts += buildField(f, isInID, indent);
	}
	return ts;
}

const fieldTypeMap:{[type:string]:string} = {
	"char": "string",
	"text": "string",
	"id": "number",
	"textid": "string",
	"int": "number",
	"bigint": "number",
	"smallint": "number",
	"tinyint": "number",
	"dec": "number",
};
const sysFields = ['id', 'master', 'row', 'no'];
function buildField(field: Field, isInID:boolean, indent:number = 1) {
	let {name, type} = field;
	let s = fieldTypeMap[type];
	if (!s) s = 'any';
	let q:string = (isInID === true && sysFields.indexOf(name) >= 0)? '?' : '';
	return `\n${'\t'.repeat(indent)}${name}${q}: ${s};`;
}

function buildArrs(arrFields: ArrFields[]):string {
	if (!arrFields) return '';
	let ts = '\n';
	for (let af of arrFields) {
		ts += `\t${camelCase(af.name)}: {`;
		ts += buildFields(af.fields, false, 2);
		ts += '\n\t}[];\n';
	}
	return ts;
}

/*
const typeMap:{[type:string]:string} = {
	action: 'Action',
	query: 'Query',
}
*/
function buildReturns(entity:Entity, returns:ArrFields[]):string {
	if (!returns) return;
	//let {typeName} = entity;
	//let type = typeMap[typeName] || typeName;
	let {sName} = entity;
	sName = capitalCase(sName);
	let ts = '';
	for (let ret of returns) {
		let retName = capitalCase(ret.name);
		ts += `interface Return${sName}${retName} {`;
		ts += buildFields(ret.fields);
		ts += '\n}\n';
	}

	ts += `interface Result${sName} {\n`;
	for (let ret of returns) {
		let retName = capitalCase(ret.name);
		ts += `\t${ret.name}: Return${sName}${retName}[];\n`;
	}
	ts += '}';
	return ts;
}

function buildTuid(tuid: Tuid) {
	let ts = `\t${entityName(tuid.sName)}: UqTuid<Tuid${capitalCase(tuid.sName)}>;`;
	return ts;
}

function buildTuidInterface(tuid: Tuid) {
	let ts = `export interface Tuid${capitalCase(tuid.sName)} {`;
	ts += buildFields(tuid.fields);
	ts += '\n}';
	return ts;
}

function buildAction(action: Action) {
	let ts = `\t${entityName(action.sName)}: UqAction<Param${capitalCase(action.sName)}, Result${capitalCase(action.sName)}>;`;
	return ts;
}

function buildActionInterface(action: Action) {
	let ts = `export interface Param${capitalCase(action.sName)} {`;
	ts += buildFields(action.fields);
	ts += buildArrs(action.arrFields);
	ts += '\n}\n';
	ts += buildReturns(action, action.returns);
	return ts;
}

function buildEnumInterface(enm: UqEnum) {
	let {schema} = enm;
	if (!schema) return;
	let {values} = schema;
	let ts = `export enum ${capitalCase(enm.sName)} {`;
	let first:boolean = true;
	for (let i in values) {
		if (first === false) {
			ts += ',';
		}
		else {
			first = false;
		}
		let v = values[i];
		ts += '\n\t' + i + ' = ';
		if (typeof v === 'string') {
			ts += '"' + v + '"';
		}
		else {
			ts += v;
		}
	}
	return ts += '\n}'
}

function buildQuery(query: Query) {
	let {sName} = query;
	let ts = `\t${entityName(sName)}: UqQuery<Param${capitalCase(sName)}, Result${capitalCase(sName)}>;`;
	return ts;
}

function buildQueryInterface(query: Query) {
	let ts = `export interface Param${capitalCase(query.sName)} {`;
	ts += buildFields(query.fields);
	ts += '\n}\n';
	ts += buildReturns(query, query.returns);
	return ts;
}

function buildSheet(sheet: Sheet) {
	let {sName, verify} = sheet;
	let cName = capitalCase(sName);
	let v = verify? `Verify${cName}` : 'any';
	let ts = `\t${entityName(sName)}: UqSheet<Sheet${cName}, ${v}>;`;
	return ts;
}

function buildSheetInterface(sheet: Sheet) {
	let {sName, fields, arrFields, verify} = sheet;
	let ts = `export interface Sheet${capitalCase(sName)} {`;
	ts += buildFields(fields);
	ts += buildArrs(arrFields);
	ts += '}';

	if (verify) {
		let {returns} = verify;
		ts += `\nexport interface Verify${capitalCase(sName)} {`;
		for (let item of returns) {
			let {name:arrName, fields} = item;
			ts += '\n\t' + arrName + ': {';
			ts += buildFields(fields, false, 2);
			ts += '\n\t}[];';
		}
		ts += '\n}';
	}
	return ts;
}

function buildBook(book: Book):string {
	let {sName} = book;
	let ts = `\t${entityName(sName)}: UqBook<Param${capitalCase(sName)}, Result${capitalCase(sName)}>;`;
	return ts;
}

function buildBookInterface(book: Book):string {
	let {sName, fields, returns} = book;
	let ts = `export interface Param${capitalCase(sName)} {`;
	ts += buildFields(fields);
	ts += '\n}\n';
	ts += buildReturns(book, returns);
	return ts;
}

function buildMap(map: Map):string {
	let {sName} = map;
	let ts = `\t${entityName(sName)}: UqMap;`;
	return ts;
}

function buildMapInterface(map: Map):string {
	/*
	let {sName, fields, returns} = map;
	let ts = `export interface Param${capitalCaseString(sName)} {`;
	ts += buildFields(fields);
	ts += '\n}\n';
	ts += buildReturns(map, returns);
	return ts;
	*/
	return '';
}

function buildHistory(history: History):string {
	let {sName} = history;
	let ts = `\t${entityName(sName)}: UqHistory<Param${capitalCase(sName)}, Result${capitalCase(sName)}>;`;
	return ts;
}

function buildHistoryInterface(history: History):string {
	let {sName, fields, returns} = history;
	let ts = `export interface Param${capitalCase(sName)} {`;
	ts += buildFields(fields);
	ts += '\n}\n';
	ts += buildReturns(history, returns);
	return ts;
}

function buildPending(pending: Pending):string {
	let {sName} = pending;
	let ts = `\t${entityName(sName)}: UqPending<any, any>;`;
	return ts;
}

function buildPendingInterface(pending: Pending):string {
	/*
	let {sName, fields, returns} = pending;
	let ts = `export interface Param${capitalCaseString(sName)} {`;
	ts += buildFields(fields);
	ts += '\n}\n';
	ts += buildReturns(pending, returns);
	return ts;
	*/
	return '';
}

function buildTag(tag: Tag):string {
	let {sName} = tag;
	let ts = `\t${entityName(sName)}: UqTag;`;
	return ts;
}

function buildID(id: ID):string {
	let {sName} = id;
	let ts = `\t${entityName(sName)}: UqID<any>;`;
	return ts;
}

function buildIDX(idx: IDX):string {
	let {sName} = idx;
	let ts = `\t${entityName(sName)}: UqIDX<any>;`;
	return ts;
}

function buildIX(ix: IX):string {
	let {sName} = ix;
	let ts = `\t${entityName(sName)}: UqIX<any>;`;
	return ts;
}

function buildTagInterface(tag: Tag):string {
	return;
}

function buildIDInterface(idEntity: ID):string {
	let {sName, fields, schema} = idEntity;
	let {keys:schemaKeys} = schema;
	let keys:Field[] = [], others:Field[] = [];
	for (let f of fields) {
		let {name} = f;
		if (name === 'id') continue;
		if ((schemaKeys as any[]).find(v => v.name === name)) keys.push(f);
		else others.push(f);
	}
	let ts = `export interface ${capitalCase(sName)} {`;
	ts += `\n\tid?: number;`;
	ts += buildFields(keys, true);
	ts += buildFields(others, true);
	ts += '\n}';
	return ts;
}

function buildIDXInterface(idx: IDX):string {
	let {sName, fields, schema} = idx;
	let {exFields} = schema;
	let ts = `export interface ${capitalCase(sName)} {`;
	//ts += buildFields(fields);
	let indent = 1;
	for (let field of fields) {
		let {name, type} = field;
		let s = fieldTypeMap[type];
		if (!s) s = 'any';
		//let q:string = (isInID === true && sysFields.indexOf(name) >= 0)? '?' : '';
		let exField = (exFields as any[]).find(v => v.field === name);
		ts += `\n${'\t'.repeat(indent)}${name}`;
		if (exField) {
			ts += `?: ${s}|IDXValue;`;
		}
		else {
			if (name !== 'id') ts += '?';
			ts += `: ${s};`;
		}
	}

	let hasTrack:boolean = false;
	let hasMemo:boolean = false;
	if (exFields) {
		for (let exField of exFields) {
			let {track, memo} = exField;
			if (track === true) hasTrack = true;
			if (memo === true) hasMemo = true;
		}
	}
	if (hasTrack === true) {
		ts += `\n\t$track?: number;`;
	}
	if (hasMemo === true) {
		ts += `\n\t$memo?: string;`;
	}
	ts += '\n}';
	return ts;
}

function buildIXInterface(ix: IX):string {
	let {sName, fields} = ix;
	let ts = `export interface ${capitalCase(sName)} {`;
	ts += buildFields(fields);
	ts += '\n}';
	return ts;
}

function buildIDActInterface(uq: UqMan) {
	let ts = `\nexport interface ParamIDActs {`;
	uq.idArr.forEach(v => {
		let {sName} = v;
		ts += `\n\t${camelCase(sName)}?: ${capitalCase(sName)}[];`;
	});
	uq.idxArr.forEach(v => {
		let {sName} = v;
		ts += `\n\t${camelCase(sName)}?: ${capitalCase(sName)}[];`;
	});
	uq.id2Arr.forEach(v => {
		let {sName} = v;
		ts += `\n\t${camelCase(sName)}?: ${capitalCase(sName)}[];`;
	});
	ts += '\n}\n';
	return ts;
}
