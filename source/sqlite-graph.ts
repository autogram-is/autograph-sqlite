import is from "@sindresorhus/is";
import { JsonObject } from 'type-fest';
import DatabaseConstructor, {
  Database,
  Statement,
  Options,
} from "better-sqlite3";
import {
  Entity,
  Node,
  Edge,
  Reference,
  EntityFilter,
  Dictionary,
  Readable,
  Mutable,
  Persistable,
  Graph,
  JsonNodes,
  JsonEdges,
  Uuid,
  EdgeSet,
  Match,
  NodeSet,
  isNode,
  isNodeData,
  isEdgeData,
  isEdge,
} from "@autogram/autograph";
import { statements } from "./sql.js";

export type SqliteGraphOptions = {
  filename: string;
  options?: Partial<Options>;
};
const sqliteGraphDefaults: SqliteGraphOptions = {
  filename: ":memory:",
  options: {
    fileMustExist: false,
    timeout: 6000,
  },
};

export { Database, SqliteError, Statement, Options } from "better-sqlite3";

export class SqliteGraph implements Readable, Mutable, Persistable, Graph {
  config: SqliteGraphOptions = sqliteGraphDefaults;
  db!: Database;

  constructor(options: Partial<SqliteGraphOptions> = {}) {
    this.config = {
      ...this.config,
      ...options,
    };
    this.load()
      .then(() => {
        this.initialize();
        this.setPerformanceMode();
      })
      .catch(() => {
        console.log("hmmmm…");
      });
  }

  /* Graph methods */

  nodes(...criteria: Match<Node>[]): NodeSet<Node> {
    throw new Error("Method not implemented.");
  }

  edges(...criteria: Match<Edge>[]): EdgeSet<Edge> {
    throw new Error("Method not implemented.");
  }

  /* Mutable methods */
  
  add(input: Entity | Entity[], mode: 'insert' | 'upsert' = 'insert'): Mutable<Entity> {
    let nodeStmt: Statement;
    let edgeStmt: Statement;

    if (!is.array(input)) input = [input];
    if (mode === 'insert') {
      nodeStmt = this.db.prepare(statements.node.insert);
      edgeStmt = this.db.prepare(statements.edge.insert);  
    } else {
      nodeStmt = this.db.prepare(statements.node.upsert);
      edgeStmt = this.db.prepare(statements.edge.upsert);  
    }

    for (let node of input) {
      if (isNode(node)) {
        let insertData = {
          id: node.id,
          type: node.type,
          labels: JSON.stringify([...node.labels.values()]),
          data: node.serialize()
        }
        nodeStmt.run(insertData);
      }
    }
    for (let edge of input) {
      if (isEdge(edge)) {
        let insertData = {
          id: edge.id,
          source: edge.source,
          predicate: edge.predicate,
          target: edge.target,
          data: edge.serialize()
        }
        edgeStmt.run(insertData);
      }
    }
    return this;
  }

  remove(input: Reference | Reference[], cascade?: true): Mutable<Entity> {
    if (!is.array(input)) input = [input];

    throw new Error("Method not implemented.");
  }
  
  set(input: Entity | Entity[]): Mutable<Entity> {
    return this.add(input, 'upsert');
  }

  /* Readable methods */

  has(input: Reference<Entity>): boolean {
    const id = Entity.idFromReference(input);
    const stmt = this.db.prepare(statements.blind.exists).pluck();
    return stmt.get({ id: id }).count > 0;
  }

  get(input: Uuid): Entity | undefined {
    const stmt = this.db.prepare(statements.blind.select).pluck();
    const result = stmt.all({ id: input }).pop();
    if (is.string(result)) {
      const json = JSON.parse(result);
      if (isNodeData(json)) return Node.load(json);
      if (isEdgeData(json)) return Edge.load(json);
    }
    return undefined;
  }

  /* Persistable methods */

  async load(options?: Partial<SqliteGraphOptions>): Promise<void> {
    const config = {
      ...this.config,
      ...options,
    };
    return new Promise((resolve) => {
      this.db = DatabaseConstructor(config.filename, config.options);
      resolve();
    });
  }

  async save(options?: Partial<SqliteGraphOptions>): Promise<void> {
    throw new Error("Method not implemented.");
  }

  async optimize(): Promise<void> {
    return new Promise((resolve) => {
      this.db.pragma("optimize");
      resolve();
    });
  }

  setPerformanceMode() {
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("journal_size_limit = 5000000");
    this.db.pragma("synchronous = 0");
    this.db.pragma("automatic_index = false");
    this.db.pragma("temp_store = 2");
    this.db.pragma("mmap_size = 4000000000");
    this.db.pragma("page_size = 65536"); // Larger helps given the size of our data
  }

  initialize(): void {
    this.db.exec(statements.node.schema);
    this.db.exec(statements.edge.schema);
    this.db.exec(statements.node.indexes);
    this.db.exec(statements.edge.indexes);
  }
}
