export const statements = {
  node: {
    select: "SELECT data FROM node ",
    exists: "SELECT COUNT(1) FROM node WHERE id = @id",
    insert: `INSERT INTO node (id, type, data) 
      VALUES(@id, @type, json(@data))`,
    update: `UPDATE node SET data = json(@data) WHERE id = @id;`,
    upsert: `INSERT INTO node (id, type, labels, data) VALUES(@id, @type, @labels, json(@data))
      ON CONFLICT(id) DO UPDATE SET labels = excluded.labels, data = excluded.data WHERE id = @id;`,
    delete: "DELETE FROM node WHERE id IN (?)",
    schema: `
      CREATE TABLE IF NOT EXISTS node (
        id   TEXT NOT NULL,
        type TEXT NOT NULL,
        labels JSON,
        data JSON,
        UNIQUE(id)
      );`,
    indexes: `
      CREATE INDEX IF NOT EXISTS id_idx ON node(id);
      CREATE INDEX IF NOT EXISTS id_idx ON node(type);`,
  },
  edge: {
    select: "SELECT data FROM edge ",
    exists: "SELECT COUNT(1) FROM edge WHERE id = @id",
    insert: `INSERT INTO edge (id, source, target, predicate, data)
      VALUES(@id, @source, @target, @predicate, json(@data))`,
    update: `UPDATE edge SET data = json(@data) WHERE id = @id;`,
    upsert: `INSERT INTO edge (id, source, predicate, target, data)
      VALUES(@id, @source, @predicate, @target, json(@data))
      ON CONFLICT(id) DO UPDATE SET data=excluded.data WHERE id = @id;`,
    delete: "DELETE FROM node WHERE id IN (?)",
    schema: `CREATE TABLE IF NOT EXISTS edge (
      id         TEXT NOT NULL,
      source     TEXT NOT NULL,
      predicate  TEXT NOT NULL,
      target     TEXT NOT NULL,
      data JSON,
      UNIQUE(id),
      FOREIGN KEY(source) REFERENCES node(id),
      FOREIGN KEY(target) REFERENCES node(id)
    );`,
    indexes: `
      CREATE INDEX IF NOT EXISTS source_idx ON edge(source);
      CREATE INDEX IF NOT EXISTS edge_idx ON edge(predicate);
      CREATE INDEX IF NOT EXISTS target_idx ON edge(target);
      CREATE INDEX IF NOT EXISTS predicate_idx ON edge(predicate);`,
  },
  blind: {
    exists: ``,
    delete: ``,
  },
};
