import gql from 'graphql-tag';
import _ from 'lodash';
import { Request, createQueryNamesAndAliasesFromASTs } from './utils';

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
    if (_.size(this.requests) === 0) {
      return;
    }

    const ASTs = _.map(this.requests, request => request.AST);
    const { query, deepNames, deepAliases } = createQueryNamesAndAliasesFromASTs(ASTs);

    try {
      const response = await this.functionToCallWithQuery(query);
      const result = _.get(response, 'data');
      if (!result) {
        throw new Error('Response of requestFunction did not match type: { data: any }');
      }

      _.each(deepNames, (deepNameGroup, index) => {
        const deepAliasGroup = deepAliases[index];
        const returnObj = {};
        _.each(deepAliasGroup, (deepAlias, aliasIndex) => {
          const deepName = _.replace(deepNameGroup[aliasIndex], /\:.+\)/g, '');
          _.set(returnObj, deepAlias, _.get(result, deepName));
        });
        this.requests[index].resolve(returnObj);
      });
    } catch (err) {
      _.each(this.requests, request => request.reject(err));
    }

    this.requests = [];
  }
}
