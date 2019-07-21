import {
  createQueryFromUniqueNames,
  createQueryDefinitionGroups,
  createSelections,
  createDeepNamesAndAliases,
  delay,
} from '../dist/utils';
import gql from 'graphql-tag';
import _ from 'lodash';
import { RequestManager } from '../src/request-manager';
import { graphql } from 'graphql';
import { testSchema } from '../src/test-schema';

const firstQuery = `
  query {
    hello
    hello2: hello
    test {
      thing
    }
  }
`;

describe('utils', () => {
  describe('createDeepNamesAndAliases', () => {
    it('should create deepNames and deepAliases correctly', () => {
      const requests = [
        {
          AST: gql(firstQuery),
          resolve: (value: any) => {},
          reject: (reason: any) => {},
        },
      ];
      const queryDefinitionGroups = createQueryDefinitionGroups(requests);
      const selections = createSelections(queryDefinitionGroups);

      const deepNamesAndAliases = createDeepNamesAndAliases(selections);

      expect(deepNamesAndAliases).toEqual({
        deepNames: [['hello', 'hello', 'test.thing']],
        deepAliases: [['hello', 'hello2', 'test.thing']],
      });
    });
  });

  describe('createQueryFromUniqueNames', () => {
    it('should combine unique names into a query', () => {
      const uniqueNames = ['hello', 'test.thing', 'test.thing2', 'test.otherThing.moreTest'];

      const query = createQueryFromUniqueNames(uniqueNames);

      const expectedResult = `{
  hello
  test {
    thing
    thing2
    otherThing {
      moreTest
    }
  }
}
`;
      expect(query).toEqual(expectedResult);
    });
  });

  describe('createQueryNamesAndAliasesFromASTs', () => {
    const queryWithOneArgument = `
    {
      thingWithArgs(argument1: "test"){
        thingInside
      }
    }
    `;

    const queryWithOneArgument2 = `
    {
      thingWithArgs(argument1: "test2"){
        thingInside
      }
    }
    `;

    const queryWithOneArgumentAndAlias = `
    {
      thingWithArgs1: thingWithArgs(argument1: "test"){
        otherThingInside
      }
    }`;

    const queryWithTwoArguments = `
    {
      thingWithArgs(argument1: "noAlias", argument2: "testAgain"){
        thingInside
      }
    }
    `;

    const queryWithTwoArguments2 = `
    {
      thingWithArgs(argument1: "test2", argument2: "testAgain"){
        thingInside
      }
    }
    `;

    const queriesWithOneArgumentMatched = [queryWithOneArgument, queryWithOneArgument];
    const queriesWithOneArgumentUnmatched = [queryWithOneArgument, queryWithOneArgument2];
    const queriesWithOneArgumentMatchedAndAlias = [queryWithOneArgument, queryWithOneArgumentAndAlias];
    const queriesWithTwoArgumentsMatched = [queryWithTwoArguments, queryWithTwoArguments];
    const queriesWithTwoArgumentsUnmatched = [queryWithTwoArguments, queryWithTwoArguments2];
    const queriesWithAllVariations = [
      queryWithOneArgument,
      queryWithOneArgument2,
      queryWithOneArgumentAndAlias,
      queryWithTwoArguments,
      queryWithTwoArguments2,
    ];
    const getRequestQuery = async (queries: string[]) => {
      let requestQuery = '';
      const queryChecker = async (query: string) => {
        requestQuery = query;
        return { data: {} };
      };
      const requestManager = new RequestManager(queryChecker);
      const resultPromises = _.map(queries, query => requestManager.createQuery(query));
      await Promise.all(resultPromises);
      return requestQuery;
    };
    it('Can handle queries one argument matched', async () => {
      expect(await getRequestQuery(queriesWithOneArgumentMatched)).toMatchSnapshot();
    });
    it('Can handle queries one argument unmatched', async () => {
      expect(await getRequestQuery(queriesWithOneArgumentUnmatched)).toMatchSnapshot();
    });
    it('Can handle queries with one argument matched and alias', async () => {
      expect(await getRequestQuery(queriesWithOneArgumentMatchedAndAlias)).toMatchSnapshot();
    });
    it('Can handle queries with two arguments matched', async () => {
      expect(await getRequestQuery(queriesWithTwoArgumentsMatched)).toMatchSnapshot();
    });
    it('Can handle queries with two arguments unmatched', async () => {
      expect(await getRequestQuery(queriesWithTwoArgumentsUnmatched)).toMatchSnapshot();
    });
    it('Can handle queries with many variations', async () => {
      expect(await getRequestQuery(queriesWithAllVariations)).toMatchSnapshot();
    });
  });

  describe('delay', () => {
    const durations = [100, 200, 300, 400, 500, 1000];
    _.each(durations, duration => {
      it(`should allow at least ${duration}ms to pass when passed ${duration} as the duration`, async () => {
        const timeBefore = new Date().getTime();
        await delay(duration);
        const timeAfter = new Date().getTime();

        const difference = timeAfter - timeBefore;
        expect(difference + 1).toBeGreaterThan(duration);
      });
    });
  });
});
