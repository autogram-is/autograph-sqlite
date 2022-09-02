import { Node, Edge, Reference } from "@autogram/autograph";

export class Scion extends Node {
  type = "scion";
  constructor(
    public name: string,
    public birth: number,
    public death: number,
    public title?: string,
  ) {
    super();
  }
}
Node.types.set("scion", Scion);

export class Parent extends Edge {
  predicate = "is_parent_of";
  constructor(parent: Reference<Scion>, child: Reference<Scion>) {
    super(parent, "is_parent_of", child);
  }
}
Edge.types.set("is_parent_of", Parent);
