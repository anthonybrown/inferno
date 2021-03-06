import { InfernoChildren, Props, VNode, VNodeFlags } from './structures';
import { cloneVNode, createTextVNode, isVNode } from './VNodes';
import {
	isArray,
	isInvalid,
	isNull,
	isNullOrUndef,
	isString,
	isStringOrNumber,
	isUndefined,
} from '../shared';

function applyKeyIfMissing(index: number, vNode: VNode): VNode {
	if (isNull(vNode.key)) {
		vNode.key = `.${ index }`;
	}
	return vNode;
}

function _normalizeVNodes(nodes: any[], result: VNode[], index: number, keyCounter: number): number {
	for (; index < nodes.length; index++) {
		let n = nodes[index];

		if (!isInvalid(n)) {
			if (isArray(n)) {
				keyCounter = _normalizeVNodes(n, result, 0, keyCounter);
			} else {
				if (isStringOrNumber(n)) {
					n = createTextVNode(n);
				} else if (isVNode(n) && n.dom) {
					n = cloneVNode(n);
				}

				result.push((applyKeyIfMissing(keyCounter++, n as VNode)));
			}
		} else {
			// Support for nulls
			keyCounter++;
		}
	}
	return keyCounter;
}

export function normalizeVNodes(nodes: any[]): VNode[] {
	let newNodes,
		  keyCounter = 0;

	// we assign $ which basically means we've flagged this array for future note
	// if it comes back again, we need to clone it, as people are using it
	// in an immutable way
	// tslint:disable
	if (nodes['$']) {
		nodes = nodes.slice();
	} else {
		nodes['$'] = true;
	}
	// tslint:enable
	for (let i = 0; i < nodes.length; i++) {
		const n = nodes[i];
		keyCounter++;

		if (isInvalid(n) || isArray(n)) {
			const result = (newNodes || nodes).slice(0, i) as VNode[];

			keyCounter = _normalizeVNodes(nodes, result, i, keyCounter);
			return result;
		} else if (isStringOrNumber(n)) {
			if (!newNodes) {
				newNodes = nodes.slice(0, i) as VNode[];
			}
			newNodes.push(applyKeyIfMissing(keyCounter, createTextVNode(n)));
		} else if ((isVNode(n) && n.dom) || (isNull(n.key) && !(n.flags & VNodeFlags.HasNonKeyedChildren))) {
			if (!newNodes) {
				newNodes = nodes.slice(0, i) as VNode[];
			}
			newNodes.push(applyKeyIfMissing(keyCounter, cloneVNode(n)));
		} else if (newNodes) {
			newNodes.push(applyKeyIfMissing(keyCounter, cloneVNode(n)));
		}
	}
	return newNodes || nodes as VNode[];
}

function normalizeChildren(children: InfernoChildren | null) {
	if (isArray(children)) {
		return normalizeVNodes(children);
	} else if (isVNode(children as VNode) && (children as VNode).dom) {
		return cloneVNode(children as VNode);
	}
	return children;
}

function normalizeProps(vNode: VNode, props: Props, children: InfernoChildren) {
	if (!(vNode.flags & VNodeFlags.Component) && isNullOrUndef(children) && !isNullOrUndef(props.children)) {
		vNode.children = props.children;
	}
	if (props.ref) {
		vNode.ref = props.ref;
		delete props.ref;
	}
	if (props.events) {
		vNode.events = props.events;
	}
	if (!isNullOrUndef(props.key)) {
		vNode.key = props.key;
		delete props.key;
	}
}

export function copyPropsTo(copyFrom: Props, copyTo: Props) {
	for (let prop in copyFrom) {
		if (isUndefined(copyTo[prop])) {
			copyTo[prop] = copyFrom[prop];
		}
	}
}

function normalizeElement(type: string, vNode: VNode) {
	if (type === 'svg') {
		vNode.flags = VNodeFlags.SvgElement;
	} else if (type === 'input') {
		vNode.flags = VNodeFlags.InputElement;
	} else if (type === 'select') {
		vNode.flags = VNodeFlags.SelectElement;
	} else if (type === 'textarea') {
		vNode.flags = VNodeFlags.TextareaElement;
	} else if (type === 'media') {
		vNode.flags = VNodeFlags.MediaElement;
	} else {
		vNode.flags = VNodeFlags.HtmlElement;
	}
}

export function normalize(vNode: VNode): void {
	const props = vNode.props;
	const hasProps = !isNull(props);
	const type = vNode.type;
	let children = vNode.children;

	// convert a wrongly created type back to element
	if (isString(type) && (vNode.flags & VNodeFlags.Component)) {
		normalizeElement(type as string, vNode);
		if (hasProps && props.children) {
			vNode.children = props.children;
			children = props.children;
		}
	}
	if (hasProps) {
		normalizeProps(vNode, props, children);
	}
	if (!isInvalid(children)) {
		vNode.children = normalizeChildren(children);
	}
	if (hasProps && !isInvalid(props.children)) {
		props.children = normalizeChildren(props.children);
	}
}
