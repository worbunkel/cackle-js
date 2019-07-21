import _ from 'lodash';
import gql from 'graphql-tag';
import { print } from 'graphql/language/printer';

export type Request = {
  AST: any;
  resolve: (value?: any) => void;
  reject: (val?: any) => void;
};

export const createQueryDefinitionGroupsFromASTs = (ASTs: any[]) =>
  _.map(ASTs, AST => {
    const definitions = _.get(AST, 'definitions');
    return _.filter(definitions, definition => _.get(definition, 'operation') === 'query');
  });

export const createSelections = (queryDefinitionGroups: any[][]) =>
  _.map(queryDefinitionGroups, queryDefinitionGroup =>
    _.flatMap(queryDefinitionGroup, def => {
      return def.selectionSet.selections;
    }),
  );

const createArgumentsName = (selection: any) => {
  if (_.size(selection.arguments) > 0) {
    return `(${_.map(
      selection.arguments,
      argument => `${argument.name.value}:${JSON.stringify(argument.value.value)}`,
    )})`;
  }
  return '';
};

const createDeepNames = (selections: any[]): any[] => {
  return _.flatMap(selections, selection => {
    const selectionSet = selection.selectionSet;
    if (!selectionSet) {
      return selection.name.value;
    }
    const argumentsName = createArgumentsName(selection);
    const nameWithArguments = argumentsName
      ? `${selection.name.value}${_.replace(argumentsName, /[^a-zA-Z0-9]/g, '')}: ${
          selection.name.value
        }${argumentsName}`
      : selection.name.value;
    return _.map(createDeepNames(selectionSet.selections), name => nameWithArguments + '.' + name);
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
  deepNames: _.map(selections, selection => createDeepNames(selection)),
  deepAliases: _.map(selections, selection => createDeepAliases(selection)),
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

export const createQueryNamesAndAliasesFromASTs = (ASTs: any[]) => {
  const queryDefinitionGroups = createQueryDefinitionGroupsFromASTs(ASTs);
  const selections = createSelections(queryDefinitionGroups);
  const { deepNames, deepAliases } = createDeepNamesAndAliases(selections);
  const uniqueNames = createUniqueNames(deepNames);
  const query = createQueryFromUniqueNames(uniqueNames);
  return { query, deepNames, deepAliases };
};

export const delay = async (durationInMS: number) =>
  new Promise(resolve => {
    setTimeout(() => {
      resolve();
    }, durationInMS);
  });
