import { LocalMap, LocalCache, env } from '../tool';
import { UqData, UqAppData, CenterAppApi } from '../net';
import { UqMan } from './uqMan';
import { TuidImport, TuidInner } from './tuid';
import { nav } from '../components';
import { AppConfig, UqConfig } from '../app';

export interface TVs {
    [uqName:string]: {
        [tuidName: string]: (values: any) => JSX.Element;
    }
}

export class UQsMan {
	static _uqs: any;
	static value: UQsMan;
	//static uqOwnerMap: {[key:string]:string};

	static async build(appConfig: AppConfig) {
		let {app, uqs, tvs} = appConfig;
		let retErrors:string[];
		if (app) {
		let {name, version/*, ownerMap*/} = app;
			//UQsMan.uqOwnerMap = ownerMap || {};
			//for (let i in ownerMap) ownerMap[i.toLowerCase()] = ownerMap[i];
			retErrors = await UQsMan.load(name, version, tvs);
		}
		else if (uqs) {
			/*
			let uqNames:{owner:string; name:string; version:string}[] = [];
			//let map:{[owner:string]: string} = UQsMan.uqOwnerMap = {};
			for (let uq of uqs) {
				//let ownerObj = uqs[owner];
				let {dev, name, alias, version:uqVersion, memo} = uq;
				for (let name in uq) {
					let {name:owner} = dev;
					//let v = ownerObj[name];
					//if (name === '$') {
					//	map[owner.toLowerCase()] = v;
					//	continue;
					//}
					uqNames.push({owner, name, version:uqVersion});
				}
			}
			*/
			retErrors = await UQsMan.loadUqs(uqs, tvs);
		}
		else {
			throw new Error('either uqs or app must be defined in AppConfig');
		}
		return retErrors;
	}

	// 返回 errors, 每个uq一行
	private static async load(tonvaAppName:string, version:string, tvs:TVs):Promise<string[]> {
		let uqsMan = UQsMan.value = new UQsManApp(tonvaAppName, tvs);
        let {appOwner, appName} = uqsMan;
        let {localData} = uqsMan;
        let uqAppData:UqAppData = localData.get();
        if (!uqAppData || uqAppData.version !== version) {
			uqAppData = await loadAppUqs(appOwner, appName);
			if (!uqAppData.id) {
				return [
					`${appOwner}/${appName}不存在。请仔细检查app全名。`
				];
			}
            uqAppData.version = version;
            localData.set(uqAppData);
            // 
            for (let uq of uqAppData.uqs) uq.newVersion = true;
        }
        let {id, uqs} = uqAppData;
		uqsMan.id = id;
		//console.error(uqAppData);
		//let ownerProfixMap: {[owner: string]: string};
		return uqsMan.buildUqs(uqs);
	}

	// 返回 errors, 每个uq一行
	private static async loadUqs(uqConfigs: UqConfig[], tvs:TVs):Promise<string[]> {
		let uqsMan = UQsMan.value = new UQsMan(tvs);
		let uqs = await loadUqs(uqConfigs);
		return uqsMan.buildUqs(uqs, uqConfigs);
	}

	private uqMans: UqMan[] = [];
    private collection: {[uqLower: string]: UqMan};
    private readonly tvs: TVs;

    protected constructor(tvs:TVs) {
        this.tvs = tvs || {};
		this.buildTVs();
		this.uqMans = [];
        this.collection = {};
    }

	private async buildUqs(uqDataArr:UqData[], uqConfigs?:UqConfig[]):Promise<string[]> {
        await this.init(uqDataArr);
        let retErrors = await this.load();
		if (retErrors.length > 0) return retErrors;
		retErrors.push(...this.setTuidImportsLocal());
		if (retErrors.length > 0) return retErrors;
		if (uqConfigs) {
			for (let uqConfig of uqConfigs) {
				let {dev, name} = uqConfig;
				let {name:owner} = dev;
				let uqLower = owner.toLowerCase() + '/' + name.toLowerCase();
				let uq = this.collection[uqLower];
				uq.config = uqConfig;
			}
		}
		UQsMan._uqs = this.buildUQs();
	}

	static uq(uqName: string): UqMan {
		return UQsMan.value.collection[uqName.toLowerCase()];
	}
	
	static async getUqUserRoles(uqLower:string):Promise<string[]> {
		let uqMan = UQsMan.value.collection[uqLower];
		if (uqMan === undefined) return null;
		let roles = await uqMan.getRoles();
		return roles;
	}

    private buildTVs() {
		if (!this.tvs) return;
        for (let i in this.tvs) {
            let uqTVs = this.tvs[i];
            if (uqTVs === undefined) continue;
            let l = i.toLowerCase();
            if (l === i) continue;
            this.tvs[l] = uqTVs;
            for (let j in uqTVs) {
                let en = uqTVs[j];
                if (en === undefined) continue;
                let lj = j.toLowerCase();
                if (lj === j) continue;
                uqTVs[lj] = en;
            }
        }
    }

    async init(uqsData:UqData[]):Promise<void> {
        let promiseInits: PromiseLike<void>[] = uqsData.map(uqData => {
			let {uqOwner, uqName} = uqData;
			let uqFullName = uqOwner + '/' + uqName;
			//let uqUI = this.ui.uqs[uqFullName] as UqUI || {};
			//let cUq = this.newCUq(uqData, uqUI);
			//this.cUqCollection[uqFullName] = cUq;
			//this.uqs.addUq(cUq.uq);
			let uq = new UqMan(this, uqData, undefined, this.tvs[uqFullName] || this.tvs[uqName]);
			this.uqMans.push(uq);
			//uq.ownerProfix = UQsMan.uqOwnerMap[uqOwner.toLowerCase()];
			//this.collection[uqFullName] = uq;
			let lower = uqFullName.toLowerCase();
			this.collection[lower] = uq;
			/*
			if (lower !== uqFullName) {
				this.collection[lower] = uq;
			}
			*/
			return uq.init();
		});
        await Promise.all(promiseInits);
    }

