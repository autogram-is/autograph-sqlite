import is from "@sindresorhus/is";
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
  EdgeSelector,
  Graph,
  GraphStorage,
  NodeSelector,
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

export class SqliteGraph implements Graph, GraphStorage {
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

  set(input: Entity | Entity[]): this {
    const entities = is.array(input) ? input : [input];
    for (const n of entities.filter((ent: Entity) => ent instanceof Node)) {
      this.db.prepare(statements.node.upsert).run({
        id: n.id,
        type: n.type,
        labels: JSON.stringify(n.labels),
        data: n.serialize(),
      });
    }

    for (const edge of entities.filter((ent: Entity) => ent instanceof Edge)) {
      this.db.prepare(statements.edge.upsert).run({
        id: edge.id,
        source: edge.source,
        predicate: edge.predicate,
        target: edge.target,
        data: edge.serialize(),
      });
    }

    return this;
  }

  getNode(id: string): Node | undefined {
    const stmt: Statement = this.db.prepare(
      `${statements.node.select} WHERE id = ?`,
    );
    const result = stmt.all(id)[0] as Dictionary;
    if (!is.nullOrUndefined(result)) {
      return Node.load(result.data as string);
    }

    return undefined;
  }

  getEdge(id: string): Edge | undefined {
    const stmt: Statement = this.db.prepare(
      `${statements.edge.select} WHERE id = ?`,
    );
    const result = stmt.all({ id })[0] as Dictionary;
    if (!is.nullOrUndefined(result)) {
      return Edge.load(result.data as string);
    }

    return undefined;
  }

  deleteNode(r: Reference<Node> | Array<Reference<Node>>): number {
    if (!is.array(r)) r = [r];
    const ids = new Set<string>(r.map((v) => Entity.idFromReference(v)));
    const parameters = `'${[...ids].join("','")}'`;
    return this.db.prepare(statements.node.delete).run(parameters).changes;
  }

  deleteEdge(r: Reference<Edge> | Array<Reference<Edge>>): number {
    if (!is.array(r)) r = [r];
    const ids = new Set<string>(r.map((v) => Entity.idFromReference(v)));
    const parameters = `'${[...ids].join("','")}'`;
    return this.db.prepare(statements.edge.delete).run(parameters).changes;
  }

  matchNodes<T extends Node = Node>(
    r: NodeSelector,
    fn?: EntityFilter<Node>,
  ): T[] {
    const criteria: string[] = [];

    if (typeof r.label === "string") {
      criteria.push(`label LIKE '%${r.label}%'`);
    }

    if (typeof r.type === "string") {
      criteria.push(`type = '${r.type}'`);
    }

    let sql = statements.node.select;
    if (criteria.length > 0) {
      sql += ` WHERE ${criteria.join(" AND ")};`;
    }

    const customFunc = is.function_(fn) ? fn : () => true;

    const stmt = this.db.prepare(sql);
    return stmt
      .pluck()
      .all()
      .map((data: string) => Node.load(data) as T)
      .filter((edge: T) => customFunc(edge));
  }

  matchEdges<T extends Edge = Edge>(
    r: EdgeSelector,
    fn?: EntityFilter<Edge>,
  ): T[] {
    const criteria: string[] = [];

    if (typeof r.predicate === "string") {
      criteria.push(`predicate = '${r.predicate}'`);
    }

    if (typeof r.sourceOrTarget === "string") {
      criteria.push(
        `(source = '${r.sourceOrTarget}' OR target = '${r.sourceOrTarget}')`,
      );
    } else {
      if (typeof r.source === "string") {
        criteria.push(`source = '${r.source}'`);
      }

      if (typeof r.target === "string") {
        criteria.push(`target = '${r.target}'`);
      }
    }

    let sql = statements.edge.select;
    if (criteria.length > 0) {
      sql += ` WHERE ${criteria.join(" AND ")};`;
    }

    const customFunc = is.function_(fn) ? fn : () => true;

    const stmt = this.db.prepare(sql);
    return stmt
      .pluck()
      .all()
      .map((data: string) => Edge.load(data) as T)
      .filter((edge: T) => customFunc(edge));
  }
}
