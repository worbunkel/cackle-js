import _ from 'lodash';
import gql from 'graphql-tag';
import { print } from 'graphql/language/printer';

export type Request = {
  AST: any;
  resolve: (value?: any) => void;
  reject: (val?: any) => void;
};

export const createQueryDefinitionGroups = (requests: Request[]) =>
  _.map(requests, ({ AST }) => {
    const definitions = _.get(AST, 'definitions');
    return _.filter(definitions, definition => _.get(definition, 'operation') === 'query');
  });

export const createSelections = (queryDefinitionGroups: any[][]) =>
  _.map(queryDefinitionGroups, queryDefinitionGroup =>
    _.flatMap(queryDefinitionGroup, def => {
      return def.selectionSet.selections;
    }),
  );

const createDeepNames = (selections: any[]): any[] => {
  return _.flatMap(selections, selection => {
    const selectionSet = selection.selectionSet;
    if (!selectionSet) {
      return selection.name.value;
    }
    return _.map(createDeepNames(selectionSet.selections), name => selection.name.value + '.' + name);
  });
};

const createDeepAliases = (selections: any[]): any[] => {
  return _.flatMap(selections, selection => {
    const selectionSet = selection.selectionSet;
    const alias = _.get(selection, 'alias.value', selection.name.value);
    if (!selectionSet) {
      return alias;
    }
    return _.map(createDeepAliases(selectionSet.selections), childAlias => alias + '.' + childAlias);
  });
};

// TODO: Clean this up to be done in one loop
export const createDeepNamesAndAliases = (selections: any[]): { deepNames: any[]; deepAliases: any[] } => ({
  deepNames: _.map(selections, createDeepNames),
  deepAliases: _.map(selections, createDeepAliases),
});

export const printObjectQuery = (objectQuery: any): string => `{
  ${_.join(_.map(objectQuery, (value, key) => (value === '' ? key : `${key} ${printObjectQuery(value)}`)), '\n')}
}`;

export const createUniqueNames = (deepNames: string[]) => _.uniq(_.flatten(deepNames));

export const createQueryFromUniqueNames = (uniqueNames: any[]) => {
  const newQueryObject = {};
  _.each(uniqueNames, uniqueName => _.set(newQueryObject, uniqueName, ''));
  const newQuery = printObjectQuery(newQueryObject);
  const finalAST = gql(newQuery);
  const query = print(finalAST as any);
  return query;
};

export const delay = async (durationInMS: number) =>
  new Promise(resolve => {
    setTimeout(() => {
      resolve();
    }, durationInMS);
  });
