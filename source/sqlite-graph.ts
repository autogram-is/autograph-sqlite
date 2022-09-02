import is from "@sindresorhus/is";
import { JsonObject } from "type-fest";
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
import { placeholder } from "./sql-predicate";
import { stat } from "fs";
import { SqlMatchMaker } from "./sql-match.js";

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
      .catch((reason: Error) => {
        console.log(reason);
      });
  }

  /* Graph methods */

  nodes(...criteria: Array<Match<Node>>): JsonNodes {
    const matcher = new SqlMatchMaker<Node>(criteria);
    const clauses = matcher.toSql();
    const results = this.db
      .prepare(`${statements.node.select} WHERE ${clauses.sql}`)
      .pluck()
      .all(clauses.args)
      .map((data: string) => Node.load(data))
      .filter(node => matcher.match(node));
    
    return new JsonNodes(this, results);
  }

  edges(...criteria: Array<Match<Edge>>): JsonEdges {
    const matcher = new SqlMatchMaker<Edge>(criteria);
    const clauses = matcher.toSql();
    const results = this.db
      .prepare(`${statements.edge.select} WHERE ${clauses.sql}`)
      .pluck()
      .all(clauses.args)
      .map((data: string) => Edge.load(data))
      .filter(edge => matcher.match(edge));
    
    return new JsonEdges(this, results);
  }

  /* Mutable methods */

  add(input: Entity | Entity[]): SqliteGraph {
    return this.set(input, false);
  }

  set(input: Entity | Entity[], overWriteExisting: boolean = true): SqliteGraph {
    let nodeStmt: Statement;
    let edgeStmt: Statement;

    if (!is.array(input)) input = [input];
    if (overWriteExisting) {
      nodeStmt = this.db.prepare(statements.node.upsert);
      edgeStmt = this.db.prepare(statements.edge.upsert);
    } else {
      nodeStmt = this.db.prepare(statements.node.insert);
      edgeStmt = this.db.prepare(statements.edge.insert);
    } 

    for (const node of input) {
      if (isNode(node)) {
        const insertData = {
          id: node.id,
          type: node.type,
          labels: JSON.stringify([...node.labels.values()]),
          data: node.serialize(),
        };
        nodeStmt.run(insertData);
      }
    }

    for (const edge of input) {
      if (isEdge(edge)) {
        const insertData = {
          id: edge.id,
          source: edge.source,
          predicate: edge.predicate,
          target: edge.target,
          data: edge.serialize(),
        };
        edgeStmt.run(insertData);
      }
    }

    return this;
  }

  remove(input: Reference | Reference[], cascade?: true): SqliteGraph {
    if (!is.array(input)) input = [input];
    const ids = input.map(reference => Entity.idFromReference(reference));

    const edgeSql = `${statements.edge.delete} (${placeholder(ids)})`
    this.db.prepare(edgeSql).run(ids);

    const nodeSql = `${statements.node.delete} (${placeholder(ids)})`
    this.db.prepare(nodeSql).run(ids);

    return this;
  }

  /* Readable methods */

  has(input: Reference): boolean {
    const id = Entity.idFromReference(input);
    const stmt = this.db.prepare(statements.blind.exists).pluck();
    return stmt.get({ id }).count > 0;
  }

  get(input: Uuid): Entity | undefined {
    const stmt = this.db.prepare(statements.blind.select).pluck();
    const result: unknown = stmt.all({ id: input }).pop();
    if (is.string(result)) {
      const json = JSON.parse(result) as Dictionary;
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

    // See https://stackoverflow.com/questions/58519714 for the gory details.
    // It's not terribly efficient, but we're using this as a temporary shim to
    // avoid complicating up WHERE clauses with json_each() subselects.
    this.db.function(
      "json_array_contains",
      (jsonArray: string, value: number | string): 0 | 1 => {
        const haystack = JSON.parse(jsonArray) as Array<string | number>;
        return haystack.includes(value) ? 1 : 0;
      },
    );
  }
}
