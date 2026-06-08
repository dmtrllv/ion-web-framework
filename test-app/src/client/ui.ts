export type Root = {
	readonly render: <T extends Node<any>>(el: () => T) => T;
}

export const createRoot = (rootEl: HTMLElement): Root => {
	return {
		render(el) {
			const node = el();
			rootEl.appendChild(node.element);
			return node;
		}
	}
};

interface ElementFn<T extends keyof HTMLElementTagNameMap> {
	(): Node<T>;
	(props: Partial<HTMLElementTagNameMap[T]>, ...children: NodeChild[]): Node<T>;
	(...children: NodeChild[]): Node<T>;
}

type NodeChild = Node<any> | string | number;

type Node<T extends keyof HTMLElementTagNameMap> = {
	element: T;
	props: Partial<HTMLElementTagNameMap[T]>;
	children: NodeChild[];
}

const isElement = (obj: any): obj is Node<any> => {
	return obj && typeof obj === "object" && "element" in obj;
}

const createElementFn = <T extends keyof HTMLElementTagNameMap>(tagName: T): ElementFn<T> => {
	return ((...args: any[]) => {
		const element = document.createElement(tagName);

		let props: any = {};
		let children = args;

		if (typeof args[0] !== "string" && !isElement(args[0])) {
			props = args[0];
			for (const k in props) {
				(element as any)[k] = props[k]
			}
			children = args.slice(1);
		}

		children.forEach(c => {
			if (isElement(c)) {
				element.appendChild(c.element)
			} else {
				element.appendChild(document.createTextNode(c));
			}
		});

		return ({
			element,
			props: new Proxy(props, {
				get(target: any, p) {
					return target[p];
				},
				set(target: any, p, newValue) {
					target[p] = newValue;
					return true;
				},
			}),
			children: new Proxy(children, {
				get(target: any, p) {
					return target[p];
				},
				set(target: any, p, newValue) {
					if (!isNaN(p as any) && !isNaN(parseFloat(p as any))) {
						if (target[p] === undefined) {
							if (isElement(newValue)) {
								element.appendChild(newValue.element)
							} else {
								element.appendChild(document.createTextNode(newValue));
							}
						} else {
							if (isElement(newValue)) {
								target[p].element.replaceWith(newValue.element);
							} else {
								target[p].element.replaceWith(document.createTextNode(newValue));
							}
						}
					}

					target[p] = newValue;

					return true;
				},
			}),
		});
	}) as any;
}

export const div = createElementFn("div");
export const h1 = createElementFn("h1");


