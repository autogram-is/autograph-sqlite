import is from "@sindresorhus/is";
import {
  Predicate,
  PredicateComparisons,
  PredicateMode,
  PredicateStruct,
  PredicateValue,
} from "@autogram/autograph";

type PredicateSqlClause = {
  sql: string;
  args: PredicateValue[];
};
type PredicateSqlFunction = (
  property: string,
  value: unknown,
) => PredicateSqlClause;

export const predicateToSql = (predicate: Predicate): PredicateSqlClause => {
  const allSql: string[] = [];
  const allArgs: PredicateValue[] = [];

  for (const operator in predicate.comparisons) {
    const func: PredicateSqlFunction = predicateFunctions[operator];
    if (is.undefined(func)) {
      throw new Error(`Unknown operator '${operator}'`);
    }

    const { sql, args } = func(
      predicate.propertyName,
      predicate.comparisons[operator],
    );
    if (is.nonEmptyStringAndNotWhitespace(sql)) {
      allSql.push(sql);
    }

    if (is.nonEmptyArray(args)) {
      allArgs.push(...args);
    }
  }

  if (allSql.length === 0) return { sql: "", args: [] };

  let sql = "";
  switch (predicate.mode) {
    case "any":
      sql = allSql.join(` OR \n`);
      if (allSql.length > 1) sql = `(${sql})`;
      break;
    case "none":
      sql = `NOT (${allSql.join(` OR \n`)})`;
      break;
    default: // 'all'
      sql = allSql.join(` AND \n`);
      if (allSql.length > 1) sql = `(${sql})`;
      break;
  }

  return {
    sql,
    args: allArgs,
  };
};

const predicateFunctions: Record<string, PredicateSqlFunction> = {
  eq(propertyName: string, value: unknown): PredicateSqlClause {
    if (!(is.number(value) || is.string(value) || is.boolean(value)))
      return { sql: "", args: [] };
    return {
      sql: propToColumn(propertyName) + " = ?",
      args: wrapSingle(value),
    };
  },

  gt(propertyName: string, value: unknown): PredicateSqlClause {
    if (!is.number(value)) return { sql: "", args: [] };
    return {
      sql: propToColumn(propertyName) + " > ?",
      args: wrapSingle(value),
    };
  },

  lt(propertyName: string, value: unknown): PredicateSqlClause {
    if (!is.number(value)) return { sql: "", args: [] };
    return {
      sql: propToColumn(propertyName) + " < ?",
      args: wrapSingle(value),
    };
  },

  bt(propertyName: string, value: unknown): PredicateSqlClause {
    if (!is.arrayLike<number>(value)) return { sql: "", args: [] };
    const bounds: [number, number] = [value[0], value[1]];
    return {
      sql: `(${propToColumn(propertyName)} > ? AND ${propToColumn(
        propertyName,
      )} < ?)`,
      args: bounds.sort(),
    };
  },

  has(propertyName: string, value: unknown): PredicateSqlClause {
    if (!(is.number(value) || is.string(value))) return { sql: "", args: [] };
    return {
      sql: `json_array_contains(${propToColumn(propertyName)}, ?)) = 1`,
      args: wrapSingle(value),
    };
  },

  in(propertyName: string, value: unknown): PredicateSqlClause {
    if (!is.array(value) || is.emptyArray(value)) return { sql: "", args: [] };
    if (!(is.arrayLike<number>(value) || is.arrayLike<string>(value)))
      return { sql: "", args: [] };
    const values: PredicateValue[] = [...value];
    return {
      sql: `${propToColumn(propertyName)} IN (${placeholder(value)})`,
      args: values,
    };
  },

  sw(propertyName: string, value: unknown): PredicateSqlClause {
    if (!is.string(value)) return { sql: "", args: [] };
    return {
      sql: `${propToColumn(propertyName)} LIKE ?`,
      args: wrapSingle(value.toString() + "%"),
    };
  },

  ew(propertyName: string, value: unknown): PredicateSqlClause {
    if (!is.string(value)) return { sql: "", args: [] };
    return {
      sql: `${propToColumn(propertyName)} LIKE ?`,
      args: wrapSingle("%" + value.toString()),
    };
  },

  exists(propertyName: string, value: unknown): PredicateSqlClause {
    if (!is.boolean(value)) return { sql: "", args: [] };
    return {
      sql: `${propToColumn(propertyName)} NOT NULL`,
      args: [],
    };
  },

  missing(propertyName: string, value: unknown): PredicateSqlClause {
    if (!is.boolean(value)) return { sql: "", args: [] };
    return {
      sql: `${propToColumn(propertyName)} IS ${value ? "NULL" : "NOT NULL"}`,
      args: [],
    };
  },

  empty(propertyName: string, value: unknown): PredicateSqlClause {
    if (!is.boolean(value)) return { sql: "", args: [] };
    if (propertyName === "labels") {
      return {
        sql: `${propToColumn(propertyName)} ${value ? "=" : "!="} '[]'`,
        args: [],
      };
    }

    return {
      sql: `${propToColumn(propertyName)} ${value ? "=" : "!="} ''`,
      args: [],
    };
  },
};

const wrapSingle = (
  value: number | string | boolean | Array<number | string | boolean>,
): Array<number | string | boolean> => {
  return is.array(value) ? value : [value];
};

const propToColumn = (propertyName: string): string => {
  if (["id", "source", "predicate", "target", "type"].includes(propertyName)) {
    return propertyName;
  }

  return `json_extract(data, '$.${propertyName}')`;
};

export const placeholder = (value: unknown): string => {
  if (is.array(value)) {
    return Array.from({ length: value.length }).fill("?").join(",");
  }

  return "?";
};
