import { Controller } from "tonva-react";
import { renderItem, listRight, renderItemContainer } from "../tools";
import { ListPage, ListPageProps } from "./ListPage";
import { MidList } from "./MidList";

export abstract class CList<T> extends Controller {
	protected readonly midList: MidList<T>;
	constructor(midList: MidList<T>) {
		super(midList.res);
		this.midList = midList;
	}

	protected async internalStart() {
		await this.midList.init();
		let pageItems = this.midList.createPageItems();
		let props:ListPageProps = {
			header: this.header,
			pageItems,
			key: this.midList.key,
			itemClick: (item:any) => this.onItemClick(item),
			right: this.renderRight(),
			renderItem: (item:any, index) => this.renderItem(item, index),
			renderItemContainer: (content:any) => this.renderItemContainer(content),
		};
		pageItems.first(this.firstParam);
		let page = new ListPage(props);
		this.openPage(page.render());
	}

	protected get firstParam():any {return undefined;}
	protected get header():string|JSX.Element {return 'List'}
	protected renderItemContainer(content:any):JSX.Element {
		return renderItemContainer(content);
	}
	protected onItemClick(item:any):void {
		this.midList.onItemClick(item);
	}

	protected renderRight():JSX.Element {
		let {renderRight, onRightClick} = this.midList;
		return (renderRight ?? listRight)(onRightClick);
	}

	protected renderItem(item:any, index:number):JSX.Element {
		return (this.midList.renderItem ?? renderItem)(item, index);
	}

}
