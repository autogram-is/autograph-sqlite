import is from '@sindresorhus/is';
import { Predicate, Operator, PredicateValue } from '@autogram/autograph';

type predicateSqlClause = { sql: string, params?: string[] | number[] };
type predicateSqlFunction = (property: unknown, value: PredicateValue) => predicateSqlClause;

export const predicateToSql = (predicate: Predicate): predicateSqlClause => {
  const sqlFunction = predicateWhereClauses[predicate.operator];
  
  if (is.undefined(sqlFunction)) {
    throw new Error(`No test for '${predicate.operator}' exists`);
  }

  if (is.undefined(predicate.value)) {
    if (['exists', 'missing', 'empty'].includes(predicate.operator)) {
      predicate.value = false; // Assign a dummy value; those tests won't use it
    } else {
      throw new Error(`Operator '${predicate.operator} requires comparison value`);
    }
  }

  return sqlFunction(predicate.property, predicate.value);
}

const predicateWhereClauses: Record<Operator, predicateSqlFunction> = {
  equals(property: unknown, value: PredicateValue): predicateSqlClause {
    return property === value;
  },

  notequals(property: unknown, value: PredicateValue): predicateSqlClause {
    return property !== value;
  },

  greaterthan(property: unknown, value: PredicateValue): predicateSqlClause {
    if (is.number(property) && is.number(value)) {
      return property > value;
    }

    return false;
  },

  lessthan(property: unknown, value: PredicateValue): predicateSqlClause {
    if (is.number(property) && is.number(value)) {
      return property < value;
    }

    return false;
  },

  notgreaterthan(property: unknown, value: PredicateValue): predicateSqlClause {
    if (is.number(property) && is.number(value)) {
      return property <= value;
    }

    return false;
  },

  notlessthan(property: unknown, value: PredicateValue): predicateSqlClause {
    if (is.number(property) && is.number(value)) {
      return property >= value;
    }

    return false;
  },

  between(property: unknown, value: PredicateValue): predicateSqlClause {
    if (is.number(property) && is.nonEmptyArray(value) && is.number(value[0])) {
      const min = Number(value.sort()[0]);
      const max = Number(value[value.length - 1]);
      return property > min && property < max;
    }

    return false;
  },

  within(property: unknown, value: PredicateValue): predicateSqlClause {
    if (is.number(property) && is.nonEmptyArray(value) && is.number(value[0])) {
      const min = Number(value.sort()[0]);
      const max = Number(value[value.length - 1]);
      return property >= min && property <= max;
    }

    return false;
  },

  outside(property: unknown, value: PredicateValue): predicateSqlClause {
    if (is.number(property) && is.nonEmptyArray(value) && is.number(value[0])) {
      const min = Number(value.sort()[0]);
      const max = Number(value[value.length - 1]);
      return property < min && property > max;
    }

    return false;
  },

  contains(property: unknown, value: PredicateValue): predicateSqlClause {
    if (is.array(property)) {
      return property.includes(value);
    }

    if (is.string(property)) {
      return property.includes(value.toString());
    }

    return false;
  },

  excludes(property: unknown, value: PredicateValue): predicateSqlClause {
    if (is.array(property)) {
      return !property.includes(value);
    }

    if (is.string(property)) {
      return !property.includes(value.toString());
    }

    return false;
  },

  in(property: unknown, value: PredicateValue): predicateSqlClause {
    if (is.array<string>(value) && is.string(property)) {
      return value.includes(property);
    }

    if (is.array<number>(value) && is.number(property)) {
      return value.includes(property);
    }

    return false;
  },

  notin(property: unknown, value: PredicateValue): predicateSqlClause {
    if (is.array<string>(value) && is.string(property)) {
      return !value.includes(property);
    }

    if (is.array<number>(value) && is.number(property)) {
      return !value.includes(property);
    }

    return false;
  },

  startswith(property: unknown, value: PredicateValue): predicateSqlClause {
    if (is.string(value) && is.string(property)) {
      return property.startsWith(value);
    }

    return false;
  },

  endswith(property: unknown, value: PredicateValue): predicateSqlClause {
    if (is.string(value) && is.string(property)) {
      return property.endsWith(value);
    }

    return false;
  },

  exists(property: unknown, value: PredicateValue): predicateSqlClause {
    return !is.undefined(property);
  },

  missing(property: unknown, value: PredicateValue): predicateSqlClause {
    return is.nullOrUndefined(property);
  },

  empty(property: unknown, value: PredicateValue): predicateSqlClause {
    return (
      is.emptyArray(property) ||
      is.emptyObject(property) ||
      is.emptyStringOrWhitespace(property)
    );
  },
};
