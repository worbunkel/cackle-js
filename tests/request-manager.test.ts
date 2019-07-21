import { graphql } from 'graphql';
import { RequestManager } from '../src/request-manager';
import { testSchema } from '../src/test-schema';
import { delay } from '../src/utils';

const firstQuery = `
  query {
    hello
    hello2: hello
    test {
      thing
    }
  }
`;
const secondQuery = `
  {
    hello
    test2: test {
      thing
      thing2
      otherThing {
        moreTest
      }
    }
  }
`;

const graphqlRequest = async (query: string) => {
  try {
    return await graphql(testSchema, query);
  } catch (err) {
    return {};
  }
};

describe('Request Manager', () => {
  it('Can do a normal query', async () => {
    const requestManager = new RequestManager(graphqlRequest);
    const result = await requestManager.createQuery(firstQuery);
    expect(result).toEqual({
      hello: 'world',
      hello2: 'world',
      test: {
        thing: 'thing',
      },
    });
  });

  it('Can do two queries', async () => {
    const requestManager = new RequestManager(graphqlRequest);
    const result1 = requestManager.createQuery(firstQuery);
    const result2 = requestManager.createQuery(secondQuery);
    const finalResult = await Promise.all([result1, result2]);
    expect(finalResult).toEqual([
      {
        hello: 'world',
        hello2: 'world',
        test: {
          thing: 'thing',
        },
      },
      {
        hello: 'world',
        test2: {
          thing: 'thing',
          thing2: 'thing2',
          otherThing: {
            moreTest: 'otherThing moreTest',
          },
        },
      },
    ]);
  });

  it('Can do two queries with arguments', async () => {
    const queryWithOneArgument = `
    {
      thingWithArgs(argument1: "test"){
        thingInside
      }
    }
    `;
    const queryWithOneArgument2 = `
    {
      thingWithArgs(argument1: "test"){
        otherThingInside
      }
    }
    `;

    const requestManager = new RequestManager(graphqlRequest);
    const result1 = requestManager.createQuery(queryWithOneArgument);
    const result2 = requestManager.createQuery(queryWithOneArgument2);
    const finalResult = await Promise.all([result1, result2]);
    expect(finalResult).toEqual([
      {
        thingWithArgs: {
          thingInside: 'thingInside',
        },
      },
      {
        thingWithArgs: {
          otherThingInside: 'otherThingInside',
        },
      },
    ]);
  });

  it('Can batch two queries so that only one request is made', async () => {
    let count = 0;
    const graphqlRequestWithCounter = async (query: string) => {
      count++;
      try {
        return await graphql(testSchema, query);
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
    const requestManager = new RequestManager(graphqlRequest, 300);
    const result1 = requestManager.createQuery(firstQuery);
    await delay(500);
    const result2 = requestManager.createQuery(firstQuery);
    const finalResult = await Promise.all([result1, result2]);
    expect(finalResult).toEqual([
      {
        hello: 'world',
        hello2: 'world',
        test: {
          thing: 'thing',
        },
      },
      {
        hello: 'world',
        hello2: 'world',
        test: {
          thing: 'thing',
        },
      },
    ]);
  });

  it('Will make two requests if the delay between queries is longer than the batch duration', async () => {
    let count = 0;
    const graphqlRequestWithCounter = async (query: string) => {
      count++;
      try {
        return await graphql(testSchema, query);
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
    const requestManager = new RequestManager(graphqlRequest, 0);
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
