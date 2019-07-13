import _ from 'lodash';
import { RequestManager } from './request-manager';
import { delay } from './utils';
import { graphql } from 'graphql';
import { testSchema } from './test-schema';

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

const doRequest = async (queryId: string, query: string, requestManager: RequestManager) => {
  const result = await requestManager.createQuery(query);
  console.log(`${queryId} Result (${new Date().getTime()}):\n${JSON.stringify(result, null, 2)}`);
};

const createAndProcessQueries = async () => {
  const graphqlRequest = async (query: string) => {
    try {
      return graphql(testSchema, query);
    } catch (err) {
      console.error(err);
      return {};
    }
  };
  const requestManager = new RequestManager(graphqlRequest, 300);
  doRequest('First', firstQuery, requestManager);
  doRequest('Second', secondQuery, requestManager);
  await delay(200);
  doRequest('Third', firstQuery, requestManager);
  await delay(200);
  doRequest('Fourth', firstQuery, requestManager);
  await delay(400);
  doRequest('Fifth', `${firstQuery}}`, requestManager);
};

createAndProcessQueries();
