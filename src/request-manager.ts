import gql from 'graphql-tag';
import _ from 'lodash';
import { Request, createQueryNamesAndAliasesFromASTs, createMutationAndNamesFromASTs } from './utils';

export class RequestManager<T extends any> {
  private queryRequests: Array<Request> = [];
  private mutationRequests: Array<Request> = [];
  private batchDuration: number;
  private queryInterval: NodeJS.Timeout;
  private mutationInterval: NodeJS.Timeout;
  private requestCreator: (query: string) => Promise<T>;

  constructor(requestCreator: (query: string) => Promise<T>, batchDuration: number = 100) {
    this.requestCreator = requestCreator;
    this.batchDuration = batchDuration;
  }

  private resetQueryInterval() {
    clearInterval(this.queryInterval);
    this.queryInterval = setTimeout(() => {
      this.flushQueryInterval();
    }, this.batchDuration);
  }

  private flushQueryInterval() {
    clearInterval(this.queryInterval);
    this.processQueries();
  }

  private resetMutationInterval() {
    clearInterval(this.mutationInterval);
    this.mutationInterval = setTimeout(() => {
      this.flushMutationInterval();
    }, this.batchDuration);
  }

  private flushMutationInterval() {
    clearInterval(this.mutationInterval);
    this.processMutations();
  }

  flush() {
    this.flushMutationInterval();
    this.flushQueryInterval();
  }

  async createQuery(query: any, flushImmediately = false): Promise<T> {
    this.flushMutationInterval();
    this.resetQueryInterval();
    return new Promise((resolve, reject) => {
      try {
        const AST = gql(query);
        this.queryRequests.push({
          AST,
          resolve,
          reject,
        });
        if (flushImmediately) {
          this.flush();
        }
      } catch (err) {
        reject(`\nInvalid Query:\n${query}\n${err}`);
      }
    });
  }

  async createMutation(mutation: string, flushImmediately = false): Promise<T> {
    this.flushQueryInterval();
    this.resetMutationInterval();
    return new Promise((resolve, reject) => {
      try {
        const AST = gql(mutation);
        this.mutationRequests.push({
          AST,
          resolve,
          reject,
        });
        if (flushImmediately) {
          this.flush();
        }
      } catch (err) {
        reject(`\nInvalid Mutation:\n${mutation}\n${err}`);
      }
    });
  }

  private async processQueries() {
    if (_.size(this.queryRequests) === 0) {
      return;
    }

    const requests = this.queryRequests;
    this.queryRequests = [];

    const ASTs = _.map(requests, request => request.AST);
    const { query, deepNames, deepAliases } = createQueryNamesAndAliasesFromASTs(ASTs);

    try {
      const response = await this.requestCreator(query);
      const result = _.get(response, 'data', response);
      if (_.isNil(result)) {
        throw new Error('Response of requestFunction is undefined or null');
      }

      _.each(deepNames, (deepNameGroup, index) => {
        const deepAliasGroup = deepAliases[index];
        const returnObj = {};
        _.each(deepAliasGroup, (deepAlias, aliasIndex) => {
          const deepName = _.replace(deepNameGroup[aliasIndex], /\:.+\)/g, '');
          let deepAliasResult = deepAlias;
          let deepNameResult = _.get(result, deepName);
          if (_.isUndefined(deepNameResult)) {
            const [deepNameWithoutLastPeriod, finalProperty] = [
              _.initial(_.split(deepName, '.')).join('.'),
              _.last(_.split(deepName, '.')),
            ];
            let newDeepNameResult = _.get(result, deepNameWithoutLastPeriod);
            if (_.isArray(newDeepNameResult)) {
              deepAliasResult = _.initial(_.split(deepAlias, '.')).join('.');
              const oldDeepNameResult = _.get(returnObj, deepAliasResult, []);
              newDeepNameResult = _.map(newDeepNameResult, (value, index) => {
                const valueAtFinalProperty = _.get(value, finalProperty);
                const oldValue = _.get(oldDeepNameResult, index, {});
                return {
                  ...oldValue,
                  [finalProperty]: valueAtFinalProperty,
                };
              });
              deepNameResult = newDeepNameResult;
            }
            if (_.isNull(newDeepNameResult)) {
              deepAliasResult = _.initial(_.split(deepAlias, '.')).join('.');
              deepNameResult = newDeepNameResult;
            }
          }
          _.set(returnObj, deepAliasResult, deepNameResult);
        });
        requests[index].resolve(returnObj);
      });
    } catch (err) {
      _.each(requests, request => request.reject(err));
    }
  }

  private async processMutations() {
    if (_.size(this.mutationRequests) === 0) {
      return;
    }

    const requests = this.mutationRequests;
    this.mutationRequests = [];

    const ASTs = requests.map(request => request.AST);
    const { mutation, names } = createMutationAndNamesFromASTs(ASTs);
    const response = await this.requestCreator(mutation);
    const result = _.get(response, 'data', response);
    if (_.isNil(result)) {
      throw new Error('Response of requestFunction is undefined or null');
    }
    _.each(requests, ({ resolve }, index) => {
      const originalNames = _.map(names[index], name => name.original);
      const newNames = _.map(names[index], name => name.new);
      const resultToReturn = _.zipObject(originalNames, _.map(newNames, name => result[name]));
      resolve(resultToReturn);
    });
  }
}
