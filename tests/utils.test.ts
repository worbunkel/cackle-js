import {
  createQueryFromUniqueNames,
  createQueryDefinitionGroups,
  createSelections,
  createDeepNamesAndAliases,
  delay,
} from '../dist/utils';
import gql from 'graphql-tag';
import _ from 'lodash';

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
