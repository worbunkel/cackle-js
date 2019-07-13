import gql from 'graphql-tag';
import _ from 'lodash';
import { print } from 'graphql/language/printer';
import { createDeepNamesAndAliases, printObjectQuery } from './utils';

type Request = {
  AST: any;
  resolve: (value?: any) => void;
  reject: (val?: any) => void;
};

export class RequestManager {
  requests: Array<Request> = [];
  batchDuration: number;
  interval: NodeJS.Timeout;
  functionToCallWithQuery: (query: String) => Promise<any>;

  constructor(functionToCallWithQuery: (query: String) => Promise<any>, batchDuration: number = 200) {
    this.functionToCallWithQuery = functionToCallWithQuery;
    this.requests = [];
    this.batchDuration = batchDuration;
  }

  private resetInterval() {
    clearInterval(this.interval);
    this.interval = setTimeout(() => {
      this.processQueries();
    }, this.batchDuration);
  }

  async createQuery(query: any) {
    console.log(`Query Created: ${new Date().getTime()}`);
    this.resetInterval();
    return new Promise((resolve, reject) => {
      try {
        const AST = gql(query);
        this.requests.push({
          AST,
          resolve,
          reject,
        });
      } catch (err) {
        reject(`\nInvalid Query:\n${query}\n${err}`);
      }
    });
  }

  async processQueries() {
    if (_.isEqual(this.requests, [])) {
      return;
    }
    console.log(`Started Processing Queries: ${new Date().getTime()}`);
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

    try {
      const response = await this.functionToCallWithQuery(query);
      const result = _.get(response, 'data');
      if (!result) {
        throw new Error('Response of requestFunction did not match type: { data: any }');
      }
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
    } catch (err) {
      console.error('Error making request:', err);
      _.each(this.requests, request => request.reject(err));
    }

    this.requests = [];
    console.log('Processed Queries');
  }
}
