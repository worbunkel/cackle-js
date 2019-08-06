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

  // TODO: HOLY COW THIS IS GROSS
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
        let arrayDeepNames: string[] = [];
        const returnObj = {};
        deepNameGroup = _.orderBy(deepNameGroup, name => _.size(_.split(name, '.')));
        const deepAliasGroup = _.orderBy(deepAliases[index], name => _.size(_.split(name, '.')));
        _.each(deepAliasGroup, (deepAlias, aliasIndex) => {
          const deepName = _.replace(deepNameGroup[aliasIndex], /\:.+\)/g, '');
          let deepAliasResult = deepAlias;
          let deepNameResult = _.get(result, deepName);
          if (_.isUndefined(deepNameResult)) {
            const foundArrayDeepNames = _.orderBy(
              _.filter(arrayDeepNames, arrayDeepName => _.includes(deepName, arrayDeepName)),
              val => _.size(_.split(val, ',')),
            );
            const deepNameWithoutLastPeriod = _.initial(_.split(deepName, '.')).join('.');
            const arraysToCheck = [...foundArrayDeepNames, deepNameWithoutLastPeriod];
            const handleArrayDeepNames = (
              arrayDeepNamesToHandle: string[],
              currentValue?: any,
              earlierValues: string[] = [],
              earlierAliases: string[] = [],
            ) => {
              const filteredArrayDeepNamesToHandle = _.reject(arrayDeepNamesToHandle, name =>
                _.some(earlierValues, earlierValue => _.includes(earlierValue, name)),
              );
              if (_.isEmpty(filteredArrayDeepNamesToHandle)) {
                return;
              }
              const foundArrayDeepName = _.first(arrayDeepNamesToHandle);
              const numberOfPeriods = _.size(_.split(foundArrayDeepName, '.')) - 1;
              const finalProperty = _.tail(_.split(_.replace(deepName, foundArrayDeepName, ''), '.')).join('.');
              const earlierValuesPath =
                earlierValues.join('.') +
                '.' +
                _.slice(_.split(foundArrayDeepName, '.'), _.size(earlierValues)).join('.');
              const foundArrayDeepNameResult = _.get(result, foundArrayDeepName);
              const earlierValuesPathResult = _.get(result, earlierValuesPath);
              let newDeepNameResult = !_.isUndefined(foundArrayDeepNameResult)
                ? foundArrayDeepNameResult
                : !_.isUndefined(earlierValuesPathResult)
                ? earlierValuesPathResult
                : undefined;
              const splitEarlierAliases = _.split(deepAlias, '.');
              const resultingEarlierAlias = _.map(_.split(earlierValuesPath, '.'), (value, index) => {
                const earlierAliasValue = _.replace(splitEarlierAliases[index], /\[.+\]/, '');
                const bracketsValue = _.get(/\[.+\]/.exec(value), '[0]');
                if (bracketsValue) {
                  return earlierAliasValue + bracketsValue;
                }
                return earlierAliasValue;
              }).join('.');
              if (_.isArray(newDeepNameResult)) {
                arrayDeepNames = _.uniq(_.concat(arrayDeepNames, foundArrayDeepName));
                deepAliasResult = _.slice(_.split(deepAlias, '.'), 0, numberOfPeriods + 1).join('.');

                const oldDeepNameResult =
                  _.get(returnObj, deepAliasResult) ||
                  _.get(currentValue, deepAliasResult) ||
                  _.get(returnObj, resultingEarlierAlias) ||
                  [];
                let useDeepAliasResult = newDeepNameResult === _.get(result, earlierValuesPath);
                newDeepNameResult = _.map(newDeepNameResult, (value, index) => {
                  const valueAtFinalProperty = _.get(value, finalProperty);
                  const oldValue = _.cloneDeep(_.get(oldDeepNameResult, index, {}));
                  _.set(oldValue, finalProperty, valueAtFinalProperty);
                  return oldValue;
                });
                deepNameResult = newDeepNameResult;
                if (useDeepAliasResult) {
                  deepAliasResult = resultingEarlierAlias;
                  if (!_.isUndefined(deepNameResult)) {
                    _.set(returnObj, deepAliasResult, deepNameResult);
                  }
                }
                _.each(newDeepNameResult, (value, index) =>
                  handleArrayDeepNames(
                    _.tail(arrayDeepNamesToHandle),
                    value,
                    [...earlierValues, foundArrayDeepName + '[' + index + ']'],
                    [...earlierAliases, resultingEarlierAlias + '[' + index + ']'],
                  ),
                );
              } else if (_.isNull(newDeepNameResult)) {
                deepAliasResult = _.initial(_.split(deepAlias, '.')).join('.');
                deepNameResult = newDeepNameResult;
                if (!_.isUndefined(newDeepNameResult)) {
                  _.set(returnObj, deepAliasResult, deepNameResult);
                }
              }
            };
            handleArrayDeepNames(arraysToCheck);
          }
          if (!_.isUndefined(deepNameResult)) {
            _.set(returnObj, deepAliasResult, deepNameResult);
          }
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
