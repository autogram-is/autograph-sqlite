import is from "@sindresorhus/is";
import { Predicate, Operator, PredicateValue } from "@autogram/autograph";

type PredicateSqlClause = {
  sql: string;
  args?: Array<number | string | boolean>;
};
type PredicateSqlFunction = (
  propName: string,
  value: PredicateValue,
) => PredicateSqlClause;

export const predicateToSql = (predicate: Predicate): PredicateSqlClause => {
  const sqlFunction = predicateWhereClauses[predicate.operator];

  if (is.undefined(sqlFunction)) {
    throw new Error(`No test for '${predicate.operator}' exists`);
  }

  if (is.undefined(predicate.value)) {
    if (["exists", "missing", "empty"].includes(predicate.operator)) {
      predicate.value = false; // Assign a dummy value; those tests won't use it
    } else {
      throw new Error(
        `Operator '${predicate.operator} requires comparison value`,
      );
    }
  }

  return sqlFunction(predicate.property, predicate.value);
};

const wrapSingle = (
  value: PredicateValue,
): Array<number | string | boolean> => {
  return is.array(value) ? value : [value];
};

const propToColumn = (propName: string): string => {
  if (["id", "source", "predicate", "target", "type"].includes(propName)) {
    return propName;
  }

  if (propName === "labels") {
    return `json_extract(labels, '$')`;
  }

  return `json_extract(data, '$.${propName}')`;
};

const placeholder = (value: unknown): string => {
  if (is.array(value)) {
    return Array.from({ length: value.length }).fill("?").join(",");
  }

  return "?";
};

const predicateWhereClauses: Record<Operator, PredicateSqlFunction> = {
  equals(propName: string, value: PredicateValue): PredicateSqlClause {
    return {
      sql: propToColumn(propName) + " = ?",
      args: wrapSingle(value),
    };
  },

  notequals(propName: string, value: PredicateValue): PredicateSqlClause {
    return {
      sql: propToColumn(propName) + " != ?",
      args: wrapSingle(value),
    };
  },

  greaterthan(propName: string, value: PredicateValue): PredicateSqlClause {
    return {
      sql: propToColumn(propName) + " > ?",
      args: wrapSingle(value),
    };
  },

  lessthan(propName: string, value: PredicateValue): PredicateSqlClause {
    return {
      sql: propToColumn(propName) + " < ?",
      args: wrapSingle(value),
    };
  },

  notgreaterthan(propName: string, value: PredicateValue): PredicateSqlClause {
    return {
      sql: propToColumn(propName) + " <= ?",
      args: wrapSingle(value),
    };
  },

  notlessthan(propName: string, value: PredicateValue): PredicateSqlClause {
    return {
      sql: propToColumn(propName) + " >= ?",
      args: wrapSingle(value),
    };
  },

  between(propName: string, value: PredicateValue): PredicateSqlClause {
    if (is.nonEmptyArray(value) && is.number(value[0])) {
      const min = Number(value.sort()[0]);
      const max = Number(value[value.length - 1]);
      return {
        sql: `(${propToColumn(propName)} > ? AND ${propToColumn(
          propName,
        )} < ?)`,
        args: [min, max],
      };
    }

    return { sql: "", args: [] };
  },

  within(propName: string, value: PredicateValue): PredicateSqlClause {
    if (is.nonEmptyArray(value) && is.number(value[0])) {
      const min = Number(value.sort()[0]);
      const max = Number(value[value.length - 1]);
      return {
        sql: `(${propToColumn(propName)} >= ? AND ${propToColumn(
          propName,
        )} <= ?)`,
        args: [min, max],
      };
    }

    return { sql: "", args: [] };
  },

  outside(propName: string, value: PredicateValue): PredicateSqlClause {
    if (is.nonEmptyArray(value) && is.number(value[0])) {
      const min = Number(value.sort()[0]);
      const max = Number(value[value.length - 1]);
      return {
        sql: `(${propToColumn(propName)} < ? OR ${propToColumn(propName)} > ?)`,
        args: [min, max],
      };
    }

    return { sql: "", args: [] };
  },

  contains(propName: string, value: PredicateValue): PredicateSqlClause {
    return {
      sql: `json_array_contains(${propToColumn(propName)}, ?)) = 1`,
      args: wrapSingle(value),
    };
  },

  excludes(propName: string, value: PredicateValue): PredicateSqlClause {
    // Value not in property
    return {
      sql: `json_array_contains(${propToColumn(propName)}, ?)) = 0`,
      args: wrapSingle(value),
    };
  },

  in(propName: string, value: PredicateValue): PredicateSqlClause {
    if (is.array(value)) {
      return {
        sql: `${propToColumn(propName)} IN (${placeholder(value)})`,
        args: wrapSingle(value),
      };
    }

    return { sql: "", args: [] };
  },

  notin(propName: string, value: PredicateValue): PredicateSqlClause {
    if (is.array(value)) {
      return {
        sql: `${propToColumn(propName)} NOT IN (${placeholder(value)})`,
        args: wrapSingle(value),
      };
    }

    return { sql: "", args: [] };
  },

  startswith(propName: string, value: PredicateValue): PredicateSqlClause {
    return {
      sql: `${propToColumn(propName)} LIKE ?`,
      args: wrapSingle(value.toString() + "%"),
    };
  },

  endswith(propName: string, value: PredicateValue): PredicateSqlClause {
    return {
      sql: `${propToColumn(propName)} LIKE ?`,
      args: wrapSingle("%" + value.toString()),
    };
  },

  exists(propName: string, value: PredicateValue): PredicateSqlClause {
    return {
      sql: `${propToColumn(propName)} NOT NULL`,
      args: [],
    };
  },

  missing(propName: string, value: PredicateValue): PredicateSqlClause {
    return {
      sql: `${propToColumn(propName)} IS NULL`,
      args: [],
    };
  },

  empty(propName: string, value: PredicateValue): PredicateSqlClause {
    if (propName === "labels") {
      return {
        sql: `${propToColumn(propName)} = '[]'`,
        args: [],
      };
    }

    return {
      sql: `${propToColumn(propName)} = ''`,
      args: [],
    };
  },
};
