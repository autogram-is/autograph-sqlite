import test from "ava";
import { Node, Edge } from "@autogram/autograph";
import { SqliteGraph } from "../source/index.js";

const g = new SqliteGraph();

test("graph population", (t) => {
  const nodeCount = 100;
  const edgeCount = 400;

  const nodes: Node[] = [];
  for (let i = 1; i < nodeCount; i++) {
    const n = new Node();
    n.customProperty = Math.random()
      .toString(36)
      .replace(/[^a-z]+/g, "")
      .slice(0, 5);
    nodes.push(n);
  }

  const edges: Edge[] = [];
  for (let i = 1; i < edgeCount; i++) {
    const edge = new Edge(
      nodes[Math.floor(Math.random() * nodes.length)],
      "knows_of",
      nodes[Math.floor(Math.random() * nodes.length)],
    );
    edges.push(edge);
  }

  g.set(nodes);
  g.set(edges);

  t.assert((g.getNode(nodes[0].id)!.id = nodes[0].id));
});

test("node loading", (t) => {
  const n = new Node();
  const nn = Node.load(n.serialize());
  t.deepEqual(n, nn);

  g.set(n);
  const n2 = g.getNode(n.id);

  t.deepEqual(n, n2);
});

test("graph matching", (t) => {
  const nodeCount = 5;
  const edgeCount = 10;

  const nodes: Node[] = [];
  for (let i = 1; i < nodeCount; i++) {
    const n = new Node();
    n.customProperty = Math.random()
      .toString(36)
      .replace(/[^a-z]+/g, "")
      .slice(0, 5);
    nodes.push(n);
  }

  const edges: Edge[] = [];
  for (let i = 1; i < edgeCount; i++) {
    const edge = new Edge(
      nodes[Math.floor(Math.random() * nodes.length)],
      "knows_of",
      nodes[Math.floor(Math.random() * nodes.length)],
    );
    edges.push(edge);
  }

  g.set(nodes);
  g.set(edges);

  const nid = nodes[0].id;
  const foundEdges = g.matchEdges({ sourceOrTarget: nid });
  t.truthy(foundEdges);
});
