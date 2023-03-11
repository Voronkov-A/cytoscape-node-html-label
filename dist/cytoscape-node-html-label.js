import cytoscape from 'cytoscape';
const $$find = function (arr, predicate) {
    if (typeof predicate !== "function") {
        throw new TypeError("predicate must be a function");
    }
    const length = arr.length >>> 0;
    // eslint-disable-next-line prefer-rest-params
    const thisArg = arguments[1];
    let value;
    for (let i = 0; i < length; i++) {
        value = arr[i];
        if (predicate.call(thisArg, value, i, arr)) {
            return value;
        }
    }
    return undefined;
};
class LabelElement {
    constructor({ node, position = undefined, data = null }, params) {
        this.updateParams(params);
        this._node = node;
        this.initStyles(params.cssClass);
        if (data) {
            this.updateData(data);
        }
        if (position) {
            this.updatePosition(position);
        }
    }
    updateParams({ tpl = () => "", 
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    cssClass = undefined, halign = "center", valign = "center", halignBox = "center", valignBox = "center" }) {
        const _align = {
            "top": -.5,
            "left": -.5,
            "center": 0,
            "right": .5,
            "bottom": .5
        };
        this._align = [
            _align[halign],
            _align[valign],
            100 * (_align[halignBox] - 0.5),
            100 * (_align[valignBox] - 0.5)
        ];
        this.tpl = tpl;
    }
    updateData(data) {
        while (this._node.firstChild) {
            this._node.removeChild(this._node.firstChild);
        }
        const children = new DOMParser()
            .parseFromString(this.tpl(data), "text/html")
            .body.children;
        for (let i = 0; i < children.length; ++i) {
            const el = children[i];
            this._node.appendChild(el);
        }
    }
    getNode() {
        return this._node;
    }
    updatePosition(pos) {
        this._renderPosition(pos);
    }
    initStyles(cssClass) {
        const stl = this._node.style;
        stl.position = "absolute";
        if (cssClass && cssClass.length) {
            this._node.classList.add(cssClass);
        }
    }
    _renderPosition(position) {
        const prev = this._position;
        const x = position.x + this._align[0] * position.w;
        const y = position.y + this._align[1] * position.h;
        if (!prev || prev[0] !== x || prev[1] !== y) {
            this._position = [x, y];
            const valRel = `translate(${this._align[2]}%,${this._align[3]}%) `;
            const valAbs = `translate(${x.toFixed(2)}px,${y.toFixed(2)}px) `;
            const val = valRel + valAbs;
            const stl = this._node.style;
            stl.webkitTransform = val;
            stl.msTransform = val;
            stl.transform = val;
        }
    }
}
/**
 * LabelContainer
 * Html manipulate, find and upgrade nodes
 * it don't know about cy.
 */
class LabelContainer {
    constructor(node) {
        this._node = node;
        this._elements = {};
    }
    addOrUpdateElem(id, param, payload = {}) {
        const cur = this._elements[id];
        if (cur) {
            cur.updateParams(param);
            cur.updateData(payload.data);
            cur.updatePosition(payload.position);
        }
        else {
            const nodeElem = document.createElement("div");
            this._node.appendChild(nodeElem);
            this._elements[id] = new LabelElement({
                node: nodeElem,
                data: payload.data,
                position: payload.position
            }, param);
        }
    }
    removeElemById(id) {
        if (this._elements[id]) {
            this._node.removeChild(this._elements[id].getNode());
            delete this._elements[id];
        }
    }
    updateElemPosition(id, position) {
        const ele = this._elements[id];
        if (ele) {
            ele.updatePosition(position);
        }
    }
    updatePanZoom({ pan, zoom }) {
        const val = `translate(${pan.x}px,${pan.y}px) scale(${zoom})`;
        const stl = this._node.style;
        const origin = "top left";
        stl.webkitTransform = val;
        stl.msTransform = val;
        stl.transform = val;
        stl.webkitTransformOrigin = origin;
        stl.msTransformOrigin = origin;
        stl.transformOrigin = origin;
    }
}
export function cyNodeHtmlLabel(_cy, params, options) {
    const _params = (!params || typeof params !== "object") ? [] : params;
    const _lc = createLabelContainer();
    _cy.one("render", (e) => {
        createNodesCyHandler(e);
        wrapCyHandler(e);
    });
    _cy.on("add", addCyHandler);
    _cy.on("layoutstop", layoutstopHandler);
    _cy.on("remove", removeCyHandler);
    _cy.on("data", updateDataOrStyleCyHandler);
    _cy.on("style", updateDataOrStyleCyHandler);
    _cy.on("pan zoom", wrapCyHandler);
    _cy.on("position bounds", moveCyHandler); // "bounds" - not documented event
    return _cy;
    function createLabelContainer() {
        const _cyContainer = _cy.container();
        const _titlesContainer = document.createElement("div");
        const _cyCanvas = _cyContainer.querySelector("canvas");
        const cur = _cyContainer.querySelector("[class^='cy-node-html']");
        if (cur) {
            _cyCanvas.parentNode.removeChild(cur);
        }
        const stl = _titlesContainer.style;
        stl.position = 'absolute';
        stl['z-index'] = '10';
        stl.width = '500px';
        stl.margin = '0px';
        stl.padding = '0px';
        stl.border = '0px';
        stl.outline = '0px';
        stl.outline = '0px';
        if (options && options.enablePointerEvents !== true) {
            stl['pointer-events'] = 'none';
        }
        _cyCanvas.parentNode.appendChild(_titlesContainer);
        return new LabelContainer(_titlesContainer);
    }
    function createNodesCyHandler({ cy }) {
        _params.forEach(x => {
            cy.elements(x.query).forEach((d) => {
                if (d.isNode()) {
                    _lc.addOrUpdateElem(d.id(), x, {
                        position: getNodePosition(d),
                        data: d.data()
                    });
                }
            });
        });
    }
    function addCyHandler(ev) {
        const target = ev.target;
        const param = $$find(_params.slice().reverse(), x => target.is(x.query));
        if (param) {
            _lc.addOrUpdateElem(target.id(), param, {
                position: getNodePosition(target),
                data: target.data()
            });
        }
    }
    function layoutstopHandler({ cy }) {
        _params.forEach(x => {
            cy.elements(x.query).forEach((d) => {
                if (d.isNode()) {
                    _lc.updateElemPosition(d.id(), getNodePosition(d));
                }
            });
        });
    }
    function removeCyHandler(ev) {
        _lc.removeElemById(ev.target.id());
    }
    function moveCyHandler(ev) {
        _lc.updateElemPosition(ev.target.id(), getNodePosition(ev.target));
    }
    function updateDataOrStyleCyHandler(ev) {
        setTimeout(() => {
            const target = ev.target;
            const param = $$find(_params.slice().reverse(), x => target.is(x.query));
            if (param && !target.removed()) {
                _lc.addOrUpdateElem(target.id(), param, {
                    position: getNodePosition(target),
                    data: target.data()
                });
            }
            else {
                _lc.removeElemById(target.id());
            }
        }, 0);
    }
    function wrapCyHandler({ cy }) {
        _lc.updatePanZoom({
            pan: cy.pan(),
            zoom: cy.zoom()
        });
    }
    function getNodePosition(node) {
        return {
            w: node.width(),
            h: node.height(),
            x: node.position("x"),
            y: node.position("y")
        };
    }
}
cytoscape.nodeHtmlLabel = cyNodeHtmlLabel;
//# sourceMappingURL=cytoscape-node-html-label.js.map