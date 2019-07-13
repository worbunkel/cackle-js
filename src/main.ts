import _ from 'lodash';
import { RequestManager } from './request-manager';

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

const createAndProcessQueries = async () => {
  const requestManager = new RequestManager();
  const firstPromise = requestManager.createQuery(firstQuery);
  const secondPromise = requestManager.createQuery(secondQuery);
  requestManager.processQueries();
  const finalResult = await Promise.all([firstPromise, secondPromise]);
  console.log(JSON.stringify({ finalResult }, null, 2));
  return finalResult;
};

createAndProcessQueries();
