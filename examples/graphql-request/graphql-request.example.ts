import { RequestManager } from 'cackle-js';
import { request } from 'graphql-request';

const url = 'http://localhost:8080/graphql';
const queryHandler = (query: string) => request(url, query);

const requestManager = new RequestManager(queryHandler);

const query1 = `{
  todos {
    name
  }
}`;

const query2 = `{
  todos {
    isComplete
  }
}`;

(async () => {
  const promise1 = requestManager.createQuery(query1);
  const promise2 = requestManager.createQuery(query2);

  const [result1, result2] = await Promise.all([promise1, promise2]);
  console.log(JSON.stringify({ result1, result2 }, null, 2));

  // OUTPUT assuming using test-schema
  // {
  //   "result1": {
  //     "todos": [
  //       {
  //         "name": "Brush Teeth"
  //       }
  //     ]
  //   },
  //   "result2": {
  //     "todos": [
  //       {
  //         "isComplete": true
  //       }
  //     ]
  //   }
  // }
})();
