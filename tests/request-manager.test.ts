import { RequestManager } from '../src/request-manager';
import { queryTestSchema, resetTestDB } from '../src/test-schema';
import { delay } from '../src/utils';
import _ from 'lodash';

const firstQuery = `
  query {
    todos{
      name
      isComplete
    }
  }
`;
const secondQuery = `
  {
    todos {
      ...todoFields
    }
    test: todos {
      ...todoFields
    }
    todo(name: "Brush Teeth"){
      ...todoFields
    }
  }

  fragment todoFields on Todo {
    name
    isComplete
  }
`;

const mutation = `
  mutation{
    addTodo(newTodo: {name: "Testing", isComplete: false}){
      name
      isComplete
    }
  }
`;

const mutationWithArrayReturn = `
  mutation{
    addTodos(newTodos: [{name: "Testing2", isComplete: false}, {name: "Testing3", isComplete: false}]){
      name
      isComplete
    }
  }
`;

describe('Request Manager', () => {
  describe('Query', () => {
    beforeEach(() => {
      resetTestDB();
    });
    it('Can do a normal query', async () => {
      const requestManager = new RequestManager(queryTestSchema);
      const result = await requestManager.createQuery(firstQuery);
      expect(result).toEqual({
        todos: [
          {
            name: 'Brush Teeth',
            isComplete: true,
          },
        ],
      });
    });

    it('Can do two queries', async () => {
      const requestManager = new RequestManager(queryTestSchema);
      const result1 = requestManager.createQuery(firstQuery);
      const result2 = requestManager.createQuery(firstQuery);
      const finalResult = await Promise.all([result1, result2]);
      expect(finalResult).toEqual([
        {
          todos: [
            {
              name: 'Brush Teeth',
              isComplete: true,
            },
          ],
        },
        {
          todos: [
            {
              name: 'Brush Teeth',
              isComplete: true,
            },
          ],
        },
      ]);
    });

    it('Can do two queries with arguments', async () => {
      const queryWithOneArgument = `
    {
      todo(name: "Brush Teeth"){
        name
      }
    }
    `;
      const queryWithOneArgument2 = `
    {
      todo(name: "test"){
        name
      }
    }
    `;

      const requestManager = new RequestManager(queryTestSchema);
      const result1 = requestManager.createQuery(queryWithOneArgument);
      const result2 = requestManager.createQuery(queryWithOneArgument2);
      const finalResult = await Promise.all([result1, result2]);
      expect(finalResult).toEqual([
        {
          todo: {
            name: 'Brush Teeth',
          },
        },
        {
          todo: null,
        },
      ]);
    });

    it('Can batch two queries so that only one request is made', async () => {
      let count = 0;
      const graphqlRequestWithCounter = async (query: string) => {
        count++;
        try {
          return await queryTestSchema(query);
        } catch (err) {
          return {};
        }
      };
      const requestManager = new RequestManager(graphqlRequestWithCounter);
      const result1 = requestManager.createQuery(firstQuery);
      const result2 = requestManager.createQuery(firstQuery);
      await Promise.all([result1, result2]);
      expect(count).toEqual(1);
    });

    it('Can handle two queries separately if the delay is longer than the batch duration', async () => {
      const requestManager = new RequestManager(queryTestSchema, 300);
      const result1 = requestManager.createQuery(firstQuery);
      await delay(500);
      const result2 = requestManager.createQuery(firstQuery);
      const finalResult = await Promise.all([result1, result2]);
      expect(finalResult).toEqual([
        {
          todos: [
            {
              name: 'Brush Teeth',
              isComplete: true,
            },
          ],
        },
        {
          todos: [
            {
              name: 'Brush Teeth',
              isComplete: true,
            },
          ],
        },
      ]);
    });

    it('Will make two requests if the delay between queries is longer than the batch duration', async () => {
      let count = 0;
      const graphqlRequestWithCounter = async (query: string) => {
        count++;
        try {
          return await queryTestSchema(query);
        } catch (err) {
          return {};
        }
      };
      const requestManager = new RequestManager(graphqlRequestWithCounter, 300);
      const result1 = requestManager.createQuery(firstQuery);
      await delay(500);
      const result2 = requestManager.createQuery(firstQuery);
      await Promise.all([result1, result2]);
      expect(count).toEqual(2);
    });

    it('Will throw an "Invalid Query" error if the query has invalid syntax', async () => {
      expect.assertions(1);
      const requestManager = new RequestManager(queryTestSchema, 0);
      const invalidQuery = `${firstQuery}}`;
      try {
        await requestManager.createQuery(invalidQuery);
      } catch (err) {
        expect(err).toMatch('Invalid Query');
      }
    });

    it('Will throw an error if the request handler function does not return a function in the form of { data: any }', async () => {
      expect.assertions(1);
      const badGraphqlRequest = query => Promise.resolve({ query });
      const requestManager = new RequestManager(badGraphqlRequest, 0);
      try {
        await requestManager.createQuery(firstQuery);
      } catch (err) {
        expect(err.message).toMatch(/\{ data: any \}/g);
      }
    });
  });

  describe('Mutation', () => {
    it('Can do a normal mutation', async () => {
      const requestManager = new RequestManager(queryTestSchema);
      const result = await requestManager.createMutation(mutation);
      expect(result).toEqual({
        addTodo: {
          name: 'Testing',
          isComplete: false,
        },
      });
    });

    it('Can do a mutation with an array return ', async () => {
      const requestManager = new RequestManager(queryTestSchema);
      const result = await requestManager.createMutation(mutationWithArrayReturn);
      expect(result).toEqual({
        addTodos: [
          {
            name: 'Testing2',
            isComplete: false,
          },
          {
            name: 'Testing3',
            isComplete: false,
          },
        ],
      });
    });

    it('Can do two mutations', async () => {
      const requestManager = new RequestManager(queryTestSchema);
      const promise1 = requestManager.createMutation(mutation);
      const promise2 = requestManager.createMutation(mutation);
      const result1 = await promise1;
      const result2 = await promise2;
      expect([result1, result2]).toEqual([
        {
          addTodo: {
            name: 'Testing',
            isComplete: false,
          },
        },
        {
          addTodo: {
            name: 'Testing',
            isComplete: false,
          },
        },
      ]);
    });
  });

  it('Will make two requests if a query then a mutation is made', async () => {
    const counts = {
      request: 0,
      mutation: 0,
      query: 0,
    };
    const graphqlRequestWithCounter = async (query: string) => {
      counts.request++;
      if (_.includes(query, 'mutation')) {
        counts.mutation++;
      } else {
        counts.query++;
      }
      return { data: {} };
    };
    const requestManager = new RequestManager(graphqlRequestWithCounter);
    const queryPromise = requestManager.createQuery(secondQuery);
    const mutationPromise = requestManager.createMutation(mutation);
    await Promise.all([mutationPromise, queryPromise]);
    expect(counts).toEqual({
      request: 2,
      mutation: 1,
      query: 1,
    });
  });

  it('Will make two requests if a mutation then a query is made', async () => {
    const counts = {
      request: 0,
      mutation: 0,
      query: 0,
    };
    const graphqlRequestWithCounter = async (query: string) => {
      counts.request++;
      if (_.includes(query, 'mutation')) {
        counts.mutation++;
      } else {
        counts.query++;
      }
      return { data: {} };
    };
    const requestManager = new RequestManager(graphqlRequestWithCounter);
    const mutationPromise = requestManager.createMutation(mutation);
    const queryPromise = requestManager.createQuery(secondQuery);
    await Promise.all([mutationPromise, queryPromise]);
    expect(counts).toEqual({
      request: 2,
      mutation: 1,
      query: 1,
    });
  });
});
