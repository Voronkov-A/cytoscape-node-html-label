import cytoscape, { Core } from 'cytoscape';
export type IHAlign = "left" | "center" | "right";
export type IVAlign = "top" | "center" | "bottom";
export interface CytoscapeNodeHtmlParams {
    query?: string;
    halign?: IHAlign;
    valign?: IVAlign;
    halignBox?: IHAlign;
    valignBox?: IVAlign;
    cssClass?: string;
    tpl?: (d: any) => string;
}
export interface CytoscapeContainerParams {
    enablePointerEvents?: boolean;
}
export declare function cyNodeHtmlLabel(_cy: Core, params: CytoscapeNodeHtmlParams[], options?: CytoscapeContainerParams): cytoscape.Core;