    async load(): Promise<string[]> {
        let retErrors:string[] = [];
		let promises: PromiseLike<string>[] = [];
		//let lowerUqNames:string[] = [];
		// collection有小写名字，还有正常名字
        //for (let i in this.collection) {
		for (let uqMan of this.uqMans) {
			//let lower = (i as string).toLowerCase();
			//if (lowerUqNames.indexOf(lower) >= 0) continue;
			//lowerUqNames.push(lower);
            //let uq = this.collection[i];
            promises.push(uqMan.loadEntities());
		}
		let results = await Promise.all(promises);
        for (let result of results)
        {
            let retError = result; // await cUq.loadSchema();
            if (retError !== undefined) {
                retErrors.push(retError);
            }
		}
        return retErrors;
    }

    buildUQs(): any {
        //let that = this;
        let uqs:any = {};
        for (let uqMan of this.uqMans) {
            //let uqMan = this.collection[i];
            //let n = uqMan.name;
            let uqKey = uqMan.getUqKey();
			//let l = uqName.toLowerCase();
			//let uqKey:string = uqName.split(/[-._]/).join('').toLowerCase();
			//if (uqKey !== l) {
			//if (!uqs[uqKey]) {
			let lower = uqKey.toLowerCase();
			let proxy = uqMan.proxy();
			uqs[uqKey] = proxy;
			if (lower !== uqKey) uqs[lower] = proxy;
			//}
			//}
			/*
			//if (ownerProfix) uqKey = ownerProfix + uqKey;
            let entities = uqMan.entities;
            let keys = Object.keys(entities);
            for (let key of keys) {
                let entity = entities[key];
				let {name} = entity;
				entities[name.toLowerCase()] = entity;
            }
            let proxy = uqs[l] = new Proxy(entities, {
                get: function(target, key, receiver) {
					let lk = (key as string).toLowerCase();
					if (lk === '$name') {
						return uqMan.name;
					}
                    let ret = target[lk];
                    if (ret !== undefined) return ret;
					debugger;
					let err = `entity ${uqName}.${String(key)} not defined`;
                    console.error(err);
                    that.showReload('UQ错误：' + err);
                    return undefined;
                }
			})
			if (uqKey !== l) uqs[uqKey] = proxy;
			*/
        }
        //let uqs = this.collection;
        return new Proxy(uqs, {
            get: (target, key, receiver) => {
                let lk = (key as string).toLowerCase();
                let ret = target[lk];
                if (ret !== undefined) return ret;
                /*
                for (let i in uqs) {
                    if (i.toLowerCase() === lk) {
                        return uqs[i];
                    }
                }*/
                debugger;
                console.error('error in uqs');
                this.showReload(`代码错误：新增 uq ${String(key)}`);
                return undefined;
            },
        });
	}
	
	getUqMans() {
		return this.uqMans;
	}

    private showReload(msg: string) {
		for (let uqMan of this.uqMans) {
			uqMan.localMap.removeAll();
		}
        nav.showReloadPage(msg);
    }

    setTuidImportsLocal():string[] {
        let ret:string[] = [];
        for (let uqMan of this.uqMans) {
            for (let tuid of uqMan.tuidArr) {
                if (tuid.isImport === true) {
                    let error = this.setInner(tuid as TuidImport);
                    if (error) ret.push(error);
                }
            }
        }
        return ret;
    }

    private setInner(tuidImport: TuidImport):string {
        let {from} = tuidImport;
        let fromName = from.owner + '/' + from.uq;
        let uq = this.collection[fromName];
        if (uq === undefined) {
            //debugger;
            return `setInner(tuidImport: TuidImport): uq ${fromName} is not loaded`;
        }
        let iName = tuidImport.name
        let tuid = uq.tuid(iName);
        if (tuid === undefined) {
            //debugger;
            return `setInner(tuidImport: TuidImport): uq ${fromName} has no Tuid ${iName}`;
        }
        if (tuid.isImport === true) {
            //debugger;
            return `setInner(tuidImport: TuidImport): uq ${fromName} Tuid ${iName} is import`;
        }
        tuidImport.setFrom(tuid as TuidInner);
    }
}

class UQsManApp extends UQsMan {
    readonly appOwner: string;
    readonly appName: string;
    readonly localMap: LocalMap;
    readonly localData: LocalCache;
    id: number;

	constructor(tonvaAppName:string, tvs:TVs) {
		super(tvs);
        let parts = tonvaAppName.split('/');
        if (parts.length !== 2) {
            throw new Error('tonvaApp name must be / separated, owner/app');
        }
        this.appOwner = parts[0];
        this.appName = parts[1];
        this.localMap = env.localDb.map(tonvaAppName);
        this.localData = this.localMap.child('uqData');
	}
}

async function loadAppUqs(appOwner:string, appName:string): Promise<UqAppData> {
    let centerAppApi = new CenterAppApi('tv/', undefined);
    let ret = await centerAppApi.appUqs(appOwner, appName);
    return ret;
}

async function loadUqs(uqConfigs: UqConfig[]): Promise<UqData[]> {
	let uqs: {owner:string; name:string; version:string}[] = uqConfigs.map(
		v => {
			let {dev, name, version} =v;
			let {name:owner} = dev;
			return {owner, name, version};
		}
	);
    let centerAppApi = new CenterAppApi('tv/', undefined);
    let ret = await centerAppApi.uqs(uqs);
    return ret;
}
