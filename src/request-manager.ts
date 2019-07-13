import gql from 'graphql-tag';
import _ from 'lodash';
import { graphql } from 'graphql';
import { print } from 'graphql/language/printer';
import { createDeepNamesAndAliases, printObjectQuery } from './utils';
import { testSchema } from './test-schema';

type Request = {
  AST: any;
  resolve: (value?: any) => void;
  reject: (val?: any) => void;
};

export class RequestManager {
  requests: Array<Request> = [];
  constructor() {
    this.requests = [];
  }
  async createQuery(query: any) {
    return new Promise((resolve, reject) => {
      this.requests.push({
        AST: gql(query),
        resolve,
        reject,
      });
    });
  }
  async processQueries() {
    const queryDefinitionGroups = _.map(this.requests, ({ AST }) => {
      const definitions = _.get(AST, 'definitions');
      return _.filter(definitions, definition => _.get(definition, 'operation') === 'query');
    });
    console.log('queryDefinitionGroups');
    console.log(queryDefinitionGroups);
    const selections = _.map(queryDefinitionGroups, queryDefinitionGroup =>
      _.flatMap(queryDefinitionGroup, def => {
        return def.selectionSet.selections;
      }),
    );
    console.log(selections);
    const { deepNames, deepAliases } = createDeepNamesAndAliases(selections);
    console.log('DEEP NAMES:\n', deepNames);
    console.log('DEEP ALIASES:\n', deepAliases);
    const uniqueNames = _.uniq(_.flatten(deepNames));
    console.log('Unique Names:\n', uniqueNames);
    const newQueryObject = {};
    _.each(uniqueNames, uniqueName => _.set(newQueryObject, uniqueName, ''));
    console.log(newQueryObject);
    const newQuery = printObjectQuery(newQueryObject);
    const finalAST = gql(newQuery);
    const query = print(finalAST as any);

    console.log('\nQUERY:\n', query);

    const response = await graphql(testSchema, query);
    const result = response.data;
    console.log(JSON.stringify(result, null, 2));

    _.each(deepNames, (deepNameGroup, index) => {
      const deepAliasGroup = deepAliases[index];
      const returnObj = {};
      _.each(deepAliasGroup, (deepAlias, aliasIndex) => {
        const deepName = deepNameGroup[aliasIndex];
        _.set(returnObj, deepAlias, _.get(result, deepName));
      });
      this.requests[index].resolve(returnObj);
    });

    this.requests = [];
  }
}
